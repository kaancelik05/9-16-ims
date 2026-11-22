-- ══════════════════════════════════════════════════════════════════
-- 9-16 IMP · 0004 — Integration layer (consent-first data model)
--
-- Implements docs/INTEGRATION-PLAN.md §4.2:
--   · metric provenance (api | declared | manual) on every metric row
--   · platform_connections — creator OAuth tokens (Faz 4 pipeline core)
--   · metric_snapshots — own history (IG insights ~30-day window)
--   · audit_log — who did what (asana_sync_log covers sync only)
--   · metric_sync_runs — ingest observability
--   · influencers: profile/audience columns + consent state badge source
--   · storage bucket ims-assets for deliverable drafts
--   · self role-change guard (closes "update own" privilege escalation)
--   · RPC overrides keeping last_consent_state truthful
-- ══════════════════════════════════════════════════════════════════

-- ── Enum ───────────────────────────────────────────────────────────

create type public.metric_source as enum ('api', 'declared', 'manual');

-- ── Column additions ───────────────────────────────────────────────

alter table public.influencers
  add column avatar_url         text,
  add column bio                text,
  add column languages          text[] not null default '{}',
  add column audience_summary   jsonb not null default '{}',  -- declared age/gender/geo split
  add column last_consent_state text not null default 'none'; -- none|pending|granted|revoked

alter table public.influencer_platform_metrics
  add column source      public.metric_source not null default 'manual',
  add column declared_at timestamptz;                       -- when the creator last self-reported

alter table public.asset_metrics
  add column saves              integer not null default 0,
  add column watch_time_seconds integer,
  add column source             public.metric_source not null default 'manual';

-- One linked Asana project per connection row — webhook secret is
-- resolved per project (fixes blanket-secret overwrites).
create unique index asana_connections_project_uniq
  on public.asana_connections (project_gid);

-- ── platform_connections — creator OAuth registry (service-role only) ──
-- No RLS write policies for authenticated clients: tokens are written
-- exclusively by Edge Functions (platform-connect / metrics-ingest).

create table public.platform_connections (
  id                     uuid primary key default gen_random_uuid(),
  influencer_id          uuid not null references public.influencers (id) on delete cascade,
  platform               public.platform_type not null,
  provider               text not null,   -- meta_ig_login|google_oauth|tiktok_login_kit|manual_export
  external_user_id       text,
  scopes                 text[] not null default '{}',
  access_token_encrypted text,            -- service-role read only; never sent to the browser
  refresh_token_encrypted text,
  token_expires_at       timestamptz,
  status                 text not null default 'active',  -- active|expired|revoked|pending
  connected_via_consent  uuid references public.creator_consents (id) on delete set null,
  last_sync_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (influencer_id, platform)
);

create index platform_connections_influencer_idx on public.platform_connections (influencer_id);
create index platform_connections_status_idx     on public.platform_connections (status);

-- ── metric_snapshots — daily history for trends/sparklines ─────────

create table public.metric_snapshots (
  id              uuid primary key default gen_random_uuid(),
  influencer_id   uuid not null references public.influencers (id) on delete cascade,
  platform        public.platform_type not null,
  followers       bigint,
  engagement_rate numeric(5,2),
  extra           jsonb not null default '{}',  -- watch_time, story_reach, demographics…
  source          public.metric_source not null default 'api',
  captured_at     timestamptz not null default now()
);

create index metric_snapshots_lookup_idx
  on public.metric_snapshots (influencer_id, platform, captured_at desc);

-- ── audit_log — agency action ledger ───────────────────────────────

create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       uuid references public.profiles (id) on delete set null,
  action      text not null,   -- influencer.create, consent.grant, deliverable.approve…
  entity_type text not null,
  entity_id   text,
  diff        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx  on public.audit_log (entity_type, entity_id);

-- ── metric_sync_runs — ingest job ledger ───────────────────────────

