"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { ZmanimData } from "@/lib/zmanim";

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
    return { hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
}

// Dynamic messages based on day of week and hour
function getDynamicMessage(hoursLeft: number, dayOfWeek: number): string {
    const messages: { [key: number]: { [key: string]: string } } = {
        0: { // Sunday
            "18+": "Plenty of time to daven Shachris! Start your week right! 🌅",
            "12-18": "Good afternoon! Still time to daven before shkia 🙏",
            "6-12": "Time is moving! Daven Shachris soon ⏰",
            "3-6": "Getting closer! Make time for davening 🕐",
            "1-3": "Hurry! Shkia is approaching fast! ⚡",
            "0-1": "URGENT! Daven NOW before shkia! 🚨"
        },
        1: { // Monday
            "18+": "Start your Monday with davening! You have time 🌄",
            "12-18": "Afternoon reminder: Daven before shkia today 📿",
            "6-12": "Time to focus! Daven Shachris before shkia ⏳",
            "3-6": "Don't wait! Shkia is getting closer 🕒",
            "1-3": "Rush! Very little time left! ⚡",
            "0-1": "CRITICAL! Daven immediately! 🚨"
        },
        2: { // Tuesday
            "18+": "Beautiful Tuesday morning! Time for Shachris 🌞",
            "12-18": "Afternoon check-in: Remember to daven! 🙏",
            "6-12": "Shkia approaches! Daven Shachris now ⏰",
            "3-6": "Time is short! Get to davening 🕐",
            "1-3": "Hurry up! Shkia is very close! ⚡",
            "0-1": "LAST CHANCE! Daven now! 🚨"
        },
        3: { // Wednesday
            "18+": "Midweek blessing! Plenty of time to daven 🌅",
            "12-18": "Afternoon davening reminder 📿",
            "6-12": "Time passing! Daven before shkia ⏳",
            "3-6": "Getting late! Daven soon 🕒",
            "1-3": "Almost shkia! Daven quickly! ⚡",
            "0-1": "EMERGENCY! Daven RIGHT NOW! 🚨"
        },
        4: { // Thursday
            "18+": "Thursday morning! Start with davening 🌄",
            "12-18": "Good time to daven Shachris 🙏",
            "6-12": "Shkia coming! Daven now ⏰",
            "3-6": "Time running out! Daven soon 🕐",
            "1-3": "Very urgent! Daven immediately! ⚡",
            "0-1": "FINAL MOMENTS! Daven now! 🚨"
        },
        5: { // Friday - Erev Shabbos
            "18+": "Erev Shabbos! Daven early, prepare for Shabbos 🕯️",
            "12-18": "Friday afternoon! Daven before Shabbos prep 📿",
            "6-12": "Shkia approaching! Daven now for Shabbos ⏳",
            "3-6": "Erev Shabbos rush! Daven quickly! 🕒",
            "1-3": "URGENT! Shabbos is coming! Daven now! ⚡",
            "0-1": "CRITICAL! Shkia/Shabbos imminent! 🚨"
        },
        6: { // Shabbos
            "18+": "Shabbos Shalom! Enjoy your day of rest 🕊️",
            "12-18": "Peaceful Shabbos afternoon 🌟",
            "6-12": "Shabbos continues... ✨",
            "3-6": "Shabbos winding down... 🌅",
            "1-3": "Shkia approaching on Shabbos 🕯️",
            "0-1": "Shkia on Shabbos 🌙"
        }
    };

    const dayMessages = messages[dayOfWeek];

    if (hoursLeft >= 18) return dayMessages["18+"];
    if (hoursLeft >= 12) return dayMessages["12-18"];
    if (hoursLeft >= 6) return dayMessages["6-12"];
    if (hoursLeft >= 3) return dayMessages["3-6"];
    if (hoursLeft >= 1) return dayMessages["1-3"];
    return dayMessages["0-1"];
}

