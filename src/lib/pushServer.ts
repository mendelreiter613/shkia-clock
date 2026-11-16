import "server-only";
import { rpc } from "@/lib/supabaseServer";

// Sending happens inside Supabase (edge function shkia-send-reminders), where
// the push keys live. This server only adds and removes subscriptions.

export interface NewSubscription {
    endpoint: string;
    p256dh: string;
    auth: string;
    lat: number;
    lng: number;
    timeZone: string;
    locationName: string;
    minutesBefore: number;
}

export async function upsertSubscription(s: NewSubscription) {
    await rpc("shkia_upsert_subscription", {
        p_endpoint: s.endpoint,
        p_p256dh: s.p256dh,
        p_auth: s.auth,
        p_lat: s.lat,
        p_lng: s.lng,
        p_time_zone: s.timeZone,
        p_location_name: s.locationName,
        p_minutes_before: s.minutesBefore,
    });
}

export async function deleteSubscription(endpoint: string) {
    await rpc("shkia_delete_subscription", { p_endpoint: endpoint });
}
