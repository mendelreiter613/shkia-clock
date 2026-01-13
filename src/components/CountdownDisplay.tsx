"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

    // --- Sun Position Logic ---
    const dayDuration = sunsetToday.getTime() - sunriseToday.getTime();
    const elapsedTime = now.getTime() - sunriseToday.getTime();

    // 0.0 = Sunrise, 1.0 = Sunset
    let rawPercent = elapsedTime / dayDuration;
    // Clamp for visual sanity
    if (rawPercent < 0) rawPercent = 0; // Pre-sunrise
    if (rawPercent > 1.1) rawPercent = 1.1; // Post-sunset (allow a bit visually)

    // Calculate Sun Coordinates
    // Arc path: Y goes up then down. Simple parabola or Sine wave.
    // x = percent * 100
    // y = sin(percent * PI) * heightFactor
    // We want coordinates for "bottom" CSS property.
    // At 0% -> bottom: 0%. At 50% -> bottom: 60%. At 100% -> bottom: -10%.

    const sunX = rawPercent * 100;
    // Use Sine for arc height
    const sunY = Math.sin(rawPercent * Math.PI) * 70; // Peak at 70% height

    // Adjust for sunset dip
    const visualBottom = rawPercent > 1 ? -20 : Math.max(-10, sunY - 10);

    // --- Dynamic Styling ---
    let bgGradient = "linear-gradient(to top, #87CEEB 0%, #00BFFF 100%)"; // Standard Day
    let sunColor = "#FDB813"; // Yellow sun
    let sunGlow = "drop-shadow-[0_0_60px_rgba(253,184,19,0.8)]";
    let statusText = "Time until Shkia";
    let textColor = "text-white";
    let clockClass = "text-white drop-shadow-md";

    if (rawPercent < 0.1) {
        // Sunrise
        bgGradient = "linear-gradient(to top, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)";
        sunColor = "#FF6B6B";
    } else if (rawPercent > 0.85 && rawPercent <= 1.0) {
        // Golden Hour / Sunset
        bgGradient = "linear-gradient(to top, #f6d365 0%, #fda085 100%)";
        sunColor = "#FF4500"; // OrangeRed
        sunGlow = "drop-shadow-[0_0_80px_rgba(255,69,0,0.8)]";
        statusText = "Approaching Sunset";
    } else if (rawPercent > 1.0) {
        // Twilight / Night
        bgGradient = "linear-gradient(to top, #09203f 0%, #537895 100%)";
        sunColor = "#444"; // Dark set sun
        statusText = "Shkia Passed";
    }

    // Panic Overrides (Specific to time remaining, not just sun position)
    let isPanic = false;
    if (minutesLeft <= 5 && minutesLeft > 0) {
        bgGradient = "linear-gradient(to top, #380000, #000000)"; // Dark Red/Black
        sunColor = "#FF0000"; // Blood sun
        sunGlow = "drop-shadow-[0_0_100px_rgba(255,0,0,1)] animate-pulse";
        statusText = "SHKIA IMMINENT";
        isPanic = true;
        clockClass = "text-red-500 font-black glitch-text";
    } else if (minutesLeft <= 15 && minutesLeft > 0) {
        statusText = "Critical Time";
        clockClass = "text-red-100 drop-shadow-[0_0_10px_red]";
    }

    return (
        <div
            className="fixed inset-0 overflow-hidden transition-all duration-1000 ease-in-out"
            style={{ background: bgGradient }}
        >
            {/* --- Sun Graphic --- */}
            <motion.div
                className={`absolute w-32 h-32 rounded-full ${sunGlow}`}
                style={{
                    left: `calc(${sunX}% - 64px)`, // Center horizontally on point
                    bottom: `${visualBottom > 100 ? 100 : visualBottom}%`,
                    background: sunColor,
                    zIndex: 10
                }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
            />

            {/* --- Layout Wrapper (Z-20) --- */}
            <div className="relative z-20 w-full h-full flex flex-col items-center justify-center p-4">

                {/* Reset Button (Top Left) */}
                <button
                    onClick={onReset}
                    className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition shadow-lg group"
                    title="Change Location"
                >
                    <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                </button>

                {/* Location Name (Top Center - Safe Zone) */}
                <div className="absolute top-16 md:top-20 text-center">
                    <h2 className="text-white/80 font-medium tracking-[0.3em] uppercase drop-shadow-sm text-sm md:text-base">
                        {locationName}
                    </h2>
                    <p className="text-white/60 text-xs mt-1 font-mono uppercase tracking-widest">{statusText}</p>
                </div>

                {/* Main Clock (Centered) */}
                <div className="mt-8 relative">
                    <h1 className={`font-mono-digital text-[15vw] xs:text-[100px] leading-none tracking-tighter tabular-nums ${clockClass}`}>
                        {formatTimeLeft(msToShkia)}
                    </h1>
                </div>

                {/* Info Footer */}
                <div className="absolute bottom-6 text-center">
                    <div className="flex space-x-8 text-white/50 text-xs md:text-sm font-mono tracking-wider bg-black/10 px-4 py-2 rounded-full backdrop-blur-sm">
                        <span>SUNRISE: {sunriseToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>SUNSET: {sunsetToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
