"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ZmanimData } from "@/lib/zmanim";
import { gameSeconds, getGameClock, readBest, writeBest } from "@/lib/games";
import { track } from "@/lib/analytics";
import { GameMessage, GameShell, PrimaryButton, SecondaryButton } from "./GameShell";

// Things popping up around the bed. Smack what keeps you lying there, grab
// the coffee, and leave "5 more minutes" alone or you sink back down.
const KINDS = {
    snooze: { emoji: "⏰", label: "Snooze", points: 6, good: true },
    phone: { emoji: "📱", label: "Phone", points: 6, good: true },
    zzz: { emoji: "💤", label: "Zzz", points: 6, good: true },
    coffee: { emoji: "☕", label: "Coffee", points: 15, good: true },
    pillow: { emoji: "🛌", label: "5 more min", points: -18, good: false },
} as const;
type Kind = keyof typeof KINDS;

const SPOTS = 9;
const START_AWAKE = 10;
const DECAY_PER_SEC = 3;
const MISS_PENALTY = 4;       // a distraction you let get away
const MIN_SECONDS = 20;
const MAX_SECONDS = 35;

interface Item { id: number; spot: number; kind: Kind; born: number; life: number }
interface Pop { id: number; spot: number; text: string; good: boolean }

type Phase = "intro" | "playing" | "won" | "lost";

interface Result { secondsLeft: number; smacked: number; pillows: number; best: number | null; newBest: boolean }

function pickKind(): Kind {
    const r = Math.random();
    if (r < 0.1) return "coffee";
    if (r < 0.28) return "pillow";
    const rest: Kind[] = ["snooze", "phone", "zzz"];
    return rest[Math.floor(Math.random() * rest.length)];
}

