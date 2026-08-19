-- CartaYa: narrowly scoped public menu access and atomic public ordering.
-- The underlying tenant tables remain inaccessible to anon; only these RPCs are public.

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
  if p_slug is null or char_length(p_slug) > 120 then
    return null;
  end if;

  select *
  into restaurant_record
  from public.restaurants
  where slug = lower(trim(p_slug));

  if not found then
    return null;
  end if;

  if p_table_id is not null then
    select jsonb_build_object('id', dining_table.id, 'label', dining_table.label)
    into table_payload
    from public.tables as dining_table
    where dining_table.id = p_table_id
      and dining_table.restaurant_id = restaurant_record.id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', category.id,
        'name', category.name,
        'display_order', category.display_order,
        'items', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', item.id,
              'category_id', item.category_id,
              'name', item.name,
              'description', item.description,
              'price', item.price,
              'image_url', item.image_url,
              'tag', item.tag,
              'display_order', item.display_order
            ) order by item.display_order, item.name, item.id
          )
          from public.menu_items as item
          where item.restaurant_id = restaurant_record.id
            and item.category_id = category.id
            and item.is_available = true
        ), '[]'::jsonb)
      ) order by category.display_order, category.name, category.id
    ),
    '[]'::jsonb
  )
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

create or replace function public.create_public_order(
  p_slug text,
  p_table_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  restaurant_record public.restaurants%rowtype;
  request_count integer;
  valid_count integer;
  calculated_total numeric(12, 2);
  new_order_id uuid;
  table_label text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'El pedido debe incluir una lista de platos' using errcode = '22023';
  end if;

  request_count := jsonb_array_length(p_items);
  if request_count < 1 or request_count > 50 then
    raise exception 'El pedido debe contener entre 1 y 50 partidas' using errcode = '22023';
  end if;

  if p_notes is not null and char_length(p_notes) > 500 then
    raise exception 'Las notas del pedido no pueden superar 500 caracteres' using errcode = '22023';
  end if;

  select *
  into restaurant_record
  from public.restaurants
  where slug = lower(trim(p_slug))
  for share;

  if not found then
    raise exception 'Restaurante no encontrado' using errcode = 'P0002';
  end if;

  if restaurant_record.subscription_tier = 'gratis' then
    raise exception 'El plan Gratis no permite enviar pedidos automáticamente' using errcode = '42501';
  end if;

  if p_table_id is not null then
    select dining_table.label
    into table_label
    from public.tables as dining_table
    where dining_table.id = p_table_id
      and dining_table.restaurant_id = restaurant_record.id;

    if not found then
      raise exception 'La mesa no pertenece a este restaurante' using errcode = '22023';
    end if;
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as requested(menu_item_id uuid, quantity integer, notes text)
    where requested.quantity is null
      or requested.quantity < 1
      or requested.quantity > 99
      or char_length(coalesce(requested.notes, '')) > 200
  ) then
    raise exception 'Cantidad o notas de plato inválidas' using errcode = '22023';
  end if;

  select count(item.id), coalesce(sum(item.price * requested.quantity), 0)
  into valid_count, calculated_total
  from jsonb_to_recordset(p_items) as requested(menu_item_id uuid, quantity integer, notes text)
  left join public.menu_items as item
    on item.id = requested.menu_item_id
    and item.restaurant_id = restaurant_record.id
    and item.is_available = true;

  if valid_count <> request_count then
    raise exception 'Uno o más platos no están disponibles' using errcode = '22023';
  end if;

  insert into public.orders (restaurant_id, table_id, total, notes)
  values (restaurant_record.id, p_table_id, calculated_total, nullif(trim(p_notes), ''))
  returning id into new_order_id;

  insert into public.order_items (order_id, menu_item_id, quantity, unit_price, notes)
  select
    new_order_id,
    item.id,
    requested.quantity,
    item.price,
    nullif(trim(requested.notes), '')
  from jsonb_to_recordset(p_items) as requested(menu_item_id uuid, quantity integer, notes text)
  join public.menu_items as item
    on item.id = requested.menu_item_id
    and item.restaurant_id = restaurant_record.id
    and item.is_available = true;

  return jsonb_build_object(
    'order_id', new_order_id,
    'total', calculated_total,
    'phone', restaurant_record.phone,
    'table_label', table_label
  );
end;
$$;

revoke all on function public.get_public_menu(text, uuid) from public;
revoke all on function public.get_public_menu(text, uuid) from anon;
revoke all on function public.get_public_menu(text, uuid) from authenticated;
grant execute on function public.get_public_menu(text, uuid) to anon, authenticated;

revoke all on function public.create_public_order(text, uuid, jsonb, text) from public;
revoke all on function public.create_public_order(text, uuid, jsonb, text) from anon;
revoke all on function public.create_public_order(text, uuid, jsonb, text) from authenticated;
grant execute on function public.create_public_order(text, uuid, jsonb, text) to service_role;

-- Defense in depth: anonymous clients still receive no direct table privileges.
revoke all on public.restaurants, public.profiles, public.categories, public.menu_items,
  public.tables, public.orders, public.order_items from anon;
