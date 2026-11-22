-- ══════════════════════════════════════════════════════════════════
-- 9-16 IMP · 0006 — RPC search_path fix (Faz 2 live verification)
--
-- create_consent_token ran with search_path = public, so
-- gen_random_bytes() (pgcrypto, installed in the `extensions` schema on
-- Supabase) was unresolvable at call time: "function
-- gen_random_bytes(integer) does not exist". Never surfaced before
-- because the RPC had never been invoked. Supabase convention: append
-- `extensions` to the definer search_path.
-- ══════════════════════════════════════════════════════════════════

create or replace function public.create_consent_token(
  p_influencer_id uuid,
  p_ttl_hours     integer default 72
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  if not public.can_write() then
    raise exception 'Only admin/manager roles can issue consent tokens';
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.consent_tokens (influencer_id, token, expires_at, created_by)
  values (
    p_influencer_id,
    v_token,
    now() + (p_ttl_hours || ' hours')::interval,
    auth.uid()
  );

  update public.influencers
  set last_consent_state = 'pending'
  where id = p_influencer_id
    and last_consent_state = 'none';

  return v_token;
end;
$$;
