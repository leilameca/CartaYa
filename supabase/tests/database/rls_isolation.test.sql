begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Fixed fixtures. The registration trigger ignores these because signup_type is absent.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-a@test.local', '', now(), now(), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'owner-b@test.local', '', now(), now(), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'admin@test.local', '', now(), now(), now(), '{}', '{}');

insert into public.restaurants (id, name, slug) values
  ('a0000000-0000-0000-0000-000000000001', 'Restaurante A', 'restaurante-a'),
  ('b0000000-0000-0000-0000-000000000002', 'Restaurante B', 'restaurante-b');

insert into public.profiles (id, restaurant_id, role, full_name) values
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'owner', 'Owner A'),
  ('20000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'owner', 'Owner B'),
  ('30000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'superadmin', 'Super Admin');

insert into public.categories (id, restaurant_id, name) values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Categoría A'),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Categoría B');

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select results_eq(
  'select name from public.restaurants order by name',
  $$values ('Restaurante A'::text)$$,
  'owner A sees only restaurant A'
);
select results_eq(
  'select name from public.categories order by name',
  $$values ('Categoría A'::text)$$,
  'owner A sees only categories from A'
);
select lives_ok(
  $$insert into public.categories (restaurant_id, name) values ('a0000000-0000-0000-0000-000000000001', 'Postres A')$$,
  'owner A can write inside tenant A'
);
select throws_ok(
  $$insert into public.categories (restaurant_id, name) values ('b0000000-0000-0000-0000-000000000002', 'Ataque')$$,
  '42501', null,
  'owner A cannot write inside tenant B'
);
select throws_ok(
  $$update public.profiles set role = 'superadmin' where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'owner A cannot promote itself (column privileges)'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = '20000000-0000-0000-0000-000000000002';
select results_eq(
  'select name from public.restaurants order by name',
  $$values ('Restaurante B'::text)$$,
  'owner B sees only restaurant B'
);
select results_eq(
  'select name from public.categories order by name',
  $$values ('Categoría B'::text)$$,
  'owner B sees only categories from B'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = '30000000-0000-0000-0000-000000000003';
set local "request.jwt.claims" = '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}';
select is((select count(*) from public.restaurants), 0::bigint, 'superadmin without MFA cannot read restaurants');
set local "request.jwt.claims" = '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}';
select is((select count(*) from public.restaurants), 2::bigint, 'superadmin reads every restaurant');
select is((select count(*) from public.categories), 3::bigint, 'superadmin reads every category');

select * from finish();
rollback;
