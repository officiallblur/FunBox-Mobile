const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? 'ce1a0db13c99a45fd7effb86ab82f78f';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const YOUTUBE_API_KEY =
  process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? 'AIzaSyDIJol94J-5LTuakQSNkOK3OcTrQRIDhzg';

type MediaType = 'movie' | 'tv';

type DiscoverMediaOptions = {
  mediaType?: MediaType;
  page?: number;
  sortBy?: string;
  genreId?: number | null;
  withOriginCountry?: string[];
  region?: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function tmdbImage(path?: string | null, size: string = 'w500') {
  if (!path) {
    return 'https://via.placeholder.com/300x450?text=No+Image';
  }
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export async function fetchNowPlaying() {
  return fetchJson<{ results: any[] }>(
    `${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1`
  );
}

export async function fetchTrending() {
  return fetchJson<{ results: any[] }>(
    `${TMDB_BASE_URL}/trending/all/day?api_key=${TMDB_API_KEY}&language=en-US`
  );
}

export async function fetchTopRatedMovies() {
  return fetchJson<{ results: any[] }>(
    `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=1`
  );
}

export async function fetchUpcomingMovies() {
  return fetchJson<{ results: any[] }>(
    `${TMDB_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}&language=en-US&page=1`
  );
}

export async function fetchPopularMovies() {
  return fetchJson<{ results: any[] }>(
    `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
  );
}

export async function fetchPopularTv() {
  return fetchJson<{ results: any[] }>(
    `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
  );
}

export async function fetchTopRatedTv() {
  return fetchJson<{ results: any[] }>(
    `${TMDB_BASE_URL}/tv/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=1`
  );
}

export async function fetchOnTheAirTv() {
  return fetchJson<{ results: any[] }>(
    `${TMDB_BASE_URL}/tv/on_the_air?api_key=${TMDB_API_KEY}&language=en-US&page=1`
  );
}

export async function discoverMedia({
  mediaType = 'movie',
  page = 1,
  sortBy = 'popularity.desc',
  genreId,
  withOriginCountry,
  region,
}: DiscoverMediaOptions = {}) {
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'en-US',
    sort_by: sortBy,
    page: String(page),
  });
  if (genreId) {
    params.set('with_genres', String(genreId));
  }
  if (withOriginCountry?.length) {
    params.set('with_origin_country', withOriginCountry.join('|'));
  }
  if (region) {
    params.set('region', region);
  }

  return fetchJson<{ results: any[] }>(`${TMDB_BASE_URL}/discover/${mediaType}?${params.toString()}`);
}

export async function fetchByGenre({
  genreId,
  mediaType = 'movie',
  page = 1,
}: {
  genreId?: number | null;
  mediaType?: 'movie' | 'tv';
  page?: number;
}) {
  return discoverMedia({ genreId, mediaType, page });
}

export async function searchMulti(query: string) {
  return fetchJson<{ results: any[] }>(
    `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`
  );
}

export async function searchMovie(query: string) {
  return fetchJson<{ results: any[] }>(
    `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
  );
}

export async function searchTv(query: string) {
  return fetchJson<{ results: any[] }>(
    `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
  );
}

export async function fetchMovieDetails(id: string | number) {
  return fetchJson<any>(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
}

export async function fetchMovieCredits(id: string | number) {
  return fetchJson<{ cast: any[] }>(
    `${TMDB_BASE_URL}/movie/${id}/credits?api_key=${TMDB_API_KEY}&language=en-US`
  );
}

export async function fetchMovieRecommendations(id: string | number) {
  return fetchJson<{ results: any[] }>(
    `${TMDB_BASE_URL}/movie/${id}/recommendations?api_key=${TMDB_API_KEY}&language=en-US`
  );
}

export async function fetchTvDetails(id: string | number) {
  return fetchJson<any>(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
}

export async function fetchTvCredits(id: string | number) {
  return fetchJson<{ cast: any[] }>(
    `${TMDB_BASE_URL}/tv/${id}/credits?api_key=${TMDB_API_KEY}&language=en-US`
  );
}

export async function fetchTvRecommendations(id: string | number) {
  return fetchJson<{ results: any[] }>(
    `${TMDB_BASE_URL}/tv/${id}/recommendations?api_key=${TMDB_API_KEY}&language=en-US`
  );
}

export async function fetchActorDetails(id: string | number) {
  return fetchJson<any>(`${TMDB_BASE_URL}/person/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
}

export async function fetchActorMovieCredits(id: string | number) {
  return fetchJson<{ cast: any[] }>(
    `${TMDB_BASE_URL}/person/${id}/movie_credits?api_key=${TMDB_API_KEY}&language=en-US`
  );
}

export async function fetchTrailerId(title: string) {
  if (!title) {
    return null;
  }
  const data = await fetchJson<any>(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      `${title} official trailer`
    )}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`
  );
  return data?.items?.[0]?.id?.videoId ?? null;
}
