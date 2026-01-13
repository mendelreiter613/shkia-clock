"use client";

import { useEffect, useState } from "react";
import { Search, MapPin, Sunrise, Sunset, Clock } from "lucide-react";
import { ZmanimData } from "@/lib/zmanim";
import { motion, AnimatePresence } from "framer-motion";

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
        isUrgent: totalSeconds < 900,
        isCritical: totalSeconds < 300
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
    
    const statusConfig = time.isCritical 
        ? { message: "Shkia is approaching", color: "red", glow: "rgba(239, 68, 68, 0.4)" }
        : time.isUrgent 
        ? { message: "Shkia is imminent", color: "amber", glow: "rgba(251, 191, 36, 0.4)" }
        : { message: "You have plenty of time", color: "emerald", glow: "rgba(16, 185, 129, 0.4)" };

    return (
        <div className="flex flex-col h-screen w-full relative overflow-hidden">
            
            {/* Animated Background Orbs */}
            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
            
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex justify-between items-start z-20 p-8"
            >
                <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-3 glass-badge px-5 py-3 rounded-full cursor-default"
                >
                    <MapPin size={16} className="text-blue-400" />
                    <span className="text-sm font-semibold tracking-wide text-white/90">
                        {locationName}
                    </span>
                </motion.div>

                <motion.button 
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onReset}
                    className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-xl"
                    title="Change Location"
                >
                    <Search size={20} className="text-white/70" />
                </motion.button>
            </motion.div>

            {/* Main Clock Display */}
            <div className="flex-1 flex flex-col items-center justify-center z-10 px-6">
                
                {/* Label with Icon */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mb-12"
                >
                    <Clock className="w-5 h-5 text-white/40" />
                    <h2 className="text-white/40 text-sm font-bold tracking-[0.3em] uppercase">
                        Time Until Shkia
                    </h2>
                </motion.div>

                {/* The Clock - Massive and Glowing */}
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="relative"
                >
                    {/* Glow effect behind numbers */}
                    <div 
                        className="absolute inset-0 blur-3xl opacity-30"
                        style={{ 
                            background: `radial-gradient(circle, ${statusConfig.glow} 0%, transparent 70%)`
                        }}
                    />
                    
                    <div className="font-clock text-white font-light leading-none tracking-[0.1em] flex items-center gap-4 relative">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={time.hours}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                className="text-[clamp(4rem,15vw,12rem)] glow-text"
                            >
                                {time.hours}
                            </motion.span>
                        </AnimatePresence>
                        
                        <span className="text-[clamp(3rem,12vw,10rem)] text-white/20 animate-pulse">:</span>
                        
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={time.minutes}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                className="text-[clamp(4rem,15vw,12rem)] glow-text"
                            >
                                {time.minutes}
                            </motion.span>
                        </AnimatePresence>
                        
                        <span className="text-[clamp(3rem,12vw,10rem)] text-white/20 animate-pulse">:</span>
                        
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={time.seconds}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                className="text-[clamp(3rem,12vw,9rem)] text-white/70"
                            >
                                {time.seconds}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Status Badge - Enhanced */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`mt-16 px-8 py-4 rounded-full glass-badge flex items-center gap-4 ${
                        time.isCritical ? 'border-red-500/30' : 
                        time.isUrgent ? 'border-amber-500/30' : 
                        'border-emerald-500/20'
                    }`}
                >
                    <div className={`relative w-3 h-3 rounded-full ${
                        time.isCritical ? 'bg-red-500' : 
                        time.isUrgent ? 'bg-amber-500' : 
                        'bg-emerald-400'
                    }`}>
                        {(time.isUrgent || time.isCritical) && (
                            <motion.div
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className={`absolute inset-0 rounded-full ${
                                    time.isCritical ? 'bg-red-500' : 'bg-amber-500'
                                }`}
                            />
                        )}
                    </div>
                    <span className="text-white/90 text-base font-semibold tracking-wide">
                        {statusConfig.message}
                    </span>
                </motion.div>

            </div>

            {/* Footer Info Bar - Modern Cards */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center items-center gap-8 pb-10 z-20 px-6"
            >
                
                {/* Sunrise Card */}
                <div className="glass-badge px-6 py-4 rounded-2xl flex items-center gap-4 min-w-[160px]">
                    <div className="p-3 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl">
                        <Sunrise className="text-orange-400" size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">
                            Sunrise
                        </p>
                        <p className="text-white text-xl font-semibold font-clock">
                            {sunriseToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

                {/* Sunset Card */}
                <div className="glass-badge px-6 py-4 rounded-2xl flex items-center gap-4 min-w-[160px]">
                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
                        <Sunset className="text-purple-400" size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">
                            Sunset
                        </p>
                        <p className="text-white text-xl font-semibold font-clock">
                            {sunsetToday.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                
            </motion.div>
        </div>
    );
}