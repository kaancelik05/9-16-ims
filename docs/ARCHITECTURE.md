# 9-16 IMP — Architecture

Enterprise influencer management platform for short-form 9:16 vertical video
campaigns. Angular 21 frontend · Supabase (Postgres, Auth, Realtime, Edge
Functions) · Bidirectional Asana synchronization.

> **[INTEGRATION-PLAN.md](./INTEGRATION-PLAN.md)** — eksik akış envanteri,
> backend hata/schema geliştirme planı, Asana webhook/rate-limit analizi ve
> consent-first platform veri stratejisi (Instagram/YouTube/TikTok/Snapchat)
> tek dokümanda; uygulama fazları oradan yönetilir.

```
┌──────────────────────────── Browser ────────────────────────────┐
│  Angular 21 (zoneless, signals, standalone)                     │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ Directory │ │ Profile & │ │ Campaign │ │ Analytics (Mod 5) │  │
│  │ (Mod 1-2)│ │ Audit(3)  │ │ Kanban(4)│ └───────────────────┘  │
│  └────┬─────┘ └────┬──────┘ └────┬─────┘                        │
│       └───────┬─────┴─────────────┘                              │
│         feature services (signals)                               │
│               │                                                  │
│   ┌───────────┴───────────────┐   ┌───────────────────────┐     │
│   │ supabase-js (anon + RLS)  │   │ Supabase Realtime WS  │     │
│   └───────────┬───────────────┘   └───────────▲───────────┘     │
└───────────────┼───────────────────────────────┼─────────────────┘
                ▼                               │
┌─────────────── Supabase ──────────────────────┴─────────────────┐
│  Postgres (RLS)  ·  Auth  ·  Storage                            │
│  ── asana_sync_log / deliverables  →  realtime publication ──┐  │
│                                                              │  │
│  Edge Functions (Deno)                                       │  │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────┐        │  │
│  │ asana-proxy  │ │ asana-webhook  │ │ consent-api  │        │  │
│  │ (JWT, out ↗) │ │ (public, in ↘) │ │ (JWT, staff) │        │  │
│  └──────┬───────┘ └───────┬────────┘ └──────────────┘        │  │
└─────────┼─────────────────┼──────────────────────────────────┼──┘
          ▼                 │                                  │
   Asana REST API  ◀────────┘  (PAT lives only in secrets)      │
   Webhooks ─────────────────▶ /functions/asana-webhook         │
```

## Stack

| Layer      | Technology                                                      |
| ---------- | --------------------------------------------------------------- |
| Frontend   | Angular 21 · zoneless CD · signals · standalone components      |
| Styling    | Tailwind CSS v4 (`@theme` tokens, Kinetic Executive Dark)       |
| Font       | Plus Jakarta Sans (400/500/600/700 via Fontsource)               |
| Database   | Supabase Postgres (RLS on every table)                          |
| Auth       | Supabase Auth (email + password; profiles auto-provisioned)     |
| Realtime   | Supabase Realtime — `asana_sync_log` + `deliverables` channels  |
| Asana      | REST + Webhooks through Edge Functions (`asana-proxy` / `asana-webhook`) |

## Source layout

```
src/app/
├── core/                     # singletons & platform services
│   ├── auth/                 # AuthService (signals), authGuard
│   ├── supabase/             # typed client + database.types.ts
│   ├── asana/                # AsanaApiService (proxy), AsanaSyncService (realtime)
│   └── layout/               # Enterprise Shell (sidebar/topbar)
├── features/
│   ├── auth/login/           # agency sign-in
│   ├── influencers/          # Module 1 (Directory) · Module 3 (Profile & Audit)
│   ├── campaigns/            # Module 4 (Kanban + Asana Sync Center)
│   ├── analytics/            # Module 5 (Performance)
│   └── consent/              # Module 6 (creator portal — outside shell)
├── shared/
│   ├── ui/                   # Icon, Badge, Button, KpiCard, Modal, EmptyState, PageHeader
│   └── models/               # domain models + display label maps
supabase/
├── migrations/               # 0001 schema · 0002 RLS · 0003 triggers & RPCs
├── functions/                # asana-proxy · asana-webhook · consent-api (+ _shared)
├── seed.sql
└── config.toml
```

## Module → route map

| Module | Route                       | Notes                              |
| ------ | --------------------------- | ---------------------------------- |
| —      | `/login`                    | agency sign-in                     |
| 1      | `/influencers`              | directory, filters, bento cards    |
| 2      | `/influencers` (modal)      | add-creator modal w/ auto-fetch    |
| 3      | `/influencers/:id`          | profile + AI safety audit          |
| 4      | `/campaigns`                | Kanban + telemetry + event ticker  |
| 5      | `/analytics`                | KPIs, telemetry table, exports     |
| 6      | `/consent?token=…`          | shell-less creator consent portal  |

## Asana bidirectional sync

**Outbound (App → Asana)** — `AsanaApiService` → `asana-proxy` (JWT-verified):
task CRUD, custom fields (Content Format, Deliverable Fee, Approval Status),
comments. Every mutation is logged to `asana_sync_log`.

**Inbound (Asana → App)** — Asana webhook → `asana-webhook` (public):
X-Hook-Secret handshake on creation, then event batches → task fetch →
deliverable upsert (section → stage mapping) → `asana_sync_log` insert →
Supabase Realtime broadcast → Kanban + ticker update live in the browser.

**Telemetry** — connection status = Realtime channel state; sync ratio,
conflicts and latency all derive from `asana_sync_log`.

The Asana PAT is stored only in Edge Function secrets:
`supabase secrets set ASANA_ACCESS_TOKEN=…/personal_access_token`

## Security model

- **RLS everywhere**: `is_agency_member()` gates reads; `can_write()`
  (admin/manager) gates writes. See `supabase/migrations/0002_rls.sql`.
- **Zero-posting guarantee**: creator consents are granted through the
  `grant_consent` RPC which whitelists scopes server-side to
  `read_only_analytics` — no write scope exists in the schema at all.
- **Tokenized consent**: single-use, expiring tokens (`consent_tokens`);
  the token itself is the authorization for the anon-callable RPCs.
- **First user bootstraps as admin** via `handle_new_user()`; later
  signups land as `viewer` until promoted.
- **PAT isolation**: Asana credentials never leave Edge Functions.

## Local development

```bash
npm install
npm start                     # Angular dev server (localhost:4200)

# Supabase (requires supabase CLI)
supabase start                # local stack incl. migrations + seed
supabase functions serve      # Edge Functions on :54321
```

Fill in `src/environments/environment.development.ts` with the local
stack URL + anon key. Set `ASANA_ACCESS_TOKEN` as a function secret
before exercising sync flows.
