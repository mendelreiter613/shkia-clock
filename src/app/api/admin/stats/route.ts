import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/supabaseServer";
import { ADMIN_COOKIE } from "@/lib/adminSession";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "signed out" }, { status: 401 });

    const days = Number(request.nextUrl.searchParams.get("days")) || 30;
    const tz = (request.nextUrl.searchParams.get("tz") ?? "UTC").slice(0, 64);

    try {
        const stats = await rpc("shkia_admin_stats", { p_token: token, p_days: days, p_tz: tz });
        if (!stats) return NextResponse.json({ error: "signed out" }, { status: 401 });
        return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
        console.error("Admin stats failed:", e instanceof Error ? e.message : e);
        return NextResponse.json({ error: "server" }, { status: 500 });
    }
}
