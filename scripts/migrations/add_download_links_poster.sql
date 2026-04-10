-- Migration: add poster column to download_links
-- Run this in Supabase SQL editor or with psql

ALTER TABLE public.download_links
  ADD COLUMN IF NOT EXISTS poster text;

-- Optional index to speed up poster-based queries (usually not required)
-- CREATE INDEX IF NOT EXISTS idx_download_links_poster ON public.download_links (poster);
