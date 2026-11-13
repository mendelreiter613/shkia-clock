"use client";

import { ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock } from "lucide-react";
import { ZmanimData } from "@/lib/zmanim";
import { formatRealTimeLeft, getGameClock } from "@/lib/games";

interface GameShellProps {
    title: string;
    zmanim: ZmanimData;
    onExit: () => void;
    children: ReactNode;
}

// Full-screen frame shared by both games: a back button, the game's name and
// the real time left until shkia, so the game never hides the actual clock.
export function GameShell({ title, zmanim, onExit, children }: GameShellProps) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onExit(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onExit]);

    const clock = getGameClock(zmanim, now);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col bg-slate-950 text-white"
        >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
                <button
                    onClick={onExit}
                    className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/10 transition-colors text-sm text-white/80"
                    aria-label="Back to the clock"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Back</span>
                </button>
                <h2 className="text-base font-semibold truncate">{title}</h2>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5" />
                    {clock.afterShkia ? "Shkia passed" : <>Real shkia in <span className="font-clock text-white">{formatRealTimeLeft(clock.msToShkia)}</span></>}
                </div>
            </div>
            <div className="relative flex-1 min-h-0">{children}</div>
        </motion.div>
    );
}

interface GameMessageProps {
    emoji: string;
    title: string;
    children: ReactNode;
    actions: ReactNode;
}

// The intro and end-of-round card, laid over the game area.
export function GameMessage({ emoji, title, children, actions }: GameMessageProps) {
    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
            <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full max-w-sm rounded-3xl bg-slate-900/95 border border-white/10 shadow-2xl p-6 text-center"
            >
                <div className="text-5xl mb-3" aria-hidden>{emoji}</div>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <div className="text-sm text-white/70 space-y-2 mb-6">{children}</div>
                <div className="flex flex-col gap-2">{actions}</div>
            </motion.div>
        </div>
    );
}

export function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
    return (
        <button
            onClick={onClick}
            autoFocus
            className="w-full py-3 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition-colors"
        >
            {children}
        </button>
    );
}

export function SecondaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
    return (
        <button
            onClick={onClick}
            className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 font-semibold hover:bg-white/10 transition-colors"
        >
            {children}
        </button>
    );
}
