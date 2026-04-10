import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.1';

import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESOLVER_URL = Deno.env.get('LINK_RESOLVER_URL') ?? '';
const RESOLVER_AUTH = Deno.env.get('LINK_RESOLVER_AUTH') ?? '';

type ResolvePayload = {
  title?: string;
  season?: number;
  episode?: number;
};

type ResolverResponse = {
  success?: boolean;
  links?: Array<{ url: string; title?: string; source?: string }>;
  message?: string;
};

function jsonResponse(payload: ResolverResponse, status = 200) {
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

async function parseJson(request: Request): Promise<ResolvePayload> {
  try {
    return (await request.json()) as ResolvePayload;
  } catch {
    return {};
  }
}

async function callResolver(payload: ResolvePayload) {
  if (!RESOLVER_URL) {
    return { success: false, links: [], message: 'Resolver not configured.' } satisfies ResolverResponse;
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
  let json: ResolverResponse = {};
  try {
    json = text ? (JSON.parse(text) as ResolverResponse) : {};
  } catch {}

  if (!response.ok) {
    return {
      success: false,
      links: [],
      message: json?.message || `Resolver failed (${response.status}).`,
    } satisfies ResolverResponse;
  }

  const links = Array.isArray(json?.links)
    ? json.links.filter((link) => typeof link?.url === 'string' && link.url.trim().length > 0)
    : [];

  return {
    success: true,
    links,
    message: json?.message,
  } satisfies ResolverResponse;
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
  if (!payload.title || !payload.title.trim()) {
    return jsonResponse({ success: false, message: 'title is required', links: [] }, 400);
  }

  const resolved = await callResolver(payload);
  return jsonResponse(resolved, resolved.success ? 200 : 200);
});
