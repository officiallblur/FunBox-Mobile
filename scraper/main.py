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
from playwright.sync_api import sync_playwright
from requests_toolbelt.adapters.host_header_ssl import HostHeaderSSLAdapter

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
SCRAPER_USER_AGENT = os.getenv(
    "SCRAPER_USER_AGENT",
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
)
SUPABASE_WRITE_ATTEMPTS = int(os.getenv("SUPABASE_WRITE_ATTEMPTS", "5"))
SUPABASE_WRITE_BACKOFF_SECONDS = float(os.getenv("SUPABASE_WRITE_BACKOFF_SECONDS", "2"))
SUPABASE_DOH_ATTEMPTS = int(os.getenv("SUPABASE_DOH_ATTEMPTS", "2"))

EP_RE = re.compile(r"(?:S|Season)\s?(\d{1,2})[^\d]?(?:E|Episode)\s?(\d{1,3})", re.I)
SXXEYY = re.compile(r"S(\d{1,2})E(\d{1,3})", re.I)
RESOLUTION_ERROR_MARKERS = (
    "name or service not known",
    "err_name_not_resolved",
    "enotfound",
    "dns",
)
HOSTNAME_VARIANTS = {
    "net9jaseries.com": ["www.net9jaseries.com"],
    "www.net9jaseries.com": ["net9jaseries.com"],
    "net9ja.com.ng": ["www.net9ja.com.ng"],
    "www.net9ja.com.ng": ["net9ja.com.ng"],
}

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
session.headers.update(
    {
        "User-Agent": SCRAPER_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }
)
SUPABASE_REST_BASE = f"{SUPABASE_URL.rstrip('/')}/rest/v1" if SUPABASE_URL else ""
SUPABASE_HOST = urlparse(SUPABASE_URL).hostname or ""

supabase_ip_session = requests.Session()
supabase_ip_session.mount("https://", HostHeaderSSLAdapter(max_retries=retry))
supabase_ip_session.mount("http://", adapter)
supabase_ip_session.headers.update(
    {
        "User-Agent": SCRAPER_USER_AGENT,
        "Accept": "application/json",
    }
)
_supabase_ip_cache: list[str] = []


def fetch_xml(url: str) -> str:
    res = session.get(url, timeout=30)
    res.raise_for_status()
    return res.text


def resolve_hostname_via_doh(hostname: str) -> list[str]:
    if not hostname:
        return []
    if _supabase_ip_cache:
        return list(_supabase_ip_cache)

    providers = (
        (
            "google",
            "https://dns.google/resolve",
            {"name": hostname, "type": "A"},
            {"Accept": "application/json"},
        ),
        (
            "cloudflare",
            "https://cloudflare-dns.com/dns-query",
            {"name": hostname, "type": "A"},
            {"Accept": "application/dns-json"},
        ),
    )

    for provider_name, provider_url, params, headers in providers:
        for attempt in range(1, SUPABASE_DOH_ATTEMPTS + 1):
            try:
                response = session.get(provider_url, params=params, headers=headers, timeout=20)
                response.raise_for_status()
                payload = response.json()
                answers = payload.get("Answer") or []
                ips: list[str] = []
                for answer in answers:
                    if answer.get("type") == 1 and answer.get("data"):
                        ip = str(answer["data"]).strip()
                        if ip and ip not in ips:
                            ips.append(ip)
                if ips:
                    _supabase_ip_cache[:] = ips
                    logger.warning(
                        "Resolved %s via %s DoH fallback: %s",
                        hostname,
                        provider_name,
                        ", ".join(ips),
                    )
                    return list(_supabase_ip_cache)
            except Exception as exc:
                logger.warning(
                    "DoH lookup retry %s/%s via %s for %s failed: %s",
                    attempt,
                    SUPABASE_DOH_ATTEMPTS,
                    provider_name,
                    hostname,
                    exc,
                )
                if attempt < SUPABASE_DOH_ATTEMPTS:
                    time.sleep(attempt)

    return []


def build_ip_url(url: str, ip: str) -> str:
    parsed = urlparse(url)
    netloc = ip
    if parsed.port:
        netloc = f"{ip}:{parsed.port}"
    return parsed._replace(netloc=netloc).geturl()


