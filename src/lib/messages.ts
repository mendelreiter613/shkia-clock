// Dynamic messages based on day of week and current hour
export function getDynamicMessage(currentHour: number, dayOfWeek: number): string {
    const messages: { [key: number]: { [key: string]: string } } = {
        0: { // Sunday
            "morning": "Plenty of time to daven Shachris! Start your week right! 🌅",
            "afternoon": "Good afternoon! Still time to daven before shkia 🙏",
            "evening": "Getting closer! Make time for davening 🕐",
            "night": "Late night! Daven Shachris soon ⏰"
        },
        1: { // Monday
            "morning": "Start your Monday with davening! You have time 🌄",
            "afternoon": "Afternoon reminder: Daven before shkia today 📿",
            "evening": "Don't wait! Shkia is getting closer 🕒",
            "night": "Late night! Time to daven Shachris ⏰"
        },
        2: { // Tuesday
            "morning": "Beautiful Tuesday morning! Time for Shachris 🌞",
            "afternoon": "Afternoon check-in: Remember to daven! 🙏",
            "evening": "Time is short! Get to davening 🕐",
            "night": "Late night! Daven Shachris soon ⏰"
        },
        3: { // Wednesday
            "morning": "Midweek blessing! Plenty of time to daven 🌅",
            "afternoon": "Afternoon davening reminder 📿",
            "evening": "Getting late! Daven soon 🕒",
            "night": "Late night! Time for Shachris ⏰"
        },
        4: { // Thursday
            "morning": "Thursday morning! Start with davening 🌄",
            "afternoon": "Good time to daven Shachris 🙏",
            "evening": "Time running out! Daven soon 🕐",
            "night": "Late night! Daven Shachris soon ⏰"
        },
        5: { // Friday - Erev Shabbos
            "morning": "Erev Shabbos! Daven early, prepare for Shabbos 🕯️",
            "afternoon": "Friday afternoon! Daven before Shabbos prep 📿",
            "evening": "Erev Shabbos rush! Daven quickly! 🕒",
            "night": "Late night! Late Erev Shabbos! Prepare for Shabbos 🕯️"
        },
        6: { // Shabbos
            "morning": "Shabbos Shalom! Enjoy your day of rest 🕊️",
            "afternoon": "Peaceful Shabbos afternoon 🌟",
            "evening": "Shabbos winding down... 🌅",
            "night": "Shabbos night... ✨"
        }
    };

    const dayMessages = messages[dayOfWeek];

    // Determine time of day based on current hour
    let timeOfDay: string;
    if (currentHour >= 6 && currentHour < 12) {
        timeOfDay = "morning";  // 6 AM - 12 PM
    } else if (currentHour >= 12 && currentHour < 17) {
        timeOfDay = "afternoon";  // 12 PM - 5 PM
    } else if (currentHour >= 17 && currentHour < 21) {
        timeOfDay = "evening";  // 5 PM - 9 PM
    } else {
        timeOfDay = "night";  // 9 PM - 6 AM
    }

    return dayMessages[timeOfDay];
}
