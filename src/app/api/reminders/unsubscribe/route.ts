import { NextResponse } from "next/server";
import { deleteSubscription } from "@/lib/pushServer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    let endpoint: unknown;
    try {
        ({ endpoint } = await request.json());
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 1000) {
        return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
    }

    try {
        await deleteSubscription(endpoint);
    } catch (e) {
        console.error("Deleting push subscription failed:", e instanceof Error ? e.message : e);
        return NextResponse.json({ error: "Could not remove reminder" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}
