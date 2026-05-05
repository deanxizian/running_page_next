import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path


REQUIRED_FIELDS = {
    "run_id": int,
    "name": str,
    "distance": (int, float),
    "moving_time": str,
    "type": str,
    "subtype": str,
    "start_date": str,
    "start_date_local": str,
    "start_time_local_ms": int,
    "month_key": str,
    "year_key": str,
    "average_speed": (int, float),
    "streak": int,
}

OPTIONAL_FIELDS = {
    "location_country": (str, type(None)),
    "summary_polyline": (str, type(None)),
    "average_heartrate": (int, float, type(None)),
    "elevation_gain": (int, float, type(None)),
}


def is_finite_number(value):
    return isinstance(value, (int, float)) and math.isfinite(value)


def local_start_fields(start_date_local):
    local_start = datetime.strptime(start_date_local, "%Y-%m-%d %H:%M:%S")
    # Must match generator semantics: local wall-clock timestamp for sorting,
    # not the activity's real UTC instant.
    return {
        "start_time_local_ms": int(
            local_start.replace(tzinfo=timezone.utc).timestamp() * 1000
        ),
        "month_key": local_start.strftime("%Y-%m"),
        "year_key": local_start.strftime("%Y"),
    }


def validate_activity(activity, index):
    if not isinstance(activity, dict):
        raise ValueError(f"activity[{index}] must be an object")

    for field, expected_type in REQUIRED_FIELDS.items():
        if field not in activity:
            raise ValueError(f"activity[{index}] missing required field {field}")
        if not isinstance(activity[field], expected_type):
            raise ValueError(f"activity[{index}].{field} has invalid type")

    for field, expected_type in OPTIONAL_FIELDS.items():
        if field in activity and not isinstance(activity[field], expected_type):
            raise ValueError(f"activity[{index}].{field} has invalid type")

    for field in (
        "distance",
        "average_speed",
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

    try:
        expected_dates = local_start_fields(activity["start_date_local"])
    except ValueError as exc:
        raise ValueError(
            f"activity[{index}].start_date_local is invalid"
        ) from exc

    for field, expected_value in expected_dates.items():
        if activity[field] != expected_value:
            raise ValueError(
                f"activity[{index}].{field} does not match start_date_local"
            )


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: validate_activities.py <activities.json>")

    path = Path(sys.argv[1])
    activities = json.loads(path.read_text())
    if not isinstance(activities, list):
        raise ValueError("activities file must contain a list")

    for index, activity in enumerate(activities):
        validate_activity(activity, index)

    print(f"Validated {len(activities)} activities")


if __name__ == "__main__":
    main()
