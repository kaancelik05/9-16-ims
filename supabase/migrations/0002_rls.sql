-- ══════════════════════════════════════════════════════════════════
-- 9-16 IMP · 0002 — Row Level Security & realtime
-- Zero-posting guarantee: creator-facing tables are read-only by design;
-- writes only flow through agency roles or service-role Edge Functions.
-- ══════════════════════════════════════════════════════════════════

-- ── Helper predicates ─────────────────────────────────────────────

-- Any authenticated agency staff (admin / manager / viewer)
create or replace function public.is_agency_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
  );
$$;

-- Roles allowed to mutate workspace data
create or replace function public.can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'manager')
  );
$$;

-- Admin-only predicate (role management, staff profile edits)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- ── Enable RLS ────────────────────────────────────────────────────

alter table public.profiles                    enable row level security;
alter table public.influencers                 enable row level security;
alter table public.influencer_platform_metrics enable row level security;
alter table public.safety_audits               enable row level security;
alter table public.campaigns                   enable row level security;
alter table public.deliverables                enable row level security;
alter table public.asset_metrics               enable row level security;
alter table public.asana_connections           enable row level security;
alter table public.asana_sync_log              enable row level security;
alter table public.consent_tokens              enable row level security;
alter table public.creator_consents            enable row level security;

-- ── profiles ──────────────────────────────────────────────────────

create policy "profiles: agency read"
  on public.profiles for select
  to authenticated
  using (public.is_agency_member() or id = auth.uid());

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Role changes on other staff rows are admin-only (can_write would
-- wrongly let managers promote users).
create policy "profiles: admin update all"
  on public.profiles for update
  to authenticated
  using (public.is_admin());

-- ── Workspace tables (agency read · manager/admin write) ──────────

-- influencers
create policy "influencers: agency read"
  on public.influencers for select
  to authenticated
  using (public.is_agency_member());

create policy "influencers: staff insert"
  on public.influencers for insert
  to authenticated
  with check (public.can_write());

create policy "influencers: staff update"
  on public.influencers for update
  to authenticated
  using (public.can_write())
  with check (public.can_write());

create policy "influencers: staff delete"
  on public.influencers for delete
  to authenticated
  using (public.can_write());

-- influencer_platform_metrics
create policy "platform metrics: agency read"
  on public.influencer_platform_metrics for select
  to authenticated
  using (public.is_agency_member());

create policy "platform metrics: staff write"
  on public.influencer_platform_metrics for all
  to authenticated
  using (public.can_write())
  with check (public.can_write());

-- safety_audits
create policy "audits: agency read"
  on public.safety_audits for select
  to authenticated
  using (public.is_agency_member());

create policy "audits: staff write"
  on public.safety_audits for all
  to authenticated
  using (public.can_write())
  with check (public.can_write());

-- campaigns
create policy "campaigns: agency read"
  on public.campaigns for select
  to authenticated
  using (public.is_agency_member());

create policy "campaigns: staff write"
  on public.campaigns for all
  to authenticated
  using (public.can_write())
  with check (public.can_write());

-- deliverables
create policy "deliverables: agency read"
  on public.deliverables for select
  to authenticated
  using (public.is_agency_member());

create policy "deliverables: staff write"
  on public.deliverables for all
  to authenticated
  using (public.can_write())
  with check (public.can_write());

-- asset_metrics
create policy "asset metrics: agency read"
  on public.asset_metrics for select
  to authenticated
  using (public.is_agency_member());

create policy "asset metrics: staff write"
  on public.asset_metrics for all
  to authenticated
  using (public.can_write())
  with check (public.can_write());

-- asana_connections
create policy "asana connections: agency read"
  on public.asana_connections for select
  to authenticated
  using (public.is_agency_member());

create policy "asana connections: staff write"
  on public.asana_connections for all
  to authenticated
  using (public.can_write())
  with check (public.can_write());

-- asana_sync_log — read for ticker; inserts from webhooks use service role
create policy "sync log: agency read"
  on public.asana_sync_log for select
  to authenticated
  using (public.is_agency_member());

create policy "sync log: staff insert"
  on public.asana_sync_log for insert
  to authenticated
  with check (public.can_write());

-- consent_tokens — agency-only; creators interact via consent-api RPC
create policy "consent tokens: agency read"
  on public.consent_tokens for select
  to authenticated
  using (public.is_agency_member());

create policy "consent tokens: staff write"
  on public.consent_tokens for all
  to authenticated
  using (public.can_write())
  with check (public.can_write());

-- creator_consents — agency read; inserts happen in grant_consent() RPC /
-- consent-api Edge Function. No direct client writes (zero-posting guarantee).
create policy "creator consents: agency read"
  on public.creator_consents for select
  to authenticated
  using (public.is_agency_member());

create policy "creator consents: staff revoke"
  on public.creator_consents for update
  to authenticated
  using (public.can_write())
  with check (public.can_write());

-- ── Realtime (WebSocket ticker + Kanban refresh) ─────────────────

alter publication supabase_realtime add table public.asana_sync_log;
alter publication supabase_realtime add table public.deliverables;
