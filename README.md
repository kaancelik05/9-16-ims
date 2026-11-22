# 9-16 IMP · Influencer Management Platform

Enterprise B2B SaaS platform for short-form **9:16 vertical video** influencer
marketing — creator discovery, on-demand AI brand safety audits, bidirectional
**Asana** synchronization, cross-platform campaign analytics and tokenized
creator consent.

| Layer    | Tech                                                                 |
| -------- | -------------------------------------------------------------------- |
| Frontend | Angular 21 (zoneless, signals, standalone) + Tailwind CSS v4         |
| Backend  | Supabase — Postgres, Auth, Realtime, Storage, Edge Functions (Deno)  |
| Sync     | Asana REST + Webhooks (PAT kept server-side in Edge Function secrets) |

Full architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Modules

| # | Module                          | Route                     |
| - | ------------------------------- | ------------------------- |
| 1 | Influencer Discovery & Directory | `/influencers`            |
| 2 | Add Influencer Modal            | `/influencers` (modal)    |
| 3 | Profile & AI Safety Audit       | `/influencers/:id`        |
| 4 | Campaign Workflow · Asana Sync  | `/campaigns`              |
| 5 | Campaign Analytics              | `/analytics`              |
| 6 | Creator Consent Portal          | `/consent?token=…`        |

## Getting started

```bash
npm install
npm start          # → http://localhost:4200
```

Configure Supabase credentials in
`src/environments/environment.development.ts` (local stack) and
`src/environments/environment.ts` (production):

```ts
export const environment = {
  production: false,
  supabase: {
    url: 'http://127.0.0.1:54321',
    anonKey: 'YOUR-SUPABASE-ANON-KEY',
  },
};
```

### Database (local Supabase stack)

```bash
supabase link --project-ref <ref>        # or: supabase init + supabase start
supabase db reset                        # applies migrations + seed.sql
supabase functions serve                 # asana-proxy · asana-webhook · consent-api
```

### Asana secrets

```bash
supabase secrets set ASANA_ACCESS_TOKEN=<personal_access_token>
supabase secrets set APP_URL=https://your-app.example.com
```

## Scripts

| Command         | Purpose                            |
| --------------- | ---------------------------------- |
| `npm start`     | Dev server (`localhost:4200`)      |
| `npm run build` | Production build (`dist/`)         |
| `npm test`      | Unit tests (Vitest)                |

## Security notes

- Row Level Security on every table (`supabase/migrations/0002_rls.sql`)
- Asana PAT never reaches the browser — only Edge Functions
- Creator consents are read-only by schema (zero-posting guarantee)
- Consent links are single-use, expiring tokens
