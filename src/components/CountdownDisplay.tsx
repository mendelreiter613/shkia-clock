"use client";

import { useEffect, useState } from "react";
import { Search, Clock, MapPin } from "lucide-react";
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
    return { 
        text: `${hours}:${pad(minutes)}:${pad(seconds)}`,
        hours: pad(hours),
        minutes: pad(minutes),
        seconds: pad(seconds),
        isUrgent: totalSeconds < 900 // 15 mins
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
    const time = formatTimeLeft(msToShkia);
    
    // Status message logic
    const isUrgent = time.isUrgent;
    const message = isUrgent 
        ? "SHKIA IS IMMINENT. DAVEN NOW." 
        : "YOU HAVE PLENTY OF TIME.";

    return (
        <div className="flex flex-col h-screen w-full bg-black text-white relative p-6 md:p-12 overflow-hidden">
            
            {/* 1. Header Row (Logo + Search) */}
            <div className="flex justify-between items-start z-20">
                {/* Logo Area */}
                <div className="flex items-center gap-2">
                    <Clock size={24} className="text-white" strokeWidth={2.5} />
                    <span className="text-xl font-bold tracking-tight">SHKIA CLOCK</span>
                </div>

                {/* Search Bar (Visual only - clicks trigger reset) */}
                <button 
                    onClick={onReset}
                    className="group flex items-center gap-3 bg-[#1A1A1A] hover:bg-[#252525] px-4 py-2.5 rounded-full transition-all border border-white/5 hover:border-white/20 w-48 md:w-64"
                >
                    <Search size={16} className="text-white/40 group-hover:text-white transition-colors" />
                    <span className="text-sm text-white/40 group-hover:text-white transition-colors">Search city...</span>
                </button>
            </div>

            {/* 2. Main Content (Centered) */}
            <div className="flex-1 flex flex-col items-center justify-center z-10 -mt-10">
                
                {/* The Sun Orb (Centered Glow) */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1 }}
                    className={`w-32 h-32 rounded-full mb-8 ${isUrgent ? 'sun-glow-urgent' : 'sun-glow'}`}
                />

                {/* Label */}
                <div className="flex items-center gap-2 text-[#666666] text-xs md:text-sm font-bold tracking-[0.2em] uppercase mb-4">
                    <span>Time Until Shkia</span>
                    <span className="text-[#333]">•</span>
                    <span className="flex items-center gap-1">
                        <MapPin size={10} /> {locationName}
                    </span>
                </div>

                {/* THE CLOCK - Massive Typography */}
                <div className="font-clock text-[18vw] md:text-[160px] lg:text-[200px] font-bold leading-none tracking-tighter text-white">
                    {time.hours}:{time.minutes}:{time.seconds}
                </div>

                {/* Status Pill */}
                <div className={`mt-8 md:mt-12 px-8 py-3 rounded-full border border-white/10 ${isUrgent ? 'bg-red-900/20 border-red-500/30' : 'bg-[#111]'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-red-500 animate-pulse' : 'bg-white'}`}></div>
                        <span className={`text-sm md:text-base font-bold tracking-wider ${isUrgent ? 'text-red-400' : 'text-white'}`}>
                            {message}
                        </span>
                    </div>
                </div>

            </div>

            {/* 3. Footer Data */}
            <div className="flex justify-between items-end border-t border-white/10 pt-8 z-20">
                
                {/* Times */}
                <div className="flex gap-12 md:gap-24">
                    <div>
                        <p className="text-[#444] text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mb-1">Sunrise</p>
                        <p className="text-xl md:text-2xl text-white font-medium">
                             {sunriseToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <div>
                        <p className="text-[#444] text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mb-1">Shkia</p>
                        <p className="text-xl md:text-2xl text-white font-medium">
                            {sunsetToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="hidden md:block text-right">
                    <p className="text-[#333] text-[10px] font-bold tracking-[0.2em] uppercase">
                        Based on Hebcal Halachic Algorithms
                    </p>
                    <p className="text-[#333] text-[10px] font-bold tracking-[0.2em] uppercase mt-1">
                        Use with caution for exact times
                    </p>
                </div>
            </div>
        </div>
    );
}