# Running Page Next

Strava-backed running dashboard.

## Automation

- Strava sync: `.github/workflows/run_data_sync.yml` runs every day at `00:00` Asia/Shanghai and commits refreshed `run_page/data.db` plus `src/static/activities.json`.
- GitHub Pages: `.github/workflows/gh-pages.yml` deploys automatically on pushes to `main` or `master` that affect the site. The Strava sync workflow also dispatches it after committing refreshed data, because commits made with `GITHUB_TOKEN` do not fan out to normal push workflows. For the first deployment in a new repository, enable GitHub Pages in repository settings and set the source to GitHub Actions.
- Vercel: connect this GitHub repository in Vercel. Use build command `pnpm build` and output directory `dist`; Vercel will deploy on every push, including the daily Strava data commit.

Required GitHub secrets for Strava sync:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_CLIENT_REFRESH_TOKEN`

Local commands:

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run data:sync:strava
```
