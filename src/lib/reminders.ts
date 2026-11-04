// Shared by the in-tab reminder (browser) and the push sender (server), so
// both agree on which lead times exist and when a reminder is due.

export const REMINDER_MINUTES = [15, 30, 60] as const;
export type ReminderMinutes = (typeof REMINDER_MINUTES)[number];
export const DEFAULT_REMINDER_MINUTES: ReminderMinutes = 30;

export function isReminderMinutes(value: unknown): value is ReminderMinutes {
    return REMINDER_MINUTES.includes(value as ReminderMinutes);
}

// Due once we're inside the lead window and shkia hasn't passed yet. Callers
// remember which shkia they already notified for, so this firing on every
// check inside the window is fine.
export function isReminderDue(shkia: Date, now: Date, minutesBefore: number): boolean {
    const msLeft = shkia.getTime() - now.getTime();
    return msLeft > 0 && msLeft <= minutesBefore * 60 * 1000;
}

export function reminderTitle(): string {
    return "Time to daven Shachris";
}

// Says how long is actually left, not the chosen lead time: the page may be
// opened (or the scheduler may run) partway into the window.
export function reminderBody(shkia: Date, timeZone: string, locationName: string, now: Date): string {
    const at = shkia.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
    const minutesLeft = Math.max(1, Math.round((shkia.getTime() - now.getTime()) / 60000));
    return `Shkia in ${locationName} is at ${at}, ${minutesLeft} ${minutesLeft === 1 ? "minute" : "minutes"} from now.`;
}
