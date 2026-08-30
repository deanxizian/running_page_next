import datetime
import logging
import os
import time

from geopy.geocoders import Nominatim
from sqlalchemy import (
    Column,
    Float,
    Integer,
    Interval,
    String,
    create_engine,
    inspect,
    text,
)
from sqlalchemy.orm import DeclarativeBase, sessionmaker

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


NOMINATIM_USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "running_page_next")
g = Nominatim(user_agent=NOMINATIM_USER_AGENT)
_geocode_cache = {}
_geocode_requests_disabled = False

_WEATHER_INPUT_FIELDS = (
    "start_date_local",
    "elapsed_time",
    "moving_time",
    "summary_polyline",
)


PUBLIC_ACTIVITY_KEYS = [
    "run_id",
    "name",
    "distance",
    "moving_time",
    "workout_type",
    "start_date_local",
    "location_country",
    "summary_polyline",
    "weather_temperature",
    "average_heartrate",
    "average_speed",
    "elevation_gain",
]


def activity_date_fields(start_date_local):
    local_start = datetime.datetime.strptime(start_date_local, "%Y-%m-%d %H:%M:%S")
    # Derived from local wall-clock time for stable frontend sorting/grouping.
    # This is not intended to represent the activity's real UTC instant.
    return {
        "start_time_local_ms": int(
            local_start.replace(tzinfo=datetime.UTC).timestamp() * 1000
        ),
        "month_key": local_start.strftime("%Y-%m"),
        "year_key": local_start.strftime("%Y"),
    }


class Activity(Base):
    __tablename__ = "activities"

    run_id = Column(Integer, primary_key=True)
    name = Column(String)
    distance = Column(Float)
    moving_time = Column(Interval)
    elapsed_time = Column(Interval)
    type = Column(String)
    workout_type = Column(Integer)
    start_date = Column(String)
    start_date_local = Column(String)
    location_country = Column(String)
    summary_polyline = Column(String)
    weather_temperature = Column(Float)
    average_heartrate = Column(Float)
    average_speed = Column(Float)
    elevation_gain = Column(Float)

    def to_dict(self):
        out = {}
        for key in PUBLIC_ACTIVITY_KEYS:
            attr = getattr(self, key)
            if key == "weather_temperature" and attr is None:
                continue
            if isinstance(attr, (datetime.timedelta, datetime.datetime)):
                out[key] = str(attr)
            else:
                out[key] = attr

        out.update(activity_date_fields(out["start_date_local"]))

        return out


def reset_geocode_state():
    global _geocode_requests_disabled

    _geocode_cache.clear()
    _geocode_requests_disabled = False


def resolve_location_country(run_activity, current_location=None, force_refresh=False):
    global _geocode_requests_disabled

    strava_location = getattr(run_activity, "location_country", "") or ""
    if (
        not force_refresh
        and current_location
        and current_location != "China"
        and strava_location in ("", "China")
    ):
        return current_location

    location_country = strava_location or current_location or ""
    fallback_location = current_location or strava_location or ""
    start_point = getattr(run_activity, "start_latlng", None)
    should_reverse_geocode = start_point and (
        force_refresh or not location_country or location_country == "China"
    )

    if not should_reverse_geocode:
        return fallback_location if force_refresh else location_country

    if _geocode_requests_disabled:
        return fallback_location

    cache_key = (round(start_point.lat, 4), round(start_point.lon, 4))
    if cache_key in _geocode_cache:
        return _geocode_cache[cache_key] or fallback_location

    for attempt in range(2):
        try:
            time.sleep(1)
            result = g.reverse(
                f"{start_point.lat}, {start_point.lon}",
                language="zh-CN",
                timeout=15,
            )
            resolved_location = str(result) if result else None
            _geocode_cache[cache_key] = resolved_location
            return resolved_location or fallback_location
        except Exception as exc:
            logger.warning(
                "Reverse geocode failed for %s,%s on attempt %s: %s",
                start_point.lat,
                start_point.lon,
                attempt + 1,
                exc,
            )

    _geocode_cache[cache_key] = None
    _geocode_requests_disabled = True
    logger.warning("Reverse geocoding disabled for the remainder of this sync")
    return fallback_location


