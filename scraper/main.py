import os
import re
import time
import logging
import random
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup
from supabase import create_client
from playwright.sync_api import sync_playwright

SITEMAPS = [
    "https://net9jaseries.com/sitemap_index.xml",
    "https://www.net9ja.com.ng/sitemap_index.xml",
]

DOWNLOAD_HOSTS = {
    "wildshare.net",
    "loadedfiles.org",
    "loadedfiles.net",
    "net9ja.com.ng",
    "net9jaseries.com",
}

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
MAX_URLS = int(os.getenv("MAX_URLS", "200"))
DRY_RUN = os.getenv("DRY_RUN", "false").lower() == "true"
LASTMOD_DAYS = int(os.getenv("LASTMOD_DAYS", "14"))
THROTTLE_SECONDS = float(os.getenv("THROTTLE_SECONDS", "1.2"))
JITTER_SECONDS = float(os.getenv("JITTER_SECONDS", "0.4"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

EP_RE = re.compile(r"(?:S|Season)\s?(\d{1,2})[^\d]?(?:E|Episode)\s?(\d{1,3})", re.I)
SXXEYY = re.compile(r"S(\d{1,2})E(\d{1,3})", re.I)

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("scraper")

session = requests.Session()
retry = Retry(
    total=3,
    backoff_factor=0.6,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET", "HEAD"],
)
adapter = HTTPAdapter(max_retries=retry)
session.mount("https://", adapter)
session.mount("http://", adapter)
session.headers.update({"User-Agent": "FunBoxScraper/1.0"})


def fetch_xml(url: str) -> str:
    res = session.get(url, timeout=30)
    res.raise_for_status()
    return res.text


def parse_lastmod(value: str | None) -> datetime | None:
    if not value:
        return None
    raw = value.strip()
    if not raw:
        return None
    try:
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        try:
            parsed = datetime.strptime(raw, "%Y-%m-%d")
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def is_recent(lastmod: str | None, cutoff: datetime | None) -> bool:
    if cutoff is None:
        return True
    parsed = parse_lastmod(lastmod)
    if parsed is None:
        return True
    return parsed >= cutoff


def parse_sitemap_entries(url: str) -> list[dict]:
    xml = fetch_xml(url)
    soup = BeautifulSoup(xml, "xml")
    entries: list[dict] = []

    sitemap_tags = soup.find_all("sitemap")
    if sitemap_tags:
        for tag in sitemap_tags:
            loc_tag = tag.find("loc")
            if not loc_tag:
                continue
            lastmod_tag = tag.find("lastmod")
            entries.append(
                {
                    "loc": loc_tag.get_text(strip=True),
                    "lastmod": lastmod_tag.get_text(strip=True) if lastmod_tag else None,
                    "is_sitemap": True,
                }
            )
        return entries

    url_tags = soup.find_all("url")
    if url_tags:
        for tag in url_tags:
            loc_tag = tag.find("loc")
            if not loc_tag:
                continue
            lastmod_tag = tag.find("lastmod")
            entries.append(
                {
                    "loc": loc_tag.get_text(strip=True),
                    "lastmod": lastmod_tag.get_text(strip=True) if lastmod_tag else None,
                    "is_sitemap": False,
                }
            )
        return entries

    for loc in soup.find_all("loc"):
        entries.append({"loc": loc.get_text(strip=True), "lastmod": None, "is_sitemap": False})
    return entries


def collect_urls() -> list[str]:
    urls: list[str] = []
    cutoff = None
    if LASTMOD_DAYS > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=LASTMOD_DAYS)
        logger.info("Lastmod filter enabled: %s days (cutoff %s)", LASTMOD_DAYS, cutoff.date())
    else:
        logger.info("Lastmod filter disabled (LASTMOD_DAYS <= 0)")

    for sitemap in SITEMAPS:
        logger.info("Fetching sitemap index: %s", sitemap)
        entries = parse_sitemap_entries(sitemap)
        for entry in entries:
            loc = entry["loc"]
            is_sitemap = entry.get("is_sitemap") or loc.endswith(".xml")
            if is_sitemap:
                if not is_recent(entry.get("lastmod"), cutoff):
                    logger.info("Skipping stale sitemap: %s", loc)
                    continue
                child_entries = parse_sitemap_entries(loc)
                for child in child_entries:
                    child_loc = child["loc"]
                    child_is_sitemap = child.get("is_sitemap") or child_loc.endswith(".xml")
                    if child_is_sitemap:
                        if not is_recent(child.get("lastmod"), cutoff):
                            logger.info("Skipping stale child sitemap: %s", child_loc)
                            continue
                        for grand in parse_sitemap_entries(child_loc):
                            if is_recent(grand.get("lastmod"), cutoff):
                                urls.append(grand["loc"])
                            else:
                                logger.debug("Skipping stale url: %s", grand["loc"])
                    else:
                        if is_recent(child.get("lastmod"), cutoff):
                            urls.append(child_loc)
                        else:
                            logger.debug("Skipping stale url: %s", child_loc)
            else:
                if is_recent(entry.get("lastmod"), cutoff):
                    urls.append(loc)
                else:
                    logger.debug("Skipping stale url: %s", loc)

    unique = list(dict.fromkeys(urls))
    if MAX_URLS > 0:
        unique = unique[:MAX_URLS]
    logger.info("Collected %d urls (limit=%s)", len(unique), MAX_URLS)
    return unique


def tmdb_search(kind: str, title: str) -> dict | None:
    if not TMDB_API_KEY or not title:
        return None
    endpoint = "movie" if kind == "movie" else "tv"
    url = f"https://api.themoviedb.org/3/search/{endpoint}?api_key={TMDB_API_KEY}&query={title}"
    res = session.get(url, timeout=20)
    if not res.ok:
        return None
    data = res.json()
    if not data.get("results"):
        return None
    return data["results"][0]


def tmdb_poster(path: str | None) -> str | None:
    if not path:
        return None
    return f"https://image.tmdb.org/t/p/w500{path}"


def clean_title(title: str | None) -> str:
    if not title:
        return ""
    return title.replace("Download", "").replace("|", "").strip()


def detect_episode_info(text: str | None) -> tuple[int | None, int | None]:
    if not text:
        return None, None
    match = EP_RE.search(text) or SXXEYY.search(text)
    if match:
        return int(match.group(1)), int(match.group(2))
    return None, None


def extract_links(soup: BeautifulSoup) -> list[str]:
    links: list[str] = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        host = urlparse(href).netloc.replace("www.", "")
        if host in DOWNLOAD_HOSTS:
            links.append(href)
        elif any(href.lower().endswith(ext) for ext in [".mkv", ".mp4", ".avi", ".m3u8"]):
            links.append(href)
    return list(dict.fromkeys(links))


def is_series_page(title: str, links: list[str]) -> bool:
    return "season" in title.lower() or len(links) > 1


def upsert_movie(supabase, payload: dict):
    if DRY_RUN:
        logger.info("DRY RUN movie: %s", payload)
        return
    existing = supabase.table("download_links").select("id").eq("url", payload["url"]).limit(1).execute()
    if existing.data:
        return
    supabase.table("download_links").insert(payload).execute()


def upsert_episode(supabase, payload: dict):
    if DRY_RUN:
        logger.info("DRY RUN episode: %s", payload)
        return
    existing = supabase.table("series_links").select("id").eq("url", payload["url"]).limit(1).execute()
    if existing.data:
        return
    supabase.table("series_links").insert(payload).execute()


def goto_with_retry(page, url: str, attempts: int = 3):
    for attempt in range(1, attempts + 1):
        try:
            page.goto(url, wait_until="networkidle", timeout=45000)
            return
        except Exception as exc:
            if attempt >= attempts:
                raise
            backoff = min(2**attempt, 8)
            logger.warning("Playwright retry %s/%s for %s: %s", attempt, attempts, url, exc)
            time.sleep(backoff)


def throttle():
    base = max(0.0, THROTTLE_SECONDS)
    jitter = max(0.0, JITTER_SECONDS)
    if base == 0 and jitter == 0:
        return
    delay = base + (random.random() * jitter)
    time.sleep(delay)


def scrape_page(page, url: str) -> tuple[str, str, str | None, list[str]]:
    goto_with_retry(page, url)
    html = page.content()
    soup = BeautifulSoup(html, "lxml")

    title = clean_title(
        (soup.find("h1").get_text(strip=True) if soup.find("h1") else "")
        or (soup.find("meta", property="og:title") or {}).get("content", "")
    )

    description = ""
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if meta_desc and meta_desc.get("content"):
        description = meta_desc["content"]

    poster = None
    og_img = soup.find("meta", property="og:image")
    if og_img and og_img.get("content"):
        poster = og_img["content"]

    links = extract_links(soup)
    return title, description, poster, links


def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Missing Supabase credentials.")

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    urls = collect_urls()
    logger.info("Scraping %d urls...", len(urls))

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        for idx, url in enumerate(urls, 1):
            try:
                title, description, poster, links = scrape_page(page, url)
                if not title or not links:
                    logger.info("[%s/%s] Skip (missing title/links): %s", idx, len(urls), url)
                    throttle()
                    continue

                series = is_series_page(title, links)
                source_domain = urlparse(url).netloc.replace("www.", "")

                if series:
                    tmdb = tmdb_search("tv", title)
                    tv_id = tmdb["id"] if tmdb else None
                    poster_url = tmdb_poster(tmdb.get("poster_path")) if tmdb else poster

                    for link in links:
                        season, episode = detect_episode_info(link)
                        if season is None or episode is None:
                            season, episode = detect_episode_info(title)

                        payload = {
                            "tv_id": tv_id,
                            "series_title": title,
                            "season_number": season,
                            "episode_number": episode,
                            "title": title,
                            "url": link,
                            "poster": poster_url,
                            "source": source_domain,
                        }
                        upsert_episode(supabase, payload)
                else:
                    tmdb = tmdb_search("movie", title)
                    movie_id = tmdb["id"] if tmdb else None
                    poster_url = tmdb_poster(tmdb.get("poster_path")) if tmdb else poster

                    for link in links:
                        payload = {
                            "title": title,
                            "url": link,
                            "poster": poster_url,
                            "movie_id": movie_id,
                        }
                        upsert_movie(supabase, payload)

                logger.info("[%s/%s] OK: %s", idx, len(urls), title)
                throttle()
            except Exception as e:
                logger.error("[%s/%s] FAIL %s: %s", idx, len(urls), url, e)
                throttle()

        browser.close()


if __name__ == "__main__":
    main()
