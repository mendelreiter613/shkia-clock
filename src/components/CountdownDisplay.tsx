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

// Dynamic messages based on day of week and current hour
function getDynamicMessage(currentHour: number, dayOfWeek: number): string {
    const messages: { [key: number]: { [key: string]: string } } = {
        0: { // Sunday
            "morning": "Plenty of time to daven Shachris! Start your week right! 🌅",
            "afternoon": "Good afternoon! Still time to daven before shkia 🙏",
            "evening": "Getting closer! Make time for davening 🕐",
            "night": "Late night! Daven Shachris soon ⏰"
        },
        1: { // Monday
            "morning": "Start your Monday with davening! You have time 🌄",
            "afternoon": "Afternoon reminder: Daven before shkia today 📿",
            "evening": "Don't wait! Shkia is getting closer 🕒",
            "night": "Late night! Time to daven Shachris ⏰"
        },
        2: { // Tuesday
            "morning": "Beautiful Tuesday morning! Time for Shachris 🌞",
            "afternoon": "Afternoon check-in: Remember to daven! 🙏",
            "evening": "Time is short! Get to davening 🕐",
            "night": "Late night! Daven Shachris soon ⏰"
        },
        3: { // Wednesday
            "morning": "Midweek blessing! Plenty of time to daven 🌅",
            "afternoon": "Afternoon davening reminder 📿",
            "evening": "Getting late! Daven soon 🕒",
            "night": "Late night! Time for Shachris ⏰"
        },
        4: { // Thursday
            "morning": "Thursday morning! Start with davening 🌄",
            "afternoon": "Good time to daven Shachris 🙏",
            "evening": "Time running out! Daven soon 🕐",
            "night": "Late night! Daven Shachris soon ⏰"
        },
        5: { // Friday - Erev Shabbos
            "morning": "Erev Shabbos! Daven early, prepare for Shabbos 🕯️",
            "afternoon": "Friday afternoon! Daven before Shabbos prep 📿",
            "evening": "Erev Shabbos rush! Daven quickly! 🕒",
            "night": "Late Erev Shabbos! Prepare for Shabbos 🕯️"
        },
        6: { // Shabbos
            "morning": "Shabbos Shalom! Enjoy your day of rest 🕊️",
            "afternoon": "Peaceful Shabbos afternoon 🌟",
            "evening": "Shabbos winding down... 🌅",
            "night": "Shabbos night... ✨"
        }
    };

    const dayMessages = messages[dayOfWeek];

    // Determine time of day based on current hour
    let timeOfDay: string;
    if (currentHour >= 6 && currentHour < 12) {
        timeOfDay = "morning";  // 6 AM - 12 PM
    } else if (currentHour >= 12 && currentHour < 17) {
        timeOfDay = "afternoon";  // 12 PM - 5 PM
    } else if (currentHour >= 17 && currentHour < 21) {
        timeOfDay = "evening";  // 5 PM - 9 PM
    } else {
        timeOfDay = "night";  // 9 PM - 6 AM
    }

    return dayMessages[timeOfDay];
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

    // USE THE NEW VISUAL FIELDS
    const { shkia, visualSunrise, visualSunset, timeZone } = zmanim;
    const msToShkia = shkia.getTime() - now.getTime();
    const time = formatTimeLeft(msToShkia);
    const dayOfWeek = now.getDay();

    // Get current hour in the LOCATION'S timezone (not browser's timezone)
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        hour: 'numeric',
        hour12: false
    });
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find(part => part.type === 'hour');
    const currentHour = hourPart ? parseInt(hourPart.value) : 0;

    // Calculate sun position (0 to 100%) using VISUAL times
    const totalDaylightValues = visualSunset.getTime() - visualSunrise.getTime();
    const elapsedDaylight = now.getTime() - visualSunrise.getTime();
    let sunProgress = (elapsedDaylight / totalDaylightValues) * 100;

    // FIX: Allow sun to go out of bounds (-15 to 115) so it sets completely
    // We do NOT clamp it strictly to 0-100 anymore for the calculation

    // Calculate Sun arc (height) - Peak at 50%
    // If progress is < 0 or > 100, Math.sin might get weird, so we clamp for height calculation only
    const clampedProgress = Math.max(0, Math.min(100, sunProgress));
    const sunHeight = Math.sin((clampedProgress / 100) * Math.PI) * 150; 

    // FIX: Only turn "Night Mode" on when sun is sufficiently below horizon
    // This allows the sunset gradient to be visible before it goes pitch black
    const isNight = sunProgress < -10 || sunProgress > 110;

    // Get dynamic message based on current hour and day (not hours left!)
    const dynamicMessage = getDynamicMessage(currentHour, dayOfWeek);

    console.log(`Sun Progress: ${sunProgress}`);
    console.log(`Is Night: ${isNight}`);
    console.log(`Current Time: ${now.toLocaleTimeString()}`);

    const statusConfig = time.isCritical
        ? { message: dynamicMessage, color: "red", glow: "rgba(239, 68, 68, 0.4)" }
        : time.isUrgent
            ? { message: dynamicMessage, color: "amber", glow: "rgba(251, 191, 36, 0.4)" }
            : { message: dynamicMessage, color: "emerald", glow: "rgba(16, 185, 129, 0.4)" };

    const getBackgroundGradient = () => {
        if (time.isCritical) return 'radial-gradient(circle at 50% 50%, #7f1d1d 0%, #450a0a 50%, #000000 100%)';
        if (time.isUrgent) return 'radial-gradient(circle at 50% 90%, #f59e0b 0%, #ea580c 25%, #7c2d12 60%, #1e1b4b 100%)';
        
        if (isNight) return 'radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 50%, #020617 100%)';

        // Dynamic Day Gradients
        if (sunProgress < 15) return 'linear-gradient(180deg, #3b82f6 0%, #60a5fa 50%, #fde047 100%)'; // Dawn
        if (sunProgress < 75) return 'linear-gradient(180deg, #0ea5e9 0%, #38bdf8 60%, #bae6fd 100%)'; // Day
        if (sunProgress < 90) return 'linear-gradient(180deg, #1d4ed8 0%, #3b82f6 50%, #fbbf24 100%)'; // Golden Hour
        
        return 'linear-gradient(180deg, #0f172a 0%, #7c2d12 40%, #ea580c 80%, #fbbf24 100%)'; // Sunset Approach
    };

    return (
        <div className="flex flex-col h-screen w-full relative overflow-hidden">
            {/* Dynamic Background */}
            <div 
                className="absolute inset-0 transition-all duration-[2000ms] ease-in-out z-50" 
                style={{ 
                    background: getBackgroundGradient()
                }} 
            />

            {/* Animated Background Orbs */}
            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

            {/* DYNAMIC SUN ORB */}
            <AnimatePresence>
                {!isNight && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            left: `${sunProgress}%`,
                            // FIX: Sun goes below screen (-15%) at start/end
                            bottom: `${-15 + (sunHeight / 2)}%` 
                        }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ duration: 1, ease: "linear" }}
                        className="absolute w-32 h-32 rounded-full z-0 pointer-events-none"
                        style={{
                            background: `radial-gradient(circle, ${sunProgress > 85 ? '#f97316' : '#facc15'} 20%, transparent 70%)`,
                            boxShadow: `0 0 ${sunProgress > 85 ? '50px' : '80px'} ${sunProgress > 85 ? 'rgba(249, 115, 22, 0.8)' : 'rgba(250, 204, 21, 0.6)'}`,
                            transform: 'translate(-50%, 50%)',
                            filter: 'blur(8px)'
                        }}
                    >
                        {/* Core of the sun */}
                        <div className="absolute inset-8 bg-white rounded-full opacity-100 shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
                    </motion.div>
                )}
            </AnimatePresence>

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

                {/* The Clock */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="relative"
                >
                    {/* Glow effect */}
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
                                className="text-[clamp(3rem,12vw,10rem)] md:text-[clamp(4rem,15vw,12rem)] glow-text"
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
                                className="text-[clamp(2.5rem,10vw,8rem)] md:text-[clamp(3rem,12vw,9rem)] text-white/70"
                            >
                                {time.seconds}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Status Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`mt-16 px-8 py-4 rounded-full glass-badge flex items-center gap-4 ${time.isCritical ? 'border-red-500/30' :
                        time.isUrgent ? 'border-amber-500/30' :
                            'border-emerald-500/20'
                        }`}
                >
                    <div className={`relative w-3 h-3 rounded-full ${time.isCritical ? 'bg-red-500' :
                        time.isUrgent ? 'bg-amber-500' :
                            'bg-emerald-400'
                        }`}>
                        {(time.isUrgent || time.isCritical) && (
                            <motion.div
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className={`absolute inset-0 rounded-full ${time.isCritical ? 'bg-red-500' : 'bg-amber-500'
                                    }`}
                            />
                        )}
                    </div>
                    <span className="text-white/90 text-base font-semibold tracking-wide">
                        {statusConfig.message}
                    </span>
                </motion.div>

            </div>

            {/* Footer Info Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 pb-6 sm:pb-10 z-20 px-6 flex-wrap"
            >

                {/* Sunrise Card */}
                <div className="glass-badge px-4 sm:px-6 py-4 rounded-2xl flex items-center gap-4 min-w-[150px] sm:min-w-[160px]">
                    <div className="p-3 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl">
                        <Sunrise className="text-orange-400" size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">
                            Sunrise
                        </p>
                        <p className="text-white text-lg sm:text-xl font-semibold font-clock">
                            {visualSunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timeZone })}
                        </p>
                    </div>
                </div>

                {/* Divider - hidden on mobile */}
                <div className="hidden sm:block w-px h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

                {/* Sunset Card */}
                <div className="glass-badge px-4 sm:px-6 py-4 rounded-2xl flex items-center gap-4 min-w-[150px] sm:min-w-[160px]">
                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
                        <Sunset className="text-purple-400" size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase mb-1">
                            Sunset
                        </p>
                        <p className="text-white text-lg sm:text-xl font-semibold font-clock">
                            {visualSunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timeZone })}
                        </p>
                    </div>
                </div>

            </motion.div>
        </div>
    );
}