def supabase_request_via_ip(
    method: str,
    url: str,
    *,
    params: dict | None = None,
    payload: list[dict] | None = None,
    headers: dict | None = None,
) -> list[dict] | None:
    host = urlparse(url).hostname or SUPABASE_HOST
    ips = resolve_hostname_via_doh(host)
    if not ips:
        raise RuntimeError(f"Unable to resolve {host} via DoH fallback.")

    last_exc: Exception | None = None
    for ip in ips:
        try:
            request_headers = dict(headers or {})
            request_headers["Host"] = host
            response = supabase_ip_session.request(
                method,
                build_ip_url(url, ip),
                params=params,
                json=payload,
                headers=request_headers,
                timeout=45,
            )
            response.raise_for_status()
            if not response.content:
                return None
            logger.warning("Supabase %s succeeded via IP fallback %s", method, ip)
            return response.json()
        except Exception as exc:
            last_exc = exc
            logger.warning("Supabase IP fallback via %s failed: %s", ip, exc)

    if last_exc:
        raise last_exc
    raise RuntimeError(f"Supabase IP fallback failed for {host}")


def supabase_request(
    method: str,
    table: str,
    *,
    params: dict | None = None,
    payload: list[dict] | None = None,
) -> list[dict] | None:
    if not SUPABASE_REST_BASE or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Missing Supabase REST configuration.")

    url = f"{SUPABASE_REST_BASE}/{table}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    last_exc: Exception | None = None
    for attempt in range(1, SUPABASE_WRITE_ATTEMPTS + 1):
        try:
            response = session.request(method, url, params=params, json=payload, headers=headers, timeout=45)
            response.raise_for_status()
            if not response.content:
                return None
            return response.json()
        except Exception as exc:
            last_exc = exc
            if is_resolution_error(exc):
                try:
                    return supabase_request_via_ip(
                        method,
                        url,
                        params=params,
                        payload=payload,
                        headers=headers,
                    )
                except Exception as fallback_exc:
                    last_exc = fallback_exc
            if attempt >= SUPABASE_WRITE_ATTEMPTS:
                break
            backoff = max(1.0, SUPABASE_WRITE_BACKOFF_SECONDS * attempt)
            logger.warning(
                "Supabase %s retry %s/%s for %s: %s",
                method,
                attempt,
                SUPABASE_WRITE_ATTEMPTS,
                table,
                exc,
            )
            time.sleep(backoff)

    if last_exc:
        raise last_exc
    raise RuntimeError(f"Supabase request failed for table {table}")


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


def should_scrape_url(url: str) -> bool:
    parsed = urlparse(url)
    path = parsed.path.strip("/")
    if not path:
        return False
    blocked_prefixes = (
        "category/",
        "tag/",
        "page/",
        "author/",
        "notice",
    )
    return not any(path.startswith(prefix) for prefix in blocked_prefixes)


def is_resolution_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(marker in message for marker in RESOLUTION_ERROR_MARKERS)


def build_candidate_urls(url: str) -> list[str]:
    parsed = urlparse(url)
    hosts = [parsed.netloc, *HOSTNAME_VARIANTS.get(parsed.netloc, [])]
    candidates: list[str] = []
    for host in hosts:
        if not host:
            continue
        candidate = parsed._replace(netloc=host).geturl()
        if candidate not in candidates:
            candidates.append(candidate)
    return candidates or [url]


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
                            if is_recent(grand.get("lastmod"), cutoff) and should_scrape_url(grand["loc"]):
                                urls.append(grand["loc"])
                            else:
                                logger.debug("Skipping stale url: %s", grand["loc"])
                    else:
                        if is_recent(child.get("lastmod"), cutoff) and should_scrape_url(child_loc):
                            urls.append(child_loc)
                        else:
                            logger.debug("Skipping stale url: %s", child_loc)
            else:
                if is_recent(entry.get("lastmod"), cutoff) and should_scrape_url(loc):
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
        text = a.get_text(" ", strip=True).lower()
        href_lower = href.lower()
        host = urlparse(href).netloc.replace("www.", "")
        if host in DOWNLOAD_HOSTS:
            if host in {"net9ja.com.ng", "net9jaseries.com"}:
                # Same-domain links are only useful when they clearly look like download targets.
                if not any(
                    marker in href_lower or marker in text
                    for marker in ("download", "480p", "720p", "1080p", "x264", "x265", "mkv", "mp4")
                ):
                    continue
            links.append(href)
        elif any(href.lower().endswith(ext) for ext in [".mkv", ".mp4", ".avi", ".m3u8"]):
            links.append(href)
    return list(dict.fromkeys(links))


def is_series_page(title: str, links: list[str]) -> bool:
    return "season" in title.lower() or len(links) > 1


def upsert_movie(payload: dict):
    if DRY_RUN:
        logger.info("DRY RUN movie: %s", payload)
        return
    existing = supabase_request(
        "GET",
        "download_links",
        params={"select": "id", "url": f"eq.{payload['url']}", "limit": "1"},
    )
    if existing:
        return
    supabase_request("POST", "download_links", payload=[payload])


