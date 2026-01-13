"use client";

import { useEffect, useState } from "react";
import { Search, MapPin } from "lucide-react";
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
        isUrgent: totalSeconds < 900 // Less than 15 mins
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
    
    // Sun Position Logic (0 to 100%)
    const dayLength = sunsetToday.getTime() - sunriseToday.getTime();
    const elapsed = now.getTime() - sunriseToday.getTime();
    const percent = Math.max(0, Math.min(1, elapsed / dayLength));

    const timeDisplay = formatTimeLeft(msToShkia);

    return (
        <div className="relative w-full h-screen flex flex-col items-center justify-between p-6 z-10 overflow-hidden">
            
            {/* Background Sun Arc Visualization (Decorative) */}
            <div className="absolute inset-x-0 bottom-0 h-[60vh] opacity-20 pointer-events-none">
                 {/* The Track */}
                <svg className="w-full h-full" preserveAspectRatio="none">
                    <path d="M 0,400 Q 50,-100 1000,400" vectorEffect="non-scaling-stroke" stroke="white" strokeWidth="2" fill="none" className="opacity-30" />
                </svg>
            </div>

            {/* Top Navigation */}
            <div className="w-full flex justify-between items-center z-20">
                <div className="flex items-center gap-2 text-white/60 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    <MapPin size={14} />
                    <span className="text-xs font-medium tracking-wider uppercase">{locationName}</span>
                </div>
                <button 
                    onClick={onReset}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/5"
                >
                    <Search size={18} />
                </button>
            </div>

            {/* Main Timer Content */}
            <div className="flex-1 flex flex-col items-center justify-center relative w-full">
                
                {/* The Sun Orb */}
                <motion.div 
                    className="absolute w-64 h-64 rounded-full blur-[80px] -z-10 transition-colors duration-1000"
                    style={{
                        background: timeDisplay.isUrgent ? 'rgba(255, 69, 0, 0.4)' : 'rgba(255, 200, 0, 0.15)',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}
                />

                <div className="text-center">
                    <h2 className="text-white/40 text-sm md:text-base tracking-[0.4em] uppercase mb-4">Time Until Sunset</h2>
                    <h1 className={`font-mono-digital text-7xl sm:text-9xl md:text-[10rem] font-bold tracking-tighter leading-none ${timeDisplay.isUrgent ? 'text-red-200 animate-pulse' : 'text-white'}`}>
                        {timeDisplay.text}
                    </h1>
                </div>

                {/* Progress Bar (Visual Indicator) */}
                <div className="w-full max-w-md mt-12 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-gradient-to-r from-orange-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${percent * 100}%` }}
                        transition={{ ease: "linear", duration: 1 }}
                    />
                </div>
            </div>

            {/* Footer Data Grid */}
            <div className="w-full max-w-4xl glass-panel rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4 z-20">
                <div className="text-center border-r border-white/5 last:border-0">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Sunrise</p>
                    <p className="text-white font-medium">{sunriseToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-center border-r border-white/5 last:border-0 md:border-r">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Sunset</p>
                    <p className="text-white font-medium">{sunsetToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-center border-r border-white/5 last:border-0 hidden md:block">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Day Length</p>
                    <p className="text-white font-medium">{Math.floor(dayLength / 1000 / 60 / 60)}h {Math.floor((dayLength / 1000 / 60) % 60)}m</p>
                </div>
                <div className="text-center hidden md:block">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Halacha Source</p>
                    <p className="text-white/60 text-xs mt-1">Hebcal</p>
                </div>
            </div>
        </div>
    );
}