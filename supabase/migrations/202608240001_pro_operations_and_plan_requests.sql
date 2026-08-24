-- CartaYa: Pro staff access, waiter ownership, service calls, plan requests and tiered theming.

alter table public.restaurants
  add column if not exists secondary_color text not null default '#00A86B',
  add column if not exists menu_style text not null default 'moderno',
  add column if not exists internal_primary_color text not null default '#FF6B35',
  add column if not exists internal_secondary_color text not null default '#00A86B';

alter table public.restaurants
  add constraint restaurants_secondary_color_hex check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint restaurants_internal_primary_color_hex check (internal_primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint restaurants_internal_secondary_color_hex check (internal_secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint restaurants_menu_style_valid check (menu_style in ('moderno', 'clasico', 'calido'));

alter table public.profiles
  add column if not exists staff_username text,
  add column if not exists staff_email text;

create unique index if not exists profiles_restaurant_staff_username_unique
  on public.profiles (restaurant_id, lower(staff_username))
  where staff_username is not null;

alter table public.orders add column if not exists assigned_waiter_id uuid;
alter table public.orders
  add constraint orders_assigned_waiter_tenant_fk
  foreign key (assigned_waiter_id, restaurant_id)
  references public.profiles(id, restaurant_id);
create index if not exists orders_assigned_waiter_idx on public.orders(assigned_waiter_id);

create table public.table_service_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid not null references public.tables(id) on delete cascade,
  waiter_id uuid not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  claimed_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  closed_at timestamptz,
  foreign key (waiter_id, restaurant_id) references public.profiles(id, restaurant_id)
);
create unique index table_service_sessions_one_active
  on public.table_service_sessions(table_id) where status = 'active';
create index table_service_sessions_waiter_idx on public.table_service_sessions(waiter_id, status);

create table public.table_service_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid not null references public.tables(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'resolved', 'cancelled')),
  claimed_by uuid,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  resolved_at timestamptz,
  foreign key (claimed_by, restaurant_id) references public.profiles(id, restaurant_id)
);
create unique index table_service_requests_one_pending
  on public.table_service_requests(table_id) where status = 'pending';
create index table_service_requests_restaurant_status_idx on public.table_service_requests(restaurant_id, status, created_at);

create table public.plan_change_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  current_tier public.subscription_tier not null,
  requested_tier public.subscription_tier not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
create unique index plan_change_requests_one_pending
  on public.plan_change_requests(restaurant_id) where status = 'pending';

alter table public.table_service_sessions enable row level security;
alter table public.table_service_requests enable row level security;
alter table public.plan_change_requests enable row level security;

create policy service_sessions_select on public.table_service_sessions for select to authenticated
  using (public.can_access_restaurant(restaurant_id));
create policy service_requests_select on public.table_service_requests for select to authenticated
  using (public.can_access_restaurant(restaurant_id));
create policy plan_requests_select on public.plan_change_requests for select to authenticated
  using (public.is_superadmin() or public.can_manage_restaurant(restaurant_id));
create policy plan_requests_insert on public.plan_change_requests for insert to authenticated
  with check (requested_by = auth.uid() and public.can_manage_restaurant(restaurant_id));

grant select on public.table_service_sessions, public.table_service_requests to authenticated;
grant select, insert on public.plan_change_requests to authenticated;
revoke all on public.table_service_sessions, public.table_service_requests, public.plan_change_requests from anon;

create or replace function public.claim_table_service_request(p_request_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare request_record public.table_service_requests%rowtype;
declare profile_record public.profiles%rowtype;
declare session_id uuid;
begin
  select * into profile_record from public.profiles where id = auth.uid();
  if not found or profile_record.role <> 'mesero' then
    raise exception 'Solo un mesero puede aceptar la solicitud' using errcode = '42501';
  end if;

  update public.table_service_requests
  set status = 'claimed', claimed_by = auth.uid(), claimed_at = now()
  where id = p_request_id and restaurant_id = profile_record.restaurant_id and status = 'pending'
  returning * into request_record;
  if not found then return jsonb_build_object('claimed', false); end if;

  insert into public.table_service_sessions (restaurant_id, table_id, waiter_id)
  values (request_record.restaurant_id, request_record.table_id, auth.uid())
  on conflict (table_id) where status = 'active'
  do update set waiter_id = excluded.waiter_id, claimed_at = now(), last_activity_at = now()
  returning id into session_id;

  return jsonb_build_object('claimed', true, 'session_id', session_id, 'table_id', request_record.table_id);
end;
$$;

create or replace function public.close_table_service_session(p_session_id uuid)
returns boolean
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
begin
  update public.table_service_sessions
  set status = 'closed', closed_at = now(), last_activity_at = now()
  where id = p_session_id and status = 'active'
    and (waiter_id = auth.uid() or public.can_manage_restaurant(restaurant_id));
  return found;
end;
$$;

revoke all on function public.claim_table_service_request(uuid) from public, anon;
revoke all on function public.close_table_service_session(uuid) from public, anon;
grant execute on function public.claim_table_service_request(uuid) to authenticated;
grant execute on function public.close_table_service_session(uuid) to authenticated;

-- Keep all later public orders for an active table session with the same waiter.
create or replace function public.assign_order_to_active_waiter()
returns trigger language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.table_id is not null and new.assigned_waiter_id is null then
    select waiter_id into new.assigned_waiter_id
    from public.table_service_sessions
    where table_id = new.table_id and restaurant_id = new.restaurant_id and status = 'active'
    order by claimed_at desc limit 1;
  end if;
  return new;
end;
$$;
drop trigger if exists assign_order_to_active_waiter on public.orders;
create trigger assign_order_to_active_waiter before insert on public.orders
for each row execute function public.assign_order_to_active_waiter();

-- Include the Plus public theme in the anonymous menu payload.
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
      'price', i.price, 'image_url', i.image_url, 'tag', i.tag, 'display_order', i.display_order
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

do $$ begin
  alter publication supabase_realtime add table public.table_service_requests;
exception when duplicate_object then null; end $$;
