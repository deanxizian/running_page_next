import re
from collections.abc import Mapping

HALF_MARATHON_NAME_PATTERN = re.compile(r"半程|半马|half\s*marathon", re.IGNORECASE)
FULL_MARATHON_NAME_PATTERN = re.compile(r"全马|马拉松|marathon", re.IGNORECASE)
STRAVA_RACE_WORKOUT_TYPE = 1
HALF_MARATHON_DISTANCE_RANGE = (20_000, 23_000)
FULL_MARATHON_DISTANCE_RANGE = (40_000, 45_000)


def _activity_value(activity, field):
    if isinstance(activity, Mapping):
        return activity.get(field)
    return getattr(activity, field, None)


def _distance_category(distance):
    try:
        distance_value = float(distance)
    except (TypeError, ValueError):
        return None

    if (
        HALF_MARATHON_DISTANCE_RANGE[0]
        <= distance_value
        <= (HALF_MARATHON_DISTANCE_RANGE[1])
    ):
        return "half"
    if (
        FULL_MARATHON_DISTANCE_RANGE[0]
        <= distance_value
        <= (FULL_MARATHON_DISTANCE_RANGE[1])
    ):
        return "full"
    return None


def is_race_event(activity):
    """Match the frontend race rule for cached or exported activities."""
    if _activity_value(activity, "workout_type") == STRAVA_RACE_WORKOUT_TYPE:
        return True

    title = str(_activity_value(activity, "name") or "").strip()
    distance_category = _distance_category(_activity_value(activity, "distance"))
    is_half_by_name = bool(HALF_MARATHON_NAME_PATTERN.search(title))
    is_full_by_name = not is_half_by_name and bool(
        FULL_MARATHON_NAME_PATTERN.search(title)
    )

    return (is_half_by_name and distance_category == "half") or (
        is_full_by_name and distance_category == "full"
    )
