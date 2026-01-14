"use client";

import { useEffect, useState, useRef } from "react";
import { Search, MapPin, AlertTriangle } from "lucide-react";
import { ZmanimData } from "@/lib/zmanim";
import { motion } from "framer-motion";
import SpaceBackground from "./SpaceBackground";

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
        totalSeconds,
        isUrgent: totalSeconds < 900,
        isCritical: totalSeconds < 60
    };
}

// Dynamic messages
function getDynamicMessage(currentHour: number, dayOfWeek: number): string {
    const messages: { [key: number]: { [key: string]: string } } = {
        0: { "morning": "Plenty of time to daven Shachris! 🌅", "afternoon": "Good afternoon! Still time to daven 🙏", "evening": "Getting closer! Make time for davening 🕐", "night": "Late night! Daven Shachris soon ⏰" },
        1: { "morning": "Start your Monday right! 🌄", "afternoon": "Reminder: Daven before shkia 📿", "evening": "Don't wait! Shkia is closer 🕒", "night": "Time to daven Shachris ⏰" },
        2: { "morning": "Time for Shachris 🌞", "afternoon": "Check-in: Remember to daven! 🙏", "evening": "Time is short! 🕐", "night": "Late night! Daven soon ⏰" },
        3: { "morning": "Midweek blessing! 🌅", "afternoon": "Afternoon davening reminder 📿", "evening": "Getting late! Daven soon 🕒", "night": "Time for Shachris ⏰" },
        4: { "morning": "Thursday morning! 🌄", "afternoon": "Good time to daven Shachris 🙏", "evening": "Time running out! 🕐", "night": "Daven Shachris soon ⏰" },
        5: { "morning": "Erev Shabbos! Daven early 🕯️", "afternoon": "Friday afternoon! Daven before Shabbos 📿", "evening": "Erev Shabbos rush! 🕒", "night": "Good Shabbos! 🕯️" },
        6: { "morning": "Shabbos Shalom! 🕊️", "afternoon": "Peaceful Shabbos 🌟", "evening": "Shabbos winding down... 🌅", "night": "Shabbos night... ✨" }
    };
    let timeOfDay = "night";
    if (currentHour >= 6 && currentHour < 12) timeOfDay = "morning";
    else if (currentHour >= 12 && currentHour < 17) timeOfDay = "afternoon";
    else if (currentHour >= 17 && currentHour < 21) timeOfDay = "evening";
    return messages[dayOfWeek]?.[timeOfDay] || "Check zmanim!";
}

export default function CountdownDisplay({ zmanim, locationName, onReset }: CountdownDisplayProps) {
    const [now, setNow] = useState(new Date());
    const [mounted, setMounted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        setMounted(true);
        const interval = setInterval(() => setNow(new Date()), 1000);
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
            if (audioRef.current.paused) audioRef.current.play().catch(e => console.log("Audio blocked", e));
        } else {
            if (!audioRef.current.paused) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        }
    }, [time.isCritical, time.totalSeconds]);

    if (!mounted) return null;

    const formatter = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false });
    const currentHour = parseInt(formatter.formatToParts(now).find(p => p.type === 'hour')?.value || "0");
    const totalDaylight = sunsetToday.getTime() - sunriseToday.getTime();
    const elapsed = now.getTime() - sunriseToday.getTime();
    const sunProgress = Math.max(0, Math.min(100, (elapsed / totalDaylight) * 100));
    const isNight = now.getTime() > sunsetToday.getTime() || now.getTime() < sunriseToday.getTime();
    const dynamicMessage = getDynamicMessage(currentHour, dayOfWeek);

    return (
        <div className={`flex flex-col h-screen w-full relative overflow-hidden transition-colors duration-1000 ${time.isCritical ? 'animate-alarm' : ''}`}>

            {/* 1. THE 3D BACKGROUND (Must be at the bottom of the stack) */}
            <SpaceBackground sunProgress={sunProgress} isNight={isNight} />

            {/* 2. THE UI LAYER (z-10 ensures it sits ON TOP of the stars) */}
            <div className="absolute inset-0 z-10 flex flex-col">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full flex justify-between items-start p-6 md:p-8"
                >
                    <div className="flex items-center gap-3 backdrop-blur-md bg-white/10 px-5 py-3 rounded-full border border-white/20 shadow-lg">
                        <MapPin size={16} className="text-white" />
                        <span className="text-sm font-semibold tracking-wide text-white shadow-sm">{locationName}</span>
                    </div>
                    <button onClick={onReset} className="p-3 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all backdrop-blur-md shadow-lg">
                        <Search size={20} className="text-white" />
                    </button>
                </motion.div>

                {/* Main Clock Content */}
                <div className="flex-1 flex flex-col items-center justify-center px-4 w-full">

                    {/* Label */}
                    <motion.div className="flex items-center gap-3 mb-6 opacity-80">
                        {time.isCritical ? <AlertTriangle className="text-red-500 animate-bounce" /> : <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_#60a5fa]" />}
                        <h2 className="text-sm md:text-base font-bold tracking-[0.3em] uppercase text-white/80">
                            {time.isCritical ? "SHKIA IMMINENT" : "Time Until Shkia"}
                        </h2>
                    </motion.div>

                    {/* The Clock Numbers - Scaled down slightly to fit better (text-[10vw] instead of 12) */}
                    <div className="font-clock text-white leading-none relative flex justify-center w-full">
                        {time.isCritical ? (
                            <motion.span
                                key="panic"
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="text-[25vw] font-bold text-red-500 drop-shadow-[0_0_50px_rgba(220,38,38,0.8)] tabular-nums"
                            >
                                {time.seconds}
                            </motion.span>
                        ) : (
                            <div className="flex items-center gap-2 md:gap-6">
                                <div className="flex flex-col items-center">
                                    <span className="text-[14vw] md:text-[9rem] font-bold drop-shadow-2xl tabular-nums">{time.hours}</span>
                                    <span className="text-[10px] md:text-lg uppercase tracking-widest opacity-50 font-sans mt-[-5px]">Hours</span>
                                </div>
                                <span className="text-[10vw] md:text-[7rem] opacity-30 pb-4">:</span>
                                <div className="flex flex-col items-center">
                                    <span className="text-[14vw] md:text-[9rem] font-bold drop-shadow-2xl tabular-nums">{time.minutes}</span>
                                    <span className="text-[10px] md:text-lg uppercase tracking-widest opacity-50 font-sans mt-[-5px]">Minutes</span>
                                </div>
                                <span className="text-[10vw] md:text-[7rem] opacity-30 pb-4">:</span>
                                <div className="flex flex-col items-center">
                                    <span className="text-[14vw] md:text-[9rem] font-medium text-white/80 drop-shadow-xl tabular-nums">{time.seconds}</span>
                                    <span className="text-[10px] md:text-lg uppercase tracking-widest opacity-50 font-sans mt-[-5px]">Seconds</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Message Badge - Increased spacing and better padding */}
                    {!time.isCritical && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-10 px-6 py-3 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 flex items-center gap-3 shadow-2xl max-w-[90vw]"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-white/90 text-sm md:text-lg font-medium truncate">
                                {dynamicMessage}
                            </span>
                        </motion.div>
                    )}
                </div>

                {/* Footer */}
                <div className="w-full flex justify-between items-end p-6 md:p-8 text-white/40 text-[10px] md:text-xs font-mono uppercase tracking-widest z-20">
                    <div>Sun ↑ {sunriseToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone })}</div>
                    <div>Sun ↓ {sunsetToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone })}</div>
                </div>
            </div>
        </div>
    );
}