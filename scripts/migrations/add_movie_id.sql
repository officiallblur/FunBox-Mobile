-- Migration: add movie_id column to download_links
-- Run this in Supabase SQL editor or with psql

-- Add the movie_id column (integer) to associate links with TMDB movie id
ALTER TABLE public.download_links
  ADD COLUMN IF NOT EXISTS movie_id integer;

-- Optional: create an index for faster lookups by movie_id
CREATE INDEX IF NOT EXISTS idx_download_links_movie_id ON public.download_links (movie_id);

-- Note: existing rows will have NULL movie_id. When adding new links from the admin UI, movie_id will be set.
