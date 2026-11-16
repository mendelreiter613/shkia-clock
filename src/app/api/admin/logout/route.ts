import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/supabaseServer";
import { ADMIN_COOKIE, adminCookieOptions } from "@/lib/adminSession";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    if (token) {
        await rpc("shkia_admin_logout", { p_token: token }).catch(() => {});
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions, maxAge: 0 });
    return res;
}
