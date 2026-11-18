import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Public analytics for /stats: no sign-in, no per-visitor activity feed.
export async function GET(request: NextRequest) {
    const days = Number(request.nextUrl.searchParams.get("days")) || 30;
    const tz = (request.nextUrl.searchParams.get("tz") ?? "UTC").slice(0, 64);

    try {
        const stats = await rpc("shkia_public_stats", { p_days: days, p_tz: tz });
        return NextResponse.json(stats, {
            // Anyone can open this, so let Vercel's CDN absorb repeat loads.
            headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
        });
    } catch (e) {
        console.error("Public stats failed:", e instanceof Error ? e.message : e);
        return NextResponse.json({ error: "server" }, { status: 500 });
    }
}
