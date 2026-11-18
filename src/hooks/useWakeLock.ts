"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// "Keep screen on": uses the browser's Screen Wake Lock API so the screen
// doesn't dim or sleep while the clock is open (handy for a computer or
// tablet left showing the countdown). The browser drops the lock whenever the
// tab is hidden, so it's taken again each time the tab comes back. The choice
// is remembered in this browser.
const KEEP_SCREEN_ON_KEY = "shkia-keep-screen-on";

export interface WakeLockState {
    /** False on browsers without the Screen Wake Lock API. */
    supported: boolean;
    /** The user's choice. */
    enabled: boolean;
    /** The screen is being kept on right now. */
    active: boolean;
    /** The browser refused the last request (battery saver, permission policy). */
    blocked: boolean;
    toggle: () => void;
}

export function useWakeLock(): WakeLockState {
    const [supported, setSupported] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [active, setActive] = useState(false);
    const [blocked, setBlocked] = useState(false);
    const lock = useRef<WakeLockSentinel | null>(null);

    useEffect(() => {
        // Read the browser after mount, not during render, so SSR and the first client render agree.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability check needs navigator
        setSupported("wakeLock" in navigator);
        try {
            setEnabled(localStorage.getItem(KEEP_SCREEN_ON_KEY) === "1");
        } catch { /* storage blocked: start off */ }
    }, []);

    useEffect(() => {
        if (!enabled || !supported) return;
        let cancelled = false;

        const acquire = async () => {
            if (cancelled || document.visibilityState !== "visible" || lock.current) return;
            try {
                const sentinel = await navigator.wakeLock.request("screen");
                if (cancelled) {
                    sentinel.release().catch(() => {});
                    return;
                }
                lock.current = sentinel;
                setActive(true);
                setBlocked(false);
                sentinel.addEventListener("release", () => {
                    if (lock.current === sentinel) lock.current = null;
                    setActive(false);
                });
            } catch {
                // Refused (battery saver, not visible, policy): try again next time the tab is shown.
                if (!cancelled) {
                    setActive(false);
                    setBlocked(true);
                }
            }
        };

        acquire();
        document.addEventListener("visibilitychange", acquire);
        return () => {
            cancelled = true;
            document.removeEventListener("visibilitychange", acquire);
            lock.current?.release().catch(() => {});
            lock.current = null;
            setActive(false);
            setBlocked(false);
        };
    }, [enabled, supported]);

    const toggle = useCallback(() => {
        const next = !enabled;
        setEnabled(next);
        try {
            if (next) localStorage.setItem(KEEP_SCREEN_ON_KEY, "1");
            else localStorage.removeItem(KEEP_SCREEN_ON_KEY);
        } catch { /* storage blocked: works for this visit only */ }
    }, [enabled]);

    return { supported, enabled, active, blocked, toggle };
}
