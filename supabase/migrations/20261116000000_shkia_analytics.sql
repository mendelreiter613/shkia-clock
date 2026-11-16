-- Shkia Trusher analytics: anonymous visit and game events, plus the
-- password-protected stats behind /admin.
--
-- Same rules as the reminder objects: everything is prefixed shkia_, the
-- tables are locked to anon/authenticated, and the site only gets in through
-- the security-definer functions granted at the bottom. No IP address is ever
-- stored: country/region/city come from Vercel's geo headers, and a visitor is
-- a random id the browser makes for itself.
--
-- Set or change the admin password from the Supabase SQL editor (never through
-- the API):
--   select public.shkia_admin_set_password('your new password');
-- That also signs out every open admin session.

create table if not exists public.shkia_events (
    id               bigint generated always as identity primary key,
    created_at       timestamptz not null default now(),
    visitor_id       uuid not null,
    session_id       uuid not null,
    event            text not null check (event in ('visit', 'location_set', 'game_start', 'game_end', 'reminder_on', 'reminder_off')),
    country          text check (country ~ '^[A-Z]{2}$'),
    region           text check (length(region) <= 80),
    city             text check (length(city) <= 80),
    device           text check (device in ('mobile', 'tablet', 'desktop')),
    browser          text check (length(browser) <= 30),
    os               text check (length(os) <= 30),
    referrer         text check (length(referrer) <= 120),
    installed        boolean,
    location_name    text check (length(location_name) <= 120),
    game             text check (game in ('race-the-sun', 'wake-up-dash')),
    won              boolean,
    score            real check (score between 0 and 100000),
    reminder_mode    text check (reminder_mode in ('tab', 'push')),
    reminder_minutes integer check (reminder_minutes in (15, 30, 60))
);
create index if not exists shkia_events_created_at_idx on public.shkia_events (created_at);
create index if not exists shkia_events_visitor_idx on public.shkia_events (visitor_id, created_at);

-- Signed-in admin browsers. Only a hash of each token is kept.
create table if not exists public.shkia_admin_sessions (
    token_hash bytea primary key,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null
);

-- Wrong passwords, for the login lockout.
create table if not exists public.shkia_admin_failures (
    at timestamptz not null default now()
);

alter table public.shkia_events enable row level security;
alter table public.shkia_admin_sessions enable row level security;
alter table public.shkia_admin_failures enable row level security;
revoke all on table public.shkia_events from anon, authenticated;
revoke all on table public.shkia_admin_sessions from anon, authenticated;
revoke all on table public.shkia_admin_failures from anon, authenticated;

