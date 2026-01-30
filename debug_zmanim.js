
const { getZmanimJson } = require("kosher-zmanim");

const now = new Date();
const options = {
    date: now,
    latitude: 35.6762, // Tokyo
    longitude: 139.6503,
    timeZoneId: "Asia/Tokyo",
};

const data = getZmanimJson(options);
console.log(JSON.stringify(data, null, 2));
