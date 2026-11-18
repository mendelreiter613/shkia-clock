"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
    Bell, Gamepad2, Globe2, Loader2, LogOut, MapPin, MonitorSmartphone, RefreshCw, Sun, Users,
} from "lucide-react";
import { isAdminDevice, setAdminDevice } from "@/lib/analytics";

// ---- data shape returned by public.shkia_admin_stats ----

interface Row { k: string; v: number }
interface CityRow extends Row { c: string | null; r: string | null }
interface GameRow {
    game: "race-the-sun" | "wake-up-dash";
    plays: number; players: number; finished: number; wins: number;
    best: number | null; avg_win: number | null;
}
interface RecentRow {
    at: string; event: string; city: string | null; country: string | null; device: string | null;
    location: string | null; game: GameRow["game"] | null; won: boolean | null; score: number | null;
    mode: "tab" | "push" | null; visitor: string;
}
interface Stats {
    days: number;
    bucket: "hour" | "day";
    time_zone: string;
    generated_at: string;
    totals: { visitors: number; visits: number; game_plays: number; locations_set: number; reminders_on: number };
    new_visitors: number;
    live: number;
    reminders: { active: number; m15: number; m30: number; m60: number };
    series: { t: string; visitors: number; visits: number; plays: number }[];
    hours: { h: number; visits: number }[];
    countries: Row[];
    cities: CityRow[];
    locations: Row[];
    devices: Row[];
    browsers: Row[];
    os: Row[];
    referrers: Row[];
    installed: { app: number; browser: number };
    games: GameRow[];
    recent: RecentRow[];
}

// Single-hue charts, validated against the dark card surface (dataviz validator).
const AMBER = "#d97706";
const SKY = "#0284c7";

const RANGES = [
    { days: 1, label: "24 hours", short: "24h" },
    { days: 7, label: "7 days", short: "7d" },
    { days: 30, label: "30 days", short: "30d" },
    { days: 90, label: "90 days", short: "90d" },
    { days: 365, label: "1 year", short: "1y" },
];

const GAME_NAMES: Record<GameRow["game"], string> = {
    "race-the-sun": "Race the Sun",
    "wake-up-dash": "Wake-up Dash",
};
const GAME_SCORE: Record<GameRow["game"], string> = {
    "race-the-sun": "s of sun to spare",
    "wake-up-dash": "s to spare",
};

const fmt = new Intl.NumberFormat();
let regionNames: Intl.DisplayNames | null = null;
function countryName(code: string | null): string {
    if (!code) return "Unknown";
    try {
        regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
        return regionNames.of(code) ?? code;
    } catch {
        return code;
    }
}
function flag(code: string | null): string {
    if (!code || !/^[A-Z]{2}$/.test(code)) return "🌐";
    return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}
function timeAgo(iso: string, now: number): string {
    const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}
function pct(part: number, whole: number): string {
    return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–";
}

function describe(r: RecentRow): string {
    const g = r.game ? GAME_NAMES[r.game] : "a game";
    switch (r.event) {
        case "visit": return "Opened the site";
        case "location_set": return `Picked ${r.location ?? "a location"}`;
        case "game_start": return `Started ${g}`;
        case "game_end": return r.won ? `Won ${g} with ${r.score ?? 0}s left` : `Lost ${g}`;
        case "reminder_on": return `Turned on ${r.mode === "push" ? "daily" : "in-tab"} reminders`;
        case "reminder_off": return "Turned off reminders";
        default: return r.event;
    }
}

// ---- page ----

type Status = "loading" | "signed-out" | "ready" | "error";

