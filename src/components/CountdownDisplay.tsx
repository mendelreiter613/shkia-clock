"use client";

import { useEffect, useState } from "react";
import { Search, MapPin, Sunrise, Sunset, Clock } from "lucide-react";
import { ZmanimData } from "@/lib/zmanim";
import { motion, AnimatePresence } from "framer-motion";

// % of viewport height the ocean band occupies, measured from the bottom.
// The sun/moon arc is anchored to this so it visually rises out of / sinks
// into the water instead of just floating over a flat gradient.
const HORIZON_PCT = 30;

interface Star {
    left: number;
    top: number;
    size: number;
    delay: number;
    duration: number;
}

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

type DayPhase = "predawn" | "morning" | "afternoon" | "postShkia";

// Dynamic messages based on day of week and where "now" falls relative to
// today's actual sunrise/shkia — NOT fixed clock hours. Shkia shifts by
// hours across the seasons, so a message can only be "morning" if the sun
// has actually risen, and only pre-shkia phases mention Shachris/Mincha;
// once shkia has passed the copy switches to Maariv/evening framing.
function getDynamicMessage(phase: DayPhase, dayOfWeek: number): string {
    const messages: Record<number, Record<DayPhase, string>> = {
        0: { // Sunday
            predawn: "Quiet predawn hours — Shachris is coming up soon 🌌",
            morning: "Plenty of time to daven Shachris! Start your week right! 🌅",
            afternoon: "Still time to daven before shkia today 🙏",
            postShkia: "Shkia has passed — time for Maariv 🌙"
        },
        1: { // Monday
            predawn: "Monday predawn calm — Shachris awaits 🌌",
            morning: "Start your Monday with davening! You have time 🌄",
            afternoon: "Afternoon reminder: Daven before shkia today 📿",
            postShkia: "Shkia has passed — time for Maariv 🌙"
        },
        2: { // Tuesday
            predawn: "Tuesday predawn hush — Shachris soon 🌌",
            morning: "Beautiful Tuesday morning! Time for Shachris 🌞",
            afternoon: "Afternoon check-in: Remember to daven! 🙏",
            postShkia: "Shkia has passed — time for Maariv 🌙"
        },
        3: { // Wednesday
            predawn: "Wednesday predawn — Shachris coming up 🌌",
            morning: "Midweek blessing! Plenty of time to daven 🌅",
            afternoon: "Afternoon davening reminder 📿",
            postShkia: "Shkia has passed — time for Maariv 🌙"
        },
        4: { // Thursday
            predawn: "Thursday predawn — Shachris soon 🌌",
            morning: "Thursday morning! Start with davening 🌄",
            afternoon: "Good time to daven Mincha before shkia 🙏",
            postShkia: "Shkia has passed — Maariv time, Shabbos is close! 🌙"
        },
        5: { // Friday - Erev Shabbos
            predawn: "Erev Shabbos predawn — get a head start today 🌌",
            morning: "Erev Shabbos! Daven early, prepare for Shabbos 🕯️",
            afternoon: "Friday afternoon! Daven Mincha before licht bentchen 📿",
            postShkia: "Shabbos has arrived — Good Shabbos! 🕯️"
        },
        6: { // Shabbos
            predawn: "Shabbos predawn stillness ✨",
            morning: "Shabbos Shalom! Enjoy your day of rest 🕊️",
            afternoon: "Peaceful Shabbos afternoon 🌟",
            postShkia: "Shabbos has ended — Good week! 🌠"
        }
    };

    return messages[dayOfWeek][phase];
}

