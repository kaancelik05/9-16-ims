/**
 * consent-api — agency-side consent link management (Module 6).
 *
 * JWT-verified. Wraps the create_consent_token RPC under the service
 * role after independently verifying the caller is agency staff, and
 * returns a ready-to-send invite URL. The creator-facing flow itself
 * (validate / grant / revoke) runs through anon-callable RPCs.
 */

import { json, corsHeaders } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { requireAgencyMember } from '../_shared/auth.ts';

interface ConsentBody {
  action: 'create-link' | 'list';
  influencerId?: string;
  ttlHours?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ data: null, error: 'POST only' }, 405);

  let body: ConsentBody;
  try {
    body = (await req.json()) as ConsentBody;
  } catch {
    return json({ data: null, error: 'Invalid JSON body' }, 400);
  }

  try {
    const profile = await requireAgencyMember(req.headers.get('authorization'));
    const supabase = serviceClient();

    switch (body.action) {
      case 'create-link': {
        if (!body.influencerId) throw new Error('influencerId is required');
        if (!['admin', 'manager'].includes(profile.role)) {
          throw new Error('Only admin/manager roles can issue consent links');
        }

        // Role is verified above (requireAgencyMember), so mint the token
        // directly — the create_consent_token RPC re-checks can_write()
        // against auth.uid(), which is absent on the service client.
        const bytes = crypto.getRandomValues(new Uint8Array(24));
        const token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
        const ttl = body.ttlHours ?? 72;
        const { error: insertError } = await supabase.from('consent_tokens').insert({
          influencer_id: body.influencerId,
          token,
          expires_at: new Date(Date.now() + ttl * 3_600_000).toISOString(),
          created_by: profile.id,
        });
        if (insertError) throw new Error(insertError.message);

        await supabase
          .from('influencers')
          .update({ last_consent_state: 'pending' })
          .eq('id', body.influencerId)
          .eq('last_consent_state', 'none');

        const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:4200';
        return json({
          data: { token, url: `${appUrl}/consent?token=${token}` },
          error: null,
        });
      }

      case 'list': {
        const { data, error } = await supabase
          .from('consent_tokens')
          .select('id, token, expires_at, used_at, created_at, influencers(full_name, primary_handle)')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        // Full token strings are only ever returned by create-link — the
        // list view masks them so stale tokens can't be leaked to viewers.
        const masked = (data ?? []).map((row) => ({
          ...row,
          token: row.token.length > 12
            ? `${row.token.slice(0, 6)}…${row.token.slice(-4)}`
            : '••••',
        }));
        return json({ data: masked, error: null });
      }

      default:
        return json({ data: null, error: `Unknown action: ${body.action}` }, 400);
    }
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null
        ? JSON.stringify(err)
        : String(err);
    return json({ data: null, error: message }, 403);
  }
});
