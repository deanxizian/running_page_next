# Running Page Next

## Deploy

### Vercel

- Framework Preset: `Vite`
- Build Command: `pnpm build`
- Output Directory: `dist`
- Root Directory: project root
- Node.js: `20+`

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

The sync workflow updates `src/static/activities.json`, commits it to `main`, and triggers the site deployment.

## Local

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run data:sync:strava
```