-- Called by /api/track with the public key. Insert only; nothing can be read
-- back. The check constraints validate every field.
create or replace function public.shkia_track_event(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_visitor uuid := (p->>'visitor_id')::uuid;
begin
    -- A real visitor sends a handful of events a minute; drop floods quietly.
    if (select count(*) from public.shkia_events
        where visitor_id = v_visitor and created_at > now() - interval '1 minute') >= 30 then
        return;
    end if;
    insert into public.shkia_events
        (visitor_id, session_id, event, country, region, city, device, browser, os, referrer,
         installed, location_name, game, won, score, reminder_mode, reminder_minutes)
    values
        (v_visitor, (p->>'session_id')::uuid, p->>'event', p->>'country', p->>'region', p->>'city',
         p->>'device', p->>'browser', p->>'os', p->>'referrer', (p->>'installed')::boolean,
         p->>'location_name', p->>'game', (p->>'won')::boolean, (p->>'score')::real,
         p->>'reminder_mode', (p->>'reminder_minutes')::integer);
end;
$$;

-- SQL editor only (not granted to the API).
create or replace function public.shkia_admin_set_password(p_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
    if p_password is null or length(p_password) < 10 then
        raise exception 'Use at least 10 characters';
    end if;
    insert into public.shkia_settings (key, value)
    values ('admin_password_hash', extensions.crypt(p_password, extensions.gen_salt('bf', 10)))
    on conflict (key) do update set value = excluded.value;
    delete from public.shkia_admin_sessions;
    return 'Admin password set. Any open admin sessions were signed out.';
end;
$$;

-- Returns {"token": ...} on success, {"error": "wrong"} or {"error": "locked"}.
-- Never raises on a wrong password, so the failure row is kept.
create or replace function public.shkia_admin_login(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_hash text;
    v_token text;
begin
    delete from public.shkia_admin_failures where at < now() - interval '1 day';
    if (select count(*) from public.shkia_admin_failures where at > now() - interval '15 minutes') >= 10 then
        return jsonb_build_object('error', 'locked');
    end if;

    select value into v_hash from public.shkia_settings where key = 'admin_password_hash';
    if v_hash is null or p_password is null or extensions.crypt(p_password, v_hash) <> v_hash then
        insert into public.shkia_admin_failures default values;
        return jsonb_build_object('error', 'wrong');
    end if;

    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    delete from public.shkia_admin_sessions where expires_at < now();
    insert into public.shkia_admin_sessions (token_hash, expires_at)
    values (extensions.digest(v_token, 'sha256'), now() + interval '30 days');
    return jsonb_build_object('token', v_token);
end;
$$;

-- Internal.
create or replace function public.shkia_admin_valid(p_token text)
returns boolean
language sql
security definer
set search_path = ''
as $$
    select p_token is not null and exists (
        select 1 from public.shkia_admin_sessions
        where token_hash = extensions.digest(p_token, 'sha256') and expires_at > now()
    );
$$;

create or replace function public.shkia_admin_logout(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
    delete from public.shkia_admin_sessions where token_hash = extensions.digest(p_token, 'sha256');
$$;

-- Everything the dashboard shows, for the last p_days days, with days and
-- hours in the admin's own time zone. Returns null for a bad token.
create or replace function public.shkia_admin_stats(p_token text, p_days integer, p_tz text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_days integer := case when p_days in (1, 7, 30, 90, 365) then p_days else 30 end;
    v_tz text := case when exists (select 1 from pg_catalog.pg_timezone_names where name = p_tz) then p_tz else 'UTC' end;
    v_since timestamptz := now() - make_interval(days => v_days);
    v_bucket text := case when v_days = 1 then 'hour' else 'day' end;
    v_result jsonb;
begin
    if not public.shkia_admin_valid(p_token) then
        return null;
    end if;

    with e as (
        select * from public.shkia_events where created_at >= v_since
    )
    select jsonb_build_object(
        'days', v_days,
        'bucket', v_bucket,
        'time_zone', v_tz,
        'generated_at', now(),

        'totals', (select jsonb_build_object(
            'visitors',      count(distinct visitor_id),
            'visits',        count(distinct session_id),
            'game_plays',    count(*) filter (where event = 'game_start'),
            'locations_set', count(*) filter (where event = 'location_set'),
            'reminders_on',  count(*) filter (where event = 'reminder_on')
        ) from e),

        'new_visitors', (select count(*) from (
            select visitor_id from public.shkia_events group by visitor_id having min(created_at) >= v_since
        ) n),

        'live', (select count(distinct visitor_id) from public.shkia_events where created_at > now() - interval '5 minutes'),

        'reminders', (select jsonb_build_object(
            'active', count(*),
            'm15', count(*) filter (where minutes_before = 15),
            'm30', count(*) filter (where minutes_before = 30),
            'm60', count(*) filter (where minutes_before = 60)
        ) from public.shkia_push_subscriptions),

        'series', (select coalesce(jsonb_agg(jsonb_build_object(
                't', to_char(b, 'YYYY-MM-DD"T"HH24:MI'),
                'visitors', coalesce(x.v, 0),
                'visits', coalesce(x.s, 0),
                'plays', coalesce(x.g, 0)
            ) order by b), '[]'::jsonb)
            from generate_series(
                date_trunc(v_bucket, v_since at time zone v_tz),
                date_trunc(v_bucket, now() at time zone v_tz),
                ('1 ' || v_bucket)::interval
            ) b
            left join (
                select date_trunc(v_bucket, created_at at time zone v_tz) bb,
                       count(distinct visitor_id) v,
                       count(distinct session_id) s,
                       count(*) filter (where event = 'game_start') g
                from e group by 1
            ) x on x.bb = b),

        'hours', (select coalesce(jsonb_agg(jsonb_build_object('h', h, 'visits', coalesce(x.s, 0)) order by h), '[]'::jsonb)
            from generate_series(0, 23) h
            left join (
                select extract(hour from created_at at time zone v_tz)::int hh, count(distinct session_id) s
                from e group by 1
            ) x on x.hh = h),

        'countries', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'v', v) order by v desc, k), '[]'::jsonb) from (
            select country k, count(distinct visitor_id) v from e where country is not null group by 1 order by 2 desc, 1 limit 20) t),

        'cities', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'c', c, 'r', r, 'v', v) order by v desc, k), '[]'::jsonb) from (
            select city k, country c, max(region) r, count(distinct visitor_id) v from e where city is not null group by city, country order by 4 desc, 1 limit 20) t),

        'locations', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'v', v) order by v desc, k), '[]'::jsonb) from (
            select location_name k, count(distinct visitor_id) v from e where event = 'location_set' and location_name is not null group by 1 order by 2 desc, 1 limit 20) t),

        'devices', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'v', v) order by v desc, k), '[]'::jsonb) from (
            select device k, count(distinct visitor_id) v from e where device is not null group by 1) t),

        'browsers', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'v', v) order by v desc, k), '[]'::jsonb) from (
            select browser k, count(distinct visitor_id) v from e where browser is not null group by 1 order by 2 desc limit 10) t),

        'os', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'v', v) order by v desc, k), '[]'::jsonb) from (
            select os k, count(distinct visitor_id) v from e where os is not null group by 1 order by 2 desc limit 10) t),

        'referrers', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'v', v) order by v desc, k), '[]'::jsonb) from (
            select coalesce(referrer, 'Direct') k, count(distinct session_id) v from e where event = 'visit' group by 1 order by 2 desc limit 15) t),

        'installed', (select jsonb_build_object(
            'app',     count(distinct visitor_id) filter (where installed),
            'browser', count(distinct visitor_id) filter (where not installed)
        ) from e where event = 'visit'),

        'games', (select coalesce(jsonb_agg(jsonb_build_object(
                'game', g.game,
                'plays', g.plays, 'players', g.players, 'finished', g.finished, 'wins', g.wins,
                'best', g.best, 'avg_win', g.avg_win
            ) order by g.game), '[]'::jsonb)
            from (
                select game,
                       count(*) filter (where event = 'game_start') plays,
                       count(distinct visitor_id) filter (where event = 'game_start') players,
                       count(*) filter (where event = 'game_end') finished,
                       count(*) filter (where event = 'game_end' and won) wins,
                       max(score) filter (where event = 'game_end' and won) best,
                       round(avg(score) filter (where event = 'game_end' and won)::numeric, 1) avg_win
                from e where game is not null group by game
            ) g),

        'recent', (select coalesce(jsonb_agg(jsonb_build_object(
                'at', created_at, 'event', event, 'city', city, 'country', country,
                'device', device, 'location', location_name, 'game', game, 'won', won, 'score', score,
                'mode', reminder_mode, 'visitor', left(visitor_id::text, 6)
            ) order by created_at desc), '[]'::jsonb)
            from (select * from public.shkia_events order by created_at desc limit 40) r)
    ) into v_result;

    return v_result;
end;
$$;

revoke all on function public.shkia_track_event(jsonb) from public, anon, authenticated;
revoke all on function public.shkia_admin_set_password(text) from public, anon, authenticated;
revoke all on function public.shkia_admin_login(text) from public, anon, authenticated;
revoke all on function public.shkia_admin_valid(text) from public, anon, authenticated;
revoke all on function public.shkia_admin_logout(text) from public, anon, authenticated;
revoke all on function public.shkia_admin_stats(text, integer, text) from public, anon, authenticated;

grant execute on function public.shkia_track_event(jsonb) to anon;
grant execute on function public.shkia_admin_login(text) to anon;
grant execute on function public.shkia_admin_logout(text) to anon;
grant execute on function public.shkia_admin_stats(text, integer, text) to anon;
