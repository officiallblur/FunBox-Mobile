const fs = require('fs');
const path = require('path');

const backupFile = path.resolve('./scripts/policies-backup.json');
const outFile = path.resolve('./scripts/restore-policies.sql');

if (!fs.existsSync(backupFile)) {
  console.error('No backup file found at', backupFile);
  process.exit(1);
}

const raw = fs.readFileSync(backupFile, { encoding: 'utf8' });
let policies;
try {
  policies = JSON.parse(raw);
} catch (e) {
  console.error('Error parsing backup JSON:', e);
  process.exit(1);
}

const statements = [];
for (const p of policies) {
  const schema = p.schema_name || 'public';
  const table = p.table_name;
  const name = p.name;
  const cmd = p.cmd || 'ALL';
  const usingExpr = p.using_expr;
  const withCheck = p.with_check_expr;

  let stmt = `DROP POLICY IF EXISTS ${name} ON ${schema}.${table};\n`;
  stmt += `CREATE POLICY ${name} ON ${schema}.${table} FOR ${cmd}`;
  if (usingExpr) stmt += `\n  USING (${usingExpr})`;
  if (withCheck) stmt += `\n  WITH CHECK (${withCheck})`;
  stmt += `;\n\n`;
  statements.push(stmt);
}

fs.writeFileSync(outFile, statements.join('\n'), { encoding: 'utf8' });
console.log('Wrote', outFile, 'with', statements.length, 'policy statements');

console.log('To apply these policies to your database, run the SQL file via psql or your SQL editor.');
console.log('Example (psql): psql "$DATABASE_URL" -f scripts/restore-policies.sql');
