-- CartaYa: enforce subscription entitlements at the database boundary.
-- Frontend locks are UX only; these policies remain authoritative for the public API.

create or replace function public.can_use_orders(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.profiles as profile
    join public.restaurants as restaurant on restaurant.id = profile.restaurant_id
    where profile.id = auth.uid()
      and profile.role in ('owner', 'staff')
      and profile.restaurant_id = target_restaurant_id
      and restaurant.subscription_tier in ('plus', 'pro')
  );
$$;

create or replace function public.can_use_table_qr(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.can_use_orders(target_restaurant_id);
$$;

create or replace function public.can_use_kds(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.profiles as profile
    join public.restaurants as restaurant on restaurant.id = profile.restaurant_id
    where profile.id = auth.uid()
      and profile.role in ('owner', 'staff')
      and profile.restaurant_id = target_restaurant_id
      and restaurant.subscription_tier = 'pro'
  );
$$;

create or replace function public.can_access_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.orders
    where id = target_order_id
      and (public.is_superadmin() or public.can_use_orders(restaurant_id))
  );
$$;

create or replace function public.can_manage_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.orders
    where id = target_order_id
      and public.can_use_orders(restaurant_id)
  );
$$;

revoke all on function public.can_use_orders(uuid) from public, anon;
revoke all on function public.can_use_table_qr(uuid) from public, anon;
revoke all on function public.can_use_kds(uuid) from public, anon;
grant execute on function public.can_use_orders(uuid) to authenticated;
grant execute on function public.can_use_table_qr(uuid) to authenticated;
grant execute on function public.can_use_kds(uuid) to authenticated;

drop policy if exists tables_select on public.tables;
drop policy if exists tables_insert on public.tables;
drop policy if exists tables_update on public.tables;
drop policy if exists tables_delete on public.tables;
create policy tables_select on public.tables for select to authenticated
  using (public.is_superadmin() or public.can_use_table_qr(restaurant_id));
create policy tables_insert on public.tables for insert to authenticated
  with check (public.can_use_table_qr(restaurant_id));
create policy tables_update on public.tables for update to authenticated
  using (public.can_use_table_qr(restaurant_id)) with check (public.can_use_table_qr(restaurant_id));
create policy tables_delete on public.tables for delete to authenticated
  using (public.can_use_table_qr(restaurant_id));

drop policy if exists orders_select on public.orders;
drop policy if exists orders_insert on public.orders;
drop policy if exists orders_update on public.orders;
drop policy if exists orders_delete on public.orders;
create policy orders_select on public.orders for select to authenticated
  using (public.is_superadmin() or public.can_use_orders(restaurant_id));
create policy orders_insert on public.orders for insert to authenticated
  with check (public.can_use_orders(restaurant_id));
create policy orders_update on public.orders for update to authenticated
  using (public.can_use_kds(restaurant_id)) with check (public.can_use_kds(restaurant_id));
create policy orders_delete on public.orders for delete to authenticated
  using (public.can_use_orders(restaurant_id));

-- Orders are created only through the validated service-role RPC. Dashboard clients
-- can read eligible orders and Pro clients can update only the status column.
revoke insert, update, delete on public.orders from authenticated;
revoke insert, update, delete on public.order_items from authenticated;
grant select on public.orders, public.order_items to authenticated;
grant update (status) on public.orders to authenticated;

-- A downgraded Gratis restaurant must not keep accepting an old table-specific QR.
create or replace function public.get_public_menu(
  p_slug text,
  p_table_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  restaurant_record public.restaurants%rowtype;
  table_payload jsonb := null;
  categories_payload jsonb := '[]'::jsonb;
begin
  if p_slug is null or char_length(p_slug) > 120 then return null; end if;

  select * into restaurant_record
  from public.restaurants
  where slug = lower(trim(p_slug));
  if not found then return null; end if;

  if p_table_id is not null and restaurant_record.subscription_tier in ('plus', 'pro') then
    select jsonb_build_object('id', dining_table.id, 'label', dining_table.label)
    into table_payload
    from public.tables as dining_table
    where dining_table.id = p_table_id
      and dining_table.restaurant_id = restaurant_record.id;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', category.id,
      'name', category.name,
      'display_order', category.display_order,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', item.id,
          'category_id', item.category_id,
          'name', item.name,
          'description', item.description,
          'price', item.price,
          'image_url', item.image_url,
          'tag', item.tag,
          'display_order', item.display_order
        ) order by item.display_order, item.name, item.id)
        from public.menu_items as item
        where item.restaurant_id = restaurant_record.id
          and item.category_id = category.id
          and item.is_available = true
      ), '[]'::jsonb)
    ) order by category.display_order, category.name, category.id
  ), '[]'::jsonb)
  into categories_payload
  from public.categories as category
  where category.restaurant_id = restaurant_record.id;

  return jsonb_build_object(
    'restaurant', jsonb_build_object(
      'id', restaurant_record.id,
      'name', restaurant_record.name,
      'slug', restaurant_record.slug,
      'logo_url', restaurant_record.logo_url,
      'primary_color', restaurant_record.primary_color,
      'phone', restaurant_record.phone,
      'address', restaurant_record.address,
      'opening_hours', restaurant_record.opening_hours,
      'subscription_tier', restaurant_record.subscription_tier
    ),
    'table', table_payload,
    'table_valid', p_table_id is null or table_payload is not null,
    'categories', categories_payload
  );
end;
$$;

revoke all on function public.get_public_menu(text, uuid) from public, anon, authenticated;
grant execute on function public.get_public_menu(text, uuid) to anon, authenticated;
