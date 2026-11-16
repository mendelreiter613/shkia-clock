import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabaseServer";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, adminCookieOptions } from "@/lib/adminSession";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    let password: unknown;
    try {
        ({ password } = await request.json());
    } catch {
        return NextResponse.json({ error: "wrong" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length === 0 || password.length > 200) {
        return NextResponse.json({ error: "wrong" }, { status: 400 });
    }

    let result: { token?: string; error?: "wrong" | "locked" };
    try {
        result = await rpc("shkia_admin_login", { p_password: password });
    } catch (e) {
        console.error("Admin login failed:", e instanceof Error ? e.message : e);
        return NextResponse.json({ error: "server" }, { status: 500 });
    }
    if (!result?.token) {
        return NextResponse.json({ error: result?.error ?? "wrong" }, { status: result?.error === "locked" ? 429 : 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, result.token, { ...adminCookieOptions, maxAge: ADMIN_COOKIE_MAX_AGE });
    return res;
}
