-- ══════════════════════════════════════════════════════════════════
-- 9-16 IMP · 0001 — Core schema
-- Influencer Management Platform (short-form 9:16 vertical video)
-- ══════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Enums ──────────────────────────────────────────────────────────

create type public.user_role as enum ('admin', 'manager', 'viewer');

create type public.platform_type as enum ('instagram', 'tiktok', 'youtube', 'snapchat');

create type public.influencer_tier as enum ('tier1_kol', 'mid_tier', 'nano');

create type public.influencer_status as enum ('prospect', 'open', 'assigned');

-- 5-stage Kanban pipeline (Module 4)
create type public.campaign_stage as enum (
  'selection_pitching',
  'briefing_contract',
  'content_creation',
  'scheduled_live',
  'performance_reporting'
);

create type public.approval_status as enum (
  'pending',
  'in_review',
  'approved',
  'revision',
  'rejected'
);

create type public.audit_status as enum ('in_progress', 'green_flag', 'red_flag');

create type public.sync_direction as enum ('inbound', 'outbound');

create type public.sync_status as enum ('success', 'conflict', 'failed');

-- ── Tables ─────────────────────────────────────────────────────────

-- Agency staff extension of auth.users
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.user_role not null default 'viewer',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Module 1/2/3 — creator roster
create table public.influencers (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text not null,
  primary_handle     text,                  -- e.g. @clara.moves
  email              text,
  phone              text,
  region             text,
  niche              text,                  -- micro-niche tag
  category           text,                  -- Lifestyle / Tech / Beauty / Gaming…
  tier               public.influencer_tier not null default 'mid_tier',
  status             public.influencer_status not null default 'prospect',
  verified           boolean not null default false,
  agent_name         text,
  agent_contact      text,
  rate_card          numeric(12,2),         -- baseline 9:16 bundle rate
  currency           text not null default 'USD',
  timezone           text,
  exclusivity_notes  text,                  -- category non-compete monitor
  tags               text[] not null default '{}',
  asana_gid          text,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index influencers_category_idx    on public.influencers (category);
create index influencers_tier_idx        on public.influencers (tier);
create index influencers_status_idx      on public.influencers (status);
create index influencers_handle_idx      on public.influencers (lower(primary_handle));
create index influencers_tags_idx        on public.influencers using gin (tags);

-- Cross-platform telemetry grid (IG / TT / YT / SC)
create table public.influencer_platform_metrics (
  id               uuid primary key default gen_random_uuid(),
  influencer_id    uuid not null references public.influencers (id) on delete cascade,
  platform         public.platform_type not null,
  handle           text,
  followers        bigint  not null default 0,
  engagement_rate  numeric(5,2) not null default 0,   -- %
  avg_views        bigint,
  viral_index      numeric(5,2),                      -- TikTok velocity
  story_reach      bigint,                            -- IG stories
  reel_retention   numeric(5,2),                      -- IG reels %
  metrics          jsonb not null default '{}',       -- future per-platform extras
  updated_at       timestamptz not null default now(),
  unique (influencer_id, platform)
);

create index ipm_followers_idx on public.influencer_platform_metrics (followers);
create index ipm_engagement_idx on public.influencer_platform_metrics (engagement_rate);

-- Module 3 — on-demand AI brand safety certification
create table public.safety_audits (
  id                  uuid primary key default gen_random_uuid(),
  influencer_id       uuid not null references public.influencers (id) on delete cascade,
  status              public.audit_status not null default 'in_progress',
  score               numeric(5,2),          -- e.g. 99.4
  sentiment_positive  numeric(5,2),
  sentiment_neutral   numeric(5,2),
  sentiment_negative  numeric(5,2),
  ftc_compliant       boolean,
  toxicity_score      numeric(5,2),
  mentions_scanned    integer,
  months_covered      integer not null default 36,
  report              jsonb not null default '{}',
  triggered_by        uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

create index safety_audits_influencer_idx on public.safety_audits (influencer_id, created_at desc);

-- Module 4/5 — campaigns & deliverables
create table public.campaigns (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  client_name        text,
  status             text not null default 'active',   -- draft/active/completed/archived
  budget             numeric(14,2) not null default 0,
  spend              numeric(14,2) not null default 0,
  currency           text not null default 'USD',
  start_date         date,
  end_date           date,
  asana_project_gid  text,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index campaigns_status_idx on public.campaigns (status);

create table public.deliverables (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid not null references public.campaigns (id) on delete cascade,
  influencer_id      uuid references public.influencers (id) on delete set null,
  stage              public.campaign_stage not null default 'selection_pitching',
  title              text not null,
  content_format     text,                     -- 'IG Reels' / 'TikTok 9:16' / 'YouTube Shorts'…
  fee                numeric(12,2),
  due_date           date,
  approval_status    public.approval_status not null default 'pending',
  asana_task_gid     text,
  asana_task_label   text,                     -- human label e.g. ASANA-#88392
  asset_url          text,
  asset_filename     text,                     -- e.g. Draft_V2_4K_9x16.mp4
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index deliverables_campaign_idx on public.deliverables (campaign_id, stage);
create index deliverables_influencer_idx on public.deliverables (influencer_id);
create index deliverables_asana_gid_idx on public.deliverables (asana_task_gid);
create unique index deliverables_asana_gid_uniq on public.deliverables (asana_task_gid)
  where asana_task_gid is not null;

-- Module 5 — per-asset performance telemetry
create table public.asset_metrics (
  id              uuid primary key default gen_random_uuid(),
  deliverable_id  uuid not null references public.deliverables (id) on delete cascade,
  platform        public.platform_type,
  reach           bigint not null default 0,
  impressions     bigint not null default 0,
  views           bigint not null default 0,
  likes           bigint not null default 0,
  comments        integer not null default 0,
  shares          integer not null default 0,
  swipe_ups       integer not null default 0,
  vcr             numeric(5,2),               -- video completion rate %
  sentiment_pct   numeric(5,2),               -- positive sentiment %
  cpe             numeric(10,4),              -- cost per engagement
  emv             numeric(14,2),              -- earned media value
  captured_at     timestamptz not null default now()
);

create index asset_metrics_deliverable_idx on public.asset_metrics (deliverable_id);

-- Module 4 — Asana connection registry (one row per linked project)
create table public.asana_connections (
  id              uuid primary key default gen_random_uuid(),
  workspace_gid   text,
  project_gid     text not null,
  project_name    text,
  webhook_id      text,
  webhook_secret  text,                       -- X-Hook-Secret from Asana handshake
  status          text not null default 'connected',   -- connected/disconnected/error
  last_sync_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Module 4 — bidirectional sync ledger (feeds the realtime event ticker)
create table public.asana_sync_log (
  id           uuid primary key default gen_random_uuid(),
  direction    public.sync_direction not null,
  entity_type  text not null,                 -- deliverable / influencer / comment…
  entity_id    text,
  event        text,                          -- e.g. task.updated / task.created
  status       public.sync_status not null default 'success',
  latency_ms   integer,
  message      text,
  payload      jsonb,
  created_at   timestamptz not null default now()
);

create index asana_sync_log_created_idx on public.asana_sync_log (created_at desc);
create index asana_sync_log_entity_idx on public.asana_sync_log (entity_type, entity_id);

-- Module 6 — single-use consent tokens (tokenized creator links)
create table public.consent_tokens (
  id            uuid primary key default gen_random_uuid(),
  influencer_id uuid not null references public.influencers (id) on delete cascade,
  token         text not null unique,
  expires_at    timestamptz not null,
  used_at       timestamptz,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index consent_tokens_token_idx on public.consent_tokens (token);

-- Module 6 — granted permissions
create table public.creator_consents (
  id               uuid primary key default gen_random_uuid(),
  influencer_id    uuid not null references public.influencers (id) on delete cascade,
  token_id         uuid references public.consent_tokens (id) on delete set null,
  scopes           jsonb not null default '{}',   -- {read_only_analytics: true, …}
  terms_accepted   boolean not null default false,
  terms_version    text,
  whatsapp_notify  boolean not null default false,
  email_notify     boolean not null default false,
  granted_at       timestamptz,
  revoked_at       timestamptz,
  created_at       timestamptz not null default now()
);

create index creator_consents_influencer_idx on public.creator_consents (influencer_id);
