"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
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
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
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
    const minutesLeft = msToShkia / 1000 / 60;

    // Calculate sun position
    const dayDuration = sunsetToday.getTime() - sunriseToday.getTime();
    const elapsedTime = now.getTime() - sunriseToday.getTime();
    let sunPercent = Math.max(0, Math.min(1.1, elapsedTime / dayDuration));

    const sunX = sunPercent * 100;
    const sunY = Math.sin(sunPercent * Math.PI) * 60;
    const sunBottom = sunPercent > 1 ? -20 : Math.max(-10, sunY);

    // Dynamic styling based on time
    let bgGradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    let sunColor = "#FDB813";
    let sunSize = "w-40 h-40";
    let statusText = "Time Until Shkia";
    let timerColor = "text-white";

    if (sunPercent < 0.2) {
        bgGradient = "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";
        sunColor = "#FF6B6B";
        statusText = "Morning";
    } else if (sunPercent >= 0.8 && sunPercent <= 1.0) {
        bgGradient = "linear-gradient(135deg, #fa709a 0%, #fee140 100%)";
        sunColor = "#FF6500";
        sunSize = "w-48 h-48";
        statusText = "Approaching Sunset";
    } else if (sunPercent > 1.0) {
        bgGradient = "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)";
        sunColor = "#2a2a2a";
        statusText = "Shkia Passed";
        timerColor = "text-blue-200";
    }

    if (minutesLeft <= 5 && minutesLeft > 0) {
        bgGradient = "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)";
        sunColor = "#FF0000";
        statusText = "SHKIA IMMINENT!";
        timerColor = "text-white font-black animate-pulse";
    }

    return (
        <motion.div
            className="fixed inset-0 overflow-hidden"
            animate={{ background: bgGradient }}
            transition={{ duration: 2 }}
        >
            {/* Sun - Background Layer */}
            <motion.div
                className={`absolute ${sunSize} rounded-full transition-all duration-1000`}
                style={{
                    left: `calc(${sunX}% - ${sunSize === 'w-48 h-48' ? '96px' : '80px'})`,
                    bottom: `${Math.min(100, sunBottom)}%`,
                    background: `radial-gradient(circle, ${sunColor} 0%, ${sunColor}99 50%, transparent 100%)`,
                    boxShadow: `0 0 80px ${sunColor}`,
                    zIndex: 10
                }}
            />

            {/* Main Content - Flexbox Layout */}
            <div className="relative z-20 h-full flex flex-col items-center justify-between p-8 md:p-12">

                {/* Top Section - Location & Status */}
                <div className="w-full flex flex-col items-center space-y-3 pt-4">
                    <motion.h2
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-white/90 text-xl md:text-2xl font-light tracking-[0.3em] uppercase drop-shadow-lg"
                    >
                        {locationName}
                    </motion.h2>
                    <p className="text-white/70 text-sm md:text-base uppercase tracking-widest font-medium">
                        {statusText}
                    </p>
                </div>

                {/* Center Section - Timer */}
                <div className="flex-1 flex items-center justify-center">
                    <motion.h1
                        key={formatTimeLeft(msToShkia)}
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        className={`font-mono-digital text-[20vw] md:text-[180px] leading-none tracking-tighter ${timerColor} drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]`}
                    >
                        {formatTimeLeft(msToShkia)}
                    </motion.h1>
                </div>

                {/* Bottom Section - Sunrise/Sunset Info */}
                <div className="w-full flex flex-col items-center space-y-4 pb-4">
                    <div className="flex items-center gap-6 md:gap-8 text-white/60 text-sm md:text-base font-mono bg-black/20 backdrop-blur-sm px-6 py-3 rounded-full">
                        <div className="flex flex-col items-center gap-1 min-w-[90px]">
                            <span className="text-xs opacity-60 uppercase tracking-wider whitespace-nowrap">Sunrise</span>
                            <span className="font-semibold whitespace-nowrap">{sunriseToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="w-px h-8 bg-white/20 flex-shrink-0"></div>
                        <div className="flex flex-col items-center gap-1 min-w-[90px]">
                            <span className="text-xs opacity-60 uppercase tracking-wider whitespace-nowrap">Sunset</span>
                            <span className="font-semibold whitespace-nowrap">{sunsetToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reset Button - Fixed Top Right */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onReset}
                className="fixed top-6 right-6 z-30 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all shadow-xl border border-white/20"
                title="Change Location"
            >
                <X size={24} />
            </motion.button>
        </motion.div>
    );
}
