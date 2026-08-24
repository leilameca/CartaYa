-- Enum values must be committed before the following migration can use them.
alter type public.profile_role add value if not exists 'mesero';
alter type public.profile_role add value if not exists 'cocina';