create table public.metric_sync_runs (
  id               uuid primary key default gen_random_uuid(),
  platform         public.platform_type,   -- null = all platforms
  status           public.sync_status not null default 'success',
  creators_scanned integer not null default 0,
  metrics_written  integer not null default 0,
  error_message    text,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz
);

create index metric_sync_runs_started_idx on public.metric_sync_runs (started_at desc);

-- ── RLS for the new tables ─────────────────────────────────────────

alter table public.platform_connections enable row level security;
alter table public.metric_snapshots     enable row level security;
alter table public.audit_log            enable row level security;
alter table public.metric_sync_runs     enable row level security;

create policy "platform connections: agency read"
  on public.platform_connections for select
  to authenticated
  using (public.is_agency_member());
-- No insert/update/delete policies: service role only (token custody).

create policy "snapshots: agency read"
  on public.metric_snapshots for select
  to authenticated
  using (public.is_agency_member());

create policy "audit log: agency read"
  on public.audit_log for select
  to authenticated
  using (public.is_agency_member());

create policy "sync runs: agency read"
  on public.metric_sync_runs for select
  to authenticated
  using (public.is_agency_member());

-- ── updated_at maintenance for new/missed tables ───────────────────

drop trigger if exists ipm_set_updated_at on public.influencer_platform_metrics;
create trigger ipm_set_updated_at
  before update on public.influencer_platform_metrics
  for each row execute function public.set_updated_at();

drop trigger if exists platform_connections_set_updated_at on public.platform_connections;
create trigger platform_connections_set_updated_at
  before update on public.platform_connections
  for each row execute function public.set_updated_at();

-- ── profiles: block self role changes ──────────────────────────────
-- "profiles: update own" lets staff edit their own row; without this
-- guard a viewer/manager could set their own role to 'admin'.
-- Service role (Edge Functions) bypasses the check.

create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() = old.id
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Self role modification is not allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_self_role_change on public.profiles;
create trigger profiles_prevent_self_role_change
  before update on public.profiles
  for each row execute function public.prevent_self_role_change();

-- ── RPC overrides — keep last_consent_state truthful ───────────────

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

  update public.influencers
  set last_consent_state = 'pending'
  where id = p_influencer_id
    and last_consent_state = 'none';

  return v_token;
end;
$$;

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

  update public.influencers
  set last_consent_state = 'granted'
  where id = v_token.influencer_id;

  insert into public.audit_log (actor, action, entity_type, entity_id)
  values (
    null, 'consent.grant', 'influencer', v_token.influencer_id::text
  );

  return jsonb_build_object('ok', true);
end;
$$;

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

  -- Consent-first guarantee: revoking also cuts every platform feed
  -- that was authorized through it.
  update public.platform_connections
  set status = 'revoked'
  where influencer_id = v_influencer
    and status = 'active';

  update public.influencers
  set last_consent_state = 'revoked'
  where id = v_influencer;

  insert into public.audit_log (actor, action, entity_type, entity_id)
  values (
    null, 'consent.revoke', 'influencer', v_influencer::text
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.grant_consent(text, jsonb, boolean, boolean, boolean) from public;
grant execute on function public.grant_consent(text, jsonb, boolean, boolean, boolean) to anon, authenticated;
revoke all on function public.revoke_consent(text) from public;
grant execute on function public.revoke_consent(text) to anon, authenticated;

-- ── Storage — deliverable drafts (9:16 video assets) ───────────────

insert into storage.buckets (id, name, public)
values ('ims-assets', 'ims-assets', false)
on conflict (id) do nothing;

create policy "ims assets: staff read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'ims-assets' and public.is_agency_member());

create policy "ims assets: staff write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'ims-assets' and public.can_write());

create policy "ims assets: staff update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'ims-assets' and public.can_write())
  with check (bucket_id = 'ims-assets' and public.can_write());

create policy "ims assets: staff delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'ims-assets' and public.can_write());
