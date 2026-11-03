-- Move reminder sending into Supabase (edge function shkia-send-reminders),
-- so no secret has to live in Vercel. Only shkia_* objects are touched.
--
-- Secrets now live only in public.shkia_settings (locked to anon/authenticated):
--   vapid_public_key, vapid_private_key, vapid_subject  - web push keys
--   cron_secret - sent by the pg_cron job, checked by the edge function
-- The edge function reads them with the service role it gets automatically.

drop function if exists public.shkia_upsert_subscription(text, text, text, text, double precision, double precision, text, text, integer);
drop function if exists public.shkia_delete_subscription(text, text);
drop function if exists public.shkia_list_subscriptions(text);
drop function if exists public.shkia_mark_notified(text, text, timestamptz);
drop function if exists public.shkia_require_secret(text);

-- Called by the Vercel API routes with the public key. Same exposure as those
-- public routes themselves; the table's check constraints validate the input,
-- and nothing here can read rows back.
create or replace function public.shkia_upsert_subscription(
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

-- Knowing a push endpoint (an unguessable URL) is what proves ownership.
create or replace function public.shkia_delete_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    delete from public.shkia_push_subscriptions where endpoint = p_endpoint;
end;
$$;

revoke all on function public.shkia_upsert_subscription(text, text, text, double precision, double precision, text, text, integer) from public, anon, authenticated;
revoke all on function public.shkia_delete_subscription(text) from public, anon, authenticated;
grant execute on function public.shkia_upsert_subscription(text, text, text, double precision, double precision, text, text, integer) to anon;
grant execute on function public.shkia_delete_subscription(text) to anon;

-- Scheduler secret: generated here, so it never exists outside the database.
insert into public.shkia_settings (key, value)
values ('cron_secret', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

insert into public.shkia_settings (key, value)
values ('vapid_subject', 'https://www.shkiatrusher.com')
on conflict (key) do nothing;

delete from public.shkia_settings where key = 'api_secret';
