-- ══════════════════════════════════════════════════════════════════
-- 9-16 IMP · 0007 — deliverables upsert fix (Faz 3 live sync)
--
-- The webhook/proxy upsert (`onConflict: 'asana_task_gid'`) emits a
-- plain ON CONFLICT (asana_task_gid), which does not match the PARTIAL
-- unique index from 0001 → every sync upsert failed with "no unique or
-- exclusion constraint matching the ON CONFLICT specification". A full
-- unique index fixes it — Postgres treats NULLs as distinct, so
-- deliverables without an Asana gid coexist fine.
-- ══════════════════════════════════════════════════════════════════

drop index if exists public.deliverables_asana_gid_uniq;
create unique index deliverables_asana_gid_uniq
  on public.deliverables (asana_task_gid);
