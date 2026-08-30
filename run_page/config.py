import os

# getting content root directory
current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(current)

SQL_FILE = os.path.join(parent, "run_page", "data.db")
JSON_FILE = os.path.join(parent, "src", "static", "activities.json")
ACTIVITY_ROUTES_JSON_FILE = os.path.join(
    parent, "src", "static", "activity_routes.json"
)
EVENT_ROUTES_JSON_FILE = os.path.join(parent, "src", "static", "event_routes.json")
