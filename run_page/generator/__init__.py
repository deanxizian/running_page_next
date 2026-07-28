import datetime
import logging
import math
import os
import sys

import arrow
import polyline as polyline_codec
import stravalib
from activity_rules import is_race_event
from race_weather import temperature_for_activity
from sqlalchemy import func

from .db import Activity, init_db, update_or_create_activity

logger = logging.getLogger(__name__)


def _nonnegative_float_env(name, default):
    raw_value = os.getenv(name, str(default))
    try:
        value = float(raw_value)
        if not math.isfinite(value):
            raise ValueError
        return max(0.0, value)
    except ValueError:
        logger.warning(
            "%s=%r is invalid; using %.1f",
            name,
            raw_value,
            default,
        )
        return float(default)


# Hide this much route length from both ends of every public polyline.
# The raw Strava polyline remains unchanged in the local SQLite cache.
IGNORE_START_END_RANGE = _nonnegative_float_env("IGNORE_START_END_RANGE", 10)

_CHINESE_MUNICIPALITIES = frozenset(
    {
        "北京市",
        "上海市",
        "天津市",
        "重庆市",
        "香港特别行政区",
        "澳门特别行政区",
    }
)
_CHINESE_PROVINCE_SUFFIXES = ("省", "自治区")
_CHINESE_CITY_SUFFIXES = ("市", "自治州", "盟", "地区")
_CHINESE_DISTRICT_SUFFIXES = ("区", "县")


def _haversine(lat1, lon1, lat2, lon2):
    """Return distance in metres between two WGS-84 points."""
    earth_radius_m = 6_371_000
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    )
    a = min(1.0, max(0.0, a))
    return earth_radius_m * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _interpolate(start, end, fraction):
    return (
        start[0] + (end[0] - start[0]) * fraction,
        start[1] + (end[1] - start[1]) * fraction,
    )


def _coordinate_at_distance(coords, cumulative_distances, target_distance):
    if target_distance <= 0:
        return coords[0]

    for index in range(1, len(coords)):
        if cumulative_distances[index] < target_distance:
            continue

        segment_start_distance = cumulative_distances[index - 1]
        segment_distance = cumulative_distances[index] - segment_start_distance
        if segment_distance <= 0:
            continue

        fraction = (target_distance - segment_start_distance) / segment_distance
        return _interpolate(coords[index - 1], coords[index], fraction)

    return coords[-1]


def _trim_route_coordinates(coords, trim_m):
    """Trim cumulative route length from the beginning and end only."""
    if len(coords) < 2 or trim_m <= 0:
        return list(coords)

    cumulative_distances = [0.0]
    for start, end in zip(coords, coords[1:], strict=False):
        cumulative_distances.append(cumulative_distances[-1] + _haversine(*start, *end))

    route_length_m = cumulative_distances[-1]
    if route_length_m <= trim_m * 2:
        return []

    keep_start_m = trim_m
    keep_end_m = route_length_m - trim_m
    trimmed = [_coordinate_at_distance(coords, cumulative_distances, keep_start_m)]

    for coordinate, distance_m in zip(
        coords[1:-1], cumulative_distances[1:-1], strict=False
    ):
        if keep_start_m < distance_m < keep_end_m:
            trimmed.append(coordinate)

    trimmed.append(_coordinate_at_distance(coords, cumulative_distances, keep_end_m))

    return [
        coordinate
        for index, coordinate in enumerate(trimmed)
        if index == 0 or coordinate != trimmed[index - 1]
    ]


def trim_route_for_public(polyline_value, trim_m=IGNORE_START_END_RANGE):
    """Hide route length from both ends without removing later loop sections."""
    if not polyline_value or trim_m <= 0:
        return polyline_value or ""

    try:
        coords = polyline_codec.decode(polyline_value)
    except Exception:
        logger.warning("Dropped an invalid activity polyline during public export")
        return ""

    trimmed = _trim_route_coordinates(coords, trim_m)
    return polyline_codec.encode(trimmed) if len(trimmed) >= 2 else ""


def public_location_for(location):
    """Keep administrative location only; drop streets, POIs, and postcodes."""
    if not location:
        return ""

    parts = [part.strip() for part in str(location).split(",") if part.strip()]
    if not parts:
        return ""

    if "中国" in parts:
        municipality = next(
            (part for part in reversed(parts) if part in _CHINESE_MUNICIPALITIES),
            "",
        )
        if municipality:
            district = next(
                (
                    part
                    for part in reversed(parts)
                    if part != municipality
                    and part.endswith(_CHINESE_DISTRICT_SUFFIXES)
                ),
                "",
            )
            return ", ".join(part for part in (district, municipality, "中国") if part)

        province = next(
            (
                part
                for part in reversed(parts)
                if part.endswith(_CHINESE_PROVINCE_SUFFIXES)
            ),
            "",
        )
        city = next(
            (
                part
                for part in reversed(parts)
                if part != province and part.endswith(_CHINESE_CITY_SUFFIXES)
            ),
            "",
        )
        return ", ".join(part for part in (city, province, "中国") if part)

    coarse_parts = [
        part
        for part in parts
        if not any(character.isdigit() for character in part)
        and "latitude" not in part.lower()
        and "longitude" not in part.lower()
    ]
    return ", ".join(coarse_parts[-2:])


