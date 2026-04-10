# FunBox Scraper (Render + Playwright)

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

## Run locally (optional)

```
python -m venv .venv
source .venv/bin/activate  # or .venv\\Scripts\\activate on Windows
pip install -r requirements.txt
python main.py
```

## Render Deployment (Cron Job)

1. Create a **new Render Cron Job**
2. Connect this repository
3. Environment: **Docker**
4. Schedule (UTC):
   - Lagos 12:00AM + 12:00PM = `0 23,11 * * *`
5. Add env vars above
6. (Optional) Set `LASTMOD_DAYS` to control how far back sitemap pages are scraped.

## Notes
- This uses the Supabase **service role key** and must run server-side only.
- Direct download links can expire; the scraper re-runs twice daily to refresh.
- If the sitemap provides `lastmod`, the scraper will skip pages older than `LASTMOD_DAYS` days.
