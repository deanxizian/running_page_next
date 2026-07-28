import unittest
from types import SimpleNamespace

from activity_rules import is_race_event


class RaceEventRuleTests(unittest.TestCase):
    def test_strava_race_attribute_is_authoritative(self):
        activity = SimpleNamespace(
            workout_type=1,
            name="Morning Run",
            distance=10_000,
        )

        self.assertTrue(is_race_event(activity))

    def test_fallback_requires_matching_title_and_distance(self):
        self.assertTrue(
            is_race_event(
                {
                    "workout_type": None,
                    "name": "上海半程马拉松",
                    "distance": 21_100,
                }
            )
        )
        self.assertFalse(
            is_race_event(
                {
                    "workout_type": None,
                    "name": "上海半程马拉松",
                    "distance": 10_000,
                }
            )
        )
        self.assertFalse(
            is_race_event(
                {
                    "workout_type": None,
                    "name": "Easy Run",
                    "distance": 21_100,
                }
            )
        )


if __name__ == "__main__":
    unittest.main()
