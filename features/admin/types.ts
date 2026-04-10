export type AdminMessageType = 'success' | 'error' | 'info';

export type AdminMessage = {
  text: string;
  type: AdminMessageType;
} | null;

export type AppUser = {
  id: string;
  email?: string | null;
  role?: string | null;
  created_at?: string | null;
};

export type DownloadLink = {
  id: number;
  title?: string | null;
  url: string;
  movie_id?: number | null;
  poster?: string | null;
  created_at?: string | null;
};

export type SeriesLink = {
  id: number;
  title?: string | null;
  url: string;
  tv_id?: number | null;
  series_title?: string | null;
  season_number?: number | null;
  episode_number?: number | null;
  poster?: string | null;
  created_at?: string | null;
};

export type MovieGroup = {
  key: string;
  movie_id: number | null;
  title: string;
  poster: string | null;
  links: DownloadLink[];
};

export type SeriesGroup = {
  key: string;
  tv_id: number | null;
  title: string;
  poster: string | null;
  links: SeriesLink[];
};

export type TmdbMovieResult = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  media_type?: string;
};

export type TmdbSeriesResult = {
  id: number;
  name?: string;
  title?: string;
  poster_path?: string | null;
  first_air_date?: string;
  media_type?: string;
};

export type ScraperResolveResponse = {
  success?: boolean;
  links?: Array<{ url: string; title?: string }>;
};

export type ScraperActionResponse = {
  success?: boolean;
  count?: number;
  message?: string;
};
