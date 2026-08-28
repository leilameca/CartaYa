-- CartaYa launch hardening: persistent rate limits for public and credential endpoints.

create table public.request_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default statement_timestamp(),
  request_count integer not null default 1 check (request_count > 0)
);

create index request_rate_limits_window_idx
  on public.request_rate_limits(window_started_at);

alter table public.request_rate_limits enable row level security;
revoke all on public.request_rate_limits from public, anon, authenticated;

create or replace function public.consume_rate_limit(
  p_key_hash text,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allowed boolean;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
    or p_window_seconds not between 1 and 86400
    or p_max_requests not between 1 and 10000 then
    raise exception 'Invalid rate limit configuration' using errcode = '22023';
  end if;

  if random() < 0.01 then
    delete from public.request_rate_limits
    where window_started_at < statement_timestamp() - interval '1 day';
  end if;

  insert into public.request_rate_limits as limits (
    key_hash,
    window_started_at,
    request_count
  ) values (
    p_key_hash,
    statement_timestamp(),
    1
  )
  on conflict (key_hash) do update set
    window_started_at = case
      when limits.window_started_at <= statement_timestamp() - make_interval(secs => p_window_seconds)
        then statement_timestamp()
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at <= statement_timestamp() - make_interval(secs => p_window_seconds)
        then 1
      else limits.request_count + 1
    end
  returning request_count <= p_max_requests into allowed;

  return allowed;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
