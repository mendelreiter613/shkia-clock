"use client";

import { DEFAULT_REMINDER_MINUTES, isReminderMinutes, ReminderMinutes } from "./reminders";

export type ReminderMode = "off" | "tab" | "push";

export interface ReminderPrefs {
    mode: ReminderMode;
    minutes: ReminderMinutes;
    // Which location the server-side push subscription is registered for,
    // so picking a new city can quietly move the reminder along with it.
    pushLocationKey?: string;
}

export interface ReminderLocation {
    lat: number;
    lng: number;
    name: string;
}

const PREFS_KEY = "shkia-reminder-prefs";
const LAST_TAB_NOTIFIED_KEY = "shkia-reminder-last-tab";

export const DEFAULT_PREFS: ReminderPrefs = { mode: "off", minutes: DEFAULT_REMINDER_MINUTES };

export function locationKey(loc: ReminderLocation): string {
    return `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}`;
}

export function loadPrefs(): ReminderPrefs {
    try {
        const raw = window.localStorage.getItem(PREFS_KEY);
        if (!raw) return DEFAULT_PREFS;
        const parsed = JSON.parse(raw);
        return {
            mode: parsed.mode === "tab" || parsed.mode === "push" ? parsed.mode : "off",
            minutes: isReminderMinutes(parsed.minutes) ? parsed.minutes : DEFAULT_REMINDER_MINUTES,
            pushLocationKey: typeof parsed.pushLocationKey === "string" ? parsed.pushLocationKey : undefined,
        };
    } catch {
        return DEFAULT_PREFS;
    }
}

export function savePrefs(prefs: ReminderPrefs) {
    try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
        // Private mode / blocked storage: reminders still work for this visit.
    }
}

export function loadLastTabNotified(): number | null {
    try {
        const raw = window.localStorage.getItem(LAST_TAB_NOTIFIED_KEY);
        return raw ? Number(raw) : null;
    } catch {
        return null;
    }
}

export function saveLastTabNotified(shkiaMs: number) {
    try {
        window.localStorage.setItem(LAST_TAB_NOTIFIED_KEY, String(shkiaMs));
    } catch {
        // See savePrefs.
    }
}

export interface DeviceSupport {
    notifications: boolean;
    push: boolean;
    isIOS: boolean;
    isStandalone: boolean;
}

export function getDeviceSupport(): DeviceSupport {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    // iPadOS reports itself as a Mac, so also check for touch.
    const isIOS = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    return {
        notifications: "Notification" in window,
        // iOS only exposes PushManager inside a home-screen app.
        push: "serviceWorker" in nav && "PushManager" in window && !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        isIOS,
        isStandalone,
    };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (Notification.permission !== "default") return Notification.permission;
    return Notification.requestPermission();
}

export async function showLocalNotification(title: string, body: string) {
    // Android Chrome refuses `new Notification()`; going through the service
    // worker works there and everywhere else that has one.
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
        await reg.showNotification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: "shkia-reminder" });
    } else {
        new Notification(title, { body, icon: "/icon-192.png", tag: "shkia-reminder" });
    }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
    const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(padded);
    const out = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

async function getOrCreateSubscription(): Promise<PushSubscription> {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;
    return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
}

// Creates (or updates) the server-side reminder for this device.
export async function subscribePush(loc: ReminderLocation, minutes: ReminderMinutes) {
    const subscription = await getOrCreateSubscription();
    const res = await fetch("/api/reminders/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), lat: loc.lat, lng: loc.lng, locationName: loc.name, minutesBefore: minutes }),
    });
    if (!res.ok) throw new Error(`Subscribe failed (${res.status})`);
}

export async function unsubscribePush() {
    const reg = await navigator.serviceWorker.getRegistration();
    const subscription = await reg?.pushManager.getSubscription();
    if (!subscription) return;
    await fetch("/api/reminders/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => {
        // Server copy is cleaned up on its own once the push service reports the endpoint gone.
    });
    await subscription.unsubscribe();
}

// Chrome/Edge/Android fire this when the site can be installed; stashed so
// the reminder panel can offer a one-tap "Install app" later.
export interface InstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let installPrompt: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

export function captureInstallPrompt() {
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        installPrompt = e as InstallPromptEvent;
        installListeners.forEach((fn) => fn());
    });
    window.addEventListener("appinstalled", () => {
        installPrompt = null;
        installListeners.forEach((fn) => fn());
    });
}

export function getInstallPrompt() {
    return installPrompt;
}

export function onInstallPromptChange(fn: () => void) {
    installListeners.add(fn);
    return () => { installListeners.delete(fn); };
}
