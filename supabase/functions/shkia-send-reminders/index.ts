// Supabase Edge Function: sends the daily Shachris reminder pushes.
//
// Invoked every 5 minutes by the pg_cron job "shkia-shachris-reminders",
// which passes the cron_secret from public.shkia_settings as x-shkia-secret.
// Each run reminds everyone whose own shkia is now within their chosen lead
// time and who hasn't been reminded for that shkia yet.
//
// The shkia and wording logic mirrors src/lib/zmanim.ts and
// src/lib/reminders.ts in the app. Keep them in step.

import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import webpush from "npm:web-push@3.6.7";
import { getZmanimJson, TimeZone } from "npm:kosher-zmanim@0.9.0";

// Same fix as src/lib/zmanim.ts: kosher-zmanim 0.9.0 flips the sign of the
// standard offset for daylight-saving zones, which pushed Sydney and New
// Zealand onto tomorrow's shkia so their reminders never came due.
function utcOffsetMs(timeZone: string, at: Date): number {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
            timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
            hour: "numeric", minute: "numeric", second: "numeric",
        }).formatToParts(at).map((p) => [p.type, p.value]),
    );
    const wallAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    return wallAsUtc - at.getTime();
}

TimeZone.getRawOffset = (timeZoneId: string): number => {
    const year = new Date().getUTCFullYear();
    return Math.min(
        utcOffsetMs(timeZoneId, new Date(Date.UTC(year, 0, 1))),
        utcOffsetMs(timeZoneId, new Date(Date.UTC(year, 6, 1))),
    );
};

interface SubscriptionRow {
    endpoint: string;
    p256dh: string;
    auth: string;
    lat: number;
    lng: number;
    time_zone: string;
    location_name: string;
    minutes_before: number;
    last_notified_shkia: string | null;
}

interface ZmanimResponse {
    BasicZmanim?: { Sunset?: string };
}

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
});

// Next shkia for a place: today's if it hasn't passed yet, else tomorrow's,
// with "today" taken in the place's own timezone.
function nextShkia(lat: number, lng: number, timeZone: string, now: Date): Date | null {
    const zonedNow = new Date(now.toLocaleString("en-US", { timeZone }));
    const base = { latitude: lat, longitude: lng, timeZoneId: timeZone };
    const today = (getZmanimJson({ ...base, date: zonedNow }) as ZmanimResponse).BasicZmanim?.Sunset;
    if (!today) return null;
    const shkia = new Date(today);
    if (now.getTime() <= shkia.getTime()) return shkia;

    const zonedTomorrow = new Date(zonedNow);
    zonedTomorrow.setDate(zonedTomorrow.getDate() + 1);
    const tomorrow = (getZmanimJson({ ...base, date: zonedTomorrow }) as ZmanimResponse).BasicZmanim?.Sunset;
    return tomorrow ? new Date(tomorrow) : null;
}

function isReminderDue(shkia: Date, now: Date, minutesBefore: number): boolean {
    const msLeft = shkia.getTime() - now.getTime();
    return msLeft > 0 && msLeft <= minutesBefore * 60 * 1000;
}

function reminderBody(shkia: Date, timeZone: string, locationName: string, now: Date): string {
    const at = shkia.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
    const minutesLeft = Math.max(1, Math.round((shkia.getTime() - now.getTime()) / 60000));
    return `Shkia in ${locationName} is at ${at}, ${minutesLeft} ${minutesLeft === 1 ? "minute" : "minutes"} from now.`;
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
    const { data: settingsRows, error: settingsError } = await supabase.from("shkia_settings").select("key, value");
    if (settingsError) return json({ error: "Could not load settings" }, 500);
    const settings = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]));

    if (!settings.cron_secret || req.headers.get("x-shkia-secret") !== settings.cron_secret) {
        return json({ error: "Unauthorized" }, 401);
    }

    webpush.setVapidDetails(settings.vapid_subject, settings.vapid_public_key, settings.vapid_private_key);

    // PostgREST caps responses at 1000 rows by default; page this if it grows past that.
    const { data, error } = await supabase.from("shkia_push_subscriptions").select("*");
    if (error) return json({ error: "Could not load subscriptions" }, 500);

    const rows = (data ?? []) as SubscriptionRow[];
    const now = new Date();
    let sent = 0, removed = 0, failed = 0;

    await Promise.all(rows.map(async (row) => {
        const shkia = nextShkia(row.lat, row.lng, row.time_zone, now);
        if (!shkia || !isReminderDue(shkia, now, row.minutes_before)) return;
        if (row.last_notified_shkia && new Date(row.last_notified_shkia).getTime() === shkia.getTime()) return;

        try {
            await webpush.sendNotification(
                { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
                JSON.stringify({
                    title: "Time to daven Shachris",
                    body: reminderBody(shkia, row.time_zone, row.location_name, now),
                    url: "/",
                }),
                // Past shkia the reminder is pointless, so don't let the push service hold it longer.
                { TTL: Math.max(60, Math.floor((shkia.getTime() - now.getTime()) / 1000)) },
            );
            await supabase.from("shkia_push_subscriptions")
                .update({ last_notified_shkia: shkia.toISOString() })
                .eq("endpoint", row.endpoint);
            sent++;
        } catch (e) {
            const status = (e as { statusCode?: number }).statusCode;
            // 404/410: the browser dropped this subscription (uninstalled, permission revoked).
            if (status === 404 || status === 410) {
                await supabase.from("shkia_push_subscriptions").delete().eq("endpoint", row.endpoint);
                removed++;
            } else {
                console.error("Push send failed:", status, e instanceof Error ? e.message : e);
                failed++;
            }
        }
    }));

    return json({ checked: rows.length, sent, removed, failed });
});
