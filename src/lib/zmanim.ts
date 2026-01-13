
import { getZmanimJson } from "kosher-zmanim";

export function getComingShkia(lat: number, lng: number, timeZone: string): Date | null {
    try {
        const options = {
            date: new Date(),
            latitude: lat,
            longitude: lng,
            timeZoneId: timeZone,
        };

        // getZmanimJson returns an object with metadata and separate zmanim objects
        // We check BasicZmanim or valid keys for Sunset.
        // The library handles constructing the calendar internally.
        let data: any = getZmanimJson(options);

        const getSunset = (d: any) => {
            return d?.BasicZmanim?.Sunset || d?.Zmanim?.Sunset || d?.Sunset;
        }

        let shkiaString = getSunset(data);

        if (!shkiaString) return null;

        let shkiaDate = new Date(shkiaString);
        const now = new Date();

        if (shkiaDate.getTime() < now.getTime()) {
            // Get tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            options.date = tomorrow;
            data = getZmanimJson(options);
            shkiaString = getSunset(data);
            if (shkiaString) {
                shkiaDate = new Date(shkiaString);
            }
        }

        return shkiaDate;
    } catch (e) {
        console.error("Zmanim Error:", e);
        return null;
    }
}
