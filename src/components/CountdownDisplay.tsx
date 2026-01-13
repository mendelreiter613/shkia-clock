"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
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
    const sunY = Math.sin(sunPercent * Math.PI) * 45;
    const sunBottom = sunPercent > 1 ? -12 : Math.max(-5, sunY);

    // Dynamic styling
    let bgGradient = "linear-gradient(to bottom, #667eea 0%, #764ba2 100%)";
    let sunColor = "#FFD700";
    let statusText = "Until Shkia";
    let timerColor = "text-white";

    if (sunPercent < 0.2) {
        bgGradient = "linear-gradient(to bottom, #ff9a9e 0%, #fecfef 100%)";
        sunColor = "#FF6B6B";
        statusText = "Morning";
    } else if (sunPercent >= 0.8 && sunPercent <= 1.0) {
        bgGradient = "linear-gradient(to bottom, #fa709a 0%, #fee140 100%)";
        sunColor = "#FF6500";
        statusText = "Approaching Sunset";
    } else if (sunPercent > 1.0) {
        bgGradient = "linear-gradient(to bottom, #0f2027 0%, #203a43 50%, #2c5364 100%)";
        sunColor = "#1a1a1a";
        statusText = "Shkia Passed";
        timerColor = "text-blue-100";
    }

    if (minutesLeft <= 5 && minutesLeft > 0) {
        bgGradient = "linear-gradient(to bottom, #eb3349 0%, #f45c43 100%)";
        sunColor = "#FF0000";
        statusText = "SHKIA NOW!";
        timerColor = "text-white animate-pulse";
    }

    return (
        <motion.div
            className="fixed inset-0 w-full h-full overflow-hidden flex items-center justify-center"
            animate={{ background: bgGradient }}
            transition={{ duration: 2 }}
        >
            {/* Sun - Integrated into background */}
            <motion.div
                className="absolute w-28 h-28 md:w-36 md:h-36 rounded-full transition-all duration-1000"
                style={{
                    left: `calc(${sunX}% - 72px)`,
                    bottom: `${Math.min(100, sunBottom)}%`,
                    background: `radial-gradient(circle, ${sunColor} 0%, ${sunColor}cc 40%, transparent 70%)`,
                    boxShadow: `0 0 80px 30px ${sunColor}55`,
                    filter: 'blur(1px)',
                    zIndex: 5
                }}
            />

            {/* Main Content Container */}
            <div className="relative z-10 w-full max-w-5xl mx-auto px-6">

                {/* Location & Status */}
                <div className="text-center mb-8 md:mb-12">
                    <motion.h2
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-white/95 text-2xl md:text-4xl font-light uppercase tracking-[0.2em] drop-shadow-lg mb-3"
                    >
                        {locationName}
                    </motion.h2>
                    <p className="text-white/80 text-lg md:text-xl font-medium tracking-wide">
                        {statusText}
                    </p>
                </div>

                {/* Timer - Perfectly Sized */}
                <div className="text-center mb-8 md:mb-12">
                    <motion.h1
                        key={Math.floor(msToShkia / 1000)}
                        initial={{ opacity: 0.9 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`font-mono-digital text-[15vw] sm:text-[120px] md:text-[140px] lg:text-[160px] leading-none tracking-tight ${timerColor}`}
                        style={{
                            fontVariantNumeric: 'tabular-nums',
                            textShadow: '0 4px 30px rgba(0,0,0,0.3)'
                        }}
                    >
                        {formatTimeLeft(msToShkia)}
                    </motion.h1>
                </div>

                {/* Sunrise/Sunset Info */}
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-8 md:gap-12 text-white/75 text-sm md:text-base bg-black/20 backdrop-blur-md px-8 md:px-10 py-4 md:py-5 rounded-full border border-white/15 shadow-xl">
                        <div className="flex flex-col items-center gap-1.5">
                            <span className="text-xs md:text-sm opacity-75 uppercase tracking-[0.15em] font-medium">Sunrise</span>
                            <span className="font-semibold text-base md:text-lg text-white/95">{sunriseToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="w-px h-12 bg-white/25"></div>
                        <div className="flex flex-col items-center gap-1.5">
                            <span className="text-xs md:text-sm opacity-75 uppercase tracking-[0.15em] font-medium">Sunset</span>
                            <span className="font-semibold text-base md:text-lg text-white/95">{sunsetToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reset Button - Top Right */}
            <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.3)' }}
                whileTap={{ scale: 0.95 }}
                onClick={onReset}
                className="fixed top-6 right-6 z-30 flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-medium transition-all shadow-lg border border-white/25"
            >
                <MapPin size={16} />
                <span className="hidden sm:inline">Change</span>
            </motion.button>
        </motion.div>
    );
}