// "admin" (/admin) needs the password and includes the recent-activity feed;
// "public" (/stats) is open to everyone and leaves that feed out.
export default function AdminDashboard({ mode = "admin" }: { mode?: "admin" | "public" }) {
    const isAdmin = mode === "admin";
    const [status, setStatus] = useState<Status>("loading");
    const [stats, setStats] = useState<Stats | null>(null);
    const [days, setDays] = useState(30);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (d: number) => {
        setRefreshing(true);
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const endpoint = isAdmin ? "/api/admin/stats" : "/api/stats";
            const res = await fetch(`${endpoint}?days=${d}&tz=${encodeURIComponent(tz)}`, isAdmin ? { cache: "no-store" } : {});
            if (isAdmin && res.status === 401) {
                setStatus("signed-out");
                return;
            }
            if (!res.ok) throw new Error(String(res.status));
            setStats(await res.json());
            setStatus("ready");
        } catch {
            setStatus((s) => (s === "ready" ? s : "error"));
        } finally {
            setRefreshing(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        load(days);
        const interval = setInterval(() => { if (!document.hidden) load(days); }, 60_000);
        return () => clearInterval(interval);
    }, [days, load]);

    const signOut = async () => {
        await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
        setStats(null);
        setStatus("signed-out");
    };

    return (
        // The clock page locks body scrolling (globals.css), so the admin page
        // scrolls inside its own full-screen container instead.
        <div className="fixed inset-0 overflow-y-auto overflow-x-hidden overscroll-contain bg-slate-950 text-white">
            {status === "loading" && <Centered><Loader2 className="w-6 h-6 animate-spin text-white/50" /></Centered>}
            {status === "error" && (
                <Centered>
                    <p className="text-white/70 mb-4">Couldn&apos;t load the stats.</p>
                    <button onClick={() => load(days)} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15">Try again</button>
                </Centered>
            )}
            {status === "signed-out" && <Login onSignedIn={() => { setStatus("loading"); load(days); }} />}
            {status === "ready" && stats && (
                <Dashboard
                    stats={stats}
                    days={days}
                    onDays={setDays}
                    refreshing={refreshing}
                    onRefresh={() => load(days)}
                    onSignOut={isAdmin ? signOut : undefined}
                />
            )}
        </div>
    );
}

function Centered({ children }: { children: ReactNode }) {
    return <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 text-center">{children}</div>;
}

// ---- login ----

function Login({ onSignedIn }: { onSignedIn: () => void }) {
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!password) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            if (res.ok) {
                // Don't count the owner's own visits from this device.
                setAdminDevice(true);
                onSignedIn();
                return;
            }
            const { error: code } = await res.json().catch(() => ({ error: "server" }));
            setError(code === "locked" ? "Too many wrong tries. Wait 15 minutes and try again."
                : code === "wrong" ? "That password isn't right."
                : "Something went wrong. Please try again.");
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Centered>
            <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/10 p-6 text-left">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-xl bg-amber-500/15"><Sun className="w-5 h-5 text-amber-300" /></div>
                    <div>
                        <h1 className="text-lg font-semibold leading-tight">Shkia Trusher admin</h1>
                        <p className="text-sm text-white/50">Sign in to see the analytics</p>
                    </div>
                </div>
                <label htmlFor="admin-password" className="block text-sm text-white/70 mb-1.5">Password</label>
                <input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-300/50 focus:outline-none text-white"
                />
                {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
                <button
                    type="submit"
                    disabled={busy || !password}
                    className="mt-5 w-full py-3 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Sign in
                </button>
            </form>
        </Centered>
    );
}

// ---- dashboard ----

interface DashboardProps {
    stats: Stats;
    days: number;
    onDays: (d: number) => void;
    refreshing: boolean;
    onRefresh: () => void;
    /** Only on /admin; the public page has no sign-out, activity feed or device switch. */
    onSignOut?: () => void;
}