export default function CountdownDisplay({ zmanim, locationName, onReset }: CountdownDisplayProps) {
    const [now, setNow] = useState(new Date());
    const [mounted, setMounted] = useState(false);

    // Lazy initializer: generated once per mount so stars don't reshuffle on every 1s tick.
    const [stars] = useState<Star[]>(() => Array.from({ length: 50 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 65,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 4,
        duration: Math.random() * 3 + 2
    })));

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard: avoids SSR/CSR mismatch from `new Date()`
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
    const sunProgress = (elapsedDaylight / totalDaylightValues) * 100;

    // FIX: Allow sun to go out of bounds (-15 to 115) so it sets completely
    // We do NOT clamp it strictly to 0-100 anymore for the calculation

    // Calculate Sun arc (height) - Peak at 50%
    // If progress is < 0 or > 100, Math.sin might get weird, so we clamp for height calculation only
    const clampedProgress = Math.max(0, Math.min(100, sunProgress));
    const sunHeight = Math.sin((clampedProgress / 100) * Math.PI) * 150;

    // Anchor the arc to the ocean surface: at sunrise/shkia the sun sits
    // just below the horizon line (partly hidden behind the wave layer,
    // which paints in front of it), rising to its highest point at midday.
    const sunBottomPct = HORIZON_PCT - 10 + (sunHeight / 150) * 65;
    const sunLeftPct = Math.max(0, Math.min(100, sunProgress));

    // FIX: Only turn "Night Mode" on when sun is sufficiently below horizon
    // This allows the sunset gradient to be visible before it goes pitch black
    const isNight = sunProgress < -10 || sunProgress > 110;

    // Phase is driven by the real sunrise/shkia for today, not fixed clock
    // hours, so messaging never mentions Shachris after shkia has passed.
    const dayPhase: DayPhase =
        now.getTime() < visualSunrise.getTime() ? "predawn"
        : now.getTime() >= visualSunset.getTime() ? "postShkia"
        : currentHour < 12 ? "morning"
        : "afternoon";
    const dynamicMessage = getDynamicMessage(dayPhase, dayOfWeek);

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

    // Water/wave colors mirroring the sky palette above, so the ocean reads
    // as a continuation of the sky rather than a separate flat band.
    const getOceanPalette = () => {
        if (time.isCritical) return {
            top: 'rgba(127,29,29,0.5)', bottom: 'rgba(12,2,2,0.97)',
            waveBack: 'rgba(69,10,10,0.9)', waveFront: 'rgba(127,29,29,0.85)',
            glow: 'rgba(239,68,68,0.5)'
        };
        if (time.isUrgent) return {
            top: 'rgba(234,88,12,0.45)', bottom: 'rgba(24,12,4,0.97)',
            waveBack: 'rgba(124,45,18,0.9)', waveFront: 'rgba(194,65,12,0.85)',
            glow: 'rgba(251,191,36,0.5)'
        };
        if (isNight) return {
            top: 'rgba(30,41,59,0.5)', bottom: 'rgba(2,6,23,0.98)',
            waveBack: 'rgba(2,6,23,0.92)', waveFront: 'rgba(15,23,42,0.85)',
            glow: 'rgba(191,219,254,0.35)'
        };
        if (sunProgress < 15) return { // Dawn
            top: 'rgba(96,165,250,0.4)', bottom: 'rgba(8,20,45,0.96)',
            waveBack: 'rgba(30,58,95,0.9)', waveFront: 'rgba(37,99,235,0.8)',
            glow: 'rgba(253,224,71,0.5)'
        };
        if (sunProgress < 75) return { // Day
            top: 'rgba(56,189,248,0.4)', bottom: 'rgba(3,25,45,0.95)',
            waveBack: 'rgba(12,74,110,0.9)', waveFront: 'rgba(3,105,161,0.82)',
            glow: 'rgba(255,255,255,0.45)'
        };
        if (sunProgress < 90) return { // Golden Hour
            top: 'rgba(96,165,250,0.4)', bottom: 'rgba(10,15,40,0.96)',
            waveBack: 'rgba(29,78,216,0.88)', waveFront: 'rgba(245,158,11,0.55)',
            glow: 'rgba(251,191,36,0.55)'
        };
        return { // Sunset Approach
            top: 'rgba(234,88,12,0.45)', bottom: 'rgba(15,23,42,0.97)',
            waveBack: 'rgba(124,45,18,0.85)', waveFront: 'rgba(234,88,12,0.65)',
            glow: 'rgba(251,191,36,0.6)'
        };
    };
    const ocean = getOceanPalette();

    return (
        <div className="flex flex-col h-screen w-full relative overflow-hidden">
            {/* Sky (bottom layer) */}
            <div
                className="absolute inset-0 transition-all duration-[2000ms] ease-in-out z-0"
                style={{
                    background: getBackgroundGradient()
                }}
            />

            {/* Ambient glow orbs */}
            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float z-0" />
            <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float z-0" style={{ animationDelay: '2s' }} />

            {/* Stars (night only) */}
            <AnimatePresence>
                {isNight && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0 z-[5] pointer-events-none"
                    >
                        {stars.map((star, i) => (
                            <div
                                key={i}
                                className="absolute rounded-full bg-white animate-twinkle"
                                style={{
                                    left: `${star.left}%`,
                                    top: `${star.top}%`,
                                    width: `${star.size}px`,
                                    height: `${star.size}px`,
                                    animationDelay: `${star.delay}s`,
                                    animationDuration: `${star.duration}s`
                                }}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SUN */}
            <AnimatePresence>
                {!isNight && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            left: `${sunLeftPct}%`,
                            bottom: `${sunBottomPct}%`
                        }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ duration: 1, ease: "linear" }}
                        className="absolute w-32 h-32 rounded-full z-10 pointer-events-none"
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

            {/* MOON (night only) - fixed position, gentle bob */}
            <AnimatePresence>
                {isNight && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute w-20 h-20 rounded-full z-10 pointer-events-none animate-float"
                        style={{
                            left: '68%',
                            top: '14%',
                            background: 'radial-gradient(circle at 35% 35%, #f8fafc 0%, #cbd5e1 60%, transparent 75%)',
                            boxShadow: '0 0 60px rgba(226, 232, 240, 0.5)'
                        }}
                    />
                )}
            </AnimatePresence>

            {/* OCEAN (in front of the celestial body's lower half, so it visibly rises out of / sinks into the water) */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden pointer-events-none z-20" style={{ height: `${HORIZON_PCT}vh` }}>
                {/* Water body */}
                <div
                    className="absolute inset-0 transition-all duration-[2000ms] ease-in-out"
                    style={{ background: `linear-gradient(to bottom, ${ocean.top} 0%, ${ocean.bottom} 100%)` }}
                />

                {/* Reflection of the sun/moon on the water surface */}
                <div
                    className="absolute top-0 h-full w-[28%] animate-shimmer"
                    style={{
                        left: `${isNight ? 68 : sunLeftPct}%`,
                        transform: 'translateX(-50%)',
                        background: `radial-gradient(ellipse at 50% 0%, ${ocean.glow} 0%, transparent 65%)`
                    }}
                />

                {/* Back wave (slow) */}
                <div className="absolute bottom-0 left-0 h-[75%] w-[200%] flex animate-wave-back">
                    <svg className="w-1/2 h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M0,60 C150,20 350,100 600,60 C850,20 1050,100 1200,60 L1200,120 L0,120 Z" fill={ocean.waveBack} />
                    </svg>
                    <svg className="w-1/2 h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M0,60 C150,20 350,100 600,60 C850,20 1050,100 1200,60 L1200,120 L0,120 Z" fill={ocean.waveBack} />
                    </svg>
                </div>

                {/* Front wave (fast) */}
                <div className="absolute bottom-0 left-0 h-[55%] w-[200%] flex animate-wave-front">
                    <svg className="w-1/2 h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M0,70 C200,100 400,40 600,70 C800,100 1000,40 1200,70 L1200,120 L0,120 Z" fill={ocean.waveFront} />
                    </svg>
                    <svg className="w-1/2 h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M0,70 C200,100 400,40 600,70 C800,100 1000,40 1200,70 L1200,120 L0,120 Z" fill={ocean.waveFront} />
                    </svg>
                </div>
            </div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex justify-between items-start z-30 p-8"
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
            <div className="flex-1 flex flex-col items-center justify-center z-30 px-6">

                {/* Label with Icon */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mb-6 sm:mb-12"
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
                    className={`mt-8 sm:mt-16 px-8 py-4 rounded-full glass-badge flex items-center gap-4 ${time.isCritical ? 'border-red-500/30' :
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
                className="flex flex-row flex-wrap justify-center items-center gap-3 sm:gap-8 pb-6 sm:pb-10 z-30 px-6"
            >

                {/* Sunrise Card */}
                <div className="glass-badge px-4 sm:px-6 py-3 sm:py-4 rounded-2xl flex items-center gap-4 min-w-[140px] sm:min-w-[160px]">
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

                {/* Divider - only shown once the cards actually sit side by side */}
                <div className="hidden sm:block w-px h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

                {/* Sunset Card */}
                <div className="glass-badge px-4 sm:px-6 py-3 sm:py-4 rounded-2xl flex items-center gap-4 min-w-[140px] sm:min-w-[160px]">
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