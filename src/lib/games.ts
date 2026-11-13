import { ZmanimData } from "@/lib/zmanim";

// Both games give you less time the later it really is: before sunrise you
// get the whole budget, and as today's shkia gets close it shrinks toward the
// minimum. After shkia (zmanim.shkia already points at tomorrow) it's a
// practice round with the full budget.
export interface GameClock {
    msToShkia: number;
    // 0..1: share of today's daylight still left before shkia
    dayLeft: number;
    afterShkia: boolean;
}

export function getGameClock(zmanim: ZmanimData, now = new Date()): GameClock {
    const msToShkia = zmanim.shkia.getTime() - now.getTime();
    const afterShkia = now.getTime() >= zmanim.visualSunset.getTime();
    const daylight = zmanim.visualSunset.getTime() - zmanim.visualSunrise.getTime();
    const dayLeft = afterShkia ? 1 : Math.max(0, Math.min(1, msToShkia / daylight));
    return { msToShkia, dayLeft, afterShkia };
}

// Seconds of game time, from `min` (shkia is minutes away) to `max` (the whole day is ahead).
export function gameSeconds(clock: GameClock, min: number, max: number): number {
    return Math.round(min + (max - min) * clock.dayLeft);
}

export function formatRealTimeLeft(ms: number): string {
    const totalMin = Math.max(0, Math.floor(ms / 60000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m} min`;
    return `${h}h ${m}m`;
}

// Best scores stay on this device only. Storage can be missing or blocked
// (private windows, previews), so every read and write is guarded.
export function readBest(key: string): number | null {
    try {
        const v = localStorage.getItem(`shkia-game-best:${key}`);
        return v === null ? null : Number(v);
    } catch {
        return null;
    }
}

export function writeBest(key: string, value: number) {
    try {
        localStorage.setItem(`shkia-game-best:${key}`, String(value));
    } catch {
        // not saved; the game still works
    }
}
