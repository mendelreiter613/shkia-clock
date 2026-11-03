import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// The Supabase project is shared with other apps, so this server holds no
// Supabase secret at all: it uses the public key, which can only call the two
// shkia_* functions below. Sending happens inside Supabase (edge function
// shkia-send-reminders), where the push keys live. See supabase/migrations.

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

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable ${name}`);
    return value;
}

let supabase: SupabaseClient | null = null;

function db(): SupabaseClient {
    if (!supabase) {
        supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_PUBLISHABLE_KEY"), {
            auth: { persistSession: false },
        });
    }
    return supabase;
}

async function call(fn: string, args: Record<string, unknown>) {
    const { error } = await db().rpc(fn, args);
    if (error) throw new Error(`${fn} failed: ${error.message}`);
}

export function upsertSubscription(s: NewSubscription) {
    return call("shkia_upsert_subscription", {
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

export function deleteSubscription(endpoint: string) {
    return call("shkia_delete_subscription", { p_endpoint: endpoint });
}