def _model_value(value):
    return getattr(value, "root", value)


def _text_value(value):
    value = _model_value(value)
    return str(value) if value is not None else ""


def _duration_value(value):
    if value is None or isinstance(value, datetime.timedelta):
        return value
    return datetime.timedelta(seconds=float(value))


def _datetime_value(value, *, local=False):
    if isinstance(value, datetime.datetime):
        if local:
            return value.replace(tzinfo=None).strftime("%Y-%m-%d %H:%M:%S")
        return str(value)
    return str(value)


def strava_activity_type(run_activity):
    return _text_value(getattr(run_activity, "type", ""))


def _activity_fields(run_activity):
    map_data = getattr(run_activity, "map", None)
    average_heartrate = getattr(run_activity, "average_heartrate", None)
    workout_type = getattr(run_activity, "workout_type", None)

    current_elevation_gain = getattr(run_activity, "total_elevation_gain", None)
    if current_elevation_gain is None:
        current_elevation_gain = getattr(run_activity, "elevation_gain", None)

    return {
        "name": run_activity.name,
        "distance": float(run_activity.distance),
        "moving_time": _duration_value(run_activity.moving_time),
        "elapsed_time": _duration_value(run_activity.elapsed_time),
        "type": strava_activity_type(run_activity),
        "workout_type": int(workout_type) if workout_type is not None else None,
        "start_date": _datetime_value(run_activity.start_date),
        "start_date_local": _datetime_value(
            run_activity.start_date_local,
            local=True,
        ),
        "average_heartrate": (
            float(average_heartrate) if average_heartrate is not None else None
        ),
        "average_speed": float(run_activity.average_speed),
        "elevation_gain": (
            float(current_elevation_gain) if current_elevation_gain is not None else 0.0
        ),
        "summary_polyline": (
            getattr(map_data, "summary_polyline", None) if map_data else ""
        )
        or "",
    }


def update_or_create_activity(session, run_activity, refresh_locations=False):
    created = False
    activity = session.query(Activity).filter_by(run_id=int(run_activity.id)).first()
    activity_fields = _activity_fields(run_activity)

    if not activity:
        location_country = resolve_location_country(run_activity)

        activity = Activity(
            run_id=run_activity.id,
            location_country=location_country,
            **activity_fields,
        )
        session.add(activity)
        created = True
    else:
        current_location = activity.location_country
        weather_inputs_changed = any(
            getattr(activity, field_name) != activity_fields[field_name]
            for field_name in _WEATHER_INPUT_FIELDS
        )
        if refresh_locations or not current_location or current_location == "China":
            location_country = resolve_location_country(
                run_activity,
                current_location,
                force_refresh=refresh_locations,
            )
        else:
            location_country = current_location
        activity.location_country = location_country
        for field_name, field_value in activity_fields.items():
            setattr(activity, field_name, field_value)
        if weather_inputs_changed:
            activity.weather_temperature = None

    return created


def add_missing_columns(engine, model):
    inspector = inspect(engine)
    table_name = model.__tablename__
    columns = {col["name"] for col in inspector.get_columns(table_name)}
    missing_columns = []

    for column in model.__table__.columns:
        if column.name not in columns:
            missing_columns.append(column)
    if missing_columns:
        with engine.begin() as conn:
            for column in missing_columns:
                column_type = str(column.type)
                statement = (
                    f"ALTER TABLE {table_name} ADD COLUMN {column.name} {column_type}"
                )
                conn.execute(text(statement))


def init_db(db_path):
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)

    # check missing columns
    add_missing_columns(engine, Activity)

    sm = sessionmaker(bind=engine)
    session = sm()
    # apply the changes
    session.commit()
    return session
