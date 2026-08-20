-- Enum values must be committed before they can be used in data updates.
update public.profiles
set role = 'mesero'
where role = 'staff';

alter table public.orders
	add column if not exists customer_name text,
	add column if not exists created_by_waiter_id uuid;

alter table public.profiles
	add constraint profiles_id_restaurant_unique unique (id, restaurant_id);

alter table public.orders
	add constraint orders_created_by_waiter_tenant_fk
	foreign key (created_by_waiter_id, restaurant_id)
	references public.profiles(id, restaurant_id);

alter table public.orders
	add constraint orders_customer_name_length check (customer_name is null or char_length(customer_name) between 2 and 100);

create index if not exists orders_created_by_waiter_idx on public.orders(created_by_waiter_id);

create or replace function public.create_public_order_with_customer(
	p_slug text,
	p_table_id uuid,
	p_items jsonb,
	p_notes text default null,
	p_customer_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	result jsonb;
	created_order_id uuid;
begin
	if p_customer_name is not null and char_length(trim(p_customer_name)) not between 2 and 100 then
		raise exception 'El nombre debe tener entre 2 y 100 caracteres' using errcode = '22023';
	end if;

	result := public.create_public_order(p_slug, p_table_id, p_items, p_notes);
	created_order_id := (result ->> 'order_id')::uuid;

	update public.orders
	set customer_name = nullif(trim(p_customer_name), '')
	where id = created_order_id;

	return result;
end;
$$;

revoke all on function public.create_public_order_with_customer(text, uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.create_public_order_with_customer(text, uuid, jsonb, text, text) to service_role;

create or replace function public.can_access_restaurant(target_restaurant_id uuid)
returns boolean
language sql stable security definer
set search_path = public, auth, pg_temp
as $$
	select exists (select 1 from public.profiles where id = auth.uid() and (role = 'superadmin' or (role in ('owner', 'mesero', 'cocina') and restaurant_id = target_restaurant_id)));
$$;

create or replace function public.can_manage_restaurant(target_restaurant_id uuid)
returns boolean
language sql stable security definer
set search_path = public, auth, pg_temp
as $$
	select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner' and restaurant_id = target_restaurant_id);
$$;

create or replace function public.can_use_orders(target_restaurant_id uuid)
returns boolean
language sql stable security definer
set search_path = public, auth, pg_temp
as $$
	select exists (select 1 from public.profiles as profile join public.restaurants as restaurant on restaurant.id = profile.restaurant_id where profile.id = auth.uid() and profile.role in ('owner', 'mesero', 'cocina') and profile.restaurant_id = target_restaurant_id and restaurant.subscription_tier in ('plus', 'pro'));
$$;

create or replace function public.can_use_kds(target_restaurant_id uuid)
returns boolean
language sql stable security definer
set search_path = public, auth, pg_temp
as $$
	select exists (select 1 from public.profiles as profile join public.restaurants as restaurant on restaurant.id = profile.restaurant_id where profile.id = auth.uid() and profile.role in ('owner', 'cocina') and profile.restaurant_id = target_restaurant_id and restaurant.subscription_tier = 'pro');
$$;
