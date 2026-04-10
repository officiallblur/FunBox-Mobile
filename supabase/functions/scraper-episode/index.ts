import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.1';

import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESOLVER_URL = Deno.env.get('LINK_RESOLVER_URL') ?? '';
const RESOLVER_AUTH = Deno.env.get('LINK_RESOLVER_AUTH') ?? '';

type ScrapeEpisodePayload = {
  tvId?: number;
  seriesTitle?: string;
  season?: number;
  episode?: number;
};

type ScraperResponse = {
  success?: boolean;
  count?: number;
  message?: string;
};

function jsonResponse(payload: ScraperResponse, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function requireAdmin(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return { error: jsonResponse({ success: false, message: 'Supabase environment is not configured.' }, 500) };
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  if (!authHeader) {
    return { error: jsonResponse({ success: false, message: 'Authorization required.' }, 401) };
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    return { error: jsonResponse({ success: false, message: 'Invalid session.' }, 401) };
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: row, error: roleError } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (roleError || !row || row.role !== 'admin') {
    return { error: jsonResponse({ success: false, message: 'Admin access required.' }, 403) };
  }

  return { adminClient };
}

async function parseJson(request: Request): Promise<ScrapeEpisodePayload> {
  try {
    return (await request.json()) as ScrapeEpisodePayload;
  } catch {
    return {};
  }
}

async function callResolver(payload: { title: string; season: number; episode: number }) {
  if (!RESOLVER_URL) {
    return { links: [], message: 'Resolver not configured.' };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (RESOLVER_AUTH) {
    headers.Authorization = RESOLVER_AUTH.startsWith('Bearer ')
      ? RESOLVER_AUTH
      : `Bearer ${RESOLVER_AUTH}`;
  }

  const response = await fetch(RESOLVER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json: { links?: Array<{ url: string; title?: string; source?: string }> } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {}

  if (!response.ok) {
    return { links: [], message: `Resolver failed (${response.status}).` };
  }

  const links = Array.isArray(json?.links)
    ? json.links.filter((link) => typeof link?.url === 'string' && link.url.trim().length > 0)
    : [];

  return { links, message: undefined };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ success: false, message: 'Method not allowed.' }, 405);
  }

  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  const payload = await parseJson(request);
  const tvId = Number(payload.tvId);
  const seriesTitle = payload.seriesTitle?.trim() ?? '';
  const season = Number(payload.season);
  const episode = Number(payload.episode);

  if (!tvId || !seriesTitle || !season || !episode) {
    return jsonResponse(
      { success: false, message: 'tvId, seriesTitle, season, and episode are required.' },
      400
    );
  }

  const resolved = await callResolver({ title: seriesTitle, season, episode });
  if (resolved.links.length === 0) {
    return jsonResponse({ success: true, count: 0, message: resolved.message || 'No links found.' }, 200);
  }

  const urls = Array.from(new Set(resolved.links.map((link) => link.url)));
  const { adminClient } = auth;
  const { data: existing, error: existingError } = await adminClient
    .from('series_links')
    .select('url')
    .eq('tv_id', tvId)
    .eq('season_number', season)
    .eq('episode_number', episode)
    .in('url', urls);
  if (existingError) {
    return jsonResponse({ success: false, message: existingError.message }, 500);
  }

  const existingSet = new Set((existing ?? []).map((row) => row.url));
  const inserts = resolved.links
    .filter((link) => !existingSet.has(link.url))
    .map((link) => ({
      tv_id: tvId,
      series_title: seriesTitle,
      season_number: season,
      episode_number: episode,
      title: link.title?.trim() || `${seriesTitle} S${season}E${episode}`,
      url: link.url,
      source: link.source ?? 'resolver',
    }));

  if (inserts.length > 0) {
    const { error: insertError } = await adminClient.from('series_links').insert(inserts as any);
    if (insertError) {
      return jsonResponse({ success: false, message: insertError.message }, 500);
    }
  }

  return jsonResponse({ success: true, count: inserts.length, message: 'Scrape complete.' }, 200);
});
