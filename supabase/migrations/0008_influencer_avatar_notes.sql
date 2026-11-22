-- ══════════════════════════════════════════════════════════════════
-- 9-16 IMP · 0008 — Influencer avatar upload & internal notes
--
-- Add-Influencer modal gains a profile photo picker and an agency
-- notes field: avatars live in a PUBLIC ims-avatars bucket (public
-- read via bucket flag; staff-only writes), notes in a new column.
-- ══════════════════════════════════════════════════════════════════

alter table public.influencers
  add column internal_notes text;   -- note from the registering agent

insert into storage.buckets (id, name, public)
values ('ims-avatars', 'ims-avatars', true)
on conflict (id) do nothing;

create policy "ims avatars: staff write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'ims-avatars' and public.can_write());

create policy "ims avatars: staff update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'ims-avatars' and public.can_write())
  with check (bucket_id = 'ims-avatars' and public.can_write());

create policy "ims avatars: staff delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'ims-avatars' and public.can_write());
