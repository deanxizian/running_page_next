import datetime
import logging
import math

import polyline
import requests

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://historical-forecast-api.open-meteo.com/v1/forecast"
OPEN_METEO_TIMEOUT_SECONDS = 20
OPEN_METEO_USER_AGENT = "running_page_next/1.0"

_session = requests.Session()
_session.headers.update({"User-Agent": OPEN_METEO_USER_AGENT})


def _activity_value(activity, field):
    if isinstance(activity, dict):
        return activity.get(field)
    return getattr(activity, field, None)


def _route_start(summary_polyline):
    if not summary_polyline:
        return None

    try:
        coordinates = polyline.decode(summary_polyline)
    except (TypeError, ValueError):
        return None

    if not coordinates:
        return None

    latitude, longitude = coordinates[0]
    if (
        not math.isfinite(latitude)
        or not math.isfinite(longitude)
        or not -90 <= latitude <= 90
        or not -180 <= longitude <= 180
    ):
        return None

    return latitude, longitude


def _activity_duration(activity):
    duration = _activity_value(activity, "moving_time") or _activity_value(
        activity, "elapsed_time"
    )
    if isinstance(duration, datetime.timedelta):
        return duration
    if not isinstance(duration, str):
        return None

    try:
        hours, minutes, seconds = duration.split(":")
        return datetime.timedelta(
            hours=int(hours),
            minutes=int(minutes),
            seconds=float(seconds),
        )
    except (TypeError, ValueError):
        return None


def _temperature_at(samples, target):
    if target <= samples[0][0]:
        return samples[0][1]

    for (start_time, start_value), (end_time, end_value) in zip(
        samples, samples[1:], strict=False
    ):
        if target > end_time:
            continue

        interval_seconds = (end_time - start_time).total_seconds()
        if interval_seconds <= 0:
            return end_value
        fraction = (target - start_time).total_seconds() / interval_seconds
        return start_value + (end_value - start_value) * fraction

    return samples[-1][1]


def _average_temperature(samples, start, end):
    if not samples or end <= start:
        return None

    points = [(start, _temperature_at(samples, start))]
    points.extend((time, value) for time, value in samples if start < time < end)
    points.append((end, _temperature_at(samples, end)))

    weighted_sum = 0.0
    total_seconds = 0.0
    for (start_time, start_value), (end_time, end_value) in zip(
        points, points[1:], strict=False
    ):
        interval_seconds = (end_time - start_time).total_seconds()
        weighted_sum += (start_value + end_value) / 2 * interval_seconds
        total_seconds += interval_seconds

    if total_seconds <= 0:
        return None
    return round(weighted_sum / total_seconds, 1)


def temperature_for_activity(activity, session=None):
    """Return mean outdoor temperature during one race, or None on failure."""
    route_start = _route_start(_activity_value(activity, "summary_polyline"))
    duration = _activity_duration(activity)
    try:
        start = datetime.datetime.strptime(
            _activity_value(activity, "start_date_local"),
            "%Y-%m-%d %H:%M:%S",
        )
    except (TypeError, ValueError):
        return None

    if route_start is None or duration is None or duration.total_seconds() <= 0:
        return None

    end = start + duration
    latitude, longitude = route_start
    client = session or _session

    try:
        response = client.get(
            OPEN_METEO_URL,
            params={
                "latitude": round(latitude, 4),
                "longitude": round(longitude, 4),
                "start_date": start.date().isoformat(),
                "end_date": end.date().isoformat(),
                "hourly": "temperature_2m",
                "temperature_unit": "celsius",
                "timezone": "auto",
            },
            timeout=OPEN_METEO_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        hourly = response.json()["hourly"]
        times = hourly["time"]
        temperatures = hourly["temperature_2m"]
        if len(times) != len(temperatures):
            raise ValueError("Open-Meteo returned mismatched hourly arrays")

        samples = [
            (datetime.datetime.fromisoformat(time_value), float(temperature))
            for time_value, temperature in zip(times, temperatures, strict=True)
            if temperature is not None and math.isfinite(float(temperature))
        ]
        samples.sort(key=lambda sample: sample[0])
        return _average_temperature(samples, start, end)
    except (
        KeyError,
        TypeError,
        ValueError,
        requests.RequestException,
    ) as exc:
        logger.warning(
            "Open-Meteo lookup failed for activity %s: %s",
            _activity_value(activity, "run_id"),
            exc,
        )
        return None
