"use client";

import { useEffect, useState, useRef } from "react";
import { Search, MapPin, Sunrise, Sunset, Clock, AlertTriangle } from "lucide-react";
import { ZmanimData } from "@/lib/zmanim";
import { motion, AnimatePresence } from "framer-motion";

interface CountdownDisplayProps {
    zmanim: ZmanimData;
    locationName: string;
    onReset: () => void;
}

function formatTimeLeft(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return {
        hours: pad(hours),
        minutes: pad(minutes),
        seconds: pad(seconds),
        totalSeconds, // Exposed for logic
        isUrgent: totalSeconds < 900,
        isCritical: totalSeconds < 60
    };
}

// Dynamic messages based on day of week and current hour
function getDynamicMessage(currentHour: number, dayOfWeek: number): string {
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

export default function CountdownDisplay({ zmanim, locationName, onReset }: CountdownDisplayProps) {
    const [now, setNow] = useState(new Date());
    const [mounted, setMounted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        setMounted(true);
        const interval = setInterval(() => setNow(new Date()), 1000);

        // Initialize Audio
        audioRef.current = new Audio('/alarm.mp3');
        audioRef.current.loop = true;

        return () => {
            clearInterval(interval);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const { shkia, sunriseToday, sunsetToday, timeZone } = zmanim;
    const msToShkia = shkia.getTime() - now.getTime();
    const time = formatTimeLeft(msToShkia);
    const dayOfWeek = now.getDay();

    // Audio Logic
    useEffect(() => {
        if (!audioRef.current) return;

        if (time.isCritical && time.totalSeconds > 0) {
            // Play if not already playing
            if (audioRef.current.paused) {
                audioRef.current.play().catch(e => console.log("Audio play blocked", e));
            }
        } else {
            // Stop logic
            if (!audioRef.current.paused) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        }
    }, [time.isCritical, time.totalSeconds]);


    if (!mounted) return null;

    // Get current hour in the LOCATION'S timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        hour: 'numeric',
        hour12: false
    });
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find(part => part.type === 'hour');
    const currentHour = hourPart ? parseInt(hourPart.value) : 0;

    // Calculate sun position (0 to 100%)
    const totalDaylightValues = sunsetToday.getTime() - sunriseToday.getTime();
    const elapsedDaylight = now.getTime() - sunriseToday.getTime();
    let sunProgress = (elapsedDaylight / totalDaylightValues) * 100;

    // Clamp to 0-100
    sunProgress = Math.max(0, Math.min(100, sunProgress));

    // Calculate Sun arc (height) - Peak at 50%
    // Horizon is at 35% from bottom, so max height should be relative to that
    const sunArcHeight = Math.sin((sunProgress / 100) * Math.PI) * 45; // 45% of screen height
    const sunBottomPosition = 35 + sunArcHeight; // Base ocean level is 35%

    // Sky colors based on progress
    let skyGradient = "";
    if (sunProgress < 10) skyGradient = "from-indigo-900 via-purple-900 to-orange-200"; // Sunrise
    else if (sunProgress < 40) skyGradient = "from-blue-500 via-blue-300 to-blue-100"; // Morning
    else if (sunProgress < 60) skyGradient = "from-blue-600 via-blue-400 to-blue-200"; // Noon
    else if (sunProgress < 85) skyGradient = "from-blue-500 via-orange-200 to-orange-100"; // Late Afternoon
    else skyGradient = "from-indigo-900 via-purple-600 to-orange-400"; // Sunset

    // Ocean colors
    let oceanGradient = "";
    if (sunProgress < 10 || sunProgress > 85) oceanGradient = "from-indigo-900/80 to-indigo-950";
    else oceanGradient = "from-blue-600/80 to-blue-900";

    const isNight = now.getTime() > sunsetToday.getTime() || now.getTime() < sunriseToday.getTime();
    const dynamicMessage = getDynamicMessage(currentHour, dayOfWeek);

    return (
        <div className={`flex flex-col h-screen w-full relative overflow-hidden transition-colors duration-1000 ${time.isCritical ? 'animate-alarm bg-red-950/20' : ''}`}>

            {/* --- BACKGROUND SCENE --- */}

            {/* Sky */}
            <div className={`absolute inset-0 bg-gradient-to-b ${isNight ? 'from-slate-900 to-slate-800' : skyGradient} transition-all duration-1000 ease-in-out`} />

            {/* Stars (Night only) */}
            {isNight && (
                <div className="absolute inset-0 bg-[url('/stars.png')] opacity-50" />
            )}

            {/* Sun */}
            <AnimatePresence>
                {!isNight && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: 1,
                            left: `${sunProgress}%`,
                            bottom: `${sunBottomPosition}%`
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, ease: "linear" }}
                        className="absolute w-24 h-24 md:w-40 md:h-40 rounded-full z-10 pointer-events-none transform -translate-x-1/2 translate-y-1/2 shadow-2xl shadow-orange-500/50"
                        style={{
                            background: `radial-gradient(circle, #fbbf24 10%, #f97316 90%)`
                        }}
                    >
                        {/* Sun Glow */}
                        <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-40 rounded-full" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ocean */}
            <div className={`absolute bottom-0 w-full h-[35%] z-20 overflow-hidden backdrop-blur-sm`}>
                <div className={`absolute inset-0 bg-gradient-to-b ${oceanGradient} opacity-90`} />

                {/* Shimmer Effect */}
                {!isNight && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer scale-150" />
                )}

                {/* Sun Reflection */}
                {!isNight && (
                    <motion.div
                        className="absolute h-full w-20 md:w-32 bg-orange-400/20 blur-xl"
                        animate={{ left: `${sunProgress}%` }}
                        style={{ transform: 'translateX(-50%)' }}
                    />
                )}
            </div>


            {/* --- UI OVERLAY --- */}

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex justify-between items-start z-30 p-8"
            >
                <div className="flex items-center gap-3 backdrop-blur-md bg-white/10 px-5 py-3 rounded-full border border-white/20 shadow-lg">
                    <MapPin size={16} className="text-white" />
                    <span className="text-sm font-semibold tracking-wide text-white shadow-sm">
                        {locationName}
                    </span>
                </div>

                <button
                    onClick={onReset}
                    className="p-3 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all backdrop-blur-md shadow-lg"
                    title="Change Location"
                >
                    <Search size={20} className="text-white" />
                </button>
            </motion.div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center z-30 px-6 pb-20"> {/* pb-20 to account for new horizon */}

                {/* Label */}
                <motion.div
                    className="flex items-center gap-3 mb-8"
                    animate={{ opacity: time.isCritical ? [1, 0.5, 1] : 1 }}
                    transition={{ duration: time.isCritical ? 0.5 : 1, repeat: time.isCritical ? Infinity : 0 }}
                >
                    {time.isCritical ? (
                        <AlertTriangle className="w-6 h-6 text-red-500 animate-bounce" />
                    ) : (
                        <Clock className="w-5 h-5 text-white/60" />
                    )}
                    <h2 className={`text-sm font-bold tracking-[0.3em] uppercase ${time.isCritical ? 'text-red-400' : 'text-white/60'}`}>
                        {time.isCritical ? "SHKIA IMMINENT" : "Time Until Shkia"}
                    </h2>
                </motion.div>

                {/* THE CLOCK */}
                <div className="font-clock text-white font-light leading-none tracking-tight relative">
                    {time.isCritical ? (
                        // PANIC MODE (Seconds Only)
                        <motion.div
                            key="panic"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center"
                        >
                            <span className="text-[25vw] font-bold text-red-500 drop-shadow-[0_0_50px_rgba(220,38,38,0.8)] tabular-nums">
                                {time.seconds}
                            </span>
                            <span className="text-4xl font-bold text-white/80 mt-[-2rem]">SECONDS</span>
                        </motion.div>
                    ) : (
                        // NORMAL MODE
                        <motion.div
                            key="normal"
                            className="flex items-center gap-4 md:gap-8"
                        >
                            <div className="flex flex-col items-center">
                                <span className="text-[12vw] md:text-[8rem] font-bold drop-shadow-2xl">{time.hours}</span>
                                <span className="text-sm md:text-xl uppercase tracking-widest opacity-60">Hours</span>
                            </div>
                            <span className="text-[8vw] md:text-[6rem] opacity-40 -mt-8">:</span>
                            <div className="flex flex-col items-center">
                                <span className="text-[12vw] md:text-[8rem] font-bold drop-shadow-2xl">{time.minutes}</span>
                                <span className="text-sm md:text-xl uppercase tracking-widest opacity-60">Minutes</span>
                            </div>
                            <span className="text-[8vw] md:text-[6rem] opacity-40 -mt-8">:</span>
                            <div className="flex flex-col items-center">
                                <span className="text-[12vw] md:text-[8rem] font-light text-white/80 drop-shadow-xl">{time.seconds}</span>
                                <span className="text-sm md:text-xl uppercase tracking-widest opacity-60">Seconds</span>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Message Badge */}
                {!time.isCritical && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-16 px-8 py-4 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 flex items-center gap-4 shadow-2xl"
                    >
                        <span className="text-white/90 text-lg font-medium">
                            {dynamicMessage}
                        </span>
                    </motion.div>
                )}
            </div>

            {/* Footer Footer */}
            <div className="h-[10%] z-30 w-full flex justify-between items-end px-8 pb-8 text-white/50 text-xs font-mono">
                <div>Sunrise: {sunriseToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone })}</div>
                <div>Sunset: {sunsetToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone })}</div>
            </div>

        </div>
    );
}