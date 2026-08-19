-- CartaYa: provision email owners only after OTP confirmation and support OAuth onboarding.

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

  -- With email confirmation enabled, the insert trigger waits for the OTP.
  if new.email_confirmed_at is null then
    return new;
  end if;

  if exists (select 1 from public.profiles where id = new.id) then
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

drop trigger if exists on_auth_user_confirmed_create_restaurant on auth.users;
create trigger on_auth_user_confirmed_create_restaurant
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_new_restaurant_owner();

create or replace function public.complete_restaurant_owner_onboarding(
  p_restaurant_name text,
  p_restaurant_slug text,
  p_phone text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  auth_user_record auth.users%rowtype;
  new_restaurant_id uuid;
  owner_name text;
  normalized_name text := trim(p_restaurant_name);
  normalized_slug text := lower(trim(p_restaurant_slug));
  normalized_phone text := trim(p_phone);
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into auth_user_record
  from auth.users
  where id = auth.uid()
  for update;

  if auth_user_record.id is null or auth_user_record.email_confirmed_at is null then
    raise exception 'Verified email required' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = auth_user_record.id) then
    raise exception 'Account onboarding already completed' using errcode = '23505';
  end if;

  if normalized_name is null or char_length(normalized_name) not between 2 and 120
    or normalized_slug is null or normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or normalized_phone is null or char_length(normalized_phone) not between 10 and 20 then
    raise exception 'Invalid restaurant onboarding data' using errcode = '22023';
  end if;

  owner_name := trim(coalesce(
    auth_user_record.raw_user_meta_data ->> 'full_name',
    auth_user_record.raw_user_meta_data ->> 'name',
    split_part(auth_user_record.email, '@', 1)
  ));

  insert into public.restaurants (name, slug, phone)
  values (normalized_name, normalized_slug, normalized_phone)
  returning id into new_restaurant_id;

  insert into public.profiles (id, restaurant_id, role, full_name)
  values (auth_user_record.id, new_restaurant_id, 'owner', owner_name);

  return new_restaurant_id;
exception
  when unique_violation then
    raise exception 'Restaurant slug already exists' using errcode = '23505';
end;
$$;

revoke all on function public.complete_restaurant_owner_onboarding(text, text, text) from public;
revoke all on function public.complete_restaurant_owner_onboarding(text, text, text) from anon;
grant execute on function public.complete_restaurant_owner_onboarding(text, text, text) to authenticated;
