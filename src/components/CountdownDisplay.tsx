"use client";

import { useEffect, useState } from "react";
import { Search, RotateCcw } from "lucide-react";
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
    
    // Logic for visual urgency
    const isUrgent = totalSeconds < 900; // 15 minutes
    const isPassed = totalSeconds <= 0;

    return {
        hours: pad(hours),
        minutes: pad(minutes),
        seconds: pad(seconds),
        isUrgent,
        isPassed
    };
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
    const timeData = formatTimeLeft(msToShkia);

    return (
        <div className="relative w-full h-screen flex flex-col items-center justify-between p-6 z-10">
            
            {/* 1. Top Bar */}
            <div className="w-full flex justify-between items-center max-w-6xl mx-auto">
                <div className="flex flex-col">
                    <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">Location</span>
                    <span className="text-white text-sm font-medium tracking-wide">{locationName}</span>
                </div>
                <button 
                    onClick={onReset}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/5"
                    title="Change Location"
                >
                    <Search size={18} />
                </button>
            </div>

            {/* 2. Main Clock Display - MASSIVE */}
            <div className="flex-1 flex flex-col items-center justify-center w-full">
                
                <h2 className="text-white/30 text-xs md:text-sm uppercase tracking-[0.5em] mb-4 md:mb-8 font-semibold">
                    Time Until Sunset
                </h2>
                
                <div className={`relative flex items-baseline font-mono-digital leading-none tracking-tighter ${
                    timeData.isUrgent ? 'text-red-300 animate-pulse' : 'text-white'
                }`}>
                    {/* Hours */}
                    <div className="text-[15vw] md:text-[18vw] font-bold">
                        {timeData.hours}
                    </div>
                    <span className="text-[5vw] md:text-[6vw] text-white/20 mx-1 md:mx-4 -translate-y-4 md:-translate-y-8">:</span>
                    
                    {/* Minutes */}
                    <div className="text-[15vw] md:text-[18vw] font-bold">
                        {timeData.minutes}
                    </div>
                    
                    {/* Seconds (Smaller) */}
                    <div className="hidden md:flex flex-col justify-end ml-4 md:ml-8 pb-4 md:pb-8">
                         <span className="text-[4vw] md:text-[5vw] font-medium text-white/50">
                            {timeData.seconds}
                         </span>
                    </div>
                </div>

                {/* Mobile Seconds Display (Show below on small screens) */}
                <div className="md:hidden mt-2 text-4xl font-mono-digital text-white/50">
                    {timeData.seconds}
                </div>

                {/* Status Badge */}
                {timeData.isUrgent && !timeData.isPassed && (
                    <div className="mt-8 px-4 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-200 text-xs uppercase tracking-widest font-bold">
                        Shkia Imminent
                    </div>
                )}
                 {timeData.isPassed && (
                    <div className="mt-8 px-4 py-1 rounded-full bg-white/10 text-white/50 text-xs uppercase tracking-widest">
                        Zman Has Passed
                    </div>
                )}
            </div>

            {/* 3. Footer Grid */}
            <div className="w-full max-w-2xl glass-card rounded-2xl p-4 md:p-6 grid grid-cols-2 gap-4">
                <div className="text-center">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1 font-bold">Sunrise</p>
                    <p className="text-white font-mono-digital text-lg">
                        {sunriseToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div className="text-center border-l border-white/10">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1 font-bold">Sunset</p>
                    <p className="text-white font-mono-digital text-lg">
                        {sunsetToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>
        </div>
    );
}