-- FunBox dedupe indexes for direct download links
-- If this migration fails due to duplicate URLs, run the cleanup queries in Supabase SQL editor
-- and re-run the migration.

-- Optional cleanup (run manually if needed):
-- DELETE FROM public.download_links a
-- USING public.download_links b
-- WHERE a.id > b.id AND a.url = b.url AND a.url IS NOT NULL;
--
-- DELETE FROM public.series_links a
-- USING public.series_links b
-- WHERE a.id > b.id AND a.url = b.url AND a.url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_download_links_url ON public.download_links (url) WHERE url IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_series_links_url ON public.series_links (url) WHERE url IS NOT NULL;
