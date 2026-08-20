-- CartaYa: split staff permissions and preserve who placed each order.

alter type public.profile_role add value if not exists 'mesero';
alter type public.profile_role add value if not exists 'cocina';
