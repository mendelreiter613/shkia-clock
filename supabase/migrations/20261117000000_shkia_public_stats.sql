-- Public analytics: /stats shows the dashboard to everyone, no sign-in.
--
-- The stats query moves into shkia_stats_data (not callable by anon).
-- shkia_admin_stats checks the admin token and returns everything;
-- shkia_public_stats needs no token and leaves out the "recent" feed, which
-- lists single visitors' events, city and visitor id.

create or replace function public.shkia_stats_data(p_days integer, p_tz text, p_recent boolean)
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
            from (select * from public.shkia_events where p_recent order by created_at desc limit 40) r)
    ) into v_result;

    return v_result;
end;
$$;

create or replace function public.shkia_admin_stats(p_token text, p_days integer, p_tz text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not public.shkia_admin_valid(p_token) then
        return null;
    end if;
    return public.shkia_stats_data(p_days, p_tz, true);
end;
$$;

create or replace function public.shkia_public_stats(p_days integer, p_tz text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
    select public.shkia_stats_data(p_days, p_tz, false);
$$;

revoke all on function public.shkia_stats_data(integer, text, boolean) from public, anon, authenticated;
revoke all on function public.shkia_admin_stats(text, integer, text) from public, anon, authenticated;
revoke all on function public.shkia_public_stats(integer, text) from public, anon, authenticated;

grant execute on function public.shkia_admin_stats(text, integer, text) to anon;
grant execute on function public.shkia_public_stats(integer, text) to anon;
