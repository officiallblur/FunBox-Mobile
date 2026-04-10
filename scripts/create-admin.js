const sql = require('../db.js');

const [, , userIdArg, emailArg] = process.argv;
const userId = userIdArg || process.env.ADMIN_USER_ID;
const email = emailArg || process.env.ADMIN_EMAIL;

if (!userId) {
  console.error(
    'Usage: node scripts/create-admin.js <user_id> [email]\nOr set ADMIN_USER_ID and ADMIN_EMAIL in env variables'
  );
  process.exit(1);
}

const run = async () => {
  try {
    await sql`INSERT INTO public.users (id, email, role) VALUES (${userId}, ${email}, 'admin')
      ON CONFLICT (id) DO UPDATE SET role = 'admin', email = EXCLUDED.email`;
    console.log('Admin user row upserted:', userId);
  } catch (err) {
    console.error('Error creating admin user row:', err);
    process.exitCode = 1;
  } finally {
    try {
      await sql.end({ timeout: 5 });
    } catch {}
  }
};

run();
