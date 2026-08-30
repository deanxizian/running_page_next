import json
import math
import re
import sys
from datetime import UTC, datetime
from pathlib import Path

import polyline
from activity_rules import is_race_event

REQUIRED_FIELDS = {
    "run_id": int,
    "name": str,
    "distance": (int, float),
    "moving_time": str,
    "workout_type": (int, type(None)),
    "start_date_local": str,
    "start_time_local_ms": int,
    "month_key": str,
    "year_key": str,
    "average_speed": (int, float),
    "average_heartrate": (int, float, type(None)),
    "elevation_gain": (int, float, type(None)),
}

OPTIONAL_FIELDS = {
    "location_country": (str, type(None)),
    "weather_temperature": (int, float, type(None)),
}

LEGACY_PUBLIC_FIELDS = {"type", "start_date", "streak", "subtype"}
ROUTE_FIELDS = {"summary_polyline"}


def is_finite_number(value):
    return (
        not isinstance(value, bool)
        and isinstance(value, (int, float))
        and math.isfinite(value)
    )


def has_expected_type(value, expected_type):
    expected_types = (
        expected_type if isinstance(expected_type, tuple) else (expected_type,)
    )
    if isinstance(value, bool) and any(
        expected_type in (int, float) for expected_type in expected_types
    ):
        return False
    return isinstance(value, expected_type)


def local_start_fields(start_date_local):
    local_start = datetime.strptime(start_date_local, "%Y-%m-%d %H:%M:%S")
    # Must match generator semantics: local wall-clock timestamp for sorting,
    # not the activity's real UTC instant.
    return {
        "start_time_local_ms": int(local_start.replace(tzinfo=UTC).timestamp() * 1000),
        "month_key": local_start.strftime("%Y-%m"),
        "year_key": local_start.strftime("%Y"),
    }


def validate_activity(activity, index):
    if not isinstance(activity, dict):
        raise ValueError(f"activity[{index}] must be an object")

    legacy_fields = LEGACY_PUBLIC_FIELDS.intersection(activity)
    if legacy_fields:
        fields = ", ".join(sorted(legacy_fields))
        raise ValueError(f"activity[{index}] contains legacy public fields: {fields}")

    route_fields = ROUTE_FIELDS.intersection(activity)
    if route_fields:
        fields = ", ".join(sorted(route_fields))
        raise ValueError(
            f"activity[{index}] contains route fields reserved for route data: {fields}"
        )

    for field, expected_type in REQUIRED_FIELDS.items():
        if field not in activity:
            raise ValueError(f"activity[{index}] missing required field {field}")
        if not has_expected_type(activity[field], expected_type):
            raise ValueError(f"activity[{index}].{field} has invalid type")

    for field, expected_type in OPTIONAL_FIELDS.items():
        if field in activity and not has_expected_type(activity[field], expected_type):
            raise ValueError(f"activity[{index}].{field} has invalid type")

    for field in (
        "distance",
        "average_speed",
        "weather_temperature",
        "average_heartrate",
        "elevation_gain",
        "start_time_local_ms",
    ):
        if (
            field in activity
            and activity[field] is not None
            and not is_finite_number(activity[field])
        ):
            raise ValueError(f"activity[{index}].{field} must be finite")

    if activity.get("weather_temperature") is not None and not is_race_event(activity):
        raise ValueError(
            f"activity[{index}].weather_temperature is only allowed for races"
        )

    try:
        expected_dates = local_start_fields(activity["start_date_local"])
    except ValueError as exc:
        raise ValueError(f"activity[{index}].start_date_local is invalid") from exc

    for field, expected_value in expected_dates.items():
        if activity[field] != expected_value:
            raise ValueError(
                f"activity[{index}].{field} does not match start_date_local"
            )

    location = activity.get("location_country") or ""
    if (
        "latitude" in location.lower()
        or "longitude" in location.lower()
        or re.search(r"\b\d{5,6}\b", location)
    ):
        raise ValueError(f"activity[{index}].location_country is too precise")


def validate_route_map(route_map, activities, label, *, races_only=False):
    if not isinstance(route_map, dict):
        raise ValueError(f"{label} must contain an object")

    activities_by_id = {str(activity["run_id"]): activity for activity in activities}
    validated_keys = set()

    for run_id, encoded_route in route_map.items():
        try:
            canonical_run_id = str(int(run_id))
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"{label} contains an invalid activity id {run_id!r}"
            ) from exc

        if canonical_run_id != run_id or int(run_id) <= 0:
            raise ValueError(f"{label} contains an invalid activity id {run_id!r}")
        if run_id not in activities_by_id:
            raise ValueError(f"{label} contains unknown activity {run_id}")
        if not isinstance(encoded_route, str) or not encoded_route:
            raise ValueError(f"{label}[{run_id}] must be a non-empty polyline")
        if races_only and not is_race_event(activities_by_id[run_id]):
            raise ValueError(f"{label} contains non-race activity {run_id}")

        try:
            coordinates = polyline.decode(encoded_route)
        except Exception as exc:
            raise ValueError(f"{label}[{run_id}] contains an invalid polyline") from exc

        if len(coordinates) < 2:
            raise ValueError(f"{label}[{run_id}] must contain at least two coordinates")
        if any(
            not is_finite_number(latitude)
            or not is_finite_number(longitude)
            or not -90 <= latitude <= 90
            or not -180 <= longitude <= 180
            for latitude, longitude in coordinates
        ):
            raise ValueError(f"{label}[{run_id}] contains invalid coordinates")

        validated_keys.add(run_id)

    return validated_keys


def validate_public_data(activities, activity_routes, event_routes):
    if not isinstance(activities, list):
        raise ValueError("activities file must contain a list")

    for index, activity in enumerate(activities):
        validate_activity(activity, index)

    activities_by_id = {str(activity["run_id"]): activity for activity in activities}
    activity_route_keys = validate_route_map(
        activity_routes,
        activities,
        "activity routes",
    )
    event_route_keys = validate_route_map(
        event_routes,
        activities,
        "event routes",
        races_only=True,
    )
    expected_event_route_keys = {
        run_id
        for run_id in activity_route_keys
        if is_race_event(activities_by_id[run_id])
    }

    if event_route_keys != expected_event_route_keys:
        raise ValueError("event routes do not match routed race activities")
    if any(
        event_routes[run_id] != activity_routes[run_id] for run_id in event_route_keys
    ):
        raise ValueError("event routes must match their activity routes")


def main():
    if len(sys.argv) != 4:
        raise SystemExit(
            "usage: validate_activities.py "
            "<activities.json> <activity_routes.json> <event_routes.json>"
        )

    activities = json.loads(Path(sys.argv[1]).read_text())
    activity_routes = json.loads(Path(sys.argv[2]).read_text())
    event_routes = json.loads(Path(sys.argv[3]).read_text())
    validate_public_data(activities, activity_routes, event_routes)

    print(
        f"Validated {len(activities)} activities, "
        f"{len(activity_routes)} routes, and {len(event_routes)} event routes"
    )


if __name__ == "__main__":
    main()