export default function CountdownDisplay({ zmanim, locationName, onReset }: CountdownDisplayProps) {
    const [now, setNow] = useState(new Date());
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) return null;

    const { shkia, sunriseToday, sunsetToday } = zmanim;
    const msToShkia = shkia.getTime() - now.getTime();
    const hoursLeft = msToShkia / 1000 / 60 / 60;
    const dayOfWeek = now.getDay();

    // Calculate sun position
    const dayDuration = sunsetToday.getTime() - sunriseToday.getTime();
    const elapsedTime = now.getTime() - sunriseToday.getTime();
    let sunPercent = Math.max(0, Math.min(1.1, elapsedTime / dayDuration));

    const sunX = sunPercent * 100;
    const sunY = Math.sin(sunPercent * Math.PI) * 40;
    const sunBottom = sunPercent > 1 ? -10 : Math.max(0, sunY);

    // Sun color based on time
    let sunColor = "#FFD700";
    if (sunPercent < 0.2) sunColor = "#FF6B6B";
    else if (sunPercent >= 0.8 && sunPercent <= 1.0) sunColor = "#FF6500";
    else if (sunPercent > 1.0) sunColor = "#1a1a1a";

    const time = formatTimeLeft(msToShkia);
    const message = getDynamicMessage(hoursLeft, dayOfWeek);

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 overflow-hidden">

            {/* Sun Animation */}
            <motion.div
                className="absolute w-40 h-40 md:w-48 md:h-48 rounded-full transition-all duration-1000"
                style={{
                    left: `calc(${sunX}% - 96px)`,
                    bottom: `${Math.min(100, sunBottom + 15)}%`,
                    background: `radial-gradient(circle, ${sunColor} 0%, ${sunColor}ee 25%, ${sunColor}99 45%, transparent 70%)`,
                    boxShadow: `0 0 150px 60px ${sunColor}aa, 0 0 250px 100px ${sunColor}55`,
                    filter: 'blur(0.5px)',
                    zIndex: 5
                }}
            />

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-20">
                <div className="text-white/70 text-sm uppercase tracking-wider">
                    <span className="text-white/40">Location:</span> {locationName}
                </div>
                <button
                    onClick={onReset}
                    className="flex items-center gap-3 px-6 py-3 md:px-8 md:py-4 bg-white/20 hover:bg-white/35 backdrop-blur-lg rounded-full text-white transition-all shadow-2xl border-2 border-white/30 hover:border-white/50 hover:scale-105"
                >
                    <Search size={24} className="md:w-7 md:h-7" />
                    <span className="hidden md:inline text-base md:text-lg font-semibold">Change Location</span>
                </button>
            </div>

            {/* Main Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">

                {/* Label */}
                <div className="mb-6">
                    <p className="text-white/50 text-sm md:text-base uppercase tracking-[0.3em] text-center">
                        TIME UNTIL SHKIA
                    </p>
                </div>

                {/* Timer - Constrained Width */}
                <div className="mb-8 max-w-4xl">
                    <div className="flex items-center justify-center gap-2 md:gap-4">
                        <span className="font-mono-digital text-[15vw] md:text-[120px] lg:text-[140px] text-white">
                            {time.hours}
                        </span>
                        <span className="font-mono-digital text-[15vw] md:text-[120px] lg:text-[140px] text-white/60">
                            :
                        </span>
                        <span className="font-mono-digital text-[15vw] md:text-[120px] lg:text-[140px] text-white">
                            {time.minutes}
                        </span>
                        <span className="font-mono-digital text-[15vw] md:text-[120px] lg:text-[140px] text-white/60">
                            :
                        </span>
                        <span className="font-mono-digital text-[15vw] md:text-[120px] lg:text-[140px] text-white">
                            {time.seconds}
                        </span>
                    </div>
                </div>

                {/* Dynamic Message */}
                <div className="mb-12 max-w-2xl">
                    <motion.div
                        key={message}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full"
                    >
                        <span className="text-white text-base md:text-lg font-medium text-center">
                            {message}
                        </span>
                    </motion.div>
                </div>

                {/* Sunrise/Shkia Times */}
                <div className="flex items-center gap-12 md:gap-16">
                    <div className="text-center">
                        <p className="text-white/40 text-xs md:text-sm uppercase tracking-[0.2em] mb-2">Sunrise</p>
                        <p className="text-white text-lg md:text-xl font-light">
                            {sunriseToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <div className="w-px h-12 bg-white/20"></div>
                    <div className="text-center">
                        <p className="text-white/40 text-xs md:text-sm uppercase tracking-[0.2em] mb-2">Shkia</p>
                        <p className="text-white text-lg md:text-xl font-light">
                            {sunsetToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}