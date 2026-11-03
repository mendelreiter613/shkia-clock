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

export function reminderBody(shkia: Date, timeZone: string, locationName: string, minutesBefore: number): string {
    const at = shkia.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
    return `Shkia in ${locationName} is at ${at}, about ${minutesBefore} minutes from now.`;
}
