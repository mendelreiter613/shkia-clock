# Deploying Shkia Trusher

The site is hosted on **Vercel** (project `shkia-clock`, live at
https://www.shkiatrusher.com). Every push to `main` on
[GitHub](https://github.com/mendelreiter613/shkia-clock) deploys automatically.

## Shachris reminders

The bell button on the countdown screen offers two kinds of reminder:

- **While this page is open:** runs entirely in the browser. Needs no setup.
- **Every day, even when closed:** real web push. Only offered inside the
  installed app (home screen, Dock, or desktop app). In a normal browser tab
  the panel shows install steps for that device instead. iPhone strictly
  requires this (iOS 16.4+); elsewhere it's a product choice, so everyone gets
  the same app experience.

### How daily reminders work

1. The browser subscribes to push and posts the subscription plus its location
   to `/api/reminders/subscribe` on Vercel. That route calls the Supabase
   function `shkia_upsert_subscription` with the public key.
2. Every 5 minutes the Supabase `pg_cron` job `shkia-shachris-reminders` calls
   the edge function `shkia-send-reminders`
   ([source](supabase/functions/shkia-send-reminders/index.ts)).
3. That function works out each subscriber's own shkia and sends one push to
   everyone within their chosen 15/30/60 minute window.

### Where it lives (shared Supabase project)

It's in the **Meerkhan Trusher** Supabase project, which other apps also use.
To keep it separate, everything Shkia Trusher owns is named `shkia_`:

| Object | What it is |
| --- | --- |
| `public.shkia_push_subscriptions` | one row per device with daily reminders on |
| `public.shkia_settings` | push keys, push contact URL, scheduler secret |
| `public.shkia_upsert_subscription`, `public.shkia_delete_subscription` | the only things the public key can call |
| edge function `shkia-send-reminders` | does the sending |
| cron job `shkia-shachris-reminders` | runs it every 5 minutes |

Both tables have RLS on and no access for anon/authenticated. Vercel holds
**no secrets**: only the public values in `.env.example`.

### Pausing or removing

```sql
-- pause
select cron.unschedule('shkia-shachris-reminders');

-- resume
select cron.schedule('shkia-shachris-reminders', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://slivfpywzoriojdfrcpl.supabase.co/functions/v1/shkia-send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-shkia-secret', (select value from public.shkia_settings where key = 'cron_secret')),
    body := '{}'::jsonb
  );
$$);
```

## Analytics dashboard (/admin)

https://www.shkiatrusher.com/admin shows visitors, countries and cities,
devices, where people came from, game plays and scores, reminders, busiest
hours and recent activity.

- The site sends anonymous events to `/api/track`, which calls
  `shkia_track_event`. No IP is stored: the place comes from Vercel's geo
  headers, and a visitor is a random id the browser makes for itself. A device
  that signed in to /admin stops being counted (switch at the bottom of the page).
- Data lives in `public.shkia_events` (same shared Supabase project, same
  locked-down `shkia_` pattern). Admin sessions are `public.shkia_admin_sessions`
  (hashed tokens, 30 days), wrong passwords are `public.shkia_admin_failures`
  (10 wrong tries in 15 minutes locks login for 15 minutes).
- Set or change the admin password in the Supabase SQL editor. It's stored as a
  bcrypt hash in `shkia_settings`, and changing it signs everyone out:

```sql
select public.shkia_admin_set_password('your new password');
```
