# Supabase Setup for Funbox

This document provides SQL and guidance to create the minimal tables and Row Level Security (RLS) policies used by the app.

## Required tables

Run these SQL statements in the Supabase SQL editor (or via `psql`):

-- users table (profile rows linking to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- download_links table
CREATE TABLE IF NOT EXISTS public.download_links (
  id bigserial PRIMARY KEY,
  title text,
  url text,
  movie_id integer,
  poster text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_download_links_movie_id ON public.download_links (movie_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_download_links_url ON public.download_links (url) WHERE url IS NOT NULL;

-- series_links table (for TV episode links)
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
CREATE UNIQUE INDEX IF NOT EXISTS ux_series_links_url ON public.series_links (url) WHERE url IS NOT NULL;

## Subscription system (Stripe)

These tables power Netflix-style plans and entitlements. If you use migrations, run the new migration file under `supabase/migrations`.

-- plans table
CREATE TABLE IF NOT EXISTS public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  interval text NOT NULL CHECK (interval IN ('month', 'year')),
  stripe_price_id text NOT NULL,
  max_quality text NOT NULL DEFAULT 'SD',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text REFERENCES public.plans(id),
  status text NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'paused', 'unpaid')),
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- entitlements table
CREATE TABLE IF NOT EXISTS public.entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  can_stream boolean NOT NULL DEFAULT false,
  max_quality text NOT NULL DEFAULT 'SD',
  updated_at timestamptz DEFAULT now()
);

-- RLS for subscription tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_public_read ON public.plans
  FOR SELECT
  USING (true);

CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY entitlements_select_own ON public.entitlements
  FOR SELECT
  USING (auth.uid() = user_id);

## Recommended Row Level Security (RLS)

Enable RLS and add minimal policies so users can manage their own profile rows, and allow public read for download links.

-- enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- allow authenticated users to INSERT a profile for themselves
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- allow authenticated users to SELECT their own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- allow authenticated users to UPDATE their own profile
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- enable RLS on download_links
ALTER TABLE public.download_links ENABLE ROW LEVEL SECURITY;

-- allow public read for download_links
CREATE POLICY "download_links_public_read" ON public.download_links
  FOR SELECT
  USING (true);

-- Writes for download_links should be performed via server-side tools (Edge Functions with service role).

-- enable RLS on series_links
ALTER TABLE public.series_links ENABLE ROW LEVEL SECURITY;

-- allow public read for series_links
CREATE POLICY "series_links_public_read" ON public.series_links
  FOR SELECT
  USING (true);

-- Writes for series_links should be performed via server-side tools (Edge Functions with service role).

Notes:
- The `auth.uid()` helper returns the logged-in user's id from the JWT.

## Stripe Edge Function Secrets

Set these in Supabase Dashboard → Project Settings → Edge Functions → Secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CHECKOUT_SUCCESS_URL` (example: `funbox://subscribe/success`)
- `CHECKOUT_CANCEL_URL` (example: `funbox://subscribe/cancel`)
- `PORTAL_RETURN_URL` (example: `funbox://subscribe`)

Deploy functions:

- `create-checkout`
- `customer-portal`
- `stripe-webhook`

## Service role considerations

- Deleting an auth account (from `auth.users`) requires the Supabase service role key. Do not embed that key in client code. Use a secure server function (Edge Function) to perform destructive auth operations.

## Quick Manual Steps

1. Create the tables via SQL editor.
2. Insert plan rows into `public.plans` (basic/standard/premium) with Stripe price IDs.
3. Deploy Stripe subscription functions and set the secrets above.
4. Test authentication from the app.

SUPABASE_URL=https://<project-ref>.supabase.co
SERVICE_ROLE_KEY=<your_service_role_key_here>
