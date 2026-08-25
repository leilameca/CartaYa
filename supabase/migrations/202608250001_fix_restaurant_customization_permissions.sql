-- Allow restaurant owners to persist every customization field introduced for
-- Plus and Pro. RLS still limits updates to the owner's own restaurant.

grant update (
  name,
  slug,
  logo_url,
  primary_color,
  secondary_color,
  menu_style,
  internal_primary_color,
  internal_secondary_color,
  phone,
  address,
  opening_hours
) on public.restaurants to authenticated;
