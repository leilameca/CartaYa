-- Called only by the authenticated server action using its service-role client.
alter table public.restaurants add column demo_imported_at timestamptz;

create or replace function public.import_demo_menu(p_user_id uuid, p_menu jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  restaurant public.restaurants%rowtype;
  category jsonb;
  dish jsonb;
  new_category uuid;
  category_map jsonb := '{}'::jsonb;
  position integer := 0;
begin
  select r.* into restaurant from public.restaurants r
    join public.profiles p on p.restaurant_id = r.id
    join auth.users u on u.id = p.id
    where p.id = p_user_id and p.role = 'owner' and u.email_confirmed_at is not null
    for update of r;
  if not found then raise exception 'DEMO_OWNER'; end if;
  -- Serialize against concurrent edits while checking the empty destination.
  lock table public.categories, public.menu_items in share row exclusive mode;
  if restaurant.demo_imported_at is not null
    or exists (select 1 from public.menu_items where restaurant_id = restaurant.id)
    or (exists (select 1 from public.categories where restaurant_id = restaurant.id)
      and ((select count(*) from public.categories where restaurant_id = restaurant.id) <> 4
        or exists (select 1 from public.categories where restaurant_id = restaurant.id
          and name not in ('Entradas', 'Platos fuertes', 'Bebidas', 'Postres'))))
    then raise exception 'DEMO_EXISTS'; end if;
  if jsonb_typeof(p_menu->'items') <> 'array' or jsonb_typeof(p_menu->'categories') <> 'array'
    or jsonb_array_length(p_menu->'items') not between 1 and 500
    or jsonb_array_length(p_menu->'categories') not between 1 and 100 then raise exception 'DEMO_INVALID'; end if;
  if restaurant.subscription_tier = 'gratis' and jsonb_array_length(p_menu->'items') > 20 then raise exception 'DEMO_LIMIT'; end if;
  delete from public.categories where restaurant_id = restaurant.id;
  for category in select value from jsonb_array_elements(p_menu->'categories') loop
    insert into public.categories(restaurant_id, name, display_order)
      values (restaurant.id, category->>'name', position) returning id into new_category;
    category_map := category_map || jsonb_build_object(category->>'id', new_category);
    position := position + 1;
  end loop;
  position := 0;
  for dish in select value from jsonb_array_elements(p_menu->'items') loop
    insert into public.menu_items(restaurant_id, category_id, name, description, price, offer_price, tag, is_available, display_order)
    values (restaurant.id, (category_map->>(dish->>'categoryId'))::uuid, dish->>'name', dish->>'description',
      (dish->>'price')::numeric, case when (dish->>'isOffer')::boolean then (dish->>'offerPrice')::numeric else null end,
      (dish->>'tag')::public.menu_item_tag, (dish->>'isAvailable')::boolean, position);
    position := position + 1;
  end loop;
  update public.restaurants set demo_imported_at = now(),
    primary_color = case when subscription_tier <> 'gratis' then p_menu->'restaurant'->>'primaryColor' else primary_color end,
    secondary_color = case when subscription_tier <> 'gratis' then p_menu->'restaurant'->>'secondaryColor' else secondary_color end,
    menu_style = case when subscription_tier <> 'gratis' then p_menu->'restaurant'->>'menuStyle' else menu_style end
    where id = restaurant.id;
end;
$$;
revoke all on function public.import_demo_menu(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_demo_menu(uuid, jsonb) to service_role;
