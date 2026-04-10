-- Migration: add series_links table for TV episode links
-- Run this in Supabase SQL editor or with psql

CREATE TABLE IF NOT EXISTS public.series_links (
  id bigserial PRIMARY KEY,
  tv_id integer,
  series_title text,
  season_number integer,
  episode_number integer,
  title text,
  url text,
  poster text,
  source text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_series_links_tv_id ON public.series_links (tv_id);

-- Enable RLS and add policies (mirrors download_links behavior)
ALTER TABLE public.series_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS series_links_public_read ON public.series_links;
CREATE POLICY series_links_public_read ON public.series_links
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS series_links_admin_manage ON public.series_links;
CREATE POLICY series_links_admin_manage ON public.series_links
  FOR ALL
  USING (exists (select 1 from public.users u where u.id = auth.uid()::text and u.role = 'admin'))
  WITH CHECK (exists (select 1 from public.users u where u.id = auth.uid()::text and u.role = 'admin'));
