"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Flame } from "lucide-react";
import { StreakState } from "@/hooks/useStreak";
import { cheer, formatMargin, weekday } from "@/lib/streak";

export function formatClock(d: Date, timeZone: string) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone });
}

// Header pill: the flame and current streak. Glows amber while today's
// streak is still on the line (Mincha time, not logged yet).
export function StreakPill({ streak, onClick }: { streak: StreakState; onClick: () => void }) {
    const atRisk = streak.streak > 0 && !streak.today && !streak.restDay && streak.minchaWindow === "open";
    const lit = !!streak.today || (streak.restDay && streak.streak > 0);
    return (
        <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3.5 py-3 rounded-full border backdrop-blur-xl transition-all ${atRisk
                ? "bg-amber-500/15 border-amber-400/50 hover:bg-amber-500/25"
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
            title="Beat the Shkia streak"
            aria-label={`Beat the Shkia: ${streak.streak} day streak`}
        >
            <Flame size={20} className={lit ? "text-orange-400 fill-orange-400/40" : atRisk ? "text-amber-300" : "text-white/70"} />
            <span className="text-sm font-bold text-white/90 tabular-nums min-w-[1ch]">{streak.streak}</span>
        </motion.button>
    );
}

// The main call to action under the countdown.
export function MinchaButton({ streak, timeZone, urgent }: { streak: StreakState; timeZone: string; urgent: boolean }) {
    const reduceMotion = useReducedMotion();
    const base = "mt-5 sm:mt-8 px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2";

    if (streak.today) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className={`${base} bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 backdrop-blur-xl`}>
                <Check size={16} /> Mincha done · {formatMargin(streak.today.minutesLeft)} to spare
            </motion.div>
        );
    }

    if (streak.restDay) {
        return (
            <div className={`${base} bg-white/5 border border-white/10 text-white/60 backdrop-blur-xl`}>
                🕯️ {weekday(streak.todayKey) === 6 ? "Shabbos" : "Yom Tov"}: your streak is safe
            </div>
        );
    }

    if (streak.minchaWindow === "early") {
        return (
            <div className={`${base} bg-white/5 border border-white/10 text-white/50 backdrop-blur-xl`}>
                Mincha from {formatClock(streak.minchaGedola, timeZone)}
            </div>
        );
    }

    if (streak.minchaWindow === "closed") return null;

    return (
        <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={urgent && !reduceMotion ? { opacity: 1, y: 0, scale: [1, 1.06, 1] } : { opacity: 1, y: 0 }}
            transition={urgent && !reduceMotion ? { scale: { duration: 0.9, repeat: Infinity } } : undefined}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={streak.markDavened}
            className={`${base} !px-7 !py-3.5 !text-base text-white shadow-lg border ${urgent
                ? "bg-gradient-to-r from-red-500 to-orange-500 border-red-300/60 shadow-red-900/50"
                : "bg-gradient-to-r from-amber-500/90 to-orange-500/90 border-amber-300/50 shadow-orange-900/40"
                }`}
        >
            🙏 I davened Mincha
        </motion.button>
    );
}

const BURST = ["🔥", "✨", "🙏", "⭐", "🌅", "✨", "🔥", "⭐", "✨", "🙏", "🌟", "🔥"];

// Shown right after logging: the new streak number, a cheer and a burst of emoji.
export function Celebration({ streak }: { streak: StreakState }) {
    const reduceMotion = useReducedMotion();
    const entry = streak.justLogged;
    const { dismissCelebration } = streak;
    const [particles] = useState(() => BURST.map((emoji, i) => {
        const angle = (i / BURST.length) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 140 + Math.random() * 110;
        return { emoji, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, rotate: Math.random() * 360 - 180 };
    }));

    useEffect(() => {
        if (!entry) return;
        const t = setTimeout(dismissCelebration, 4500);
        return () => clearTimeout(t);
    }, [entry, dismissCelebration]);

    return (
        <AnimatePresence>
            {entry && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm cursor-pointer"
                    onClick={dismissCelebration}
                    role="status"
                >
                    {!reduceMotion && particles.map((p, i) => (
                        <motion.span
                            key={i}
                            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                            animate={{ x: p.x, y: p.y, scale: 1.4, opacity: 0, rotate: p.rotate }}
                            transition={{ duration: 1.4, ease: "easeOut", delay: 0.15 }}
                            className="absolute text-3xl pointer-events-none"
                        >
                            {p.emoji}
                        </motion.span>
                    ))}
                    <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        className="relative text-center px-10 py-8 rounded-3xl bg-slate-900/90 border border-orange-400/30 shadow-2xl"
                    >
                        <div className="flex items-center justify-center gap-2 text-6xl font-bold text-white tabular-nums">
                            <Flame className="w-14 h-14 text-orange-400 fill-orange-400/40" />
                            {streak.streak}
                        </div>
                        <p className="text-white/50 text-xs font-bold tracking-[0.25em] uppercase mt-1">
                            day streak
                        </p>
                        <p className="text-2xl font-semibold text-white mt-5">{cheer(entry)}</p>
                        <p className="text-white/70 mt-1">
                            Davened with <b className="text-white">{formatMargin(entry.minutesLeft)}</b> to spare
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
