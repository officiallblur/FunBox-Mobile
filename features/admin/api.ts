import { buildBackendUrl, getBackendBaseUrl, isBackendConfigured } from '@/lib/backend';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';
import { searchMovie, searchTv, tmdbImage } from '@/lib/tmdb';

import type {
  AppUser,
  DownloadLink,
  MovieGroup,
  ScraperActionResponse,
  ScraperResolveResponse,
  SeriesGroup,
  SeriesLink,
  TmdbMovieResult,
  TmdbSeriesResult,
} from './types';

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? 'ce1a0db13c99a45fd7effb86ab82f78f';

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = json?.error || json?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return json as T;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, any>,
  token?: string | null
): Promise<T> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const client = requireSupabase();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const { data, error } = await client.functions.invoke(name, {
    body,
    headers: Object.keys(headers).length ? headers : undefined,
  });

  if (error) {
    throw error;
  }
  return data as T;
}

export async function fetchUsers() {
  const client = requireSupabase();
  const { data, error } = await client.from('users').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AppUser[];
}

export async function toggleUserRole(id: string, currentRole: string | null | undefined) {
  const client = requireSupabase();
  const nextRole = currentRole === 'admin' ? 'user' : 'admin';
  const { error } = await client.from('users').update({ role: nextRole }).eq('id', id);
  if (error) throw error;
}

export async function deleteUserRow(id: string) {
  const client = requireSupabase();
  const { error } = await client.from('users').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchDownloadLinks() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('download_links')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DownloadLink[];
}

export async function fetchSeriesLinks() {
  const client = requireSupabase();
  const { data, error } = await client.from('series_links').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SeriesLink[];
}

export async function insertDownloadLinks(payload: Array<Partial<DownloadLink>>) {
  const client = requireSupabase();
  const { error } = await client.from('download_links').insert(payload as any);
  if (error) throw error;
}

export async function insertSeriesLinks(payload: Array<Partial<SeriesLink>>) {
  const client = requireSupabase();
  const { error } = await client.from('series_links').insert(payload as any);
  if (error) throw error;
}

export async function deleteDownloadLink(id: number) {
  const client = requireSupabase();
  const { error } = await client.from('download_links').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteSeriesLink(id: number) {
  const client = requireSupabase();
  const { error } = await client.from('series_links').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteDownloadLinksByIds(ids: number[]) {
  for (const id of ids) {
    await deleteDownloadLink(id);
  }
}

export async function deleteSeriesLinksByIds(ids: number[]) {
  for (const id of ids) {
    await deleteSeriesLink(id);
  }
}

export async function groupMovieLinks(rows: DownloadLink[]) {
  const map = new Map<string, MovieGroup>();
  rows.forEach((row) => {
    const key = row.movie_id != null ? String(row.movie_id) : `no_movie_${row.id}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        movie_id: row.movie_id ?? null,
        title: row.movie_id ? 'Loading...' : row.title || 'Unknown',
        poster: null,
        links: [],
      });
    }
    map.get(key)?.links.push(row);
  });

  const groups = Array.from(map.values());
  const movieIds = groups.filter((g) => g.movie_id).map((g) => Number(g.movie_id));
  await Promise.all(
    movieIds.map(async (id) => {
      try {
        const json = await requestJson<any>(
          `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}&language=en-US`
        );
        const group = map.get(String(id));
        if (group && !json.status_code) {
          group.title = json.title || json.name || group.title;
          group.poster = json.poster_path ? tmdbImage(json.poster_path, 'w200') : null;
        }
      } catch {}
    })
  );

  return Array.from(map.values());
}

export async function groupSeriesLinks(rows: SeriesLink[]) {
  const map = new Map<string, SeriesGroup>();
  rows.forEach((row) => {
    const key = row.tv_id != null ? String(row.tv_id) : `no_series_${row.id}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        tv_id: row.tv_id ?? null,
        title: row.tv_id ? 'Loading...' : row.series_title || row.title || 'Unknown',
        poster: null,
        links: [],
      });
    }
    map.get(key)?.links.push(row);
  });

  const groups = Array.from(map.values());
  const tvIds = groups.filter((g) => g.tv_id).map((g) => Number(g.tv_id));
  await Promise.all(
    tvIds.map(async (id) => {
      try {
        const json = await requestJson<any>(
          `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=en-US`
        );
        const group = map.get(String(id));
        if (group && !json.status_code) {
          group.title = json.name || group.title;
          group.poster = json.poster_path ? tmdbImage(json.poster_path, 'w200') : null;
        }
      } catch {}
    })
  );

  return Array.from(map.values());
}

