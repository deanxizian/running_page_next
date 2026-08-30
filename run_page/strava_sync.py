import argparse
import logging
import os
from pathlib import Path

from config import (
    ACTIVITY_ROUTES_JSON_FILE,
    EVENT_ROUTES_JSON_FILE,
    JSON_FILE,
    SQL_FILE,
)
from generator import Generator
from public_data import split_public_activities, write_json

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")


def write_private_text(path: str, value: str):
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    file_descriptor = os.open(
        output_path,
        os.O_WRONLY | os.O_CREAT | os.O_TRUNC,
        0o600,
    )
    os.fchmod(file_descriptor, 0o600)
    with os.fdopen(file_descriptor, "w") as output_file:
        output_file.write(value)


def run_strava_sync(
    client_id: str,
    client_secret: str,
    refresh_token: str,
    sync_types: list[str] | None = None,
    only_run: bool = False,
    force: bool = False,
    refresh_locations: bool = False,
    refresh_token_output: str | None = None,
):
    sync_types = sync_types or []
    generator = Generator(SQL_FILE)
    generator.set_strava_config(client_id, client_secret, refresh_token)
    # judge sync types is only running or not
    if not only_run and len(sync_types) == 1 and sync_types[0] == "running":
        only_run = True
    # if you want to refresh data change False to True
    generator.only_run = only_run
    latest_refresh_token = generator.sync(
        force,
        refresh_locations=refresh_locations,
        on_token_refreshed=(
            lambda token: (
                write_private_text(refresh_token_output, token)
                if refresh_token_output
                else None
            )
        ),
    )

    generator.enrich_race_weather()
    activities_list = generator.load()
    activity_metadata, activity_routes, event_routes = split_public_activities(
        activities_list
    )
    write_json(JSON_FILE, activity_metadata)
    write_json(ACTIVITY_ROUTES_JSON_FILE, activity_routes)
    write_json(EVENT_ROUTES_JSON_FILE, event_routes)

    return latest_refresh_token


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("client_id", help="strava client id")
    parser.add_argument("client_secret", help="strava client secret")
    parser.add_argument("refresh_token", help="strava refresh token")
    parser.add_argument(
        "--only-run",
        dest="only_run",
        action="store_true",
        help="if is only for running",
    )
    parser.add_argument(
        "--force",
        dest="force",
        action="store_true",
        help="sync all available Strava activities instead of recent activities only",
    )
    parser.add_argument(
        "--refresh-locations",
        dest="refresh_locations",
        action="store_true",
        help="refresh location_country for existing activities",
    )
    parser.add_argument(
        "--refresh-token-output",
        help="write the rotated refresh token to a permission-restricted file",
    )
    options = parser.parse_args()
    run_strava_sync(
        options.client_id,
        options.client_secret,
        options.refresh_token,
        only_run=options.only_run,
        force=options.force,
        refresh_locations=options.refresh_locations,
        refresh_token_output=options.refresh_token_output,
    )
