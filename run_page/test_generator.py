import os
import sqlite3
import stat
import tempfile
import unittest
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import polyline
from generator import (
    Generator,
    _haversine,
    public_location_for,
    sanitize_activity_for_public,
    trim_route_for_public,
)
from generator import db as generator_db
from generator.db import Activity
from strava_sync import write_private_text


def strava_activity(run_id, *, average_speed=2.8, workout_type=None):
    return SimpleNamespace(
        id=run_id,
        name=f"Run {run_id}",
        distance=10_000,
        moving_time=timedelta(hours=1),
        elapsed_time=timedelta(hours=1),
        type="Run",
        workout_type=workout_type,
        start_date="2026-07-20 00:00:00",
        start_date_local="2026-07-20 08:00:00",
        location_country="France",
        start_latlng=None,
        average_heartrate=150,
        average_speed=average_speed,
        total_elevation_gain=30,
        map=SimpleNamespace(summary_polyline=""),
    )


def cached_activity(run_id, activity_type="Run", summary_polyline=""):
    return Activity(
        run_id=run_id,
        name=f"Cached {run_id}",
        distance=5_000,
        moving_time=timedelta(minutes=30),
        elapsed_time=timedelta(minutes=30),
        type=activity_type,
        subtype=activity_type,
        workout_type=None,
        start_date=f"2026-07-{run_id:02d} 00:00:00",
        start_date_local=f"2026-07-{run_id:02d} 08:00:00",
        location_country="France",
        average_heartrate=None,
        average_speed=2.8,
        elevation_gain=10,
        summary_polyline=summary_polyline,
    )


class PublicActivityTests(unittest.TestCase):
    def test_trims_exact_route_length_from_both_ends(self):
        coordinates = [(31.0 + index * 0.001, 121.0) for index in range(4)]
        trimmed = polyline.decode(
            trim_route_for_public(polyline.encode(coordinates), trim_m=10)
        )

        self.assertAlmostEqual(
            _haversine(*coordinates[0], *trimmed[0]),
            10,
            delta=1,
        )
        self.assertAlmostEqual(
            _haversine(*coordinates[-1], *trimmed[-1]),
            10,
            delta=1,
        )

    def test_keeps_later_route_points_that_reenter_the_start_area(self):
        coordinates = [
            (31.0, 121.0),
            (31.0002, 121.0),
            (31.001, 121.0),
            (31.00001, 121.00001),
            (31.001, 121.001),
            (31.002, 121.001),
        ]
        trimmed = polyline.decode(
            trim_route_for_public(polyline.encode(coordinates), trim_m=10)
        )

        self.assertTrue(
            any(_haversine(*coordinates[0], *point) < 5 for point in trimmed[1:-1])
        )

    def test_drops_routes_shorter_than_both_hidden_ends(self):
        coordinates = [(31.0, 121.0), (31.0001, 121.0)]

        self.assertEqual(
            trim_route_for_public(polyline.encode(coordinates), trim_m=10),
            "",
        )

    def test_location_export_keeps_only_coarse_administrative_parts(self):
        location = "广富林路, 徐汇区, 上海市, 中国, 200030"

        self.assertEqual(public_location_for(location), "徐汇区, 上海市, 中国")
        self.assertEqual(
            public_location_for(
                "123 Main Street, Boston, Massachusetts, 02110, United States"
            ),
            "Massachusetts, United States",
        )

    def test_missing_route_stays_empty_instead_of_reusing_another_route(self):
        outdoor_route = polyline.encode([(31.0, 121.0), (31.01, 121.01)])
        outdoor = sanitize_activity_for_public(
            {
                "run_id": 1,
                "summary_polyline": outdoor_route,
                "location_country": "上海市, 中国",
            }
        )
        missing_route = sanitize_activity_for_public(
            {
                "run_id": 2,
                "summary_polyline": "",
                "location_country": "",
            }
        )

        self.assertTrue(outdoor["summary_polyline"])
        self.assertEqual(missing_route["summary_polyline"], "")
        self.assertEqual(missing_route["location_country"], "")

    def test_public_route_trimming_does_not_change_activity_metrics(self):
        activity = {
            "run_id": 1,
            "distance": 10_000,
            "moving_time": "1:00:00",
            "average_speed": 2.8,
            "summary_polyline": polyline.encode([(31.0, 121.0), (31.01, 121.01)]),
            "location_country": "松江区, 上海市, 中国",
        }

        sanitized = sanitize_activity_for_public(activity)

        self.assertEqual(sanitized["distance"], activity["distance"])
        self.assertEqual(sanitized["moving_time"], activity["moving_time"])
        self.assertEqual(sanitized["average_speed"], activity["average_speed"])


