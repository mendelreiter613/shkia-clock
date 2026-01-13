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

    // Status message based on time remaining
    let statusMessage = "YOU HAVE PLENTY OF TIME.";
    let statusColor = "text-white/80";

    if (minutesLeft <= 5 && minutesLeft > 0) {
        statusMessage = "SHKIA IS IMMINENT!";
        statusColor = "text-red-400 animate-pulse";
    } else if (minutesLeft <= 15 && minutesLeft > 0) {
        statusMessage = "TIME IS RUNNING OUT.";
        statusColor = "text-orange-400";
    } else if (minutesLeft <= 30 && minutesLeft > 0) {
        statusMessage = "SHKIA IS APPROACHING.";
        statusColor = "text-yellow-400";
    } else if (minutesLeft <= 0) {
        statusMessage = "SHKIA HAS PASSED.";
        statusColor = "text-gray-400";
    }

    return (
        <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-6 z-30">
                {/* Logo */}
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                    </div>
                    <span className="text-xl font-bold tracking-tight">SHKIA CLOCK</span>
                </div>

                {/* Search/Change Location */}
                <button
                    onClick={onReset}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all"
                >
                    <Search size={16} />
                    <span className="text-sm">Search city...</span>
                </button>
            </div>

            {/* Sun */}
            <motion.div
                className="absolute top-16 rounded-full"
                style={{
                    left: `calc(${sunX}% - 80px)`,
                    width: '160px',
                    height: '160px',
                    background: 'radial-gradient(circle, #FFD700 0%, #FFA500 50%, transparent 70%)',
                    boxShadow: '0 0 120px 60px rgba(255, 215, 0, 0.6)',
                    zIndex: 5
                }}
            />

            {/* Main Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">

                {/* Label */}
                <div className="mb-4">
                    <p className="text-white/50 text-sm md:text-base uppercase tracking-[0.3em] text-center">
                        TIME UNTIL SHKIA • {locationName.toUpperCase()}
                    </p>
                </div>

                {/* Timer */}
                <div className="mb-8">
                    <h1
                        className="font-mono-digital text-[18vw] sm:text-[140px] md:text-[180px] lg:text-[220px] leading-none text-white tracking-tight"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                        {formatTimeLeft(msToShkia)}
                    </h1>
                </div>

                {/* Status Pill */}
                <div className="mb-16">
                    <div className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-white/60"></div>
                        <span className={`text-sm md:text-base font-medium tracking-wide ${statusColor}`}>
                            {statusMessage}
                        </span>
                    </div>
                </div>

                {/* Sunrise/Sunset */}
                <div className="flex items-center gap-16 md:gap-24">
                    <div className="text-center">
                        <p className="text-white/40 text-xs md:text-sm uppercase tracking-[0.2em] mb-2">Sunrise</p>
                        <p className="text-white text-lg md:text-2xl font-light">
                            {sunriseToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-white/40 text-xs md:text-sm uppercase tracking-[0.2em] mb-2">Shkia</p>
                        <p className="text-white text-lg md:text-2xl font-light">
                            {sunsetToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 left-0 right-0 text-center">
                <p className="text-white/30 text-xs uppercase tracking-[0.2em]">
                    Based on Hebcal Halachic Algorithms • Use with caution for halachic decisions
                </p>
            </div>
        </div>
    );
}