def upsert_episode(payload: dict):
    if DRY_RUN:
        logger.info("DRY RUN episode: %s", payload)
        return
    existing = supabase_request(
        "GET",
        "series_links",
        params={"select": "id", "url": f"eq.{payload['url']}", "limit": "1"},
    )
    if existing:
        return
    supabase_request("POST", "series_links", payload=[payload])


def fetch_html_with_requests(url: str, attempts: int = 2) -> tuple[str, str]:
    last_exc: Exception | None = None
    for candidate in build_candidate_urls(url):
        for attempt in range(1, attempts + 1):
            try:
                response = session.get(candidate, timeout=45)
                response.raise_for_status()
                return response.text, response.url
            except Exception as exc:
                last_exc = exc
                if attempt >= attempts:
                    logger.warning("Requests failed for %s: %s", candidate, exc)
                    break
                backoff = min(2**attempt, 6)
                logger.warning("Requests retry %s/%s for %s: %s", attempt, attempts, candidate, exc)
                time.sleep(backoff)
        if last_exc and not is_resolution_error(last_exc):
            break
    if last_exc:
        raise last_exc
    raise RuntimeError(f"Failed to fetch page via requests: {url}")


def goto_with_retry(page, url: str, attempts: int = 2) -> tuple[str, str]:
    last_exc: Exception | None = None
    for candidate in build_candidate_urls(url):
        for attempt in range(1, attempts + 1):
            try:
                page.goto(candidate, wait_until="domcontentloaded", timeout=45000)
                try:
                    page.wait_for_load_state("networkidle", timeout=10000)
                except Exception:
                    # Some source pages keep background requests alive; DOM content is enough for parsing.
                    pass
                return page.content(), page.url
            except Exception as exc:
                last_exc = exc
                if attempt >= attempts:
                    logger.warning("Playwright failed for %s: %s", candidate, exc)
                    break
                backoff = min(2**attempt, 8)
                logger.warning("Playwright retry %s/%s for %s: %s", attempt, attempts, candidate, exc)
                time.sleep(backoff)
        if last_exc and not is_resolution_error(last_exc):
            break
    if last_exc:
        raise last_exc
    raise RuntimeError(f"Failed to fetch page via Playwright: {url}")


def throttle():
    base = max(0.0, THROTTLE_SECONDS)
    jitter = max(0.0, JITTER_SECONDS)
    if base == 0 and jitter == 0:
        return
    delay = base + (random.random() * jitter)
    time.sleep(delay)


def parse_page_payload(html: str) -> tuple[str, str, str | None, list[str]]:
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


def scrape_page(page, url: str) -> tuple[str, str, str | None, list[str]]:
    try:
        html, resolved_url = fetch_html_with_requests(url)
        title, description, poster, links = parse_page_payload(html)
        if title and links:
            if resolved_url != url:
                logger.info("Resolved %s via requests as %s", url, resolved_url)
            return title, description, poster, links
        logger.warning("Requests fetch for %s returned incomplete data; retrying with Playwright", resolved_url)
    except Exception as exc:
        logger.warning("Requests fetch failed for %s: %s", url, exc)

    html, resolved_url = goto_with_retry(page, url)
    title, description, poster, links = parse_page_payload(html)
    if resolved_url != url:
        logger.info("Resolved %s via Playwright as %s", url, resolved_url)
    return title, description, poster, links


def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Missing Supabase credentials.")

    urls = collect_urls()
    logger.info("Scraping %d urls...", len(urls))

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(user_agent=SCRAPER_USER_AGENT)
        for idx, url in enumerate(urls, 1):
            stage = "scrape"
            try:
                title, description, poster, links = scrape_page(page, url)
                if not title or not links:
                    logger.info("[%s/%s] Skip (missing title/links): %s", idx, len(urls), url)
                    throttle()
                    continue

                stage = "classify"
                series = is_series_page(title, links)
                source_domain = urlparse(url).netloc.replace("www.", "")

                if series:
                    stage = "tmdb-tv"
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
                        stage = f"upsert-episode:{link}"
                        upsert_episode(payload)
                else:
                    stage = "tmdb-movie"
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
                        stage = f"upsert-movie:{link}"
                        upsert_movie(payload)

                logger.info("[%s/%s] OK: %s", idx, len(urls), title)
                throttle()
            except Exception as e:
                logger.error("[%s/%s] FAIL %s during %s: %s", idx, len(urls), url, stage, e)
                throttle()

        browser.close()


if __name__ == "__main__":
    main()
