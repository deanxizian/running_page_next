# Running Page Next

Strava-backed running dashboard built with Vite, React Router, and static output in `dist`.

## Quick Start

```bash
pnpm install
pnpm dev
```

Local app: http://127.0.0.1:5173/

## Development

Install optional tooling for full checks:

```bash
pnpm test:e2e:install
pip install -r requirements.txt
```

Common checks:

```bash
pnpm check              # typecheck, lint, format check, unit tests, build
pnpm check:ci           # pnpm check + Python checks/tests + Playwright smoke tests
pnpm test               # unit tests
pnpm test:e2e           # Playwright smoke tests
pnpm python:check       # Ruff checks for Python scripts
pnpm python:test        # sync, privacy, and data validation tests
```

Data commands:

```bash
pnpm data:sync:strava   # sync Strava data
pnpm data:validate      # validate generated activities data
pnpm data:clean         # clean generated data
```

## Structure

```text
src/app        router and dashboard layout
src/entities   activity domain types, parsing, stats, formatting, routes
src/features   home, events, and heatmap pages
src/shared     reusable hooks, map code, config, UI, theme
src/static     generated activities data and static geo assets
run_page       Strava sync and data generation scripts
```

## Data

```text
Strava API -> run_page/data.db cache -> src/static/activities.json -> frontend
```

`run_page/data.db` is a local/cache artifact and is not committed.  
`src/static/activities.json` is the committed frontend data output.

Race events prefer Strava's `workout_type=1` marker. For legacy activities
without that marker, marathon titles are accepted only when the recorded
distance also matches a half marathon (20–23 km) or full marathon (40–45 km).

**Privacy note:** `src/static/activities.json` may contain route and location data. Treat it as public if this site is published.

## Environment

Frontend:

```text
VITE_APP_LOCALE          optional, defaults to zh-CN
```

Maps use the token-free MapCN stack: MapLibre GL with the CARTO dark-matter
basemap. There is no alternate Mapbox provider or frontend map token.

Strava sync:

```text
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
STRAVA_CLIENT_REFRESH_TOKEN
STRAVA_TOKEN_ROTATION_PAT
NOMINATIM_USER_AGENT       optional, defaults to running_page_next
IGNORE_START_END_RANGE     optional, metres hidden at each route end; defaults to 10
```

For GitHub Actions, set the optional values above as repository Variables, not
Secrets.

`STRAVA_TOKEN_ROTATION_PAT` is a fine-grained GitHub token that can update
repository Actions secrets. The sync workflow uses it only to persist a rotated
`STRAVA_CLIENT_REFRESH_TOKEN`.

Public export keeps only coarse administrative location text and hides the
configured cumulative route length from the beginning and end. It does not
remove later route points that pass the start again, and the SQLite cache keeps
the original route.

## Deploy

Vercel:

```text
Framework Preset: Vite
Build Command: pnpm build
Output Directory: dist
```

GitHub Pages is deployed by `.github/workflows/gh-pages.yml`; set Pages source to GitHub Actions.

Daily Strava sync is handled by `.github/workflows/run_data_sync.yml`. Days
2–31 use an incremental sync. The first day of each month performs a full sync,
refreshes existing locations, and removes stale cache records only after the
full Strava traversal succeeds.
