"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Flame, X } from "lucide-react";
import { StreakState } from "@/hooks/useStreak";
import { formatMargin, isRestDay, shiftDay } from "@/lib/streak";
import { formatClock } from "./StreakWidgets";

const DAYS_SHOWN = 14;
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

interface StreakPanelProps {
    streak: StreakState;
    timeZone: string;
    onClose: () => void;
}

export default function StreakPanel({ streak, timeZone, onClose }: StreakPanelProps) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const days = Array.from({ length: DAYS_SHOWN }, (_, i) => shiftDay(streak.todayKey, i - DAYS_SHOWN + 1));

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="streak-title"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-slate-900/95 border border-white/10 shadow-2xl p-6 text-white"
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-500/15">
                            <Flame className="w-5 h-5 text-orange-300" />
                        </div>
                        <h2 id="streak-title" className="text-lg font-semibold">Beat the Shkia</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Close">
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <Stat label="Streak" value={streak.streak} highlight />
                    <Stat label="Best" value={streak.best} />
                    <Stat label="Total" value={streak.total} />
                </div>

                {/* Last two weeks */}
                <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Last 2 weeks</p>
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {days.map((key) => {
                        const entry = streak.log[key];
                        const rest = !entry && isRestDay(key, streak.inIsrael);
                        const isToday = key === streak.todayKey;
                        const pending = isToday && !entry && streak.minchaWindow !== "closed";
                        const dow = new Date(`${key}T12:00:00Z`).getUTCDay();
                        return (
                            <div
                                key={key}
                                title={entry ? `${key}: ${formatMargin(entry.minutesLeft)} to spare` : rest ? `${key}: Shabbos / Yom Tov` : key}
                                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold border ${entry
                                    ? "bg-orange-500/25 border-orange-400/50 text-orange-100"
                                    : rest
                                        ? "bg-white/[0.03] border-white/10 text-white/40"
                                        : pending
                                            ? "border-dashed border-amber-300/60 text-amber-200/80"
                                            : "bg-white/[0.02] border-white/5 text-white/25"
                                    } ${isToday ? "ring-2 ring-white/30" : ""}`}
                            >
                                <span>{DAY_LETTERS[dow]}</span>
                                <span className="text-sm leading-none mt-0.5">{entry ? "🔥" : rest ? "🕯️" : "·"}</span>
                            </div>
                        );
                    })}
                </div>
                <p className="text-xs text-white/40 mb-6">Shabbos and Yom Tov never break your streak.</p>

                {/* Badges */}
                <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Badges</p>
                <div className="grid grid-cols-2 gap-2 mb-6">
                    {streak.badges.map((b) => (
                        <div
                            key={b.id}
                            className={`rounded-xl border p-3 flex items-center gap-3 ${b.earned ? "border-orange-400/40 bg-orange-500/10" : "border-white/5 bg-white/[0.02]"}`}
                        >
                            <span className={`text-2xl ${b.earned ? "" : "grayscale opacity-30"}`}>{b.emoji}</span>
                            <div className="min-w-0">
                                <p className={`text-sm font-semibold ${b.earned ? "text-white" : "text-white/50"}`}>{b.name}</p>
                                <p className="text-[11px] text-white/45 leading-snug">{b.how}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* How it works */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/70 space-y-1.5">
                    <p>
                        Tap <b className="text-white">I davened Mincha</b> any time from mincha gedola
                        ({formatClock(streak.minchaGedola, timeZone)}) until shkia. Before plag hamincha
                        ({formatClock(streak.plag, timeZone)}) earns Early Bird.
                    </p>
                    <p className="text-xs text-white/40">Your streak is saved on this device only.</p>
                </div>

                {streak.today && (
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-white/50">Logged today with {formatMargin(streak.today.minutesLeft)} to spare</span>
                        <button onClick={streak.undoToday} className="text-white/70 underline underline-offset-4 hover:text-white">
                            Undo
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
    return (
        <div className={`rounded-2xl border p-3 text-center ${highlight ? "border-orange-400/40 bg-orange-500/10" : "border-white/10 bg-white/[0.03]"}`}>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-[10px] font-bold tracking-widest uppercase text-white/45 mt-0.5">{label}</p>
        </div>
    );
}
