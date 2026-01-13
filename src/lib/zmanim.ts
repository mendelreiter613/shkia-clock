
import { getZmanimJson } from "kosher-zmanim";

export interface ZmanimData {
    shkia: Date; // The target countdown time (could be tomorrow's shkia)
    sunriseToday: Date; // For visual sun cycle
    sunsetToday: Date; // For visual sun cycle
    timeZone: string; // Location's timezone for proper time calculations
}

export function getZmanimData(lat: number, lng: number, timeZone: string): ZmanimData | null {
    try {
        const now = new Date();
        const options = {
            date: now,
            latitude: lat,
            longitude: lng,
            timeZoneId: timeZone,
        };

        let data: any = getZmanimJson(options);

        const getZman = (d: any, key: string) => {
            // Handle various casing/structure from the library
            return d?.BasicZmanim?.[key] || d?.Zmanim?.[key] || d?.[key.toLowerCase()] || d?.[key];
        }

        let sunriseString = getZman(data, "Sunrise");
        let sunsetString = getZman(data, "Sunset");

        if (!sunriseString || !sunsetString) return null;

        let sunriseToday = new Date(sunriseString);
        let sunsetToday = new Date(sunsetString);

        // Determine the target Shkia for countdown
        let targetShkia = new Date(sunsetToday);

        if (now.getTime() > targetShkia.getTime()) {
            // If passed sunset, get tomorrow's sunset for the countdown target
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            options.date = tomorrow;
            const tomorrowData = getZmanimJson(options);
            const nextSunsetStr = getZman(tomorrowData, "Sunset");
            if (nextSunsetStr) {
                targetShkia = new Date(nextSunsetStr);
            }
        }

        return {
            shkia: targetShkia,
            sunriseToday,
            sunsetToday,
            timeZone
        };

    } catch (e) {
        console.error("Zmanim Error:", e);
        return null;
    }
}
