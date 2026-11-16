import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// The Supabase project is shared with other apps, so this server holds no
// Supabase secret at all: it uses the public key, which can only call the
// shkia_* functions granted to anon. See supabase/migrations.

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

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await db().rpc(fn, args);
    if (error) throw new Error(`${fn} failed: ${error.message}`);
    return data as T;
}
