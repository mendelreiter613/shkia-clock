"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface CountdownDisplayProps {
    shkiaTime: Date;
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

export default function CountdownDisplay({ shkiaTime, locationName, onReset }: CountdownDisplayProps) {
    const [timeLeft, setTimeLeft] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const interval = setInterval(() => {
            const now = new Date();
            const diff = shkiaTime.getTime() - now.getTime();
            setTimeLeft(diff);
        }, 1000);
        return () => clearInterval(interval);
    }, [shkiaTime]);

    if (!mounted) return null;

    const minutesLeft = timeLeft / 1000 / 60;

    // Design States
    // Using pure colors and blending for a high-end feel
    let bgClass = "bg-[#050b14]"; // Default Dark Blue/Black
    let accentColor = "text-white";
    let statusText = "Time until Shkia";
    let pulse = false;

    // Gradients defined via inline styles for framer-motion interpolation
    let gradientSteps = ["#0f2027", "#203a43", "#2c5364"]; // Relaxed

    if (minutesLeft <= 5 && minutesLeft > 0) {
        // PANIC
        gradientSteps = ["#000000", "#380000", "#660000"];
        accentColor = "text-red-500 glitch-text font-black";
        statusText = "SHKIA IMMINENT";
        pulse = true;
    } else if (minutesLeft <= 15 && minutesLeft > 0) {
        // CRITICAL
        gradientSteps = ["#1a0505", "#4a0000", "#2b0a0a"];
        accentColor = "text-red-100 text-glow-strong";
        statusText = "Critical Time";
        pulse = true;
    } else if (minutesLeft <= 60 && minutesLeft > 0) {
        // WARNING
        gradientSteps = ["#1e130c", "#9a8478", "#1e130c"]; // Golden/Bronze
        accentColor = "text-amber-100/90";
        statusText = "Approaching Sunset";
    } else if (minutesLeft <= 0) {
        gradientSteps = ["#000000", "#111111", "#000000"];
        statusText = "Shkia Passed";
        accentColor = "text-gray-600";
    }

    return (
        <motion.div
            className="fixed inset-0 w-full h-full overflow-hidden flex flex-col items-center justify-center selection:bg-white/20"
            animate={{
                background: `linear-gradient(180deg, ${gradientSteps[0]} 0%, ${gradientSteps[1]} 50%, ${gradientSteps[2]} 100%)`
            }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
        >
            {/* Subtle Grain Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

            {/* Status Label - Top */}
            <div className="absolute top-12 md:top-24 text-center">
                <motion.p
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="uppercase tracking-[0.5em] text-white/40 text-xs md:text-sm font-medium"
                >
                    {locationName}
                </motion.p>
                <motion.h2
                    key={statusText}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-2xl md:text-4xl mt-4 font-light uppercase tracking-widest ${minutesLeft <= 5 ? "text-red-500 animate-pulse font-bold" : "text-white/80"}`}
                >
                    {statusText}
                </motion.h2>
            </div>

            {/* Timer - Massive */}
            <div className="relative z-10 mx-4">
                <motion.div
                    animate={pulse ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                >
                    <h1 className={`font-mono-digital text-[18vw] xs:text-[120px] leading-none tracking-tighter tabular-nums ${accentColor} drop-shadow-2xl`}>
                        {formatTimeLeft(timeLeft)}
                    </h1>
                </motion.div>
            </div>

            {/* Metadata - Bottom */}
            <div className="absolute bottom-12 text-center text-white/30 font-mono text-sm">
                <p className="tracking-wider">SUNSET: {shkiaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            {/* Reset Button - Fixed Bottom Right */}
            <motion.button
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                onClick={onReset}
                className="fixed bottom-8 right-8 p-4 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full text-white/60 hover:text-white transition shadow-lg border border-white/5 z-50 group"
                title="Change Location"
            >
                <RefreshCw size={24} className="group-hover:text-blue-400 transition-colors" />
            </motion.button>
        </motion.div>
    );
}
