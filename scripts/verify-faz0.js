/**
 * Local helper (Faz 0) — live verification chain against the linked
 * project: password login → RLS-gated read → asana-proxy (401 without
 * JWT, health + list-projects with JWT). Usage: node scripts/verify-faz0.js
 */
const fs = require('fs');

function env(name) {
  const match = fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .find((line) => line.startsWith(name + '='));
  return match ? match.slice(name.length + 1).trim() : '';
}

const BASE = env('SUPABASE_URL');
const ANON = env('SUPABASE_PUBLISHABLE_KEY');
const EMAIL = process.argv[2] ?? 'k.celik05@gmail.com';
const PASSWORD = process.argv[3];

(async () => {
  if (!PASSWORD) { console.error('usage: node scripts/verify-faz0.js <email> <password>'); process.exit(1); }
  const results = [];

  // 1 ── password login (GoTrue) → session access token
  const login = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const session = await login.json();
  results.push(['login (password grant)', login.status, session.user ? `user ${session.user.id} confirmed=${session.user.email_confirmed_at ? 'yes' : 'no'}` : JSON.stringify(session).slice(0, 120)]);
  if (!login.ok) { results.forEach((r) => console.log(...r)); process.exit(1); }
  const jwt = session.access_token;

  // 2 ── RLS read: influencers should return the 5 seeded rows (is_agency_member passes)
  const infl = await fetch(`${BASE}/rest/v1/influencers?select=full_name,tier,last_consent_state&order=full_name`, {
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}` },
  });
  const inflBody = await infl.json();
  results.push(['RLS read influencers', infl.status, `${Array.isArray(inflBody) ? inflBody.length : '?'} rows — ${Array.isArray(inflBody) ? inflBody.map((i) => i.full_name).join(', ').slice(0, 120) : JSON.stringify(inflBody).slice(0, 120)}`]);

  // 3 ── RLS negative: anon (no session) must get an empty array
  const anon = await fetch(`${BASE}/rest/v1/influencers?select=full_name`, {
    headers: { apikey: ANON },
  });
  const anonBody = await anon.json();
  results.push(['RLS anon read (expect [])', anon.status, JSON.stringify(anonBody).slice(0, 80)]);

  // 4 ── asana-proxy rejects missing JWT (verify_jwt = true)
  const noJwt = await fetch(`${BASE}/functions/v1/asana-proxy`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'health' }),
  });
  results.push(['proxy without JWT (expect 401/403)', noJwt.status, '']);

  // 5 ── asana-proxy health with session JWT → PAT works end-to-end
  const health = await fetch(`${BASE}/functions/v1/asana-proxy`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'health' }),
  });
  const healthBody = await health.json();
  results.push(['proxy health (Asana PAT)', health.status, JSON.stringify(healthBody).slice(0, 140)]);

  // 6 ── asana-proxy list-projects with session JWT
  const projects = await fetch(`${BASE}/functions/v1/asana-proxy`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list-projects', workspaceId: '1218680723828207' }),
  });
  const projBody = await projects.json();
  const projList = Array.isArray(projBody?.data) ? projBody.data.map((p) => `${p.gid}:${p.name}`).join(' | ') : JSON.stringify(projBody).slice(0, 160);
  results.push(['proxy list-projects', projects.status, projList.slice(0, 200)]);

  for (const [name, status, detail] of results) {
    console.log(String(status).padEnd(4), name.padEnd(32), detail);
  }
})();
