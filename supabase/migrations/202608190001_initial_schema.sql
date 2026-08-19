-- CartaYa: initial multi-tenant schema, tenant provisioning and RLS.
create extension if not exists pgcrypto with schema extensions;

create type public.subscription_tier as enum ('gratis', 'plus', 'pro');
create type public.profile_role as enum ('owner', 'staff', 'superadmin');
create type public.menu_item_tag as enum ('popular', 'nuevo');
create type public.order_status as enum ('nuevo', 'en_preparacion', 'listo', 'entregado');

create table public.restaurants (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text,
  primary_color text not null default '#FF6B35' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  phone text,
  address text,
  opening_hours jsonb not null default '{}'::jsonb check (jsonb_typeof(opening_hours) = 'object'),
  subscription_tier public.subscription_tier not null default 'gratis',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  role public.profile_role not null default 'staff',
  full_name text not null check (char_length(full_name) between 2 and 100)
);

create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  display_order integer not null default 0,
  unique (restaurant_id, name),
  unique (id, restaurant_id)
);

create table public.menu_items (
  id uuid primary key default extensions.gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  price numeric(12, 2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  tag public.menu_item_tag,
  display_order integer not null default 0,
  constraint menu_items_category_tenant_fk
    foreign key (category_id, restaurant_id)
    references public.categories(id, restaurant_id)
    on delete cascade
);

create table public.tables (
  id uuid primary key default extensions.gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  qr_code_url text,
  unique (restaurant_id, label),
  unique (id, restaurant_id)
);

create table public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid,
  status public.order_status not null default 'nuevo',
  total numeric(12, 2) not null default 0 check (total >= 0),
  notes text,
  created_at timestamptz not null default now(),
  constraint orders_table_tenant_fk
    foreign key (table_id, restaurant_id)
    references public.tables(id, restaurant_id)
    on delete set null (table_id)
);

create table public.order_items (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  notes text
);

create index profiles_restaurant_id_idx on public.profiles(restaurant_id);
create index categories_restaurant_order_idx on public.categories(restaurant_id, display_order);
create index menu_items_restaurant_category_order_idx on public.menu_items(restaurant_id, category_id, display_order);
create index tables_restaurant_id_idx on public.tables(restaurant_id);
create index orders_restaurant_created_idx on public.orders(restaurant_id, created_at desc);
create index orders_restaurant_status_idx on public.orders(restaurant_id, status);
create index order_items_order_id_idx on public.order_items(order_id);
create index order_items_menu_item_id_idx on public.order_items(menu_item_id);

-- SECURITY DEFINER helpers avoid recursive profile policies. They expose booleans only.
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin'
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
      and (role = 'superadmin' or (role in ('owner', 'staff') and restaurant_id = target_restaurant_id))
  );
$$;

create or replace function public.can_manage_restaurant(target_restaurant_id uuid)
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
      and role in ('owner', 'staff')
      and restaurant_id = target_restaurant_id
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
      and public.can_access_restaurant(restaurant_id)
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
      and public.can_manage_restaurant(restaurant_id)
  );
$$;

revoke all on function public.is_superadmin() from public;
revoke all on function public.can_access_restaurant(uuid) from public;
revoke all on function public.can_manage_restaurant(uuid) from public;
revoke all on function public.can_access_order(uuid) from public;
revoke all on function public.can_manage_order(uuid) from public;
grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.can_access_restaurant(uuid) to authenticated;
grant execute on function public.can_manage_restaurant(uuid) to authenticated;
grant execute on function public.can_access_order(uuid) to authenticated;
grant execute on function public.can_manage_order(uuid) to authenticated;

-- Auth registration hook. The auth user, restaurant and owner profile share one DB transaction.
create or replace function public.handle_new_restaurant_owner()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  new_restaurant_id uuid;
  restaurant_name text := trim(new.raw_user_meta_data ->> 'restaurant_name');
  restaurant_slug text := lower(trim(new.raw_user_meta_data ->> 'restaurant_slug'));
  owner_name text := trim(new.raw_user_meta_data ->> 'full_name');
begin
  if new.raw_user_meta_data ->> 'signup_type' is distinct from 'restaurant_owner' then
    return new;
  end if;

  if restaurant_name is null or char_length(restaurant_name) not between 2 and 120
    or restaurant_slug is null or restaurant_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or owner_name is null or char_length(owner_name) not between 2 and 100 then
    raise exception 'Invalid restaurant registration metadata';
  end if;

  insert into public.restaurants (name, slug, phone)
  values (restaurant_name, restaurant_slug, nullif(trim(new.raw_user_meta_data ->> 'phone'), ''))
  returning id into new_restaurant_id;

  insert into public.profiles (id, restaurant_id, role, full_name)
  values (new.id, new_restaurant_id, 'owner', owner_name);

  return new;
end;
$$;

create trigger on_auth_user_created_create_restaurant
  after insert on auth.users
  for each row execute function public.handle_new_restaurant_owner();

-- Authenticated users cannot promote themselves or move their profile to another tenant.
create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is not null and not public.is_superadmin()
    and (new.id is distinct from old.id
      or new.restaurant_id is distinct from old.restaurant_id
      or new.role is distinct from old.role) then
    raise exception 'Profile identity, tenant and role cannot be changed';
  end if;
  return new;