export default function WakeUpDash({ zmanim, onExit }: { zmanim: ZmanimData; onExit: () => void }) {
    const [phase, setPhase] = useState<Phase>("intro");
    const [duration, setDuration] = useState(() => gameSeconds(getGameClock(zmanim), MIN_SECONDS, MAX_SECONDS));
    const [afterShkia] = useState(() => getGameClock(zmanim).afterShkia);
    const [items, setItems] = useState<Item[]>([]);
    const [pops, setPops] = useState<Pop[]>([]);
    const [awake, setAwake] = useState(START_AWAKE);
    const [timeLeft, setTimeLeft] = useState(duration);
    const [result, setResult] = useState<Result | null>(null);

    // The tick reads and writes these refs; React state mirrors them for drawing.
    const awakeRef = useRef(START_AWAKE);
    const itemsRef = useRef<Item[]>([]);
    const startRef = useRef(0);
    const nextSpawnRef = useRef(0);
    const idRef = useRef(0);
    const statsRef = useRef({ smacked: 0, pillows: 0 });
    const phaseRef = useRef<Phase>("intro");
    const durationRef = useRef(duration);

    const addPop = useCallback((spot: number, text: string, good: boolean) => {
        const id = ++idRef.current;
        setPops((p) => [...p, { id, spot, text, good }]);
        setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 700);
    }, []);

    const changeAwake = (delta: number) => {
        awakeRef.current = Math.max(0, Math.min(100, awakeRef.current + delta));
        setAwake(awakeRef.current);
    };

    const finish = useCallback((won: boolean) => {
        const secondsLeft = Math.max(0, durationRef.current - (performance.now() - startRef.current) / 1000);
        const prev = readBest("wake-up-dash");
        const newBest = won && (prev === null || secondsLeft > prev);
        if (newBest) writeBest("wake-up-dash", Math.round(secondsLeft * 10) / 10);
        track({ event: "game_end", game: "wake-up-dash", won, score: won ? Math.round(secondsLeft * 10) / 10 : 0 });
        phaseRef.current = won ? "won" : "lost";
        itemsRef.current = [];
        setItems([]);
        setResult({ secondsLeft, ...statsRef.current, best: newBest ? secondsLeft : prev, newBest });
        setPhase(won ? "won" : "lost");
    }, []);

    const start = useCallback(() => {
        const d = gameSeconds(getGameClock(zmanim), MIN_SECONDS, MAX_SECONDS);
        setDuration(d);
        durationRef.current = d;
        awakeRef.current = START_AWAKE;
        itemsRef.current = [];
        statsRef.current = { smacked: 0, pillows: 0 };
        startRef.current = performance.now();
        nextSpawnRef.current = startRef.current + 400;
        setAwake(START_AWAKE);
        setItems([]);
        setPops([]);
        setTimeLeft(d);
        setResult(null);
        phaseRef.current = "playing";
        setPhase("playing");
        track({ event: "game_start", game: "wake-up-dash" });
    }, [zmanim]);

    // Game tick: drowsiness, spawning, expiring and the clock.
    useEffect(() => {
        if (phase !== "playing") return;
        let last = performance.now();
        const interval = setInterval(() => {
            const now = performance.now();
            const dt = (now - last) / 1000;
            last = now;
            const elapsed = (now - startRef.current) / 1000;
            const progress = Math.min(1, elapsed / durationRef.current);

            awakeRef.current = Math.max(0, awakeRef.current - DECAY_PER_SEC * dt);

            // things expire; distractions that get away cost you
            let changed = false;
            const kept: Item[] = [];
            for (const it of itemsRef.current) {
                if (now - it.born > it.life) {
                    changed = true;
                    if (KINDS[it.kind].good && it.kind !== "coffee") {
                        awakeRef.current = Math.max(0, awakeRef.current - MISS_PENALTY);
                        addPop(it.spot, `−${MISS_PENALTY}`, false);
                    }
                } else kept.push(it);
            }

            // faster and shorter-lived as the round goes on
            if (now >= nextSpawnRef.current) {
                const free = Array.from({ length: SPOTS }, (_, i) => i).filter((s) => !kept.some((it) => it.spot === s));
                if (free.length) {
                    const spot = free[Math.floor(Math.random() * free.length)];
                    kept.push({ id: ++idRef.current, spot, kind: pickKind(), born: now, life: 1300 - 450 * progress });
                    changed = true;
                }
                nextSpawnRef.current = now + (700 - 300 * progress) * (0.7 + Math.random() * 0.6);
            }

            if (changed) { itemsRef.current = kept; setItems(kept); }
            setAwake(awakeRef.current);
            setTimeLeft(Math.max(0, durationRef.current - elapsed));

            if (elapsed >= durationRef.current) finish(false);
        }, 50);
        return () => clearInterval(interval);
    }, [phase, addPop, finish]);

    const smack = (item: Item) => {
        if (phaseRef.current !== "playing") return;
        // Already smacked or expired: it can still be on screen while it animates out.
        if (!itemsRef.current.some((it) => it.id === item.id)) return;
        const k = KINDS[item.kind];
        itemsRef.current = itemsRef.current.filter((it) => it.id !== item.id);
        setItems(itemsRef.current);
        changeAwake(k.points);
        if (k.good) statsRef.current.smacked++;
        else statsRef.current.pillows++;
        addPop(item.spot, k.points > 0 ? `+${k.points}` : `${k.points}`, k.good);
        if (awakeRef.current >= 100) finish(true);
    };

    const best = readBest("wake-up-dash");
    const eyes = awake < 30 ? "😴" : awake < 60 ? "🥱" : awake < 90 ? "😐" : "😃";

    return (
        <GameShell title="Wake-up Dash" zmanim={zmanim} onExit={onExit}>
            <div className="absolute inset-0 flex flex-col items-center overflow-y-auto select-none"
                style={{ background: `linear-gradient(180deg, #1e1b4b 0%, #312e81 ${100 - awake}%, #f59e0b 140%)` }}>
                {/* meter and timer */}
                <div className="w-full max-w-md px-4 pt-4 pb-2">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="flex items-center gap-2 font-semibold">
                            <span className="text-2xl" aria-hidden>{eyes}</span> Awake
                        </span>
                        <span className={`font-clock font-bold ${timeLeft < 5 && phase === "playing" ? "text-red-300" : "text-white/80"}`}>
                            {timeLeft.toFixed(1)}s
                        </span>
                    </div>
                    <div className="h-4 rounded-full bg-white/10 overflow-hidden border border-white/10"
                        role="progressbar" aria-label="Awake meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(awake)}>
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-amber-300 to-yellow-200 transition-[width] duration-100"
                            style={{ width: `${awake}%` }} />
                    </div>
                </div>

                {/* the bed: a 3x3 grid of spots on the blanket */}
                <div className="flex-1 w-full flex items-center justify-center px-4 py-4">
                    <div className="w-full max-w-sm aspect-square rounded-[2rem] p-3 sm:p-4 bg-gradient-to-br from-sky-800/70 to-indigo-900/80 border border-white/10 shadow-2xl grid grid-cols-3 gap-3">
                        {Array.from({ length: SPOTS }, (_, spot) => {
                            const item = items.find((it) => it.spot === spot);
                            const pop = pops.filter((p) => p.spot === spot).at(-1);
                            return (
                                <div key={spot} className="relative rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                                    <AnimatePresence>
                                        {item && (
                                            <motion.button
                                                key={item.id}
                                                initial={{ scale: 0, y: 12 }}
                                                animate={{ scale: 1, y: 0 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                transition={{ duration: 0.12 }}
                                                onPointerDown={(e) => { e.preventDefault(); smack(item); }}
                                                className={`absolute inset-1 rounded-2xl flex flex-col items-center justify-center touch-none ${KINDS[item.kind].good
                                                    ? item.kind === "coffee" ? "bg-amber-500/25 border border-amber-300/40" : "bg-white/10 border border-white/15"
                                                    : "bg-rose-500/20 border border-rose-300/40"}`}
                                                aria-label={KINDS[item.kind].label}
                                            >
                                                <span className="text-4xl sm:text-5xl leading-none">{KINDS[item.kind].emoji}</span>
                                                <span className="text-[10px] sm:text-xs mt-1 font-semibold text-white/70">{KINDS[item.kind].label}</span>
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                    <AnimatePresence>
                                        {pop && (
                                            <motion.span
                                                key={pop.id}
                                                initial={{ opacity: 1, y: 0 }}
                                                animate={{ opacity: 0, y: -30 }}
                                                transition={{ duration: 0.7 }}
                                                className={`absolute top-1 pointer-events-none text-lg font-bold ${pop.good ? "text-emerald-300" : "text-rose-300"}`}
                                            >
                                                {pop.text}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <p className="pb-4 text-xs text-white/40 px-4 text-center">
                    Smack ⏰ 📱 💤 · grab ☕ · don&apos;t touch 🛌
                </p>
            </div>

            {phase === "intro" && (
                <GameMessage
                    emoji="😴"
                    title="Wake-up Dash"
                    actions={<>
                        <PrimaryButton onClick={start}>Wake up!</PrimaryButton>
                        <SecondaryButton onClick={onExit}>Back to the clock</SecondaryButton>
                    </>}
                >
                    <p>You&apos;re still in bed and Shachris is waiting. Fill the awake meter before time runs out.</p>
                    <p>Smack the snooze alarms, phones and Zzz&apos;s. Grab ☕ for a big boost. Don&apos;t touch 🛌 &quot;5 more minutes&quot; or you sink back down.</p>
                    <p className="text-amber-200/90">
                        {afterShkia
                            ? `Shkia already passed today, so this is a practice round with ${duration} seconds.`
                            : `The later it really is, the less time you get. Right now you have ${duration} seconds.`}
                    </p>
                    {best !== null && <p className="text-white/50">Your best: up with {best.toFixed(1)}s to spare</p>}
                </GameMessage>
            )}

            {phase === "won" && result && (
                <GameMessage
                    emoji="☀️"
                    title="You're up!"
                    actions={<>
                        <PrimaryButton onClick={start}>Play again</PrimaryButton>
                        <SecondaryButton onClick={onExit}>Back to the clock</SecondaryButton>
                    </>}
                >
                    <p>Out of bed with <span className="font-bold text-white">{result.secondsLeft.toFixed(1)} seconds</span> to spare.</p>
                    <p>{result.smacked} smacked · {result.pillows === 0 ? "never went back to bed" : `back to bed ${result.pillows}×`}</p>
                    {result.newBest ? <p className="text-amber-300 font-semibold">New personal best!</p>
                        : result.best !== null && <p className="text-white/50">Your best: {result.best.toFixed(1)}s</p>}
                    <p className="text-emerald-300 pt-1">{afterShkia ? "Tomorrow, get up this fast and daven Shachris early." : "Now go daven Shachris for real!"}</p>
                </GameMessage>
            )}

            {phase === "lost" && result && (
                <GameMessage
                    emoji="🛌"
                    title="You fell back asleep"
                    actions={<>
                        <PrimaryButton onClick={start}>Try again</PrimaryButton>
                        <SecondaryButton onClick={onExit}>Back to the clock</SecondaryButton>
                    </>}
                >
                    <p>Your awake meter only got to <span className="font-bold text-white">{Math.round(awake)}%</span>.</p>
                    <p>{result.smacked} smacked · back to bed {result.pillows}×</p>
                    <p className="text-emerald-300 pt-1">{afterShkia ? "Tomorrow, get up early and daven Shachris on time." : "In real life you're awake, so there's no excuse. Go daven Shachris!"}</p>
                </GameMessage>
            )}
        </GameShell>
    );
}
