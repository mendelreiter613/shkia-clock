import { getZmanimJson } from "kosher-zmanim";

export interface ZmanimData {
    shkia: Date;           // Next sunset (Countdown target)
    visualSunrise: Date;   // Today's sunrise (Visuals)
    visualSunset: Date;    // Today's sunset (Visuals)
    sunriseString: string;
    sunsetString: string;
    timeZone: string;
}

export function getZmanimData(lat: number, lng: number, timeZone: string): ZmanimData | null {
    try {
        const now = new Date();
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
            return d?.BasicZmanim?.[key] || d?.Zmanim?.[key] || d?.[key.toLowerCase()] || d?.[key];
        }

        const sunriseString = getZman(data, "Sunrise");
        const sunsetString = getZman(data, "Sunset");

        if (!sunriseString || !sunsetString) return null;

        // VISUALS: Always use TODAY'S sunrise/sunset
        const visualSunrise = new Date(sunriseString);
        const visualSunset = new Date(sunsetString);

        // COUNTDOWN: Check if we need tomorrow's Shkia
        let targetShkia = new Date(visualSunset);

        if (now.getTime() > targetShkia.getTime()) {
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
            visualSunrise, // Matches your new Interface
            visualSunset,  // Matches your new Interface
            sunriseString,
            sunsetString,
            timeZone
        };

    } catch (e) {
        console.error("Zmanim Error:", e);
        return null;
    }
}