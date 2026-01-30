
const { getZmanimJson } = require("kosher-zmanim");

// 1. Setup Mock "Now" (US Time, when it is Afternoon in Japan)
// Jan 18 23:00 EST -> Jan 19 13:00 JST
const now = new Date("2026-01-18T23:00:00-05:00"); 
const timeZone = "Asia/Tokyo";

console.log("--- DEBUG START ---");
console.log("Now (Local/System):", now.toString());

// 2. Simulate Zmanim Logic (from zmanim.ts)
const targetDateStr = now.toLocaleString("en-US", { timeZone: timeZone });
const targetDate = new Date(targetDateStr);
console.log("Target Date for Zmanim:", targetDate.toString());

const options = {
    date: targetDate,
    latitude: 35.6762,
    longitude: 139.6503,
    timeZoneId: timeZone,
};

const data = getZmanimJson(options);

const getZman = (d, key) => {
    return d?.BasicZmanim?.[key] || d?.Zmanim?.[key] || d?.[key.toLowerCase()] || d?.[key];
}

const sunriseString = getZman(data, "Sunrise");
const sunsetString = getZman(data, "Sunset");

console.log("Zmanim Sunrise String:", sunriseString);
console.log("Zmanim Sunset String:", sunsetString);

const sunriseToday = new Date(sunriseString);
const sunsetToday = new Date(sunsetString);

console.log("Parsed Sunrise Obj:", sunriseToday.toString());
console.log("Parsed Sunset Obj:", sunsetToday.toString());

// 3. Simulate Component Logic (from CountdownDisplay.tsx)
// The component compares 'now' (System Time) with 'sunriseToday' (Parsed from String)

console.log("\n--- COMPONENT LOGIC CHECK ---");
console.log("Now Time:", now.getTime());
console.log("Sunrise Time:", sunriseToday.getTime());
console.log("Sunset Time:", sunsetToday.getTime());

const isAfterSunrise = now.getTime() > sunriseToday.getTime();
const isBeforeSunset = now.getTime() < sunsetToday.getTime();

console.log("Is Now > Sunrise?", isAfterSunrise);
console.log("Is Now < Sunset?", isBeforeSunset);

const isNight = !isAfterSunrise || !isBeforeSunset;
console.log("Is Night?", isNight);

if (isNight) {
    console.log("FAIL: Logic thinks it is NIGHT.");
} else {
    console.log("SUCCESS: Logic thinks it is DAY.");
}
