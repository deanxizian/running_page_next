import json
from pathlib import Path

from activity_rules import is_race_event


def split_public_activities(activities):
    """Separate lightweight activity metadata from route geometry."""
    activity_metadata = []
    activity_routes = {}
    event_routes = {}

    for activity in activities:
        metadata = dict(activity)
        summary_polyline = metadata.pop("summary_polyline", "") or ""
        activity_metadata.append(metadata)

        if not summary_polyline:
            continue

        route_key = str(metadata["run_id"])
        activity_routes[route_key] = summary_polyline
        if is_race_event(metadata):
            event_routes[route_key] = summary_polyline

    return activity_metadata, activity_routes, event_routes


def write_json(path, value):
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(value, ensure_ascii=True, separators=(",", ":")),
        encoding="utf-8",
    )
