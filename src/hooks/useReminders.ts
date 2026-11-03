"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZmanimData } from "@/lib/zmanim";
import { isReminderDue, ReminderMinutes, reminderBody, reminderTitle } from "@/lib/reminders";
import {
    DEFAULT_PREFS,
    loadLastTabNotified,
    loadPrefs,
    locationKey,
    ReminderLocation,
    ReminderPrefs,
    requestNotificationPermission,
    saveLastTabNotified,
    savePrefs,
    showLocalNotification,
    subscribePush,
    unsubscribePush,
} from "@/lib/pushClient";

const BLOCKED_MESSAGE = "Notifications are blocked for this site. Allow them in your browser's site settings, then try again.";

export function useReminders(location: ReminderLocation, zmanim: ZmanimData, now: Date) {
    const [prefs, setPrefsState] = useState<ReminderPrefs>(DEFAULT_PREFS);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastTabNotified = useRef<number | null>(null);

    useEffect(() => {
        // Read storage after mount, not during render, so SSR and the first client render agree.
        setPrefsState(loadPrefs());
        lastTabNotified.current = loadLastTabNotified();
    }, []);

    const setPrefs = useCallback((next: ReminderPrefs) => {
        setPrefsState(next);
        savePrefs(next);
    }, []);

    // In-tab reminder: piggybacks on the countdown's own 1s tick. Background
    // tabs get throttled to about once a minute, which is still on time.
    useEffect(() => {
        if (prefs.mode !== "tab" || !("Notification" in window) || Notification.permission !== "granted") return;
        if (!isReminderDue(zmanim.shkia, now, prefs.minutes)) return;
        const shkiaMs = zmanim.shkia.getTime();
        if (lastTabNotified.current === shkiaMs) return;
        lastTabNotified.current = shkiaMs;
        saveLastTabNotified(shkiaMs);
        showLocalNotification(reminderTitle(), reminderBody(zmanim.shkia, zmanim.timeZone, location.name, prefs.minutes)).catch(() => {});
    }, [now, prefs.mode, prefs.minutes, zmanim, location.name]);

    // Push reminders live on the server with the location they were set up
    // for; when the user picks a different city here, move them along.
    // `location` is a fresh object every render, so key off its fields, and
    // never let a slow request overlap the next 1s tick's attempt.
    const currentKey = locationKey(location);
    const { lat, lng, name } = location;
    const moving = useRef(false);
    useEffect(() => {
        if (prefs.mode !== "push" || prefs.pushLocationKey === currentKey || moving.current) return;
        moving.current = true;
        subscribePush({ lat, lng, name }, prefs.minutes)
            .then(() => setPrefs({ ...prefs, pushLocationKey: currentKey }))
            .catch(() => {})
            .finally(() => { moving.current = false; });
    }, [prefs, currentKey, lat, lng, name, setPrefs]);

    const run = useCallback(async (fn: () => Promise<void>) => {
        setBusy(true);
        setError(null);
        try {
            await fn();
        } catch (e) {
            setError(e instanceof Error && e.message === BLOCKED_MESSAGE ? BLOCKED_MESSAGE : "Something went wrong. Please try again.");
        } finally {
            setBusy(false);
        }
    }, []);

    const ensurePermission = async () => {
        if ((await requestNotificationPermission()) !== "granted") throw new Error(BLOCKED_MESSAGE);
    };

    const enableTab = () => run(async () => {
        await ensurePermission();
        if (prefs.mode === "push") await unsubscribePush();
        setPrefs({ mode: "tab", minutes: prefs.minutes });
    });

    const enablePush = () => run(async () => {
        await ensurePermission();
        await subscribePush(location, prefs.minutes);
        setPrefs({ mode: "push", minutes: prefs.minutes, pushLocationKey: currentKey });
    });

    const disable = () => run(async () => {
        if (prefs.mode === "push") await unsubscribePush();
        setPrefs({ mode: "off", minutes: prefs.minutes });
    });

    const setMinutes = (minutes: ReminderMinutes) => run(async () => {
        if (prefs.mode === "push") await subscribePush(location, minutes);
        setPrefs({ ...prefs, minutes });
    });

    return { prefs, busy, error, enableTab, enablePush, disable, setMinutes };
}

export type RemindersState = ReturnType<typeof useReminders>;
