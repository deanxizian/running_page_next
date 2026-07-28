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


ACTIVITY_KEYS = [
    "run_id",
    "name",
    "distance",
    "moving_time",
    "type",
    "subtype",
    "workout_type",
    "start_date",
    "start_date_local",
    "location_country",
    "summary_polyline",
    "average_temp",
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
    subtype = Column(String)
    workout_type = Column(Integer)
    start_date = Column(String)
    start_date_local = Column(String)
    location_country = Column(String)
    summary_polyline = Column(String)
    average_temp = Column(Float)
    average_heartrate = Column(Float)
    average_speed = Column(Float)
    elevation_gain = Column(Float)
    streak = None

    def to_dict(self):
        out = {}
        for key in ACTIVITY_KEYS:
            attr = getattr(self, key)
            if isinstance(attr, (datetime.timedelta, datetime.datetime)):
                out[key] = str(attr)
            else:
                out[key] = attr

        out.update(activity_date_fields(out["start_date_local"]))

        if self.streak:
            out["streak"] = self.streak

        return out


def resolve_location_country(run_activity, current_location=None, prefer_current=True):
    strava_location = getattr(run_activity, "location_country", "") or ""
    if (
        prefer_current
        and current_location
        and current_location != "China"
        and strava_location in ("", "China")
    ):
        return current_location

    location_country = strava_location or current_location or ""
    start_point = getattr(run_activity, "start_latlng", None)
    should_reverse_geocode = start_point and (
        not location_country or location_country == "China"
    )

    if not should_reverse_geocode:
        return location_country

    cache_key = (round(start_point.lat, 4), round(start_point.lon, 4))
    if cache_key in _geocode_cache:
        return _geocode_cache[cache_key]

    for attempt in range(2):
        try:
            time.sleep(1)
            result = g.reverse(
                f"{start_point.lat}, {start_point.lon}",
                language="zh-CN",
                timeout=15,
            )
            resolved_location = str(result) if result else location_country
            _geocode_cache[cache_key] = resolved_location
            return resolved_location
        except Exception as exc:
            logger.warning(
                "Reverse geocode failed for %s,%s on attempt %s: %s",
                start_point.lat,
                start_point.lon,
                attempt + 1,
                exc,
            )

    return location_country


def update_or_create_activity(session, run_activity, refresh_locations=False):
    created = False
    activity = session.query(Activity).filter_by(run_id=int(run_activity.id)).first()
    workout_type = getattr(run_activity, "workout_type", None)
    average_temp = getattr(run_activity, "average_temp", None)

    current_elevation_gain = 0.0
    if (
        hasattr(run_activity, "total_elevation_gain")
        and run_activity.total_elevation_gain is not None
    ):
        current_elevation_gain = float(run_activity.total_elevation_gain)
    elif (
        hasattr(run_activity, "elevation_gain")
        and run_activity.elevation_gain is not None
    ):
        current_elevation_gain = float(run_activity.elevation_gain)

    if not activity:
        location_country = resolve_location_country(run_activity)

        activity = Activity(
            run_id=run_activity.id,
            name=run_activity.name,
            distance=run_activity.distance,
            moving_time=run_activity.moving_time,
            elapsed_time=run_activity.elapsed_time,
            type=run_activity.type,
            subtype=run_activity.subtype,
            workout_type=workout_type,
            start_date=run_activity.start_date,
            start_date_local=run_activity.start_date_local,
            location_country=location_country,
            average_temp=average_temp,
            average_heartrate=run_activity.average_heartrate,
            average_speed=float(run_activity.average_speed),
            elevation_gain=current_elevation_gain,
            summary_polyline=(
                run_activity.map and run_activity.map.summary_polyline or ""
            ),
        )
        session.add(activity)
        created = True
    else:
        current_location = activity.location_country
        if refresh_locations or not current_location or current_location == "China":
            location_country = resolve_location_country(
                run_activity,
                current_location,
                prefer_current=not refresh_locations,
            )
        else:
            location_country = current_location
        activity.name = run_activity.name
        activity.distance = float(run_activity.distance)
        activity.moving_time = run_activity.moving_time
        activity.elapsed_time = run_activity.elapsed_time
        activity.type = run_activity.type
        activity.subtype = run_activity.subtype
        activity.workout_type = workout_type
        activity.start_date = run_activity.start_date
        activity.start_date_local = run_activity.start_date_local
        activity.location_country = location_country
        activity.average_temp = average_temp
        activity.average_heartrate = run_activity.average_heartrate
        activity.average_speed = float(run_activity.average_speed)
        activity.elevation_gain = current_elevation_gain
        activity.summary_polyline = (
            run_activity.map and run_activity.map.summary_polyline or ""
        )

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