end;
$$;

create trigger protect_profile_identity_before_update
  before update on public.profiles
  for each row execute function public.protect_profile_identity();

-- The Gratis plan has a hard database limit of 20 dishes.
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
      raise exception 'El plan Gratis permite un máximo de 20 platos';
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_menu_item_limit_before_write
  before insert or update of restaurant_id on public.menu_items
  for each row execute function public.enforce_menu_item_limit();

-- order_items has no duplicated restaurant_id column; this trigger enforces tenant consistency.
create or replace function public.enforce_order_item_tenant()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  order_restaurant_id uuid;
  item_restaurant_id uuid;
begin
  select restaurant_id into order_restaurant_id from public.orders where id = new.order_id;
  select restaurant_id into item_restaurant_id from public.menu_items where id = new.menu_item_id;

  if order_restaurant_id is null or item_restaurant_id is null
    or order_restaurant_id is distinct from item_restaurant_id then
    raise exception 'Order and menu item must belong to the same restaurant';
  end if;

  return new;
end;
$$;

create trigger enforce_order_item_tenant_before_write
  before insert or update of order_id, menu_item_id on public.order_items
  for each row execute function public.enforce_order_item_tenant();

alter table public.restaurants enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Restaurant and profile access.
create policy restaurants_select on public.restaurants for select to authenticated
  using (public.can_access_restaurant(id));
create policy restaurants_update on public.restaurants for update to authenticated
  using (public.can_manage_restaurant(id)) with check (public.can_manage_restaurant(id));

create policy profiles_select on public.profiles for select to authenticated
  using (public.can_access_restaurant(restaurant_id));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() and public.can_manage_restaurant(restaurant_id))
  with check (id = auth.uid() and public.can_manage_restaurant(restaurant_id));

-- Tenant tables: owner/staff can write only their tenant; superadmin is intentionally read-only.
create policy categories_select on public.categories for select to authenticated
  using (public.can_access_restaurant(restaurant_id));
create policy categories_insert on public.categories for insert to authenticated
  with check (public.can_manage_restaurant(restaurant_id));
create policy categories_update on public.categories for update to authenticated
  using (public.can_manage_restaurant(restaurant_id)) with check (public.can_manage_restaurant(restaurant_id));
create policy categories_delete on public.categories for delete to authenticated
  using (public.can_manage_restaurant(restaurant_id));

create policy menu_items_select on public.menu_items for select to authenticated
  using (public.can_access_restaurant(restaurant_id));
create policy menu_items_insert on public.menu_items for insert to authenticated
  with check (public.can_manage_restaurant(restaurant_id));
create policy menu_items_update on public.menu_items for update to authenticated
  using (public.can_manage_restaurant(restaurant_id)) with check (public.can_manage_restaurant(restaurant_id));
create policy menu_items_delete on public.menu_items for delete to authenticated
  using (public.can_manage_restaurant(restaurant_id));

create policy tables_select on public.tables for select to authenticated
  using (public.can_access_restaurant(restaurant_id));
create policy tables_insert on public.tables for insert to authenticated
  with check (public.can_manage_restaurant(restaurant_id));
create policy tables_update on public.tables for update to authenticated
  using (public.can_manage_restaurant(restaurant_id)) with check (public.can_manage_restaurant(restaurant_id));
create policy tables_delete on public.tables for delete to authenticated
  using (public.can_manage_restaurant(restaurant_id));

create policy orders_select on public.orders for select to authenticated
  using (public.can_access_restaurant(restaurant_id));
create policy orders_insert on public.orders for insert to authenticated
  with check (public.can_manage_restaurant(restaurant_id));
create policy orders_update on public.orders for update to authenticated
  using (public.can_manage_restaurant(restaurant_id)) with check (public.can_manage_restaurant(restaurant_id));
create policy orders_delete on public.orders for delete to authenticated
  using (public.can_manage_restaurant(restaurant_id));

create policy order_items_select on public.order_items for select to authenticated
  using (public.can_access_order(order_id));
create policy order_items_insert on public.order_items for insert to authenticated
  with check (public.can_manage_order(order_id));
create policy order_items_update on public.order_items for update to authenticated
  using (public.can_manage_order(order_id)) with check (public.can_manage_order(order_id));
create policy order_items_delete on public.order_items for delete to authenticated
  using (public.can_manage_order(order_id));

-- Remove public API access first, then grant only operations backed by RLS policies.
revoke all on public.restaurants, public.profiles, public.categories, public.menu_items,
  public.tables, public.orders, public.order_items from anon, authenticated;
grant select on public.restaurants to authenticated;
grant update (name, slug, logo_url, primary_color, phone, address, opening_hours) on public.restaurants to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.categories, public.menu_items,
  public.tables, public.orders, public.order_items to authenticated;

-- Realtime foundation for the future Pro KDS.
alter table public.orders replica identity full;
alter table public.order_items replica identity full;
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
    ) then
      alter publication supabase_realtime add table public.orders;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items'
    ) then
      alter publication supabase_realtime add table public.order_items;
    end if;
  end if;
end;
$$;
