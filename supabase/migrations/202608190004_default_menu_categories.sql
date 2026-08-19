-- CartaYa: every newly created restaurant starts with a useful menu structure.

create or replace function public.seed_default_menu_categories()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.categories (restaurant_id, name, display_order)
  values
    (new.id, 'Entradas', 0),
    (new.id, 'Platos fuertes', 1),
    (new.id, 'Bebidas', 2),
    (new.id, 'Postres', 3);

  return new;
end;
$$;

revoke all on function public.seed_default_menu_categories() from public;
revoke all on function public.seed_default_menu_categories() from anon;
revoke all on function public.seed_default_menu_categories() from authenticated;

drop trigger if exists on_restaurant_created_seed_categories on public.restaurants;
create trigger on_restaurant_created_seed_categories
  after insert on public.restaurants
  for each row execute function public.seed_default_menu_categories();
