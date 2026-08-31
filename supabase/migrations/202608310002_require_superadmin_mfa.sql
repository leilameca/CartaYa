-- A superadmin session must prove a second factor before tenant-wide reads.
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'superadmin'
      and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  );
$$;

create or replace function public.can_access_restaurant(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        (role = 'superadmin' and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2')
        or (role in ('owner', 'mesero', 'cocina') and restaurant_id = target_restaurant_id)
      )
  );
$$;

revoke all on function public.is_superadmin() from public;
revoke all on function public.can_access_restaurant(uuid) from public;
grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.can_access_restaurant(uuid) to authenticated;
