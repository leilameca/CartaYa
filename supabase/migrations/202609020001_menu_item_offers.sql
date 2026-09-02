alter table public.menu_items
  add column if not exists offer_price numeric(12, 2);

alter table public.menu_items
  drop constraint if exists menu_items_offer_price_check;

alter table public.menu_items
  add constraint menu_items_offer_price_check
  check (offer_price is null or (offer_price >= 0 and offer_price < price));

create or replace function public.get_public_menu(p_slug text, p_table_id uuid default null)
returns jsonb language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare restaurant_record public.restaurants%rowtype;
declare table_payload jsonb := null;
declare categories_payload jsonb := '[]'::jsonb;
begin
  if p_slug is null or char_length(p_slug) > 120 then return null; end if;
  select * into restaurant_record from public.restaurants where slug = lower(trim(p_slug));
  if not found then return null; end if;
  if p_table_id is not null and restaurant_record.subscription_tier in ('plus', 'pro') then
    select jsonb_build_object('id', t.id, 'label', t.label) into table_payload
    from public.tables t where t.id = p_table_id and t.restaurant_id = restaurant_record.id;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'display_order', c.display_order,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id, 'category_id', i.category_id, 'name', i.name, 'description', i.description,
      'price', i.price, 'offer_price', i.offer_price, 'image_url', i.image_url, 'tag', i.tag,
      'display_order', i.display_order
    ) order by i.display_order, i.name, i.id) from public.menu_items i
      where i.restaurant_id = restaurant_record.id and i.category_id = c.id and i.is_available), '[]'::jsonb)
  ) order by c.display_order, c.name, c.id), '[]'::jsonb)
  into categories_payload from public.categories c where c.restaurant_id = restaurant_record.id;
  return jsonb_build_object(
    'restaurant', jsonb_build_object(
      'id', restaurant_record.id, 'name', restaurant_record.name, 'slug', restaurant_record.slug,
      'logo_url', restaurant_record.logo_url, 'primary_color', restaurant_record.primary_color,
      'secondary_color', restaurant_record.secondary_color, 'menu_style', restaurant_record.menu_style,
      'phone', restaurant_record.phone, 'address', restaurant_record.address,
      'opening_hours', restaurant_record.opening_hours, 'subscription_tier', restaurant_record.subscription_tier
    ),
    'table', table_payload, 'table_valid', p_table_id is null or table_payload is not null,
    'categories', categories_payload
  );
end;
$$;

revoke all on function public.get_public_menu(text, uuid) from public, anon, authenticated;
grant execute on function public.get_public_menu(text, uuid) to anon, authenticated;

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

  select * into restaurant_record
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
    select dining_table.label into table_label
    from public.tables as dining_table
    where dining_table.id = p_table_id and dining_table.restaurant_id = restaurant_record.id;
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

  select count(item.id), coalesce(sum(coalesce(item.offer_price, item.price) * requested.quantity), 0)
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
  select new_order_id, item.id, requested.quantity, coalesce(item.offer_price, item.price), nullif(trim(requested.notes), '')
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

revoke all on function public.create_public_order(text, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_public_order(text, uuid, jsonb, text) to service_role;
