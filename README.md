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
pnpm check:ci           # pnpm check + Python lint + Playwright smoke tests
pnpm test               # unit tests
pnpm test:e2e           # Playwright smoke tests
pnpm python:check       # Ruff checks for Python scripts
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

**Privacy note:** `src/static/activities.json` may contain route and location data. Treat it as public if this site is published.

## Environment

Frontend:

```text
VITE_MAPBOX_TOKEN        required
VITE_APP_LOCALE          optional, defaults to zh-CN
```

Strava sync:

```text
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
STRAVA_CLIENT_REFRESH_TOKEN
```

## Deploy

Vercel:

```text
Framework Preset: Vite
Build Command: pnpm build
Output Directory: dist
```

GitHub Pages is deployed by `.github/workflows/gh-pages.yml`; set Pages source to GitHub Actions.

Daily Strava sync is handled by `.github/workflows/run_data_sync.yml`.