function Dashboard({ stats, days, onDays, refreshing, onRefresh, onSignOut }: DashboardProps) {
    const t = stats.totals;
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const i = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(i);
    }, []);
    const rangeLabel = RANGES.find((r) => r.days === days)?.label ?? `${days} days`;
    const installedTotal = stats.installed.app + stats.installed.browser;

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-amber-500/15 shrink-0"><Sun className="w-5 h-5 text-amber-300" /></div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold leading-tight">Shkia Trusher analytics</h1>
                        <p className="text-xs text-white/50 truncate">
                            Updated {timeAgo(stats.generated_at, now)} · times in {stats.time_zone.replace(/_/g, " ")}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-sm text-emerald-200 whitespace-nowrap">
                        <span className="relative flex w-2 h-2">
                            {stats.live > 0 && <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />}
                            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
                        </span>
                        {stats.live} on now
                    </span>
                    <button onClick={onRefresh} className="p-2 rounded-full hover:bg-white/10" aria-label="Refresh" title="Refresh">
                        <RefreshCw className={`w-4 h-4 text-white/70 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                    {onSignOut && (
                        <button onClick={onSignOut} className="p-2 rounded-full hover:bg-white/10" aria-label="Sign out" title="Sign out">
                            <LogOut className="w-4 h-4 text-white/70" />
                        </button>
                    )}
                </div>
            </header>

            <div className="flex gap-1 p-1 mb-6 rounded-xl bg-white/5 border border-white/10 w-full sm:w-fit" role="tablist" aria-label="Date range">
                {RANGES.map((r) => (
                    <button
                        key={r.days}
                        role="tab"
                        aria-selected={r.days === days}
                        onClick={() => onDays(r.days)}
                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${r.days === days ? "bg-white/15 text-white" : "text-white/60 hover:text-white"}`}
                    >
                        <span className="sm:hidden">{r.short}</span>
                        <span className="hidden sm:inline">{r.label}</span>
                    </button>
                ))}
            </div>

            <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4" aria-label="Totals">
                <Tile label="Visitors" value={t.visitors} hint={`${fmt.format(stats.new_visitors)} new`} />
                <Tile label="Visits" value={t.visits} hint={t.visitors ? `${(t.visits / t.visitors).toFixed(1)} per visitor` : undefined} />
                <Tile label="Locations set" value={t.locations_set} />
                <Tile label="Game plays" value={t.game_plays} />
                <Tile label="Reminders turned on" value={t.reminders_on} />
                <Tile label="Daily reminders active" value={stats.reminders.active} hint="all time" />
            </section>

            <TrendCard stats={stats} rangeLabel={rangeLabel} />

            <div className="grid md:grid-cols-2 gap-4 mt-4">
                <Card title="Countries" icon={<Globe2 className="w-4 h-4" />} note="visitors">
                    <BarList rows={stats.countries.map((r) => ({ label: `${flag(r.k)}  ${countryName(r.k)}`, value: r.v }))} empty="No visitors yet" />
                </Card>
                <Card title="Cities" icon={<MapPin className="w-4 h-4" />} note="visitors, from their connection">
                    <BarList
                        rows={stats.cities.map((r) => ({
                            label: `${flag(r.c)}  ${r.k}${r.r && !/^\d+$/.test(r.r) ? `, ${r.r}` : ""}`,
                            value: r.v,
                        }))}
                        empty="No cities yet (shows once the site is live on Vercel)"
                    />
                </Card>
                <Card title="Shkia locations picked" icon={<Sun className="w-4 h-4" />} note="visitors">
                    <BarList rows={stats.locations.map((r) => ({ label: r.k, value: r.v }))} empty="Nobody has picked a location yet" />
                </Card>
                <Card title="Where they came from" icon={<Users className="w-4 h-4" />} note="visits">
                    <BarList rows={stats.referrers.map((r) => ({ label: r.k, value: r.v }))} empty="No visits yet" />
                </Card>
            </div>

            <Card title="Games" icon={<Gamepad2 className="w-4 h-4" />} className="mt-4">
                <div className="grid sm:grid-cols-2 gap-3">
                    {(["race-the-sun", "wake-up-dash"] as const).map((id) => {
                        const g = stats.games.find((x) => x.game === id);
                        return (
                            <div key={id} className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                                <div className="font-semibold mb-3">{GAME_NAMES[id]}</div>
                                <dl className="grid grid-cols-3 gap-3 text-sm">
                                    <Stat label="Plays" value={fmt.format(g?.plays ?? 0)} />
                                    <Stat label="Players" value={fmt.format(g?.players ?? 0)} />
                                    <Stat label="Win rate" value={pct(g?.wins ?? 0, g?.finished ?? 0)} />
                                    <Stat label="Finished" value={fmt.format(g?.finished ?? 0)} />
                                    <Stat label="Best" value={g?.best != null ? `${g.best.toFixed(1)}s` : "–"} />
                                    <Stat label="Avg win" value={g?.avg_win != null ? `${g.avg_win}s` : "–"} />
                                </dl>
                                <p className="mt-3 text-xs text-white/40">Scores are {GAME_SCORE[id]}.</p>
                            </div>
                        );
                    })}
                </div>
            </Card>

            <div className="grid md:grid-cols-3 gap-4 mt-4">
                <Card title="Devices" icon={<MonitorSmartphone className="w-4 h-4" />} note="visitors">
                    <BarList rows={stats.devices.map((r) => ({ label: r.k[0].toUpperCase() + r.k.slice(1), value: r.v }))} empty="No data yet" />
                    {installedTotal > 0 && (
                        <p className="mt-4 text-sm text-white/60">
                            <span className="text-white font-semibold">{pct(stats.installed.app, installedTotal)}</span> use the installed app
                        </p>
                    )}
                </Card>
                <Card title="Browsers" note="visitors">
                    <BarList rows={stats.browsers.map((r) => ({ label: r.k, value: r.v }))} empty="No data yet" />
                </Card>
                <Card title="Operating systems" note="visitors">
                    <BarList rows={stats.os.map((r) => ({ label: r.k, value: r.v }))} empty="No data yet" />
                </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-4">
                <Card title="Busiest hours" note={`visits, ${rangeLabel}`} className="md:col-span-2">
                    <HourChart hours={stats.hours} />
                </Card>
                <Card title="Daily reminders" icon={<Bell className="w-4 h-4" />} note="active now">
                    <BarList
                        color={SKY}
                        rows={[
                            { label: "15 min before shkia", value: stats.reminders.m15 },
                            { label: "30 min before shkia", value: stats.reminders.m30 },
                            { label: "60 min before shkia", value: stats.reminders.m60 },
                        ]}
                        empty="No daily reminders yet"
                        hideZeroList={stats.reminders.active === 0}
                    />
                </Card>
            </div>

            {onSignOut && <Card title="Recent activity" className="mt-4" note="latest 40, any date">
                {stats.recent.length === 0 ? (
                    <p className="text-sm text-white/40">Nothing yet. Activity shows here as people use the site.</p>
                ) : (
                    <ul className="divide-y divide-white/5 -my-2">
                        {stats.recent.map((r, i) => (
                            <li key={i} className="flex items-center gap-3 py-2 text-sm">
                                <span className="text-lg shrink-0" aria-hidden>{flag(r.country)}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-white/90">{describe(r)}</span>
                                    <span className="block truncate text-xs text-white/40">
                                        {[r.city, r.country && countryName(r.country), r.device, `visitor ${r.visitor}`].filter(Boolean).join(" · ")}
                                    </span>
                                </span>
                                <span className="text-xs text-white/40 whitespace-nowrap">{timeAgo(r.at, now)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>}

            {onSignOut && <ThisDevice />}
        </div>
    );
}

function Tile({ label, value, hint }: { label: string; value: number; hint?: string }) {
    return (
        <div className="rounded-2xl bg-slate-900 border border-white/10 p-4">
            <div className="text-xs text-white/50 mb-1">{label}</div>
            <div className="text-2xl sm:text-3xl font-semibold tabular-nums">{fmt.format(value)}</div>
            {hint && <div className="text-xs text-white/40 mt-1">{hint}</div>}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs text-white/40">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
        </div>
    );
}

function Card({ title, icon, note, className = "", children }: { title: string; icon?: ReactNode; note?: string; className?: string; children: ReactNode }) {
    return (
        <section className={`rounded-2xl bg-slate-900 border border-white/10 p-4 sm:p-5 min-w-0 ${className}`}>
            <div className="flex items-baseline justify-between gap-3 mb-4">
                <h2 className="flex items-center gap-2 font-semibold text-white/90">
                    {icon && <span className="text-white/50">{icon}</span>}
                    {title}
                </h2>
                {note && <span className="text-xs text-white/40 text-right">{note}</span>}
            </div>
            {children}
        </section>
    );
}

function BarList({ rows, empty, color = AMBER, hideZeroList = false }: {
    rows: { label: string; value: number }[]; empty: string; color?: string; hideZeroList?: boolean;
}) {
    if (rows.length === 0 || hideZeroList) return <p className="text-sm text-white/40">{empty}</p>;
    const max = Math.max(...rows.map((r) => r.value), 1);
    const total = rows.reduce((s, r) => s + r.value, 0);
    return (
        <ul className="space-y-2.5">
            {rows.map((r) => (
                <li key={r.label} className="text-sm" title={`${r.label}: ${fmt.format(r.value)} (${pct(r.value, total)})`}>
                    <div className="flex justify-between gap-3 mb-1">
                        <span className="truncate text-white/80">{r.label}</span>
                        <span className="tabular-nums text-white/60 shrink-0">{fmt.format(r.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

// ---- over-time chart: one metric at a time, picked with tabs ----

const METRICS = [
    { key: "visitors", label: "Visitors" },
    { key: "visits", label: "Visits" },
    { key: "plays", label: "Game plays" },
] as const;

function TrendCard({ stats, rangeLabel }: { stats: Stats; rangeLabel: string }) {
    const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("visitors");
    const [hover, setHover] = useState<number | null>(null);
    const points = stats.series;
    const values = points.map((p) => p[metric]);
    const max = niceMax(Math.max(...values, 0));
    const hourly = stats.bucket === "hour";

    const label = useMemo(() => {
        const dayFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
        const hourFmt = new Intl.DateTimeFormat("en", { hour: "numeric" });
        // Bucket times are wall-clock in the admin's zone; parse as local.
        return (t: string) => {
            const [d, time] = t.split("T");
            const [y, m, day] = d.split("-").map(Number);
            const [h] = time.split(":").map(Number);
            const date = new Date(y, m - 1, day, h);
            return hourly ? hourFmt.format(date) : dayFmt.format(date);
        };
    }, [hourly]);

    const ticks = points.length > 1 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [0];
    const active = hover ?? null;

    return (
        <section className="rounded-2xl bg-slate-900 border border-white/10 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="font-semibold text-white/90">
                    {METRICS.find((m) => m.key === metric)?.label} {hourly ? "per hour" : "per day"}
                    <span className="ml-2 text-xs font-normal text-white/40">{rangeLabel}</span>
                </h2>
                <div className="flex gap-1 p-1 rounded-lg bg-white/5" role="tablist" aria-label="Metric">
                    {METRICS.map((m) => (
                        <button
                            key={m.key}
                            role="tab"
                            aria-selected={m.key === metric}
                            onClick={() => setMetric(m.key)}
                            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${m.key === metric ? "bg-white/15 text-white" : "text-white/55 hover:text-white"}`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative">
                <div className="absolute left-0 right-0 top-0 border-t border-dashed border-white/10" />
                <span className="absolute -top-2.5 right-0 text-[10px] text-white/40 bg-slate-900 pl-1 tabular-nums">{fmt.format(max)}</span>
                <div
                    className="relative h-48 flex items-end border-b border-white/15"
                    style={{ gap: points.length > 120 ? 0 : 2 }}
                    onMouseLeave={() => setHover(null)}
                >
                    {points.map((p, i) => {
                        const v = p[metric];
                        return (
                            <div
                                key={p.t}
                                className="relative flex-1 h-full flex items-end cursor-default"
                                onMouseEnter={() => setHover(i)}
                                onTouchStart={() => setHover(i)}
                            >
                                <div
                                    className="w-full rounded-t-[4px] transition-opacity"
                                    style={{
                                        height: v > 0 ? `max(${(v / max) * 100}%, 3px)` : 0,
                                        background: AMBER,
                                        opacity: active === null || active === i ? 1 : 0.45,
                                    }}
                                />
                            </div>
                        );
                    })}
                    {active !== null && points[active] && (
                        <div
                            className="absolute bottom-full mb-2 z-10 pointer-events-none px-3 py-2 rounded-lg bg-slate-800 border border-white/10 shadow-xl text-xs whitespace-nowrap"
                            style={{
                                left: `${((active + 0.5) / points.length) * 100}%`,
                                transform: `translateX(${active / points.length > 0.75 ? "-100%" : active / points.length < 0.25 ? "0" : "-50%"})`,
                            }}
                        >
                            <div className="text-white/50 mb-1">{label(points[active].t)}</div>
                            <div className="text-white"><span className="tabular-nums font-semibold">{fmt.format(points[active].visitors)}</span> visitors</div>
                            <div className="text-white/70"><span className="tabular-nums">{fmt.format(points[active].visits)}</span> visits</div>
                            <div className="text-white/70"><span className="tabular-nums">{fmt.format(points[active].plays)}</span> game plays</div>
                        </div>
                    )}
                </div>
                <div className="relative h-5 mt-1.5 text-[11px] text-white/40">
                    {ticks.map((i) => (
                        <span
                            key={i}
                            className="absolute whitespace-nowrap"
                            style={{
                                left: `${((i + 0.5) / points.length) * 100}%`,
                                transform: i === 0 ? "translateX(-25%)" : i === points.length - 1 ? "translateX(-75%)" : "translateX(-50%)",
                            }}
                        >
                            {points[i] ? label(points[i].t) : ""}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}

function HourChart({ hours }: { hours: Stats["hours"] }) {
    const [hover, setHover] = useState<number | null>(null);
    const max = niceMax(Math.max(...hours.map((h) => h.visits), 0));
    const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;
    return (
        <div>
            <div className="relative h-32 flex items-end gap-[2px] border-b border-white/15" onMouseLeave={() => setHover(null)}>
                {hours.map((h) => (
                    <div key={h.h} className="relative flex-1 h-full flex items-end" onMouseEnter={() => setHover(h.h)} onTouchStart={() => setHover(h.h)}>
                        <div
                            className="w-full rounded-t-[4px]"
                            style={{
                                height: h.visits > 0 ? `max(${(h.visits / max) * 100}%, 3px)` : 0,
                                background: AMBER,
                                opacity: hover === null || hover === h.h ? 1 : 0.45,
                            }}
                        />
                    </div>
                ))}
                {hover !== null && (
                    <div
                        className="absolute bottom-full mb-2 z-10 pointer-events-none px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs whitespace-nowrap"
                        style={{ left: `${((hover + 0.5) / 24) * 100}%`, transform: `translateX(${hover > 18 ? "-100%" : hover < 5 ? "0" : "-50%"})` }}
                    >
                        {hourLabel(hover)}–{hourLabel((hover + 1) % 24)}: <span className="font-semibold tabular-nums">{fmt.format(hours[hover].visits)}</span> visits
                    </div>
                )}
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-white/40">
                <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
            </div>
        </div>
    );
}

function niceMax(v: number): number {
    if (v <= 4) return 4;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= v) ?? 10;
    return step * mag;
}

// ---- the "don't count me" switch for this browser ----

function ThisDevice() {
    // Only rendered after the stats load in the browser, so storage is safe to read here.
    const [excluded, setExcluded] = useState(isAdminDevice);
    return (
        <p className="mt-6 text-xs text-white/40 text-center">
            {excluded ? "Your visits from this device aren't counted." : "Your visits from this device are being counted."}{" "}
            <button
                onClick={() => { setAdminDevice(!excluded); setExcluded(!excluded); }}
                className="underline underline-offset-2 hover:text-white/70"
            >
                {excluded ? "Count them" : "Stop counting them"}
            </button>
        </p>
    );
}
