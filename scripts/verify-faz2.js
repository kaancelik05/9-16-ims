/**
 * Faz 2 live verification — exercises the exact queries the wired
 * screens use, plus the full consent chain end-to-end.
 * Usage: node scripts/verify-faz2.js <email> <password>
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
const MAYA = '11111111-1111-4111-8111-111111111111';

async function api(path, jwt, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      apikey: ANON,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

(async () => {
  if (!PASSWORD) { console.error('usage: node scripts/verify-faz2.js <email> <password>'); process.exit(1); }
  const out = [];

  // 1 ── login
  const login = await api('/auth/v1/token?grant_type=password', null, { email: EMAIL, password: PASSWORD });
  const jwt = login.json?.access_token;
  out.push(['login', login.status, jwt ? 'ok' : JSON.stringify(login.json).slice(0, 120)]);
  if (!jwt) { out.forEach((r) => console.log(...r)); process.exit(1); }

  // 2 ── Directory join (influencers + metrics + deliverables + audits)
  const dir = await api(
    '/rest/v1/influencers?select=*,influencer_platform_metrics(*),deliverables(asana_task_label,campaigns(name)),safety_audits(score,status,created_at)&order=created_at.desc',
    jwt,
  );
  const first = Array.isArray(dir.json) ? dir.json[0] : null;
  out.push(['directory join', dir.status, `${dir.json?.length} rows; first: ${first?.full_name} metrics=${first?.influencer_platform_metrics?.length} audits=${first?.safety_audits?.length}`]);

  // 3 ── Profile bundle by uuid
  const prof = await api(
    `/rest/v1/influencers?select=*,influencer_platform_metrics(*),safety_audits(*),deliverables(*,campaigns(*))&id=eq.${MAYA}`,
    jwt,
  );
  const maya = Array.isArray(prof.json) ? prof.json[0] : null;
  out.push(['profile by uuid', prof.status, `${maya?.full_name ?? 'MISSING'}; deliverables=${maya?.deliverables?.length}; audit=${maya?.safety_audits?.[0]?.status}`]);

  // 4 ── Kanban + analytics joins
  const board = await api(
    '/rest/v1/deliverables?select=*,campaigns(name),influencers(full_name,primary_handle,avatar_url),asset_metrics(*)&order=sort_order',
    jwt,
  );
  out.push(['kanban join', board.status, `${board.json?.length ?? '?'} deliverables; stages=${[...new Set((board.json ?? []).map((d) => d.stage))].join(',')}`]);
  const assets = await api(
    '/rest/v1/asset_metrics?select=*,deliverables(title,content_format,asana_task_label,influencers(full_name,primary_handle,avatar_url))&order=captured_at.desc',
    jwt,
  );
  out.push(['analytics join', assets.status, `${assets.json?.length ?? '?'} asset rows`]);

  // 5 ── consent chain: token → context → grant → single-use check
  const created = await api('/rest/v1/rpc/create_consent_token', jwt, { p_influencer_id: MAYA, p_ttl_hours: 2 });
  const token = created.json;
  out.push(['create_consent_token', created.status, token ? `${String(token).slice(0, 8)}…` : JSON.stringify(created.json).slice(0, 120)]);

  if (token) {
    const ctx = await api('/rest/v1/rpc/get_consent_context', null, { p_token: token });
    const ctxName = ctx.json?.name ?? ctx.json?.influencer_name;
    out.push(['get_consent_context (anon)', ctx.status, ctx.json?.ok ? `name=${ctxName} handle=${ctx.json.handle}` : 'ok=false']);

    const grant = await api('/rest/v1/rpc/grant_consent', null, {
      p_token: token, p_terms_accepted: true, p_whatsapp_notify: true, p_email_notify: true,
    });
    out.push(['grant_consent (anon)', grant.status, JSON.stringify(grant.json)]);

    const regrant = await api('/rest/v1/rpc/grant_consent', null, { p_token: token, p_terms_accepted: true });
    out.push(['re-grant (expect invalid)', regrant.status, regrant.json?.error ?? JSON.stringify(regrant.json)]);

    const state = await api(`/rest/v1/influencers?select=last_consent_state&limit=1&id=eq.${MAYA}`, jwt);
    // roster state check ( Maya may not be first row ) — query by id already filters
    out.push(['influencer.last_consent_state', state.status, state.json?.[0]?.last_consent_state ?? '?']);
  }

  for (const [name, status, detail] of out) console.log(String(status).padEnd(4), name.padEnd(30), detail);
})();
