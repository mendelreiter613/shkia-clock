
const { getZmanimJson } = require("kosher-zmanim");

// Simulate being in US (Timezone Offset -5)
// Current time: Jan 18, 23:00 EST -> Jan 19, 13:00 JST
const nowInUS = new Date("2026-01-18T23:00:00-05:00"); 

console.log("System Time (US):", nowInUS.toString());

// Option 1: Pass now directly
const options1 = {
    date: nowInUS,
    latitude: 35.6762,
    longitude: 139.6503,
    timeZoneId: "Asia/Tokyo",
};

const getZman = (d, key) => {
    return d?.BasicZmanim?.[key] || d?.Zmanim?.[key] || d?.[key.toLowerCase()] || d?.[key];
}

const data1 = getZmanimJson(options1);
console.log("--- Option 1 (Direct Date) ---");
console.log("Date used by algo:", data1.metadata.date);
console.log("Sunset:", getZman(data1, "Sunset"));

// Option 2: Shifted Date
// specific to the target timezone
const targetDateString = nowInUS.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
const targetDate = new Date(targetDateString);

console.log("Shifted Date (Japan Wall Time):", targetDate.toString());

const options2 = {
    date: targetDate,
    latitude: 35.6762,
    longitude: 139.6503,
    timeZoneId: "Asia/Tokyo",
};

const data2 = getZmanimJson(options2);
console.log("--- Option 2 (Shifted Date) ---");
console.log("Date used by algo:", data2.metadata.date);
console.log("Sunset:", getZman(data2, "Sunset"));
