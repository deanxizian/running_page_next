import datetime
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

import polyline
from race_weather import OPEN_METEO_URL, temperature_for_activity


def race_activity(summary_polyline=None):
    return SimpleNamespace(
        run_id=1,
        summary_polyline=(
            polyline.encode([(31.23, 121.47), (31.24, 121.48)])
            if summary_polyline is None
            else summary_polyline
        ),
        start_date_local="2026-04-12 07:30:00",
        elapsed_time=datetime.timedelta(hours=2),
        moving_time=datetime.timedelta(hours=2),
    )


class RaceWeatherTests(unittest.TestCase):
    def test_averages_interpolated_temperature_over_activity_time(self):
        response = MagicMock()
        response.json.return_value = {
            "hourly": {
                "time": [
                    "2026-04-12T07:00",
                    "2026-04-12T08:00",
                    "2026-04-12T09:00",
                    "2026-04-12T10:00",
                ],
                "temperature_2m": [10, 12, 14, 16],
            }
        }
        session = MagicMock()
        session.get.return_value = response

        temperature = temperature_for_activity(race_activity(), session=session)

        self.assertEqual(temperature, 13.0)
        session.get.assert_called_once()
        self.assertEqual(session.get.call_args.args[0], OPEN_METEO_URL)
        self.assertEqual(session.get.call_args.kwargs["params"]["timezone"], "auto")
        response.raise_for_status.assert_called_once()

    def test_missing_route_skips_weather_request(self):
        session = MagicMock()

        temperature = temperature_for_activity(
            race_activity(summary_polyline=""),
            session=session,
        )

        self.assertIsNone(temperature)
        session.get.assert_not_called()

    def test_api_failure_does_not_break_sync(self):
        response = MagicMock()
        response.json.side_effect = ValueError("invalid response")
        session = MagicMock()
        session.get.return_value = response

        temperature = temperature_for_activity(race_activity(), session=session)

        self.assertIsNone(temperature)


if __name__ == "__main__":
    unittest.main()
