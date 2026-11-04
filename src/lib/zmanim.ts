import { getZmanimJson, TimeZone } from "kosher-zmanim";

// kosher-zmanim 0.9.0 gets the sign of the standard UTC offset wrong for any
// zone with daylight saving (Sydney comes out as UTC-10, Auckland as UTC-12).
// Its antimeridian check then thinks those places are 20+ hours off and
// computes everything for the next day, so in Sydney and New Zealand the
// countdown targeted tomorrow's shkia. Replace it with the correct value: the
// standard offset is the smaller of the January and July offsets, in either
// hemisphere. Mirrored in supabase/functions/shkia-send-reminders.
function utcOffsetMs(timeZone: string, at: Date): number {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
            timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
            hour: "numeric", minute: "numeric", second: "numeric",
        }).formatToParts(at).map((p) => [p.type, p.value]),
    );
    const wallAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    return wallAsUtc - at.getTime();
}

TimeZone.getRawOffset = (timeZoneId: string): number => {
    const year = new Date().getUTCFullYear();
    return Math.min(
        utcOffsetMs(timeZoneId, new Date(Date.UTC(year, 0, 1))),
        utcOffsetMs(timeZoneId, new Date(Date.UTC(year, 6, 1))),
    );
};

export interface ZmanimData {
    shkia: Date;           // Next sunset (Countdown target)
    visualSunrise: Date;   // Today's sunrise (Visuals)
    visualSunset: Date;    // Today's sunset (Visuals)
    sunriseString: string;
    sunsetString: string;
    timeZone: string;
}

interface ZmanimResponse {
    BasicZmanim?: {
        Sunrise?: string;
        Sunset?: string;
    };
}

// Represents "now" as wall-clock time in `timeZone`, encoded as a Date the
// local JS engine will read back with matching Y/M/D — this is what lets us
// hand kosher-zmanim a date for a timezone other than the machine's own.
function getZonedDate(instant: Date, timeZone: string): Date {
    return new Date(instant.toLocaleString("en-US", { timeZone }));
}

export function getZmanimData(lat: number, lng: number, timeZone: string): ZmanimData | null {
    try {
        const now = new Date();
        const zonedNow = getZonedDate(now, timeZone);

        const baseOptions = {
            latitude: lat,
            longitude: lng,
            timeZoneId: timeZone,
        };

        const data = getZmanimJson({ ...baseOptions, date: zonedNow }) as ZmanimResponse;

        const sunriseString = data.BasicZmanim?.Sunrise;
        const sunsetString = data.BasicZmanim?.Sunset;

        if (!sunriseString || !sunsetString) return null;

        // VISUALS: Always use TODAY'S sunrise/sunset so the background works at night
        const visualSunrise = new Date(sunriseString);
        const visualSunset = new Date(sunsetString);

        // COUNTDOWN: Check if we need tomorrow's Shkia for the timer
        let targetShkia = new Date(visualSunset);

        if (now.getTime() > targetShkia.getTime()) {
            // Advance a day within the LOCATION's timezone, not the browser's,
            // so the rollover lands on the correct calendar day for that place.
            const zonedTomorrow = new Date(zonedNow);
            zonedTomorrow.setDate(zonedTomorrow.getDate() + 1);

            const tomorrowData = getZmanimJson({ ...baseOptions, date: zonedTomorrow }) as ZmanimResponse;
            const nextSunsetStr = tomorrowData.BasicZmanim?.Sunset;

            if (nextSunsetStr) {
                targetShkia = new Date(nextSunsetStr);
            }
            // NOTE: We deliberately do NOT overwrite visualSunrise here.
        }

        return {
            shkia: targetShkia,
            visualSunrise,
            visualSunset,
            sunriseString,
            sunsetString,
            timeZone
        };

    } catch (e) {
        console.error("Zmanim Error:", e);
        return null;
    }
}
