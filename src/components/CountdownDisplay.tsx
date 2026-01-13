"use client";

import { useEffect, useState } from "react";
import { Search, MapPin, Sunrise, Sunset } from "lucide-react";
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
        hours: pad(hours),
        minutes: pad(minutes),
        seconds: pad(seconds),
        isUrgent: totalSeconds < 900
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
    
    // Status Logic
    const message = time.isUrgent 
        ? "Shkia is imminent" 
        : "You have plenty of time";

    return (
        <div className="flex flex-col h-screen w-full relative overflow-hidden">
            
            {/* 1. Header: Location & Reset (Added Padding) */}
            <div className="w-full flex justify-between items-start z-20 p-6 md:p-8">
                 <div className="flex items-center gap-2 text-white/70 bg-white/5 px-4 py-3 rounded-full border border-white/10 backdrop-blur-md">
                    <MapPin size={14} />
                    <span className="text-xs md:text-sm font-medium tracking-wider uppercase">{locationName}</span>
                </div>

                <button 
                    onClick={onReset}
                    className="group p-3 rounded-full hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
                    title="Change Location"
                >
                    <Search size={22} className="text-white/50 group-hover:text-white transition-colors" />
                </button>
            </div>

            {/* 2. Main Content: The Clock */}
            <div className="flex-1 flex flex-col items-center justify-center z-10 -mt-10">
                
                {/* Label */}
                <h2 className="text-white/40 text-xs md:text-sm font-semibold tracking-[0.3em] uppercase mb-8 md:mb-12">
                    Time Until Shkia
                </h2>

                {/* THE CLOCK - Monospace, Light, Spaced */}
                <div className="font-clock text-white text-[15vw] md:text-9xl font-light leading-none tracking-widest flex items-baseline">
                    <span>{time.hours}</span>
                    <span className="animate-pulse text-white/30 mx-2">:</span>
                    <span>{time.minutes}</span>
                    <span className="animate-pulse text-white/30 mx-2">:</span>
                    <span className="text-[10vw] md:text-7xl text-white/80">{time.seconds}</span>
                </div>

                {/* Glassmorphism Status Badge */}
                <div className={`mt-16 px-8 py-4 rounded-full glass-badge flex items-center gap-3 ${time.isUrgent ? 'border-red-500/30 bg-red-900/10' : ''}`}>
                    <div className={`w-2 h-2 rounded-full ${time.isUrgent ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`}></div>
                    <span className="text-white/90 text-sm md:text-base font-medium tracking-wide">
                        {message}
                    </span>
                </div>

            </div>

            {/* 3. Footer: Info Bar (Larger Text + Margin Bottom) */}
            <div className="flex justify-center items-center gap-12 md:gap-24 pb-12 mb-4 z-20">
                
                {/* Sunrise */}
                <div className="flex items-center gap-4">
                    <Sunrise className="text-white/50" size={24} strokeWidth={1.5} />
                    <div>
                        <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase mb-1">Sunrise</p>
                        <p className="text-white text-lg font-medium tracking-widest">
                             {sunriseToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <div className="w-px h-10 bg-white/10"></div>

                {/* Sunset */}
                <div className="flex items-center gap-4">
                    <Sunset className="text-white/50" size={24} strokeWidth={1.5} />
                    <div>
                        <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase mb-1">Sunset</p>
                        <p className="text-white text-lg font-medium tracking-widest">
                            {sunsetToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                
            </div>
        </div>
    );
}