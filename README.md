# Running Page Next

Strava-backed running dashboard built as a Vite React SPA.

## Local Development

```bash
pnpm install
pnpm test:e2e:install
pip install -r requirements.txt
pnpm dev
```

Common checks:

```bash
pnpm typecheck
pnpm lint
pnpm format
pnpm test
pnpm test:e2e
pnpm python:check
pnpm build
pnpm check
```

`pnpm check` runs typecheck, lint, format check, tests, and production build.
`pnpm test:e2e` runs Playwright smoke tests for the primary routes and events modal.
`pnpm python:check` runs Ruff checks for the Strava sync scripts.

## Architecture

The frontend is organized by responsibility:

- `src/app`: router, layout, route-level data context.
- `src/entities`: domain data and pure logic. Activity parsing, validation, grouping, route helpers, formatting, and stats live under `src/entities/activity`.
- `src/features`: page-level features and their view models/components, such as home, events, and heatmap.
- `src/shared`: reusable hooks, UI primitives, map infrastructure, config, and theme tokens.
- `src/static`: generated static data and static geographic assets.

This project is not a Next.js app despite the repository name. It uses Vite, React Router, and static build output in `dist`.

## Data Pipeline

The running data flow is:

```text
Strava API
  -> SQLite sync cache: run_page/data.db
  -> generated frontend data: src/static/activities.json
  -> schema/date validation
  -> Vite frontend
```

`run_page/data.db` is a local/cache artifact and is not committed. `src/static/activities.json` is the committed frontend data output.

Useful data commands:

```bash
pnpm data:sync:strava
pnpm data:validate
pnpm data:clean
```

## Environment Variables

Frontend:

- `VITE_MAPBOX_TOKEN`: Mapbox token used by map views.
- `VITE_APP_LOCALE`: optional locale hint. Defaults to `zh-CN`.

Strava sync:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_CLIENT_REFRESH_TOKEN`

## Privacy

`src/static/activities.json` may contain route and location data derived from Strava activities. Treat it as publishable only if you are comfortable exposing those routes and locations in a static site.

## Deploy

### Vercel

- Framework Preset: `Vite`
- Build Command: `pnpm build`
- Output Directory: `dist`
- Root Directory: project root
- Node.js: `20.19+` locally, CI validates Node.js `24`.

Required Vercel environment variable:

- `VITE_MAPBOX_TOKEN`

### GitHub Pages

GitHub Pages is deployed by `.github/workflows/gh-pages.yml`.

Repository setting required for first deployment:

- `Settings -> Pages -> Source -> GitHub Actions`

Required GitHub variable or secret:

- `VITE_MAPBOX_TOKEN`

## Strava Sync

Daily Strava sync is handled by `.github/workflows/run_data_sync.yml`.

Required GitHub secrets:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_CLIENT_REFRESH_TOKEN`
