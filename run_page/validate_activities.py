import json
import math
import sys
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

    for field in ("distance", "average_speed", "average_heartrate", "elevation_gain"):
        if field in activity and activity[field] is not None and not is_finite_number(activity[field]):
            raise ValueError(f"activity[{index}].{field} must be finite")

    if len(activity["start_date_local"]) < 10:
        raise ValueError(f"activity[{index}].start_date_local is invalid")


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
