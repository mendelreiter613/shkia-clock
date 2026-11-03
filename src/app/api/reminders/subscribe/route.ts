import { NextResponse } from "next/server";
import tz from "tz-lookup";
import { isReminderMinutes } from "@/lib/reminders";
import { upsertSubscription } from "@/lib/pushServer";

export const dynamic = "force-dynamic";

function isShortString(value: unknown, max: number): value is string {
    return typeof value === "string" && value.length > 0 && value.length <= max;
}

export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { subscription, lat, lng, locationName, minutesBefore } = body as {
        subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
        lat?: unknown; lng?: unknown; locationName?: unknown; minutesBefore?: unknown;
    };

    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    if (!isShortString(endpoint, 1000) || !endpoint.startsWith("https://")
        || !isShortString(p256dh, 200) || !isShortString(auth, 100)) {
        return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }
    if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }
    if (!isReminderMinutes(minutesBefore)) {
        return NextResponse.json({ error: "Invalid minutesBefore" }, { status: 400 });
    }

    try {
        await upsertSubscription({
            endpoint,
            p256dh,
            auth,
            lat,
            lng,
            // Derived here rather than trusted from the client.
            timeZone: tz(lat, lng),
            locationName: isShortString(locationName, 120) ? locationName : "your location",
            minutesBefore,
        });
    } catch (e) {
        console.error("Saving push subscription failed:", e instanceof Error ? e.message : e);
        return NextResponse.json({ error: "Could not save reminder" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}
