-- ══════════════════════════════════════════════════════════════════
-- 9-16 IMP · 0003 — Triggers & RPC functions
-- ══════════════════════════════════════════════════════════════════

-- ── Auto-create profile on signup ─────────────────────────────────
-- First user becomes admin (bootstrap), everyone else viewer.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'viewer' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── updated_at maintenance ────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists influencers_set_updated_at on public.influencers;
create trigger influencers_set_updated_at
  before update on public.influencers
  for each row execute function public.set_updated_at();

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

drop trigger if exists deliverables_set_updated_at on public.deliverables;
create trigger deliverables_set_updated_at
  before update on public.deliverables
  for each row execute function public.set_updated_at();

drop trigger if exists asana_connections_set_updated_at on public.asana_connections;
create trigger asana_connections_set_updated_at
  before update on public.asana_connections
  for each row execute function public.set_updated_at();

-- ── Module 6 — tokenized consent flow ─────────────────────────────

/**
 * Agency staff mints a single-use consent token for a creator.
 * Returns the token string; the invite link is /consent?token=…
 */
create or replace function public.create_consent_token(
  p_influencer_id uuid,
  p_ttl_hours     integer default 72
)
returns text
language plpgsql
security definer
set search_path = public
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

  return v_token;
end;
$$;

/**
 * Validates an invite token and returns creator context for the consent
 * screen. Callable without a session (anon) — the token itself is the
 * authorization. Never exposes contact details.
 */
create or replace function public.get_consent_context(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'name', i.full_name,
    'influencer_name', i.full_name,
    'handle', i.primary_handle,
    'expires_at', t.expires_at
  )
  from public.consent_tokens t
  join public.influencers i on i.id = t.influencer_id
  where t.token = p_token
    and t.used_at is null
    and t.expires_at > now()
  union all
  select jsonb_build_object('ok', false)
  where not exists (
    select 1 from public.consent_tokens t
    where t.token = p_token
      and t.used_at is null
      and t.expires_at > now()
  )
  limit 1;
$$;

revoke all on function public.get_consent_context(text) from public;
grant execute on function public.get_consent_context(text) to anon, authenticated;

/**
 * Records the creator's permission grant. Single-use: the token is
 * consumed atomically. Scopes are whitelisted server-side to
 * read-only analytics — the zero-posting guarantee.
 */
create or replace function public.grant_consent(
  p_token           text,
  p_scopes          jsonb default '{}',
  p_terms_accepted  boolean default false,
  p_whatsapp_notify boolean default false,
  p_email_notify    boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token public.consent_tokens;
begin
  select * into v_token
  from public.consent_tokens
  where token = p_token
    and used_at is null
    and expires_at > now()
  for update;

  if v_token.id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_token',
      'message', 'Token is invalid, expired or already used.'
    );
  end if;

  if not p_terms_accepted then
    return jsonb_build_object(
      'ok', false,
      'error', 'terms_required',
      'message', 'Terms & Conditions must be accepted.'
    );
  end if;

  insert into public.creator_consents (
    influencer_id, token_id, scopes, terms_accepted, terms_version,
    whatsapp_notify, email_notify, granted_at
  ) values (
    v_token.influencer_id,
    v_token.id,
    -- Whitelist: read-only analytics is the ONLY grantable scope.
    jsonb_build_object('read_only_analytics', true),
    true,
    '1.0.0',
    p_whatsapp_notify,
    p_email_notify,
    now()
  );

  update public.consent_tokens
  set used_at = now()
  where id = v_token.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.grant_consent(text, jsonb, boolean, boolean, boolean) from public;
grant execute on function public.grant_consent(text, jsonb, boolean, boolean, boolean) to anon, authenticated;

/**
 * Lets a creator revoke previously granted access while their token page
 * is still meaningful (token already consumed → lookup by consent row).
 */
create or replace function public.revoke_consent(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_influencer uuid;
begin
  select influencer_id into v_influencer
  from public.consent_tokens
  where token = p_token;

  if v_influencer is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  update public.creator_consents
  set revoked_at = now()
  where influencer_id = v_influencer
    and revoked_at is null;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.revoke_consent(text) from public;
grant execute on function public.revoke_consent(text) to anon, authenticated;
