// Anonymous usage events for the /admin dashboard. A visitor is a random id
// this browser makes for itself (no cookies, no personal data); a visit is one
// tab session. Tracking never throws and never blocks the page.

type GameId = "race-the-sun" | "wake-up-dash";

export type TrackEvent =
    | { event: "visit" }
    | { event: "location_set"; locationName: string }
    | { event: "game_start"; game: GameId }
    | { event: "game_end"; game: GameId; won: boolean; score: number }
    | { event: "reminder_on"; mode: "tab" | "push"; minutes: number }
    | { event: "reminder_off" };

const VISITOR_KEY = "shkia-visitor-id";
const SESSION_KEY = "shkia-session-id";
// Set on a device that signed in to /admin, so the owner's own use isn't counted.
export const ADMIN_DEVICE_KEY = "shkia-admin-device";

function uuid(): string {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Storage can be missing or blocked (private windows, previews). Then the id
// lives only in memory for this page load, which is still a fair count.
const memory: Record<string, string> = {};
function storedId(storage: () => Storage, key: string): string {
    try {
        const s = storage();
        let id = s.getItem(key);
        if (!id) {
            id = uuid();
            s.setItem(key, id);
        }
        return id;
    } catch {
        return (memory[key] ??= uuid());
    }
}

export function isAdminDevice(): boolean {
    try {
        return localStorage.getItem(ADMIN_DEVICE_KEY) === "1";
    } catch {
        return false;
    }
}

export function setAdminDevice(on: boolean) {
    try {
        if (on) localStorage.setItem(ADMIN_DEVICE_KEY, "1");
        else localStorage.removeItem(ADMIN_DEVICE_KEY);
    } catch {
        // not saved
    }
}

function visitExtras() {
    const params = new URLSearchParams(location.search);
    let referrer = params.get("utm_source") || params.get("ref") || null;
    if (!referrer && document.referrer) {
        try {
            const host = new URL(document.referrer).hostname;
            if (host && host !== location.hostname) referrer = host;
        } catch {
            // ignore a malformed referrer
        }
    }
    const installed = window.matchMedia("(display-mode: standalone)").matches
        || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return { referrer, installed };
}

let visitSent = false;

export function track(e: TrackEvent) {
    if (typeof window === "undefined" || isAdminDevice()) return;
    // React runs mount effects twice in development; count a page load once.
    if (e.event === "visit") {
        if (visitSent) return;
        visitSent = true;
    }
    try {
        const body = JSON.stringify({
            ...e,
            ...(e.event === "visit" ? visitExtras() : {}),
            visitorId: storedId(() => localStorage, VISITOR_KEY),
            sessionId: storedId(() => sessionStorage, SESSION_KEY),
            touch: navigator.maxTouchPoints > 1,
        });
        const blob = new Blob([body], { type: "application/json" });
        if (!navigator.sendBeacon?.("/api/track", blob)) {
            fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
        }
    } catch {
        // analytics must never break the page
    }
}
