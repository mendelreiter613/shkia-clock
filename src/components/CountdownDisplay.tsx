"use client";

import { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

    // DETERMINE STATE
    let bgGradient = "linear-gradient(to bottom, #0f2027, #203a43, #2c5364)"; // Deep Space
    let accentColor = "text-cyan-400";
    let statusText = "Time until Shkia";
    let heartBeat = false;
    let panicMode = false;
    let borderColor = "border-white/10";

    if (minutesLeft <= 5 && minutesLeft > 0) {
        // PANIC
        bgGradient = "radial-gradient(circle, #200101 0%, #000000 100%)";
        accentColor = "text-red-500 glitch-text";
        statusText = "RUN!! SHKIA IS NOW!!";
        panicMode = true;
        borderColor = "border-red-600/50";
    } else if (minutesLeft <= 15 && minutesLeft > 0) {
        // CRITICAL
        bgGradient = "radial-gradient(circle, #4a0000 0%, #1a0505 100%)";
        accentColor = "text-red-500 text-glow-strong";
        statusText = "CRITICAL: ZMAN IMMINENT";
        heartBeat = true;
        borderColor = "border-red-500/30";
    } else if (minutesLeft <= 60 && minutesLeft > 0) {
        // WARNING
        bgGradient = "linear-gradient(to bottom, #5f2c82, #49a09d)"; // Sunset-ish
        accentColor = "text-amber-400 text-glow";
        statusText = "Approaching Shkia...";
        borderColor = "border-amber-500/30";
    } else if (minutesLeft <= 0) {
        // PASSED
        bgGradient = "linear-gradient(to bottom, #000000, #111111)";
        accentColor = "text-gray-500";
        statusText = "Shkia Passed";
    }

    return (
        <motion.div
            className={`fixed inset-0 flex flex-col items-center justify-center overflow-hidden ${panicMode ? "shake" : ""}`}
            animate={{ background: bgGradient }}
            transition={{ duration: 2 }}
        >
            {/* Cinematic Overlays */}
            <div className="vignette" />
            <div className="scanlines" />

            {/* Reset Button */}
            <button
                onClick={onReset}
                className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 backdrop-blur rounded-full text-white/50 hover:text-white transition z-50"
                title="Change Location"
            >
                <RefreshCw size={20} />
            </button>

            {/* Main Content Card */}
            <div className={`relative z-20 p-12 rounded-3xl backdrop-blur-xl bg-black/20 border ${borderColor} shadow-2xl flex flex-col items-center max-w-4xl w-full mx-4`}>

                {/* Location Header */}
                <motion.h2
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white/60 text-lg sm:text-2xl uppercase tracking-[0.2em] mb-8 font-medium font-sans"
                >
                    {locationName}
                </motion.h2>

                {/* Timer */}
                <div className="relative">
                    <motion.h1
                        key={timeLeft} // Remount on tick? No, just animate text
                        animate={heartBeat ? { scale: [1, 1.05, 1], textShadow: ["0 0 20px red", "0 0 50px red", "0 0 20px red"] } : {}}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                        className={`font-mono-digital text-7xl sm:text-9xl font-bold tabular-nums tracking-tighter ${accentColor}`}
                        data-text={formatTimeLeft(timeLeft)}
                    >
                        {formatTimeLeft(timeLeft)}
                    </motion.h1>
                </div>

                {/* Status Text */}
                <motion.div
                    className="mt-8 flex items-center space-x-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {panicMode && <AlertTriangle className="text-red-500 animate-bounce" />}
                    <p className={`text-xl sm:text-3xl font-bold uppercase tracking-widest ${panicMode ? "text-red-500" : "text-white/80"}`}>
                        {statusText}
                    </p>
                    {panicMode && <AlertTriangle className="text-red-500 animate-bounce" />}
                </motion.div>

                {/* Sub Info */}
                <div className="mt-8 pt-8 border-t border-white/10 w-full text-center">
                    <p className="text-white/40 font-mono text-sm">
                        Target: {shkiaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>

            </div>
        </motion.div>
    );
}