export async function searchTmdbMovies(query: string) {
  if (query.trim().length < 2) return [];

  if (isBackendConfigured()) {
    try {
      const url = buildBackendUrl('/api/tmdb/search', { query, type: 'movie' });
      const json = await requestJson<{ results?: TmdbMovieResult[] }>(url);
      return (json.results ?? []).filter((item) => item.media_type === 'movie' || !item.media_type);
    } catch {}
  }

  const json = await searchMovie(query);
  return (json.results ?? []) as TmdbMovieResult[];
}

export async function searchTmdbSeries(query: string) {
  if (query.trim().length < 2) return [];

  if (isBackendConfigured()) {
    try {
      const url = buildBackendUrl('/api/tmdb/search', { query, type: 'tv' });
      const json = await requestJson<{ results?: TmdbSeriesResult[] }>(url);
      return (json.results ?? []).filter(
        (item) => item.media_type === 'tv' || (!item.media_type && (item.name || item.first_air_date))
      );
    } catch {}
  }

  const json = await searchTv(query);
  return (json.results ?? []) as TmdbSeriesResult[];
}

export async function getSessionAccessToken() {
  const client = requireSupabase();
  const { data } = await client.auth.getSession();
  return data?.session?.access_token ?? null;
}

export async function scrapeMovie(movieId: number, movieTitle: string, token: string) {
  if (isBackendConfigured()) {
    const url = buildBackendUrl('/api/scraper/movie');
    return requestJson<ScraperActionResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ movieId, movieTitle }),
    });
  }

  return invokeEdgeFunction<ScraperActionResponse>('scraper-movie', { movieId, movieTitle }, token);
}

export async function scrapeEpisode(
  tvId: number,
  seriesTitle: string,
  season: number,
  episode: number,
  token: string
) {
  if (isBackendConfigured()) {
    const url = buildBackendUrl('/api/scraper/episode');
    return requestJson<ScraperActionResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tvId, seriesTitle, season, episode }),
    });
  }

  return invokeEdgeFunction<ScraperActionResponse>(
    'scraper-episode',
    { tvId, seriesTitle, season, episode },
    token
  );
}

export async function resolveScraper(payload: Record<string, any>, token?: string | null) {
  if (isBackendConfigured()) {
    const url = buildBackendUrl('/api/scraper/resolve');
    return requestJson<ScraperResolveResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
  }

  return invokeEdgeFunction<ScraperResolveResponse>('scraper-resolve', payload, token);
}

export async function pollForInserts(
  ids: number[],
  table: 'download_links' | 'series_links',
  idColumn: 'movie_id' | 'tv_id',
  attempts = 8,
  delayMs = 1000
) {
  const client = requireSupabase();
  const pending = new Set(ids.filter(Boolean).map(Number));
  for (let attempt = 0; attempt < attempts && pending.size > 0; attempt += 1) {
    for (const id of Array.from(pending)) {
      const { data } = await client.from(table).select('id').eq(idColumn, id).limit(1);
      if (Array.isArray(data) && data.length > 0) {
        pending.delete(id);
      }
    }
    if (pending.size > 0) {
      await sleep(delayMs);
    }
  }
  return Array.from(pending);
}

export function parseEpisodeInput(value: string) {
  const set = new Set<number>();
  const chunks = value
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  chunks.forEach((chunk) => {
    if (chunk.includes('-')) {
      const [a, b] = chunk.split('-').map((s) => Number(s.trim()));
      if (!Number.isNaN(a) && !Number.isNaN(b) && a > 0 && b >= a) {
        for (let i = a; i <= b; i += 1) set.add(i);
      }
      return;
    }
    const n = Number(chunk);
    if (!Number.isNaN(n) && n > 0) set.add(n);
  });

  return Array.from(set).sort((a, b) => a - b);
}

export function getBackendStatusText() {
  if (isBackendConfigured()) {
    return getBackendBaseUrl();
  }
  if (isSupabaseConfigured) {
    return 'Supabase Edge Functions';
  }
  return 'Not configured';
}
