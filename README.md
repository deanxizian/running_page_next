# Running Page Next

A public Strava running dashboard built with Vite, React, and MapCN.

## Local Development

Requires Node 24 and pnpm 8.9.0.

```bash
pnpm install
pnpm dev
```

Local URL: http://127.0.0.1:5173/

Full checks also require the Python dependencies and Playwright:

```bash
pip install -r requirements.txt
pnpm test:e2e:install
```

## Commands

```bash
pnpm check              # Frontend checks, tests, and build
pnpm check:ci           # Full CI checks
pnpm test               # Frontend unit tests
pnpm test:e2e           # Playwright tests
pnpm python:check       # Python formatting and linting
pnpm python:test        # Python tests
pnpm data:sync:strava   # Sync Strava data
pnpm data:validate      # Validate activity data
```

## Structure

```text
src/app        Routes and layout
src/entities   Activity domain logic
src/features   Home, heatmap, and event pages
src/shared     Shared UI, maps, config, and hooks
src/static     Activity data and geographic assets
run_page       Strava sync and data validation
```

## Data

```text
Strava API -> run_page/data.db -> src/static/activities.json -> Vite build
```

`run_page/data.db` is a local cache and is not committed. `src/static/activities.json` is committed and should be treated as public data.

## Configuration

Repository Secrets:

```text
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
STRAVA_CLIENT_REFRESH_TOKEN
STRAVA_TOKEN_ROTATION_PAT
```

Optional Repository Variables:

```text
NOMINATIM_USER_AGENT       defaults to running_page_next
IGNORE_START_END_RANGE     defaults to 10 metres
```

Maps use the token-free MapCN stack with MapLibre GL and the CARTO dark-matter basemap.

## Deployment

- Vercel: build command `pnpm build`, output directory `dist`.
- GitHub Pages: deployed by `.github/workflows/gh-pages.yml`.
- Strava data: synced daily by `.github/workflows/run_data_sync.yml`; full sync on the first day of each month and incremental sync on other days.
