import { useCallback, useEffect, useRef, useState } from 'react';

import {
  deleteDownloadLink,
  deleteDownloadLinksByIds,
  deleteSeriesLink,
  deleteSeriesLinksByIds,
  deleteUserRow,
  fetchDownloadLinks,
  fetchSeriesLinks,
  fetchUsers,
  getSessionAccessToken,
  groupMovieLinks,
  groupSeriesLinks,
  insertDownloadLinks,
  insertSeriesLinks,
  parseEpisodeInput,
  pollForInserts,
  resolveScraper,
  scrapeEpisode,
  scrapeMovie,
  searchTmdbMovies,
  searchTmdbSeries,
  toggleUserRole,
} from '../api';
import type {
  AdminMessage,
  AdminMessageType,
  AppUser,
  DownloadLink,
  MovieGroup,
  SeriesGroup,
  SeriesLink,
  TmdbMovieResult,
  TmdbSeriesResult,
} from '../types';

type MessageCallback = (message: AdminMessage) => void;

export function useAdminData() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [movieLinks, setMovieLinks] = useState<DownloadLink[]>([]);
  const [movieGroups, setMovieGroups] = useState<MovieGroup[]>([]);
  const [loadingMovieLinks, setLoadingMovieLinks] = useState(true);

  const [seriesLinks, setSeriesLinks] = useState<SeriesLink[]>([]);
  const [seriesGroups, setSeriesGroups] = useState<SeriesGroup[]>([]);
  const [loadingSeriesLinks, setLoadingSeriesLinks] = useState(true);

  const [tmdbMovieResults, setTmdbMovieResults] = useState<TmdbMovieResult[]>([]);
  const [tmdbSeriesResults, setTmdbSeriesResults] = useState<TmdbSeriesResult[]>([]);
  const [tmdbMovieLoading, setTmdbMovieLoading] = useState(false);
  const [tmdbSeriesLoading, setTmdbSeriesLoading] = useState(false);

  const [message, setMessage] = useState<AdminMessage>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = useCallback((text: string, type: AdminMessageType = 'success') => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    const value = { text, type } as const;
    setMessage(value);
    messageTimer.current = setTimeout(() => setMessage(null), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, []);

  const refreshUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      setUsers(await fetchUsers());
    } catch (error: any) {
      console.error(error);
      emit(error?.message || 'Failed loading users', 'error');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [emit]);

  const refreshMovieLinks = useCallback(async () => {
    setLoadingMovieLinks(true);
    try {
      const links = await fetchDownloadLinks();
      setMovieLinks(links);
      setMovieGroups(await groupMovieLinks(links));
    } catch (error: any) {
      console.error(error);
      emit(error?.message || 'Failed loading links', 'error');
      setMovieLinks([]);
      setMovieGroups([]);
    } finally {
      setLoadingMovieLinks(false);
    }
  }, [emit]);

  const refreshSeriesLinks = useCallback(async () => {
    setLoadingSeriesLinks(true);
    try {
      const links = await fetchSeriesLinks();
      setSeriesLinks(links);
      setSeriesGroups(await groupSeriesLinks(links));
    } catch (error: any) {
      console.error(error);
      emit(error?.message || 'Failed loading series links', 'error');
      setSeriesLinks([]);
      setSeriesGroups([]);
    } finally {
      setLoadingSeriesLinks(false);
    }
  }, [emit]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshUsers(), refreshMovieLinks(), refreshSeriesLinks()]);
  }, [refreshUsers, refreshMovieLinks, refreshSeriesLinks]);

  const searchMovies = useCallback(
    async (query: string) => {
      setTmdbMovieLoading(true);
      try {
        const results = await searchTmdbMovies(query);
        setTmdbMovieResults(results);
      } catch (error: any) {
        console.error(error);
        emit(error?.message || 'TMDB movie search failed', 'error');
        setTmdbMovieResults([]);
      } finally {
        setTmdbMovieLoading(false);
      }
    },
    [emit]
  );

  const searchSeries = useCallback(
    async (query: string) => {
      setTmdbSeriesLoading(true);
      try {
        const results = await searchTmdbSeries(query);
        setTmdbSeriesResults(results);
      } catch (error: any) {
        console.error(error);
        emit(error?.message || 'TMDB series search failed', 'error');
        setTmdbSeriesResults([]);
      } finally {
        setTmdbSeriesLoading(false);
      }
    },
    [emit]
  );

  const changeRole = useCallback(
    async (id: string, role: string | null | undefined) => {
      try {
        await toggleUserRole(id, role);
        emit('Role updated');
        await refreshUsers();
      } catch (error: any) {
        emit(error?.message || 'Failed updating role', 'error');
      }
    },
    [emit, refreshUsers]
  );

  const removeUser = useCallback(
    async (id: string) => {
      try {
        await deleteUserRow(id);
        emit('User deleted');
        await refreshUsers();
      } catch (error: any) {
        emit(error?.message || 'Failed deleting user', 'error');
      }
    },
    [emit, refreshUsers]
  );

  const addMovieLinks = useCallback(
    async (payload: Array<Partial<DownloadLink>>) => {
      try {
        await insertDownloadLinks(payload);
        emit(`Added ${payload.length} movie link(s)`);
        await refreshMovieLinks();
      } catch (error: any) {
        emit(error?.message || 'Failed adding movie links', 'error');
      }
    },
    [emit, refreshMovieLinks]
  );

  const addSeriesLinks = useCallback(
    async (payload: Array<Partial<SeriesLink>>) => {
      try {
        await insertSeriesLinks(payload);
        emit(`Added ${payload.length} series link(s)`);
        await refreshSeriesLinks();
      } catch (error: any) {
        emit(error?.message || 'Failed adding series links', 'error');
      }
    },
    [emit, refreshSeriesLinks]
  );

  const removeMovieLink = useCallback(
    async (id: number) => {
      try {
        await deleteDownloadLink(id);
        emit('Movie link deleted');
        await refreshMovieLinks();
      } catch (error: any) {
        emit(error?.message || 'Failed deleting movie link', 'error');
      }
    },
    [emit, refreshMovieLinks]
  );

  const removeSeriesLink = useCallback(
    async (id: number) => {
      try {
        await deleteSeriesLink(id);
        emit('Series link deleted');
        await refreshSeriesLinks();
      } catch (error: any) {
        emit(error?.message || 'Failed deleting series link', 'error');
      }
    },
    [emit, refreshSeriesLinks]
  );

  const removeManyMovieLinks = useCallback(
    async (ids: number[]) => {
      try {
        await deleteDownloadLinksByIds(ids);
        emit(`Deleted ${ids.length} movie link(s)`);
        await refreshMovieLinks();
      } catch (error: any) {
        emit(error?.message || 'Failed deleting selected movie links', 'error');
      }
    },
    [emit, refreshMovieLinks]
  );

  const removeManySeriesLinks = useCallback(
    async (ids: number[]) => {
      try {
        await deleteSeriesLinksByIds(ids);
        emit(`Deleted ${ids.length} series link(s)`);
        await refreshSeriesLinks();
      } catch (error: any) {
        emit(error?.message || 'Failed deleting selected series links', 'error');
      }
    },
    [emit, refreshSeriesLinks]
  );

  const scrapeSingleMovie = useCallback(
    async (movieId: number, movieTitle: string) => {
      try {
        const token = await getSessionAccessToken();
        if (!token) throw new Error('Authentication required');
        const result = await scrapeMovie(movieId, movieTitle, token);
        emit(`Found ${result?.count || 0} link(s) for ${movieTitle}`);
        await pollForInserts([movieId], 'download_links', 'movie_id');
        await refreshMovieLinks();
      } catch (error: any) {
        emit(error?.message || 'Movie scraping failed', 'error');
      }
    },
    [emit, refreshMovieLinks]
  );

  const scrapeMovieGroups = useCallback(
    async (groups: MovieGroup[]) => {
      try {
        const token = await getSessionAccessToken();
        if (!token) throw new Error('Authentication required');

        let total = 0;
        const ids: number[] = [];
        for (const group of groups) {
          if (!group.movie_id) continue;
          const result = await scrapeMovie(group.movie_id, group.title, token);
          total += result?.count || 0;
          ids.push(group.movie_id);
        }
        emit(`Finished scraping movies. Found ${total} link(s).`);
        if (ids.length > 0) {
          await pollForInserts(ids, 'download_links', 'movie_id');
        }
        await refreshMovieLinks();
      } catch (error: any) {
        emit(error?.message || 'Bulk movie scraping failed', 'error');
      }
    },
    [emit, refreshMovieLinks]
  );

  const scrapeSeriesEpisodes = useCallback(
    async (tvId: number, title: string, season: number, episodes: number[]) => {
      try {
        const token = await getSessionAccessToken();
        if (!token) throw new Error('Authentication required');

        let total = 0;
        for (const episode of episodes) {
          const result = await scrapeEpisode(tvId, title, season, episode, token);
          total += result?.count || 0;
        }
        emit(`Scrape complete. Found ${total} link(s).`);
        await pollForInserts([tvId], 'series_links', 'tv_id');
        await refreshSeriesLinks();
      } catch (error: any) {
        emit(error?.message || 'Series scraping failed', 'error');
      }
    },
    [emit, refreshSeriesLinks]
  );

  const scrapeSeriesGroupBulk = useCallback(
    async (groups: SeriesGroup[], season: number, episode: number) => {
      try {
        const token = await getSessionAccessToken();
        if (!token) throw new Error('Authentication required');

        let total = 0;
        const ids: number[] = [];
        for (const group of groups) {
          if (!group.tv_id) continue;
          const result = await scrapeEpisode(group.tv_id, group.title, season, episode, token);
          total += result?.count || 0;
          ids.push(group.tv_id);
        }
        emit(`Finished series bulk scrape. Found ${total} link(s).`);
        if (ids.length > 0) {
          await pollForInserts(ids, 'series_links', 'tv_id');
        }
        await refreshSeriesLinks();
      } catch (error: any) {
        emit(error?.message || 'Bulk series scraping failed', 'error');
      }
    },
    [emit, refreshSeriesLinks]
  );

  const addSelectedTmdbMovies = useCallback(
    async (selectedRows: TmdbMovieResult[]) => {
      const token = await getSessionAccessToken();
      if (!token) {
        emit('Authentication required', 'error');
        return;
      }

      const payload: Array<Partial<DownloadLink>> = [];

      for (const row of selectedRows) {
        try {
          const resolved = await resolveScraper({ title: row.title || row.name }, token);
          const best = resolved?.links?.[0]?.url;
          if (!best) continue;
          payload.push({
            movie_id: Number(row.id),
            title: row.title || row.name || 'Unknown',
            url: best,
            poster: row.poster_path ? tmdbImage(row.poster_path) : null,
          });
        } catch {}
      }

      if (payload.length === 0) {
        emit('No valid TMDB rows found', 'error');
        return;
      }

      await addMovieLinks(payload);
    },
    [addMovieLinks, emit]
  );

  const addSelectedTmdbMoviesAndScrape = useCallback(
    async (selectedRows: TmdbMovieResult[]) => {
      try {
        const token = await getSessionAccessToken();
        if (!token) throw new Error('Authentication required');
        let total = 0;
        const ids: number[] = [];
        for (const row of selectedRows) {
          const result = await scrapeMovie(row.id, row.title || row.name || 'Unknown', token);
          total += result?.count || 0;
          ids.push(row.id);
        }
        emit(`Scrape complete. Found ${total} link(s).`);
        if (ids.length > 0) await pollForInserts(ids, 'download_links', 'movie_id');
        await refreshMovieLinks();
      } catch (error: any) {
        emit(error?.message || 'Add+scrape movies failed', 'error');
      }
    },
    [emit, refreshMovieLinks]
  );

  const addSelectedTmdbSeries = useCallback(
    async (selectedRows: TmdbSeriesResult[], season: number, episode: number) => {
      const token = await getSessionAccessToken();
      if (!token) {
        emit('Authentication required', 'error');
        return;
      }

      const payload: Array<Partial<SeriesLink>> = [];
      for (const row of selectedRows) {
        try {
          const resolved = await resolveScraper({
            title: row.name || row.title,
            season,
            episode,
          }, token);
          const best = resolved?.links?.[0]?.url;
          if (!best) continue;
          payload.push({
            tv_id: row.id,
            series_title: row.name || row.title || 'Unknown',
            season_number: season,
            episode_number: episode,
            title: `${row.name || row.title || 'Unknown'} S${season}E${episode}`,
            url: best,
            poster: row.poster_path ? tmdbImage(row.poster_path) : null,
          });
        } catch {}
      }

      if (payload.length === 0) {
        emit('No valid TMDB series rows found', 'error');
        return;
      }

      await addSeriesLinks(payload);
    },
    [addSeriesLinks, emit]
  );

  const addSelectedTmdbSeriesAndScrape = useCallback(
    async (selectedRows: TmdbSeriesResult[], season: number, episode: number) => {
      try {
        const token = await getSessionAccessToken();
        if (!token) throw new Error('Authentication required');
        let total = 0;
        const ids: number[] = [];
        for (const row of selectedRows) {
          const result = await scrapeEpisode(row.id, row.name || row.title || 'Unknown', season, episode, token);
          total += result?.count || 0;
          ids.push(row.id);
        }
        emit(`Scrape triggered. Found ${total} link(s).`);
        if (ids.length > 0) await pollForInserts(ids, 'series_links', 'tv_id');
        await refreshSeriesLinks();
      } catch (error: any) {
        emit(error?.message || 'Add+scrape series failed', 'error');
      }
    },
    [emit, refreshSeriesLinks]
  );

  const parseMovieCsv = useCallback((csv: string) => {
    const rows = csv
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return rows
      .map((line) => {
        const [movieIdStr, title, url] = line.split(',').map((cell) => cell.trim());
        if (!title || !url) return null;
        return {
          movie_id: movieIdStr ? Number(movieIdStr) : null,
          title,
          url,
        } as Partial<DownloadLink>;
      })
      .filter(Boolean) as Array<Partial<DownloadLink>>;
  }, []);

  const parseSeriesCsv = useCallback((csv: string) => {
    const rows = csv
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return rows
      .map((line) => {
        const [tvIdStr, seriesTitle, seasonStr, episodeStr, url] = line.split(',').map((cell) => cell.trim());
        if (!seriesTitle || !seasonStr || !episodeStr || !url) return null;
        const season = Number(seasonStr);
        const episode = Number(episodeStr);
        if (Number.isNaN(season) || Number.isNaN(episode)) return null;
        return {
          tv_id: tvIdStr ? Number(tvIdStr) : null,
          series_title: seriesTitle,
          season_number: season,
          episode_number: episode,
          title: `${seriesTitle} S${season}E${episode}`,
          url,
        } as Partial<SeriesLink>;
      })
      .filter(Boolean) as Array<Partial<SeriesLink>>;
  }, []);

  return {
    users,
    loadingUsers,
    movieLinks,
    movieGroups,
    loadingMovieLinks,
    seriesLinks,
    seriesGroups,
    loadingSeriesLinks,
    tmdbMovieResults,
    tmdbSeriesResults,
    tmdbMovieLoading,
    tmdbSeriesLoading,
    message,
    emit,
    refreshUsers,
    refreshMovieLinks,
    refreshSeriesLinks,
    refreshAll,
    searchMovies,
    searchSeries,
    changeRole,
    removeUser,
    addMovieLinks,
    addSeriesLinks,
    removeMovieLink,
    removeSeriesLink,
    removeManyMovieLinks,
    removeManySeriesLinks,
    scrapeSingleMovie,
    scrapeMovieGroups,
    scrapeSeriesEpisodes,
    scrapeSeriesGroupBulk,
    addSelectedTmdbMovies,
    addSelectedTmdbMoviesAndScrape,
    addSelectedTmdbSeries,
    addSelectedTmdbSeriesAndScrape,
    parseMovieCsv,
    parseSeriesCsv,
    parseEpisodeInput,
  };
}
