import unittest

from validate_activities import validate_activity


def valid_activity():
    return {
        "run_id": 1,
        "name": "Morning Run",
        "distance": 10_000,
        "moving_time": "1:00:00",
        "type": "Run",
        "subtype": "Run",
        "start_date": "2026-07-20 00:00:00",
        "start_date_local": "2026-07-20 08:00:00",
        "start_time_local_ms": 1_784_534_400_000,
        "month_key": "2026-07",
        "year_key": "2026",
        "average_speed": 2.8,
        "average_heartrate": None,
        "elevation_gain": 30,
        "streak": 1,
        "location_country": "上海市, 中国",
        "summary_polyline": "",
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
            "streak",
        ):
            with self.subTest(field=field):
                activity = valid_activity()
                activity[field] = True
                with self.assertRaisesRegex(ValueError, "invalid type|must be finite"):
                    validate_activity(activity, 0)

    def test_rejects_precise_public_locations(self):
        activity = valid_activity()
        activity["location_country"] = "广富林路, 上海市, 201620, 中国"

        with self.assertRaisesRegex(ValueError, "location_country is too precise"):
            validate_activity(activity, 0)


if __name__ == "__main__":
    unittest.main()
