/**
 * Local helper (Faz 0) — run arbitrary SQL on the linked project via the
 * Supabase Management API. Usage:
 *   node scripts/db-query.js "select 1"
 * Reads SUPABASE_ACCESS_TOKEN + project ref from .env.local.
 */
const fs = require('fs');

function env(name) {
  const match = fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .find((line) => line.startsWith(name + '='));
  return match ? match.slice(name.length + 1).trim() : '';
}

(async () => {
  const query = process.argv[2];
  if (!query) { console.error('usage: node scripts/db-query.js "<sql>"'); process.exit(1); }

  const token = env('SUPABASE_ACCESS_TOKEN');
  const ref = env('SUPABASE_PROJECT_REF');
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  console.log('HTTP', res.status);
  console.log(text.slice(0, 2000));
})();
