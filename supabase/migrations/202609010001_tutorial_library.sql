create table public.tutorial_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  description text check (description is null or char_length(description) <= 240),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index tutorial_categories_name_unique on public.tutorial_categories (lower(trim(name)));
create index tutorial_categories_order_idx on public.tutorial_categories (display_order, name);

create table public.tutorial_videos (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.tutorial_categories(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 3 and 140),
  description text check (description is null or char_length(description) <= 1000),
  youtube_url text not null check (youtube_url ~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$'),
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  keywords text[] not null default '{}',
  display_order integer not null default 0 check (display_order >= 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index tutorial_videos_youtube_id_unique on public.tutorial_videos (youtube_video_id);
create index tutorial_videos_category_order_idx on public.tutorial_videos (category_id, display_order, created_at);
create index tutorial_videos_published_idx on public.tutorial_videos (is_published) where is_published;

alter table public.tutorial_categories enable row level security;
alter table public.tutorial_videos enable row level security;

create policy tutorial_categories_authenticated_read on public.tutorial_categories
  for select to authenticated using (true);
create policy tutorial_videos_authenticated_read on public.tutorial_videos
  for select to authenticated using (is_published);

revoke all on public.tutorial_categories, public.tutorial_videos from anon, authenticated;
grant select on public.tutorial_categories, public.tutorial_videos to authenticated;

comment on table public.tutorial_categories is 'Global tutorial categories managed by CartaYa superadmins.';
comment on table public.tutorial_videos is 'Published YouTube tutorials available to authenticated restaurant teams.';
