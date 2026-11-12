import { JewishCalendar } from "kosher-zmanim";

// "Beat the Shkia": one entry per day the user tapped "I davened Mincha"
// before shkia. Days are keyed YYYY-MM-DD in the LOCATION's timezone, by the
// date of that day's shkia, so the key never depends on the browser's clock zone.

export interface MinchaEntry {
    minutesLeft: number; // whole minutes before shkia when they tapped
    at: number;          // epoch ms of the tap
    beforePlag: boolean; // davened before plag hamincha
}

export type MinchaLog = Record<string, MinchaEntry>;

const LOG_KEY = "shkia-mincha-log";

export function loadLog(): MinchaLog {
    try {
        const raw = window.localStorage.getItem(LOG_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return {};
        const log: MinchaLog = {};
        for (const [key, v] of Object.entries(parsed)) {
            const e = v as Partial<MinchaEntry>;
            if (/^\d{4}-\d{2}-\d{2}$/.test(key) && typeof e?.minutesLeft === "number" && typeof e?.at === "number") {
                log[key] = { minutesLeft: e.minutesLeft, at: e.at, beforePlag: !!e.beforePlag };
            }
        }
        return log;
    } catch {
        return {};
    }
}

export function saveLog(log: MinchaLog) {
    try {
        window.localStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch {
        // Private mode / blocked storage: the streak still works for this visit.
    }
}

export function dayKey(instant: Date, timeZone: string): string {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

export function shiftDay(key: string, delta: number): string {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

export function weekday(key: string): number {
    return new Date(`${key}T12:00:00Z`).getUTCDay();
}

// Shabbos and Yom Tov don't break a streak: people who keep them won't be
// tapping a phone. Second-day Yom Tov only counts outside Israel.
export function isRestDay(key: string, inIsrael: boolean): boolean {
    if (weekday(key) === 6) return true;
    const [y, m, d] = key.split("-").map(Number);
    const cal = new JewishCalendar(new Date(y, m - 1, d, 12));
    cal.setInIsrael(inIsrael);
    return cal.isYomTovAssurBemelacha();
}

// Shaos zmaniyos (GRA): the day from sunrise to sunset split into 12 hours.
function shaahZmanis(sunrise: Date, sunset: Date, hours: number): Date {
    return new Date(sunrise.getTime() + ((sunset.getTime() - sunrise.getTime()) * hours) / 12);
}
export const minchaGedola = (sunrise: Date, sunset: Date) => shaahZmanis(sunrise, sunset, 6.5);
export const plagHamincha = (sunrise: Date, sunset: Date) => shaahZmanis(sunrise, sunset, 10.75);

// Walk back from `fromKey`, counting logged days and stepping over rest days
// that weren't logged. Stops at the first ordinary day with no entry.
function runEndingAt(log: MinchaLog, fromKey: string, inIsrael: boolean): number {
    let n = 0;
    let key = fromKey;
    // Rest days can come 3 in a row (Yom Tov next to Shabbos); cap the skip just in case.
    for (let skipped = 0; skipped < 4; key = shiftDay(key, -1)) {
        if (log[key]) { n++; skipped = 0; }
        else if (isRestDay(key, inIsrael)) skipped++;
        else break;
    }
    return n;
}

// While today's shkia hasn't passed, an un-logged today doesn't break the
// streak yet: it's still alive from yesterday, just at risk.
export function currentStreak(log: MinchaLog, todayKey: string, beforeShkia: boolean, inIsrael: boolean): number {
    if (log[todayKey] || beforeShkia || isRestDay(todayKey, inIsrael)) {
        return runEndingAt(log, log[todayKey] ? todayKey : shiftDay(todayKey, -1), inIsrael);
    }
    return 0;
}

export function bestStreak(log: MinchaLog, inIsrael: boolean): number {
    const keys = Object.keys(log).sort();
    let best = 0;
    for (const key of keys) {
        // Only start counting at the end of each run.
        if (!log[nextLoggedOrWorkday(key, inIsrael)]) best = Math.max(best, runEndingAt(log, key, inIsrael));
    }
    return best;
}

// The next ordinary day after `key`, or the next logged one, skipping unlogged rest days.
function nextLoggedOrWorkday(key: string, inIsrael: boolean): string {
    let next = shiftDay(key, 1);
    for (let i = 0; i < 4 && isRestDay(next, inIsrael); i++) next = shiftDay(next, 1);
    return next;
}

export function formatMargin(minutes: number): string {
    if (minutes < 1) return "under a minute";
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function cheer(entry: MinchaEntry): string {
    if (entry.minutesLeft < 5) return "Buzzer beater! ⏱️";
    if (entry.minutesLeft < 15) return "Close one! 😅";
    if (entry.beforePlag) return "Early bird! 🐦";
    return "Well done! 🙏";
}

export interface Badge {
    id: string;
    emoji: string;
    name: string;
    how: string;
    earned: boolean;
}

export function badges(log: MinchaLog, best: number): Badge[] {
    const entries = Object.entries(log);
    return [
        { id: "first", emoji: "🌱", name: "First Mincha", how: "Log your first Mincha", earned: entries.length >= 1 },
        { id: "week", emoji: "🔥", name: "Full Week", how: "A 7-day streak", earned: best >= 7 },
        { id: "chai", emoji: "✡️", name: "Chai", how: "An 18-day streak", earned: best >= 18 },
        { id: "month", emoji: "🌙", name: "Full Month", how: "A 30-day streak", earned: best >= 30 },
        { id: "early", emoji: "🐦", name: "Early Bird", how: "Daven before plag hamincha", earned: entries.some(([, e]) => e.beforePlag) },
        { id: "buzzer", emoji: "⏱️", name: "Buzzer Beater", how: "Make it with under 5 minutes left", earned: entries.some(([, e]) => e.minutesLeft < 5) },
        { id: "erev", emoji: "🕯️", name: "Erev Shabbos Ready", how: "Daven on Friday with an hour to spare", earned: entries.some(([k, e]) => weekday(k) === 5 && e.minutesLeft >= 60) },
    ];
}
