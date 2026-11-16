import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Anonymous usage events for the /admin dashboard. No IP address is stored:
// the place comes from Vercel's geo headers (country/region/city only), and
// the browser, OS and device are worked out here from the user agent.

const EVENTS = new Set(["visit", "location_set", "game_start", "game_end", "reminder_on", "reminder_off"]);
const GAMES = new Set(["race-the-sun", "wake-up-dash"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|telegram|discord/i;

function short(value: unknown, max: number): string | null {
    if (typeof value !== "string") return null;
    const v = value.trim();
    return v ? v.slice(0, max) : null;
}

function header(request: Request, name: string, max: number): string | null {
    const raw = request.headers.get(name);
    if (!raw) return null;
    try {
        return short(decodeURIComponent(raw), max);
    } catch {
        return short(raw, max);
    }
}

function parseUserAgent(ua: string, touch: boolean) {
    const iPadAsMac = touch && /Macintosh/.test(ua);
    const device = iPadAsMac || /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) ? "tablet"
        : /Mobi|iPhone|iPod|Android/i.test(ua) ? "mobile"
        : "desktop";
    const browser = /Edg\//.test(ua) ? "Edge"
        : /OPR\/|Opera/.test(ua) ? "Opera"
        : /SamsungBrowser/.test(ua) ? "Samsung Internet"
        : /FxiOS|Firefox/.test(ua) ? "Firefox"
        : /CriOS|Chrome|Chromium/.test(ua) ? "Chrome"
        : /Safari/.test(ua) ? "Safari"
        : "Other";
    const os = /iPhone|iPod/.test(ua) ? "iOS"
        : /iPad/.test(ua) || iPadAsMac ? "iPadOS"
        : /Android/.test(ua) ? "Android"
        : /Windows/.test(ua) ? "Windows"
        : /CrOS/.test(ua) ? "ChromeOS"
        : /Mac OS X|Macintosh/.test(ua) ? "macOS"
        : /Linux/.test(ua) ? "Linux"
        : "Other";
    return { device, browser, os };
}

export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return new NextResponse(null, { status: 400 });
    }

    const ua = request.headers.get("user-agent") ?? "";
    if (BOT.test(ua)) return new NextResponse(null, { status: 204 });

    const { event, visitorId, sessionId, game, won, score, minutes, mode } = body;
    if (typeof event !== "string" || !EVENTS.has(event)
        || typeof visitorId !== "string" || !UUID.test(visitorId)
        || typeof sessionId !== "string" || !UUID.test(sessionId)) {
        return new NextResponse(null, { status: 400 });
    }

    const country = request.headers.get("x-vercel-ip-country");
    const { device, browser, os } = parseUserAgent(ua, body.touch === true);

    try {
        await rpc("shkia_track_event", {
            p: {
                visitor_id: visitorId,
                session_id: sessionId,
                event,
                country: country && /^[A-Z]{2}$/.test(country) ? country : null,
                region: header(request, "x-vercel-ip-country-region", 80),
                city: header(request, "x-vercel-ip-city", 80),
                device,
                browser,
                os,
                referrer: event === "visit" ? short(body.referrer, 120)?.replace(/^www\./, "") ?? null : null,
                installed: event === "visit" && typeof body.installed === "boolean" ? body.installed : null,
                location_name: event === "location_set" ? short(body.locationName, 120) : null,
                game: typeof game === "string" && GAMES.has(game) ? game : null,
                won: event === "game_end" && typeof won === "boolean" ? won : null,
                score: event === "game_end" && typeof score === "number" && score >= 0 && score <= 100000 ? score : null,
                reminder_mode: mode === "tab" || mode === "push" ? mode : null,
                reminder_minutes: minutes === 15 || minutes === 30 || minutes === 60 ? minutes : null,
            },
        });
    } catch (e) {
        console.error("Tracking failed:", e instanceof Error ? e.message : e);
        return new NextResponse(null, { status: 500 });
    }
    return new NextResponse(null, { status: 204 });
}