class SyncTests(unittest.TestCase):
    def test_successful_full_sync_reconciles_stale_runs(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            generator = Generator(os.path.join(temporary_directory, "data.db"))
            generator.only_run = True
            generator.session.add_all(
                [
                    cached_activity(1),
                    cached_activity(2),
                    cached_activity(3, "Ride"),
                ]
            )
            generator.session.commit()
            generator.client = MagicMock()
            generator.client.refresh_access_token.return_value = {
                "access_token": "access",
                "refresh_token": "rotated",
            }
            generator.client.get_activities.return_value = [
                strava_activity(2),
                strava_activity(4, workout_type=1),
            ]
            persisted_tokens = []

            latest_token = generator.sync(
                force=True,
                on_token_refreshed=persisted_tokens.append,
            )
            remaining_ids = {
                activity.run_id for activity in generator.session.query(Activity)
            }

            self.assertEqual(latest_token, "rotated")
            self.assertEqual(persisted_tokens, ["rotated"])
            self.assertEqual(remaining_ids, {2, 3, 4})
            self.assertEqual(generator.session.get(Activity, 4).average_heartrate, 150)
            self.assertEqual(generator.session.get(Activity, 4).workout_type, 1)
            exported_race = next(
                activity for activity in generator.load() if activity["run_id"] == 4
            )
            self.assertEqual(exported_race["workout_type"], 1)

    def test_incremental_sync_does_not_reconcile_cached_runs(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            generator = Generator(os.path.join(temporary_directory, "data.db"))
            generator.only_run = True
            generator.session.add_all([cached_activity(1), cached_activity(2)])
            generator.session.commit()
            generator.client = MagicMock()
            generator.client.refresh_access_token.return_value = {
                "access_token": "access",
                "refresh_token": "rotated",
            }
            generator.client.get_activities.return_value = [strava_activity(2)]

            generator.sync(force=False)

            remaining_ids = {
                activity.run_id for activity in generator.session.query(Activity)
            }
            self.assertEqual(remaining_ids, {1, 2})

    def test_existing_cache_gets_workout_type_column(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            db_path = os.path.join(temporary_directory, "data.db")
            with sqlite3.connect(db_path) as connection:
                connection.execute(
                    "CREATE TABLE activities (run_id INTEGER PRIMARY KEY)"
                )

            generator = Generator(db_path)
            with sqlite3.connect(db_path) as connection:
                columns = {
                    row[1]
                    for row in connection.execute("PRAGMA table_info(activities)")
                }

            generator.session.close()
            self.assertIn("workout_type", columns)

    def test_sync_failure_rolls_back_updates_and_skips_reconciliation(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            generator = Generator(os.path.join(temporary_directory, "data.db"))
            generator.only_run = True
            generator.session.add(cached_activity(1))
            generator.session.commit()
            generator.client = MagicMock()
            generator.client.refresh_access_token.return_value = {
                "access_token": "access",
                "refresh_token": "rotated",
            }
            generator.client.get_activities.return_value = [
                strava_activity(2),
                strava_activity(3, average_speed=None),
            ]
            persisted_tokens = []

            with self.assertRaises(TypeError):
                generator.sync(
                    force=True,
                    on_token_refreshed=persisted_tokens.append,
                )

            remaining_ids = {
                activity.run_id for activity in generator.session.query(Activity)
            }
            self.assertEqual(persisted_tokens, ["rotated"])
            self.assertEqual(remaining_ids, {1})

    def test_reverse_geocode_results_are_cached_without_changing_delay(self):
        run = SimpleNamespace(
            location_country="",
            start_latlng=SimpleNamespace(lat=31.2, lon=121.5),
        )
        reverse = MagicMock(return_value="上海市, 中国")

        with (
            patch.object(generator_db.g, "reverse", reverse),
            patch.object(generator_db.time, "sleep") as sleep,
        ):
            generator_db._geocode_cache.clear()
            first = generator_db.resolve_location_country(run)
            second = generator_db.resolve_location_country(run)

        self.assertEqual(first, "上海市, 中国")
        self.assertEqual(second, first)
        reverse.assert_called_once()
        sleep.assert_called_once_with(1)

    def test_rotated_token_file_is_owner_only(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            path = os.path.join(temporary_directory, "refresh-token")
            write_private_text(path, "rotated")

            mode = stat.S_IMODE(os.stat(path).st_mode)

            self.assertEqual(mode, 0o600)
            with open(path) as token_file:
                self.assertEqual(token_file.read(), "rotated")


if __name__ == "__main__":
    unittest.main()
