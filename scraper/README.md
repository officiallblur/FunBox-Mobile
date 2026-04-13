# FunBox Scraper (GitHub Actions + Playwright)

This service scrapes sitemap URLs from **net9jaseries.com** and **net9ja.com.ng**, extracts titles/posters/descriptions and direct download links, enriches metadata with TMDB, and writes results to Supabase.

## Environment Variables

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TMDB_API_KEY=
MAX_URLS=200
DRY_RUN=false
LASTMOD_DAYS=14
THROTTLE_SECONDS=1.2
JITTER_SECONDS=0.4
LOG_LEVEL=INFO
```

## GitHub Actions Setup

The repository now includes a scheduled workflow at `.github/workflows/funbox-scraper.yml`.

1. Open **GitHub -> your repo -> Settings -> Secrets and variables -> Actions**
2. Add **Repository secrets**:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TMDB_API_KEY`
3. Add **Repository variables** (optional, used as workflow defaults):
   - `SCRAPER_MAX_URLS`
   - `SCRAPER_DRY_RUN`
   - `SCRAPER_LASTMOD_DAYS`
   - `SCRAPER_THROTTLE_SECONDS`
   - `SCRAPER_JITTER_SECONDS`
   - `SCRAPER_LOG_LEVEL`
4. Open **Actions -> FunBox Scraper**
5. Use **Run workflow** for your first smoke test with:
   - `dry_run=true`
   - `max_urls=3`
   - `lastmod_days=0`
   - `log_level=DEBUG`
6. After the smoke test passes, run again with `dry_run=false`

## Run locally (optional)

```
python -m venv .venv
source .venv/bin/activate  # or .venv\\Scripts\\activate on Windows
pip install -r requirements.txt
python main.py
```

## Scheduled Runs

The GitHub Actions workflow is scheduled in **UTC**:

- `0 11,23 * * *`
- Lagos time: `12:00 PM` and `12:00 AM`

## Notes
- This uses the Supabase **service role key** and must run server-side only.
- Direct download links can expire; the scraper re-runs twice daily to refresh.
- If the sitemap provides `lastmod`, the scraper will skip pages older than `LASTMOD_DAYS` days.
- The mobile app still reads scraped links from Supabase, so switching the scheduler from Render to GitHub Actions does not require app-side Render URLs.
