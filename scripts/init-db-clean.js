const sql = require('../db.js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const backupFile = path.resolve('./scripts/policies-backup.json');

function askConfirmation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('This will create tables and replace RLS policies for `users`, `download_links`, and `series_links`. Continue? (y/N): ', (answer) => {
      rl.close();
      const ok = String(answer || '').trim().toLowerCase() === 'y';
      resolve(ok);
    });
  });
}

async function run() {
  try {
    const skipConfirm = process.argv.includes('--yes') || process.env.SKIP_CONFIRM === '1';
    if (!skipConfirm) {
      const ok = await askConfirmation();
      if (!ok) {
        console.log('Aborting.');
        process.exit(0);
      }
    }

    console.log('Creating tables...');

    await sql`CREATE TABLE IF NOT EXISTS public.users (
      id text PRIMARY KEY,
      email text,
      role text DEFAULT 'user',
      created_at timestamptz DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS public.download_links (
      id bigserial PRIMARY KEY,
      title text,
      url text,
      movie_id integer,
      poster text,
      created_at timestamptz DEFAULT now()
    )`;

    await sql`CREATE INDEX IF NOT EXISTS idx_download_links_movie_id ON public.download_links (movie_id)`;

    await sql`CREATE TABLE IF NOT EXISTS public.series_links (
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
    )`;

    await sql`CREATE INDEX IF NOT EXISTS idx_series_links_tv_id ON public.series_links (tv_id)`;

    console.log('Backing up existing policies (if any)...');

    const policies = await sql`
      SELECT pol.polname as name,
             cl.relname as table_name,
             ns.nspname as schema_name,
             pol.polcmd as cmd,
             pg_get_expr(pol.polqual, pol.polrelid) as using_expr,
             pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expr
      FROM pg_policy pol
      JOIN pg_class cl ON pol.polrelid = cl.oid
      JOIN pg_namespace ns ON cl.relnamespace = ns.oid
      WHERE ns.nspname = 'public' AND cl.relname IN ('users','download_links','series_links')
    `;

    try {
      fs.writeFileSync(backupFile, JSON.stringify(policies, null, 2), { encoding: 'utf8' });
      console.log('Policies backed up to', backupFile);
    } catch (e) {
      console.warn('Could not write policy backup file:', e);
    }

    console.log('Enabling RLS and creating policies...');

    await sql`ALTER TABLE public.users ENABLE ROW LEVEL SECURITY`;

    await sql`DROP POLICY IF EXISTS users_insert_own ON public.users`;
    await sql`CREATE POLICY users_insert_own ON public.users
      FOR INSERT
      WITH CHECK (auth.uid()::text = id)`;

    await sql`DROP POLICY IF EXISTS users_select_own ON public.users`;
    await sql`CREATE POLICY users_select_own ON public.users
      FOR SELECT
      USING (auth.uid()::text = id)`;

    await sql`DROP POLICY IF EXISTS users_update_own ON public.users`;
    await sql`CREATE POLICY users_update_own ON public.users
      FOR UPDATE
      USING (auth.uid()::text = id)
      WITH CHECK (auth.uid()::text = id)`;

    await sql`DROP POLICY IF EXISTS users_admin_manage ON public.users`;
    await sql`CREATE POLICY users_admin_manage ON public.users
      FOR ALL
      USING (exists (select 1 from public.users u where u.id = auth.uid()::text and u.role = 'admin'))
      WITH CHECK (exists (select 1 from public.users u where u.id = auth.uid()::text and u.role = 'admin'))`;

    await sql`ALTER TABLE public.download_links ENABLE ROW LEVEL SECURITY`;

    await sql`DROP POLICY IF EXISTS download_links_public_read ON public.download_links`;
    await sql`CREATE POLICY download_links_public_read ON public.download_links
      FOR SELECT
      USING (true)`;

    await sql`DROP POLICY IF EXISTS download_links_admin_manage ON public.download_links`;
    await sql`CREATE POLICY download_links_admin_manage ON public.download_links
      FOR ALL
      USING ( exists (select 1 from public.users u where u.id = auth.uid()::text and u.role = 'admin') )
      WITH CHECK ( exists (select 1 from public.users u where u.id = auth.uid()::text and u.role = 'admin') )`;

    await sql`ALTER TABLE public.series_links ENABLE ROW LEVEL SECURITY`;

    await sql`DROP POLICY IF EXISTS series_links_public_read ON public.series_links`;
    await sql`CREATE POLICY series_links_public_read ON public.series_links
      FOR SELECT
      USING (true)`;

    await sql`DROP POLICY IF EXISTS series_links_admin_manage ON public.series_links`;
    await sql`CREATE POLICY series_links_admin_manage ON public.series_links
      FOR ALL
      USING ( exists (select 1 from public.users u where u.id = auth.uid()::text and u.role = 'admin') )
      WITH CHECK ( exists (select 1 from public.users u where u.id = auth.uid()::text and u.role = 'admin') )`;

    console.log('Database setup complete.');
  } catch (err) {
    console.error('Error running init-db-clean:', err);
    process.exitCode = 1;
  } finally {
    try {
      await sql.end({ timeout: 5 });
    } catch {}
  }
}

run();
