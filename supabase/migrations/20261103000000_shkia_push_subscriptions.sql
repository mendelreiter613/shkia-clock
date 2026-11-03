-- Shkia Clock daily Shachris reminders.
--
-- This lives in a Supabase project shared with other apps, so everything here
-- is prefixed shkia_ and nothing outside these objects is touched. The tables
-- are locked to anon/authenticated; the app only gets in through the shkia_*
-- functions below, and each of those requires the secret stored in
-- shkia_settings (set separately, never committed). That way the server only
-- needs the project's public key, not the service-role key.

create table if not exists public.shkia_push_subscriptions (
    endpoint            text primary key check (endpoint like 'https://%' and length(endpoint) <= 1000),
    p256dh              text not null check (length(p256dh) <= 200),
    auth                text not null check (length(auth) <= 100),
    lat                 double precision not null check (lat between -90 and 90),
    lng                 double precision not null check (lng between -180 and 180),
    time_zone           text not null check (length(time_zone) <= 64),
    location_name       text not null check (length(location_name) <= 120),
    minutes_before      integer not null check (minutes_before in (15, 30, 60)),
    -- The shkia we last reminded about, so a scheduler run every few minutes
    -- sends exactly one reminder per day.
    last_notified_shkia timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create table if not exists public.shkia_settings (
    key   text primary key,
    value text not null
);

alter table public.shkia_push_subscriptions enable row level security;
alter table public.shkia_settings enable row level security;
revoke all on table public.shkia_push_subscriptions from anon, authenticated;
revoke all on table public.shkia_settings from anon, authenticated;

-- Internal: raises unless p_secret matches. Not callable through the API.
create or replace function public.shkia_require_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if p_secret is null or not exists (
        select 1 from public.shkia_settings where key = 'api_secret' and value = p_secret
    ) then
        raise exception 'unauthorized' using errcode = '42501';
    end if;
end;
$$;

create or replace function public.shkia_upsert_subscription(
    p_secret text,
    p_endpoint text,
    p_p256dh text,
    p_auth text,
    p_lat double precision,
    p_lng double precision,
    p_time_zone text,
    p_location_name text,
    p_minutes_before integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform public.shkia_require_secret(p_secret);
    insert into public.shkia_push_subscriptions
        (endpoint, p256dh, auth, lat, lng, time_zone, location_name, minutes_before)
    values
        (p_endpoint, p_p256dh, p_auth, p_lat, p_lng, p_time_zone, p_location_name, p_minutes_before)
    on conflict (endpoint) do update set
        p256dh         = excluded.p256dh,
        auth           = excluded.auth,
        lat            = excluded.lat,
        lng            = excluded.lng,
        time_zone      = excluded.time_zone,
        location_name  = excluded.location_name,
        minutes_before = excluded.minutes_before,
        updated_at     = now();
end;
$$;

create or replace function public.shkia_delete_subscription(p_secret text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform public.shkia_require_secret(p_secret);
    delete from public.shkia_push_subscriptions where endpoint = p_endpoint;
end;
$$;

create or replace function public.shkia_list_subscriptions(p_secret text)
returns setof public.shkia_push_subscriptions
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform public.shkia_require_secret(p_secret);
    return query select * from public.shkia_push_subscriptions;
end;
$$;

create or replace function public.shkia_mark_notified(p_secret text, p_endpoint text, p_shkia timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform public.shkia_require_secret(p_secret);
    update public.shkia_push_subscriptions set last_notified_shkia = p_shkia where endpoint = p_endpoint;
end;
$$;

-- Supabase grants EXECUTE on new public functions to anon/authenticated by
-- default. Take it all back, then open only the four secret-checked entry points.
revoke all on function public.shkia_require_secret(text) from public, anon, authenticated;
revoke all on function public.shkia_upsert_subscription(text, text, text, text, double precision, double precision, text, text, integer) from public, anon, authenticated;
revoke all on function public.shkia_delete_subscription(text, text) from public, anon, authenticated;
revoke all on function public.shkia_list_subscriptions(text) from public, anon, authenticated;
revoke all on function public.shkia_mark_notified(text, text, timestamptz) from public, anon, authenticated;

grant execute on function public.shkia_upsert_subscription(text, text, text, text, double precision, double precision, text, text, integer) to anon;
grant execute on function public.shkia_delete_subscription(text, text) to anon;
grant execute on function public.shkia_list_subscriptions(text) to anon;
grant execute on function public.shkia_mark_notified(text, text, timestamptz) to anon;
