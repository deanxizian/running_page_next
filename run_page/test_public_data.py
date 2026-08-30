import unittest

from public_data import split_public_activities


class PublicDataTests(unittest.TestCase):
    def test_splits_routes_without_mutating_activity_metadata(self):
        activities = [
            {
                "run_id": 1,
                "name": "Race",
                "distance": 10_000,
                "workout_type": 1,
                "summary_polyline": "race-route",
            },
            {
                "run_id": 2,
                "name": "Regular Run",
                "distance": 5_000,
                "workout_type": None,
                "summary_polyline": "regular-route",
            },
            {
                "run_id": 3,
                "name": "No Route",
                "distance": 5_000,
                "workout_type": None,
                "summary_polyline": "",
            },
        ]

        metadata, activity_routes, event_routes = split_public_activities(activities)

        self.assertTrue(all("summary_polyline" not in item for item in metadata))
        self.assertEqual(
            activity_routes,
            {"1": "race-route", "2": "regular-route"},
        )
        self.assertEqual(event_routes, {"1": "race-route"})
        self.assertEqual(activities[0]["summary_polyline"], "race-route")


if __name__ == "__main__":
    unittest.main()
