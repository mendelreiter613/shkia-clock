"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ZmanimData } from "@/lib/zmanim";
import {
    badges,
    bestStreak,
    currentStreak,
    dayKey,
    isRestDay,
    loadLog,
    MinchaEntry,
    MinchaLog,
    minchaGedola,
    plagHamincha,
    saveLog,
} from "@/lib/streak";

// "early": before mincha gedola. "open": Mincha time, before shkia. "closed": shkia has passed.
export type MinchaWindow = "early" | "open" | "closed";

export function useStreak(zmanim: ZmanimData, now: Date) {
    const [log, setLog] = useState<MinchaLog>({});
    const [justLogged, setJustLogged] = useState<MinchaEntry | null>(null);

    useEffect(() => {
        // Read storage after mount, not during render, so SSR and the first client render agree.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
        setLog(loadLog());
    }, []);

    const { visualSunrise: sunrise, visualSunset: sunset, timeZone } = zmanim;
    const inIsrael = timeZone === "Asia/Jerusalem";
    // Key the day by today's shkia, in the location's own timezone.
    const todayKey = dayKey(sunset, timeZone);
    const gedola = minchaGedola(sunrise, sunset);
    const plag = plagHamincha(sunrise, sunset);
    const beforeShkia = now.getTime() < sunset.getTime();
    const minchaWindow: MinchaWindow = !beforeShkia ? "closed" : now.getTime() < gedola.getTime() ? "early" : "open";
    const restDay = useMemo(() => isRestDay(todayKey, inIsrael), [todayKey, inIsrael]);
    const today = log[todayKey] ?? null;

    const streak = currentStreak(log, todayKey, beforeShkia, inIsrael);
    const best = useMemo(() => bestStreak(log, inIsrael), [log, inIsrael]);
    const earned = useMemo(() => badges(log, best), [log, best]);

    const markDavened = useCallback(() => {
        const at = Date.now();
        if (at >= sunset.getTime() || log[todayKey]) return;
        const entry: MinchaEntry = {
            minutesLeft: Math.floor((sunset.getTime() - at) / 60000),
            at,
            beforePlag: at < plag.getTime(),
        };
        const next = { ...log, [todayKey]: entry };
        setLog(next);
        saveLog(next);
        setJustLogged(entry);
    }, [log, todayKey, sunset, plag]);

    const undoToday = useCallback(() => {
        if (!log[todayKey]) return;
        const next = { ...log };
        delete next[todayKey];
        setLog(next);
        saveLog(next);
        setJustLogged(null);
    }, [log, todayKey]);

    const dismissCelebration = useCallback(() => setJustLogged(null), []);

    return {
        log, todayKey, today, minchaWindow, restDay, inIsrael, minchaGedola: gedola, plag,
        streak, best, total: Object.keys(log).length, badges: earned,
        justLogged, markDavened, undoToday, dismissCelebration,
    };
}

export type StreakState = ReturnType<typeof useStreak>;
