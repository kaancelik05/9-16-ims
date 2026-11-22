-- ══════════════════════════════════════════════════════════════════
-- 9-16 IMP · 0005 — Runtime fixes discovered during Faz 0 bootstrap
--
-- handle_new_user(): the CASE bootstrap expression typed its branches as
-- text, and text→user_role has no implicit assignment cast — the trigger
-- raised "column role is of type user_role but expression is of type
-- text" on the very first signup (auth admin API returned a generic
-- "Database error creating new user"). Explicit enum casts fix it.
-- ══════════════════════════════════════════════════════════════════

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
    case when (select count(*) from public.profiles) = 0
      then 'admin'::public.user_role
      else 'viewer'::public.user_role
    end
  );
  return new;
end;
$$;