def sanitize_activity_for_public(activity):
    sanitized = dict(activity)
    sanitized["location_country"] = public_location_for(
        sanitized.get("location_country")
    )
    sanitized["summary_polyline"] = trim_route_for_public(
        sanitized.get("summary_polyline")
    )
    return sanitized


class Generator:
    def __init__(self, db_path):
        self.client = stravalib.Client()
        self.session = init_db(db_path)

        self.client_id = ""
        self.client_secret = ""
        self.refresh_token = ""
        self.only_run = False

    def set_strava_config(self, client_id, client_secret, refresh_token):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token

    def check_access(self):
        response = self.client.refresh_access_token(
            client_id=self.client_id,
            client_secret=self.client_secret,
            refresh_token=self.refresh_token,
        )
        self.access_token = response["access_token"]
        self.refresh_token = response["refresh_token"]
        self.client.access_token = response["access_token"]
        logger.info("Strava access token refreshed")
        return self.refresh_token

    def _reconcile_activities(self, seen_activity_ids):
        query = self.session.query(Activity)
        if self.only_run:
            query = query.filter(Activity.type == "Run")

        stale_activities = [
            activity
            for activity in query
            if int(activity.run_id) not in seen_activity_ids
        ]
        for activity in stale_activities:
            self.session.delete(activity)

        if stale_activities:
            logger.info(
                "Removed %s activities missing from the completed full sync",
                len(stale_activities),
            )

    def enrich_race_weather(self):
        """Cache Open-Meteo temperatures for races that do not have one yet."""
        updated_count = 0
        cleared_count = 0

        for activity in self.session.query(Activity):
            if not is_race_event(activity):
                if activity.weather_temperature is not None:
                    activity.weather_temperature = None
                    cleared_count += 1
                continue

            if activity.weather_temperature is not None:
                continue

            temperature = temperature_for_activity(activity)
            if temperature is None:
                continue

            activity.weather_temperature = temperature
            updated_count += 1

        self.session.commit()
        logger.info(
            "Race weather cache: %s added, %s non-race values removed",
            updated_count,
            cleared_count,
        )
        return updated_count

    def sync(self, force, refresh_locations=False, on_token_refreshed=None):
        """Synchronize activities from Strava into the local cache."""
        latest_refresh_token = self.check_access()
        if on_token_refreshed:
            on_token_refreshed(latest_refresh_token)

        logger.info("Start syncing Strava activities")
        seen_activity_ids = set()

        try:
            if force:
                filters = {"before": datetime.datetime.now(datetime.UTC)}
            else:
                last_activity = self.session.query(
                    func.max(Activity.start_date)
                ).scalar()
                if last_activity:
                    last_activity_date = arrow.get(last_activity).shift(days=-7)
                    filters = {"after": last_activity_date.datetime}
                else:
                    filters = {"before": datetime.datetime.now(datetime.UTC)}

            for activity in self.client.get_activities(**filters):
                if self.only_run and activity.type != "Run":
                    continue

                activity_id = int(activity.id)
                seen_activity_ids.add(activity_id)
                activity.elevation_gain = getattr(
                    activity, "total_elevation_gain", None
                )
                activity.subtype = activity.type
                created = update_or_create_activity(
                    self.session,
                    activity,
                    refresh_locations=refresh_locations,
                )

                sys.stdout.write("+" if created else ".")
                sys.stdout.flush()

            if force:
                self._reconcile_activities(seen_activity_ids)
            self.session.commit()
        except Exception:
            self.session.rollback()
            raise

        return latest_refresh_token

    def load(self):
        query = self.session.query(Activity).filter(Activity.distance > 0.1)
        if self.only_run:
            query = query.filter(Activity.type == "Run")

        activities = query.order_by(Activity.start_date_local)
        activity_list = []

        streak = 0
        last_date = None
        for activity in activities:
            date = datetime.datetime.strptime(
                activity.start_date_local,
                "%Y-%m-%d %H:%M:%S",  # type: ignore
            ).date()
            if last_date is None:
                streak = 1
            elif date == last_date:
                pass
            elif date == last_date + datetime.timedelta(days=1):
                streak += 1
            else:
                assert date > last_date
                streak = 1
            activity.streak = streak  # type: ignore
            last_date = date
            activity_list.append(sanitize_activity_for_public(activity.to_dict()))

        return activity_list
