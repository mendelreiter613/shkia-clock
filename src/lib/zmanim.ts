
import { getZmanimJson } from "kosher-zmanim";

export interface ZmanimData {
    shkia: Date; // The target countdown time (could be tomorrow's shkia)
    visualSunrise: Date; // For visual sun cycle
    visualSunset: Date; // For visual sun cycle
    sunriseString: string; // ISO string for robust wall-time calc
    sunsetString: string; // ISO string for robust wall-time calc
    timeZone: string; // Location's timezone for proper time calculations
}

export function getZmanimData(lat: number, lng: number, timeZone: string): ZmanimData | null {
    try {
        const now = new Date();
        
        // CRITICAL FIX: Convert 'now' to the target timezone's Wall Time Date object
        // If we are in US (Jan 18) but it's already Jan 19 in Japan, we MUST ask for Jan 19's Zmanim.
        // Otherwise we get Jan 18's Zmanim, which was yesterday in Japan, and the app thinks it's "Night" (Post-Sunset).
        const targetDateStr = now.toLocaleString("en-US", { timeZone: timeZone });
        const targetDate = new Date(targetDateStr);

        const options = {
            date: targetDate,
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
                // Note: We deliberately DO NOT update visual reference points here. 
                // The background should always reflect the current calendar day, even if counting down to tomorrow.
            }
        }

        return {
            shkia: targetShkia,
            visualSunrise: new Date(sunriseString), // ALWAYS Today's sunrise (for the background)
            visualSunset: new Date(sunsetString),   // ALWAYS Today's sunset (for the background)
