"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { RefreshCw } from "lucide-react";

interface CountdownDisplayProps {
    shkiaTime: Date;
    locationName: string;
    onReset: () => void;
}

function formatTimeLeft(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
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
            setTimeLeft(diff > 0 ? diff : 0);
        }, 1000);

        // Initial calc
        const now = new Date();
        const diff = shkiaTime.getTime() - now.getTime();
        setTimeLeft(diff > 0 ? diff : 0);

        return () => clearInterval(interval);
    }, [shkiaTime]);

    if (!mounted) return null;

    // Theme Logic
    const minutesLeft = timeLeft / 1000 / 60;

    let themeClass = "bg-gradient-to-br from-blue-500 to-cyan-600 text-white"; // Normal
    let statusText = "Time until Shkia";
    let containerClass = "";

    if (minutesLeft <= 5) {
        // PANIC MODE
        themeClass = "bg-black text-red-600 border-8 border-red-600 font-mono tracking-tighter";
        statusText = "SHKIA IS IMMINENT! RUN!";
        containerClass = "animate-shake";
    } else if (minutesLeft <= 15) {
        // DANGER MODE
        themeClass = "bg-red-600 text-white animate-pulse";
        statusText = "URGENT: Shkia Approaching!";
    } else if (minutesLeft <= 60) {
        // WARNING MODE
        themeClass = "bg-amber-500 text-black";
        statusText = "Getting closer...";
    }

    return (
        <div className={twMerge(
            "flex flex-col items-center justify-center w-full h-screen transition-colors duration-1000 p-4 relative",
            themeClass,
            containerClass
        )}>

            <button
                onClick={onReset}
                className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/40 transition"
                title="Change Location"
            >
                <RefreshCw size={20} />
            </button>

            <div className="text-center space-y-8">
                <h2 className="text-2xl md:text-4xl uppercase font-bold tracking-widest opacity-90">
                    {locationName}
                </h2>

                <h1 className="text-6xl md:text-9xl font-black tabular-nums">
                    {formatTimeLeft(timeLeft)}
                </h1>

                <p className="text-xl md:text-3xl font-semibold uppercase tracking-wider">
                    {statusText}
                </p>

                <p className="text-sm opacity-75 mt-4">
                    Shkia Time: {shkiaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}
