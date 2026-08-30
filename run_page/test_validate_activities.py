import unittest

import polyline
from validate_activities import validate_activity, validate_public_data


def valid_activity():
    return {
        "run_id": 1,
        "name": "Morning Run",
        "distance": 10_000,
        "moving_time": "1:00:00",
        "workout_type": 1,
        "start_date_local": "2026-07-20 08:00:00",
        "start_time_local_ms": 1_784_534_400_000,
        "month_key": "2026-07",
        "year_key": "2026",
        "average_speed": 2.8,
        "average_heartrate": None,
        "elevation_gain": 30,
        "location_country": "上海市, 中国",
        "weather_temperature": 20.5,
    }


class ValidateActivityTests(unittest.TestCase):
    def test_accepts_complete_activity(self):
        validate_activity(valid_activity(), 0)

    def test_requires_nullable_numeric_fields(self):
        for field in ("average_heartrate", "elevation_gain"):
            with self.subTest(field=field):
                activity = valid_activity()
                del activity[field]
                with self.assertRaisesRegex(
                    ValueError, f"missing required field {field}"
                ):
                    validate_activity(activity, 0)

    def test_rejects_booleans_in_numeric_fields(self):
        for field in (
            "run_id",
            "distance",
            "average_speed",
            "average_heartrate",
            "elevation_gain",
            "workout_type",
            "weather_temperature",
        ):
            with self.subTest(field=field):
                activity = valid_activity()
                activity[field] = True
                with self.assertRaisesRegex(ValueError, "invalid type|must be finite"):
                    validate_activity(activity, 0)

    def test_weather_temperature_is_limited_to_races(self):
        activity = valid_activity()
        activity["workout_type"] = None

        with self.assertRaisesRegex(
            ValueError, "weather_temperature is only allowed for races"
        ):
            validate_activity(activity, 0)

        activity["name"] = "上海半程马拉松"
        activity["distance"] = 21_100
        validate_activity(activity, 0)

    def test_requires_workout_type(self):
        activity = valid_activity()
        del activity["workout_type"]
        del activity["weather_temperature"]

        with self.assertRaisesRegex(ValueError, "missing required field workout_type"):
            validate_activity(activity, 0)

    def test_rejects_legacy_public_fields(self):
        for field in ("type", "start_date", "streak", "subtype"):
            with self.subTest(field=field):
                activity = valid_activity()
                activity[field] = "legacy"
                with self.assertRaisesRegex(ValueError, "legacy public fields"):
                    validate_activity(activity, 0)

    def test_rejects_routes_in_activity_metadata(self):
        activity = valid_activity()
        activity["summary_polyline"] = "encoded-route"

        with self.assertRaisesRegex(ValueError, "route fields reserved"):
            validate_activity(activity, 0)

    def test_rejects_precise_public_locations(self):
        activity = valid_activity()
        activity["location_country"] = "广富林路, 上海市, 201620, 中国"

        with self.assertRaisesRegex(ValueError, "location_country is too precise"):
            validate_activity(activity, 0)

    def test_validates_matching_activity_and_event_route_maps(self):
        activity = valid_activity()
        encoded_route = polyline.encode([(31.2, 121.5), (31.21, 121.51)])

        validate_public_data(
            [activity],
            {"1": encoded_route},
            {"1": encoded_route},
        )

    def test_rejects_unknown_or_mismatched_route_maps(self):
        activity = valid_activity()
        encoded_route = polyline.encode([(31.2, 121.5), (31.21, 121.51)])

        with self.assertRaisesRegex(ValueError, "unknown activity"):
            validate_public_data(
                [activity],
                {"2": encoded_route},
                {},
            )

        with self.assertRaisesRegex(
            ValueError, "event routes do not match routed race"
        ):
            validate_public_data(
                [activity],
                {"1": encoded_route},
                {},
            )


if __name__ == "__main__":
    unittest.main()
