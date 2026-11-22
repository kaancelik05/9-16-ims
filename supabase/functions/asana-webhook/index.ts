/**
 * asana-webhook — inbound Asana events (Asana → IMP).
 *
 * Public endpoint (verify_jwt = false). Authenticity is enforced with the
 * X-Hook-Signature HMAC: Asana signs the raw request body with the
 * X-Hook-Secret captured at webhook creation. Secrets live per project in
 * asana_connections.webhook_secret (stored by asana-proxy `create-webhook`
 * from the webhook-creation response — this handler never persists secrets).
 *
 * Flow: handshake → echo secret · heartbeat → 200 · event batch → verify
 * HMAC → ingest tasks (shared _shared/ingest.ts) → sync log entries drive
 * the realtime WebSocket ticker in the Angular app.
 */

import { json, corsHeaders } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { ingestTask } from '../_shared/ingest.ts';

interface AsanaEvent {
  action?: string;
  created_at?: string;
  parent?: string | { gid?: string } | null;
  resource: string | { gid: string; resource_type?: string };
}

interface ConnectionRow {
  id: string;
  project_name: string | null;
  webhook_secret: string | null;
}

/** Normalized task reference from either payload shape Asana has used. */
function taskGidOf(event: AsanaEvent): { gid: string | null; isTask: boolean } {
  const resource = event.resource;
  if (typeof resource === 'string') return { gid: resource, isTask: true };
  return {
    gid: resource?.gid ?? null,
    isTask: !resource?.resource_type || resource.resource_type === 'task',
  };
}

/** Hex HMAC-SHA256 of the raw body using a stored webhook secret. */
async function signatureMatches(
  rawBody: string,
  secret: string,
  signature: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const hex = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return signature.trim().toLowerCase() === hex;
}

Deno.serve(async (req: Request) => {
  // ── Handshake (webhook creation / Asana heartbeat) ──────────────
  // Echo the secret to complete the handshake. Persistence is NOT done
  // here: asana-proxy `create-webhook` stores the secret scoped to its
  // project row from the webhook-creation response.
  const hookSecret = req.headers.get('x-hook-secret');
  if (hookSecret) {
    return new Response(null, {
      status: 200,
      headers: { ...corsHeaders, 'X-Hook-Secret': hookSecret },
    });
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const started = Date.now();
  const rawBody = await req.text();

  // ── Parse events (both {data:[…]} and {events:[…]} shapes) ──────
  let events: AsanaEvent[] = [];
  try {
    const parsed = JSON.parse(rawBody) as {
      events?: AsanaEvent[];
      data?: AsanaEvent[] | { events?: AsanaEvent[] };
    };
    events = parsed.events
      ?? (Array.isArray(parsed.data) ? parsed.data : parsed.data?.events)
      ?? [];
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // Asana sends empty heartbeat payloads (~8h) to keep the webhook
  // alive — acknowledge fast, no processing.
  if (events.length === 0) {
    return json({ received: 0, heartbeat: true });
  }

  // ── HMAC verification ───────────────────────────────────────────
  const signature = req.headers.get('x-hook-signature');
  if (!signature) {
    return json({ error: 'Missing X-Hook-Signature' }, 401);
  }

  const supabase = serviceClient();
  const { data: connections } = await supabase
    .from('asana_connections')
    .select('id, project_name, webhook_secret')
    .eq('status', 'connected')
    .not('webhook_secret', 'is', null) as { data: ConnectionRow[] | null };

  const candidates = connections ?? [];
  let verified: ConnectionRow | null = null;
  for (const conn of candidates) {
    if (conn.webhook_secret && await signatureMatches(rawBody, conn.webhook_secret, signature)) {
      verified = conn;
      break;
    }
  }
  if (!verified) {
    return json({ error: 'Invalid signature' }, 401);
  }

  // ── Event batch → shared ingestion ──────────────────────────────
  const taskGids = [
    ...new Set(
      events
        .map(taskGidOf)
        .filter((r): r is { gid: string; isTask: true } => r.isTask && !!r.gid)
        .map((r) => r.gid),
    ),
  ];

  for (const gid of taskGids) {
    const action = events.find((e) => taskGidOf(e).gid === gid)?.action ?? 'changed';
    await ingestTask(gid, action, started);
  }

  // Touch the verified connection's telemetry only (scoped, not blanket).
  await supabase
    .from('asana_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', verified.id);

  return json({ received: taskGids.length });
});
