-- CartaYa: atomic category ordering and an explicit database-level Gratis limit.

create or replace function public.enforce_menu_item_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tier public.subscription_tier;
  current_count integer;
begin
  -- Serialize menu inserts for the same restaurant so concurrent requests cannot exceed the limit.
  select subscription_tier into tier
  from public.restaurants
  where id = new.restaurant_id
  for update;

  if tier = 'gratis' then
    select count(*) into current_count
    from public.menu_items
    where restaurant_id = new.restaurant_id
      and id <> new.id;

    if current_count >= 20 then
      raise exception 'Llegaste al límite del plan Gratis — mejora tu plan para agregar más'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.reorder_categories(p_ordered_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null or coalesce(array_length(p_ordered_ids, 1), 0) = 0 then
    raise exception 'Authentication and category ids are required' using errcode = '42501';
  end if;

  if cardinality(p_ordered_ids) <> cardinality(array(select distinct unnest(p_ordered_ids))) then
    raise exception 'Duplicate category ids are not allowed' using errcode = '22023';
  end if;

  update public.categories as category
  set display_order = ordered.position - 1
  from unnest(p_ordered_ids) with ordinality as ordered(id, position)
  where category.id = ordered.id;

  get diagnostics updated_count = row_count;
  if updated_count <> cardinality(p_ordered_ids) then
    raise exception 'One or more categories are unavailable' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.reorder_categories(uuid[]) from public;
revoke all on function public.reorder_categories(uuid[]) from anon;
grant execute on function public.reorder_categories(uuid[]) to authenticated;
