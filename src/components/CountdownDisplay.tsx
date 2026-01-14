"use client";

import { useEffect, useState, useRef } from "react";
import { Search, MapPin, AlertTriangle } from "lucide-react";
import { ZmanimData } from "@/lib/zmanim";
import { motion } from "framer-motion";
import SpaceBackground from "./SpaceBackground";
import { getDynamicMessage } from "@/lib/messages";

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

    const dynamicMessage = typeof getDynamicMessage === 'function'
        ? getDynamicMessage(currentHour, dayOfWeek)
        : "Check Zmanim!";

    return (
        <div className={`min-h-screen w-full relative overflow-hidden flex flex-col transition-colors duration-1000 ${time.isCritical ? 'animate-alarm' : ''}`}>

            <SpaceBackground sunProgress={sunProgress} isNight={isNight} />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex justify-between items-start p-4 md:p-6 z-10"
            >
                <div className="flex items-center gap-2 backdrop-blur-md bg-white/10 px-4 py-2 rounded-full border border-white/20 shadow-lg">
                    <MapPin size={14} className="text-white" />
                    <span className="text-xs md:text-sm font-semibold tracking-wide text-white">{locationName}</span>
                </div>
                <button onClick={onReset} className="p-2 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all backdrop-blur-md shadow-lg">
                    <Search size={18} className="text-white" />
                </button>
            </motion.div>

            {/* Main Content - CENTERED */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 w-full z-10">

                {/* Label */}
                <motion.div className="flex items-center gap-2 mb-6 opacity-80">
                    {time.isCritical ? <AlertTriangle className="text-red-500 animate-bounce w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_#60a5fa]" />}
                    <h2 className="text-xs md:text-sm font-bold tracking-[0.2em] uppercase text-white/80">
                        {time.isCritical ? "SHKIA IMMINENT" : "Time Until Shkia"}
                    </h2>
                </motion.div>

                {/* Clock Numbers - MUCH SMALLER */}
                <div className="font-clock text-white leading-none relative flex justify-center w-full max-w-4xl">
                    {time.isCritical ? (
                        <motion.div
                            key="panic"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="flex flex-col items-center"
                        >
                            <span className="text-[15vw] md:text-[12rem] font-bold text-red-500 drop-shadow-[0_0_50px_rgba(220,38,38,0.8)] tabular-nums">
                                {time.seconds}
                            </span>
                            <span className="text-lg md:text-2xl uppercase tracking-widest text-white/80 mt-2">SECONDS</span>
                        </motion.div>
                    ) : (
                        <div className="flex items-center gap-3 md:gap-6">
                            <div className="flex flex-col items-center">
                                <span className="text-[10vw] md:text-[7rem] font-bold drop-shadow-2xl tabular-nums">{time.hours}</span>
                                <span className="text-xs md:text-sm uppercase tracking-widest opacity-50 font-sans mt-1">Hours</span>
                            </div>
                            <span className="text-[8vw] md:text-[5rem] opacity-30 -mt-6">:</span>
                            <div className="flex flex-col items-center">
                                <span className="text-[10vw] md:text-[7rem] font-bold drop-shadow-2xl tabular-nums">{time.minutes}</span>
                                <span className="text-xs md:text-sm uppercase tracking-widest opacity-50 font-sans mt-1">Minutes</span>
                            </div>
                            <span className="text-[8vw] md:text-[5rem] opacity-30 -mt-6">:</span>
                            <div className="flex flex-col items-center">
                                <span className="text-[10vw] md:text-[7rem] font-medium text-white/80 drop-shadow-xl tabular-nums">{time.seconds}</span>
                                <span className="text-xs md:text-sm uppercase tracking-widest opacity-50 font-sans mt-1">Seconds</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Message Badge */}
                {!time.isCritical && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 md:mt-12 px-5 py-2.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 flex items-center gap-2 shadow-2xl max-w-[90vw]"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-white/90 text-xs md:text-sm font-medium truncate">
                            {dynamicMessage}
                        </span>
                    </motion.div>
                )}
            </div>

            {/* Footer */}
            <div className="w-full flex justify-center gap-8 md:gap-16 items-end pb-6 pt-2 text-white/40 text-[9px] md:text-xs font-mono uppercase tracking-widest z-10">
                <div>Sun ↑ {sunriseToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone })}</div>
                <div>Sun ↓ {sunsetToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone })}</div>
            </div>
        </div>
    );
}