"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Gamepad2, X } from "lucide-react";
import { readBest } from "@/lib/games";

export type GameId = "race-the-sun" | "wake-up-dash";

const GAMES: { id: GameId; emoji: string; name: string; blurb: string; bestLabel: (s: number) => string }[] = [
    {
        id: "race-the-sun",
        emoji: "🏃‍♂️",
        name: "Race the Sun",
        blurb: "Run to shul before the sun sets. Jump the distractions, grab coffee.",
        bestLabel: (s) => `Best: ${s.toFixed(1)}s of sun to spare`,
    },
    {
        id: "wake-up-dash",
        emoji: "⏰",
        name: "Wake-up Dash",
        blurb: "Smack the snooze alarms and phones keeping you in bed. Don't hit \"5 more minutes\".",
        bestLabel: (s) => `Best: up with ${s.toFixed(1)}s to spare`,
    },
];

interface GamesPanelProps {
    onPick: (id: GameId) => void;
    onClose: () => void;
}

export default function GamesPanel({ onPick, onClose }: GamesPanelProps) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

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
                aria-labelledby="games-title"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-slate-900/95 border border-white/10 shadow-2xl p-6 text-white"
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/15">
                            <Gamepad2 className="w-5 h-5 text-amber-300" />
                        </div>
                        <h2 id="games-title" className="text-lg font-semibold">Shkia games</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Close">
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>
                <p className="text-sm text-white/60 mb-5">
                    Beat the shkia in a game, then beat it for real. The later it is today, the less time you get.
                </p>

                <div className="flex flex-col gap-3">
                    {GAMES.map((g) => {
                        const best = readBest(g.id);
                        return (
                            <button
                                key={g.id}
                                onClick={() => onPick(g.id)}
                                className="flex items-center gap-4 text-left p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-300/30 transition-colors"
                            >
                                <span className="text-4xl shrink-0" aria-hidden>{g.emoji}</span>
                                <span className="min-w-0">
                                    <span className="block font-semibold">{g.name}</span>
                                    <span className="block text-sm text-white/60">{g.blurb}</span>
                                    {best !== null && <span className="block text-xs text-amber-200/80 mt-1">{g.bestLabel(best)}</span>}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </motion.div>
        </motion.div>
    );
}
