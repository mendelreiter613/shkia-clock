"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coffee, Flame, Star, Sun, TriangleAlert } from "lucide-react";
import { ZmanimData } from "@/lib/zmanim";
import { gameSeconds, getGameClock, readBest, writeBest } from "@/lib/games";
import { GameShell } from "./GameShell";
import {
    BUBBLE_MESSAGES, UI_FONT, bubbleWidth, clamp01, drawBarrier, drawBubble, drawCity, drawClock, drawClouds,
    drawCoffee, drawGround, drawHills, drawPhone, drawRunner, drawRunnerShadow, drawShul, drawSky,
    drawStreetLayer, drawVignette, hash, lerp, paletteAt,
} from "./runnerArt";

// ---------------------------------------------------------------- tuning

const BASE_H = 360;            // logical height on a landscape screen
const MIN_W = 500;             // always show at least this much road...
const PORTRAIT_W = 430;        // ...except on a phone held upright, where we zoom in
const MAX_W = 1000;
const GROUND_PAD = 84;         // road below the ground line
const PLAYER_X_WIDE = 140;     // the runner stands further left on narrow screens
const PLAYER_X_NARROW = 84;

const SPEED_START = 330;       // px/s, ramps up over the run
const SPEED_END = 500;
const BOOST_MULT = 1.4;        // coffee: faster, and you smash through things
const BOOST_SECONDS = 2.6;

const GRAVITY = 2600;
const JUMP_V = 760;            // tap: about 110px high
const HOLD_GRAVITY = 0.45;     // holding the jump makes you float higher...
const HOLD_MAX = 0.24;         // ...for this long
const FAST_FALL_V = 1300;      // swipe down in the air
const SLIDE_SECONDS = 0.62;
const COYOTE = 0.09;           // still allowed to jump just after leaving the ground
const JUMP_BUFFER = 0.13;      // a press just before landing still counts

const STUMBLE_STALL = 0.45;
const STUMBLE_SUN_COST = 3;
const STREAK_EVERY = 5;        // clean dodges in a row...
const STREAK_BONUS = 1.5;      // ...give back this much sun

const SHUL_DISTANCE = 9500;
const MAX_SUN_SECONDS = 42;
const MIN_SUN_SECONDS = 30;

const STAND_H = 92;
const SLIDE_H = 34;
const HALF_W = 12;

// ---------------------------------------------------------------- world

type Kind = "phone" | "clock" | "barrier" | "bubble";

interface Obstacle {
    x: number; kind: Kind; w: number; bottom: number; top: number; text: string;
    passed: boolean;
    knocked: null | { t: number; dx: number; dy: number; vx: number; vy: number; spin: number };
}
interface Pickup { x: number; y: number; taken: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; text?: string; gravity: number }

interface World {
    distance: number; elapsed: number; budget: number; bonus: number;
    playerY: number; vy: number;
    holding: boolean; holdTime: number; coyote: number; jumpBuffer: number;
    sliding: number; slideQueued: boolean;
    boost: number; stumble: number; shake: number; flash: number; stretch: number;
    runPhase: number; dustTimer: number;
    obstacles: Obstacle[]; pickups: Pickup[]; particles: Particle[];
    nextObstacle: number; nextPickup: number;
    streak: number; bestStreak: number; stumbles: number; coffees: number;
}

type Phase = "intro" | "countdown" | "playing" | "won" | "lost";

interface Result {
    won: boolean; sunLeft: number; metersLeft: number; stumbles: number; coffees: number;
    bestStreak: number; stars: number; best: number | null; newBest: boolean;
}

function newWorld(budget: number): World {
    return {
        distance: 0, elapsed: 0, budget, bonus: 0,
        playerY: 0, vy: 0, holding: false, holdTime: 0, coyote: 0, jumpBuffer: 0,
        sliding: 0, slideQueued: false,
        boost: 0, stumble: 0, shake: 0, flash: 0, stretch: 0,
        runPhase: 0, dustTimer: 0,
        obstacles: [], pickups: [], particles: [],
        nextObstacle: 900, nextPickup: 1700,
        streak: 0, bestStreak: 0, stumbles: 0, coffees: 0,
    };
}

const sunLeftOf = (w: World) => Math.max(0, w.budget + w.bonus - w.elapsed);
const speedAt = (w: World) => lerp(SPEED_START, SPEED_END, clamp01(w.distance / SHUL_DISTANCE));

function makeObstacle(kind: Kind, x: number): Obstacle {
    const base = { x, kind, passed: false, knocked: null, text: "" };
    switch (kind) {
        case "phone": return { ...base, w: 30, bottom: 0, top: 50 };
        case "clock": return { ...base, w: 44, bottom: 0, top: 44 };
        case "barrier": return { ...base, w: 64, bottom: 0, top: 74 };
        case "bubble": {
            const text = BUBBLE_MESSAGES[Math.floor(Math.random() * BUBBLE_MESSAGES.length)];
            return { ...base, text, w: bubbleWidth(text), bottom: 52, top: 92 };
        }
    }
}

// Harder things show up as the run goes on.
function pickKind(p: number): Kind {
    const weights: [Kind, number][] = [
        ["phone", 1], ["clock", 1],
        ["barrier", p > 0.1 ? 0.8 : 0],
        ["bubble", p > 0.16 ? 1 : 0],
    ];
    const total = weights.reduce((a, [, wt]) => a + wt, 0);
    let r = Math.random() * total;
    for (const [k, wt] of weights) { r -= wt; if (r <= 0) return k; }
    return "phone";
}

function burst(w: World, x: number, y: number, n: number, color: string, speed: number, size: number, gravity = 900) {
    for (let i = 0; i < n && w.particles.length < 220; i++) {
        const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
        const life = 0.4 + Math.random() * 0.4;
        w.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life, max: life, size: size * (0.6 + Math.random() * 0.6), color, gravity });
    }
}

function floatText(w: World, x: number, y: number, text: string, color: string) {
    w.particles.push({ x, y, vx: 0, vy: -60, life: 1, max: 1, size: 0, color, text, gravity: 0 });
}

// ---------------------------------------------------------------- component

export default function RaceTheSun({ zmanim, onExit }: { zmanim: ZmanimData; onExit: () => void }) {
    const [phase, setPhase] = useState<Phase>("intro");
    const [count, setCount] = useState(3);
    const [result, setResult] = useState<Result | null>(null);
    const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
    const [budget, setBudget] = useState(() => gameSeconds(getGameClock(zmanim), MIN_SUN_SECONDS, MAX_SUN_SECONDS));
    const [afterShkia] = useState(() => getGameClock(zmanim).afterShkia);
    const [touch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);

    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const worldRef = useRef<World>(newWorld(budget));
    const phaseRef = useRef<Phase>("intro");
    const countRef = useRef(-1);
    const sizeRef = useRef({ W: MIN_W, V: BASE_H, G: BASE_H - GROUND_PAD, px: PLAYER_X_WIDE, scale: 1 });
    const pointerRef = useRef<{ id: number; y: number; swiped: boolean } | null>(null);

    // HUD nodes, written directly every frame
    const sunFillRef = useRef<HTMLDivElement>(null);
    const sunTextRef = useRef<HTMLSpanElement>(null);
    const progFillRef = useRef<HTMLDivElement>(null);
    const progDotRef = useRef<HTMLDivElement>(null);
    const streakRef = useRef<HTMLSpanElement>(null);
    const hudSunRef = useRef<HTMLDivElement>(null);

    // ---- controls

    const press = useCallback(() => {
        if (phaseRef.current !== "playing") return;
        const w = worldRef.current;
        w.jumpBuffer = JUMP_BUFFER;
        w.holding = true;
    }, []);

    const release = useCallback(() => {
        worldRef.current.holding = false;
    }, []);

    const slide = useCallback(() => {
        if (phaseRef.current !== "playing") return;
        const w = worldRef.current;
        w.holding = false;
        w.jumpBuffer = 0;
        if (w.playerY > 0 || w.vy < 0) {
            w.vy = Math.max(w.vy, FAST_FALL_V);
            w.slideQueued = true;
        } else {
            w.sliding = SLIDE_SECONDS;
        }
    }, []);

    const start = useCallback(() => {
        const b = gameSeconds(getGameClock(zmanim), MIN_SUN_SECONDS, MAX_SUN_SECONDS);
        setBudget(b);
        worldRef.current = newWorld(b);
        countRef.current = 3;
        setCount(3);
        setResult(null);
        setToast(null);
        phaseRef.current = "countdown";
        setPhase("countdown");
    }, [zmanim]);

    // ---- canvas sizing: fill the whole area, extra height becomes sky

    useEffect(() => {
        const wrap = wrapRef.current, canvas = canvasRef.current;
        if (!wrap || !canvas) return;
        const resize = () => {
            const cw = Math.max(1, wrap.clientWidth), ch = Math.max(1, wrap.clientHeight);
            let W = cw < ch ? PORTRAIT_W : Math.max(MIN_W, Math.min(MAX_W, (cw / ch) * BASE_H));
            let scale = cw / W;
            let V = ch / scale;
            if (V < BASE_H) { scale = ch / BASE_H; V = BASE_H; W = cw / scale; }
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            canvas.style.width = `${cw}px`;
            canvas.style.height = `${ch}px`;
            canvas.width = Math.round(cw * dpr);
            canvas.height = Math.round(ch * dpr);
            // keep the road up off the bottom edge on tall screens, clear of thumbs
            const G = V - Math.max(GROUND_PAD, V * 0.24);
            sizeRef.current = { W, V, G, px: W < 520 ? PLAYER_X_NARROW : PLAYER_X_WIDE, scale: scale * dpr };
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(wrap);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (phaseRef.current !== "playing") return;
            if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
                e.preventDefault();
                if (!e.repeat) press();
            } else if (e.code === "ArrowDown" || e.code === "KeyS") {
                e.preventDefault();
                if (!e.repeat) slide();
            }
        };
        const up = (e: KeyboardEvent) => {
            if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") release();
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
    }, [press, release, slide]);

    // ---- main loop

    useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let raf = 0;
        let last = performance.now();
        let toastId = 0;

        const finish = (won: boolean) => {
            const w = worldRef.current;
            const sunLeft = sunLeftOf(w);
            const prev = readBest("race-the-sun");
            const newBest = won && (prev === null || sunLeft > prev);
            if (newBest) writeBest("race-the-sun", Math.round(sunLeft * 10) / 10);
            const share = sunLeft / w.budget;
            phaseRef.current = won ? "won" : "lost";
            w.holding = false;
            setResult({
                won, sunLeft,
                metersLeft: Math.max(0, Math.round((SHUL_DISTANCE - w.distance) / 10)),
                stumbles: w.stumbles, coffees: w.coffees, bestStreak: w.bestStreak,
                stars: !won ? 0 : share >= 0.3 ? 3 : share >= 0.12 ? 2 : 1,
                best: newBest ? sunLeft : prev, newBest,
            });
            setPhase(won ? "won" : "lost");
        };

        const step = (dt: number) => {
            const w = worldRef.current;
            const { W, px: PLAYER_X } = sizeRef.current;
            w.elapsed += dt;
            w.boost = Math.max(0, w.boost - dt);
            w.stumble = Math.max(0, w.stumble - dt);
            w.shake = Math.max(0, w.shake - dt);
            w.flash = Math.max(0, w.flash - dt * 2.5);
            w.sliding = Math.max(0, w.sliding - dt);
            w.jumpBuffer = Math.max(0, w.jumpBuffer - dt);
            w.stretch *= Math.pow(0.0005, dt);

            const speed = w.stumble > 0 ? 0 : speedAt(w) * (w.boost > 0 ? BOOST_MULT : 1);
            w.distance += speed * dt;
            w.runPhase += dt * speed * 0.045;

            // jumping
            const grounded = w.playerY <= 0 && w.vy >= 0;
            w.coyote = grounded ? COYOTE : Math.max(0, w.coyote - dt);
            if (w.jumpBuffer > 0 && w.coyote > 0 && w.stumble === 0) {
                w.vy = -JUMP_V;
                w.playerY = Math.max(w.playerY, 0.01);
                w.holdTime = 0;
                w.jumpBuffer = 0;
                w.coyote = 0;
                w.sliding = 0;
                w.stretch = 0.18;
                burst(w, w.distance + PLAYER_X, 0, 6, "rgba(226,232,240,0.7)", 120, 4, 300);
            }
            if (w.playerY > 0 || w.vy < 0) {
                const floating = w.holding && w.vy < 0 && w.holdTime < HOLD_MAX;
                w.vy += GRAVITY * (floating ? HOLD_GRAVITY : 1) * dt;
                w.holdTime += dt;
                w.playerY -= w.vy * dt;
                if (w.playerY <= 0) {
                    w.playerY = 0;
                    w.stretch = -Math.min(0.28, w.vy / 4500);
                    w.vy = 0;
                    burst(w, w.distance + PLAYER_X, 0, 8, "rgba(226,232,240,0.75)", 150, 4, 300);
                    if (w.slideQueued) { w.sliding = SLIDE_SECONDS; w.slideQueued = false; }
                }
            }

            // running dust
            w.dustTimer -= dt;
            if (w.playerY === 0 && speed > 0 && w.dustTimer <= 0) {
                w.dustTimer = w.sliding > 0 ? 0.03 : 0.09;
                const n = w.sliding > 0 ? 3 : 1;
                for (let i = 0; i < n; i++) w.particles.push({
                    x: w.distance + PLAYER_X - 8, y: 2, vx: -40 - Math.random() * 60, vy: -30 - Math.random() * 50,
                    life: 0.45, max: 0.45, size: 3 + Math.random() * 4, color: "rgba(226,232,240,0.55)", gravity: 120,
                });
            }

            // spawn obstacles and coffee ahead of the screen
            const ahead = w.distance + W + 200;
            while (w.nextObstacle < ahead && w.nextObstacle < SHUL_DISTANCE - 700) {
                const p = w.nextObstacle / SHUL_DISTANCE;
                const kind = pickKind(p);
                w.obstacles.push(makeObstacle(kind, w.nextObstacle));
                let gap = lerp(560, 330, p) + Math.random() * lerp(280, 160, p);
                // later on: jump something, then slide right under a notification
                if (p > 0.4 && kind !== "bubble" && Math.random() < 0.32) {
                    w.obstacles.push(makeObstacle("bubble", w.nextObstacle + 380));
                    gap += 380 + 120;
                }
                w.nextObstacle += gap;
            }
            while (w.nextPickup < ahead && w.nextPickup < SHUL_DISTANCE - 700) {
                const x = w.nextPickup;
                const clash = w.obstacles.some((o) => x > o.x - 140 && x < o.x + o.w + 140);
                if (clash) { w.nextPickup += 80; continue; }
                w.pickups.push({ x, y: Math.random() < 0.55 ? 135 : 26, taken: false });
                w.nextPickup += 1700 + Math.random() * 1000;
            }

            // collisions
            const px = w.distance + PLAYER_X;
            const ph = w.sliding > 0 ? SLIDE_H : STAND_H;
            for (const o of w.obstacles) {
                if (o.knocked) {
                    const k = o.knocked;
                    k.t += dt;
                    k.vy += 1500 * dt;   // screen space: positive is down
                    k.dx += k.vx * dt;
                    k.dy += k.vy * dt;
                    continue;
                }
                const overlapX = px + HALF_W > o.x + 5 && px - HALF_W < o.x + o.w - 5;
                const overlapY = w.playerY < o.top - 4 && w.playerY + ph > o.bottom + 4;
                if (overlapX && overlapY) {
                    if (w.boost > 0) {
                        // coffee power: smash right through it
                        o.knocked = { t: 0, dx: 0, dy: 0, vx: 520, vy: -700, spin: 8 };
                        o.passed = true;
                        w.streak++;
                        w.bestStreak = Math.max(w.bestStreak, w.streak);
                        burst(w, o.x + o.w / 2, (o.top + o.bottom) / 2, 14, "#fde047", 380, 4);
                        w.shake = Math.max(w.shake, 0.12);
                    } else if (w.stumble === 0) {
                        o.knocked = { t: 0, dx: 0, dy: 0, vx: 260, vy: -520, spin: 6 };
                        o.passed = true;
                        w.stumble = STUMBLE_STALL;
                        w.elapsed += STUMBLE_SUN_COST;
                        w.stumbles++;
                        w.streak = 0;
                        w.sliding = 0;
                        w.shake = 0.35;
                        w.flash = 1;
                        burst(w, px + 10, 50, 16, "#f87171", 300, 4);
                        floatText(w, px, 120, `−${STUMBLE_SUN_COST}s`, "#fca5a5");
                    }
                } else if (!o.passed && o.x + o.w < px - HALF_W) {
                    o.passed = true;
                    w.streak++;
                    w.bestStreak = Math.max(w.bestStreak, w.streak);
                    if (w.streak % STREAK_EVERY === 0) {
                        w.bonus += STREAK_BONUS;
                        floatText(w, px, 130, `+${STREAK_BONUS}s`, "#fde047");
                        setToast({ id: ++toastId, text: `Streak ×${w.streak} · +${STREAK_BONUS}s of sun` });
                    }
                }
            }
            w.obstacles = w.obstacles.filter((o) => (o.knocked ? o.knocked.t < 1 : o.x + o.w > w.distance - 80));

            for (const c of w.pickups) {
                if (c.taken) continue;
                const near = Math.abs(px - c.x) < HALF_W + 16;
                const hit = w.playerY < c.y + 16 && w.playerY + ph > c.y - 16;
                if (near && hit) {
                    c.taken = true;
                    w.boost = BOOST_SECONDS;
                    w.coffees++;
                    burst(w, c.x, c.y, 18, "#fde047", 260, 3.5, 200);
                    floatText(w, px, 140, "COFFEE RUSH!", "#fde68a");
                }
            }
            w.pickups = w.pickups.filter((c) => !c.taken && c.x > w.distance - 60);

            for (const pt of w.particles) {
                pt.life -= dt;
                pt.vy += pt.gravity * dt;
                pt.x += pt.vx * dt;
                pt.y -= pt.vy * dt;   // y is height above ground
            }
            w.particles = w.particles.filter((pt) => pt.life > 0);

            if (w.distance >= SHUL_DISTANCE) finish(true);
            else if (sunLeftOf(w) <= 0) finish(false);
        };

        const draw = (t: number) => {
            const { W, V, G, px: PLAYER_X, scale } = sizeRef.current;
            const w = worldRef.current;
            const ph = phaseRef.current;
            ctx.setTransform(scale, 0, 0, scale, 0, 0);

            const sunLeft = sunLeftOf(w);
            const s = clamp01(sunLeft / MAX_SUN_SECONDS);
            const pal = paletteAt(s);
            const sunX = W * 0.7;
            const sunY = lerp(G - 30, G - Math.min(260, V * 0.62), s);

            if (w.shake > 0 && !reduceMotion) {
                const k = w.shake * 22;
                ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
            }

            drawSky(ctx, W, G, pal, s, sunX, sunY, t);
            drawClouds(ctx, W, G, pal, s, w.distance, t);
            drawHills(ctx, W, G, pal, w.distance);
            drawCity(ctx, W, G, pal, w.distance);
            drawStreetLayer(ctx, W, G, pal, w.distance);
            drawGround(ctx, W, V + 20, G, pal, w.distance, sunX, s);

            const shulX = SHUL_DISTANCE - w.distance + PLAYER_X - 105;
            if (shulX < W + 40) drawShul(ctx, shulX, G, pal, t);

            // pickups
            for (const c of w.pickups) {
                const sx = c.x - w.distance;
                if (sx > -40 && sx < W + 40) drawCoffee(ctx, sx, G - c.y, t);
            }

            // obstacles
            for (const o of w.obstacles) {
                const sx = o.x - w.distance;
                if (sx > W + 40 || sx + o.w < -60) continue;
                ctx.save();
                if (o.knocked) {
                    const k = o.knocked;
                    const cx = sx + o.w / 2, cy = G - (o.top + o.bottom) / 2;
                    ctx.globalAlpha = Math.max(0, 1 - k.t);
                    ctx.translate(cx + k.dx, cy + k.dy);
                    ctx.rotate(k.spin * k.t);
                    ctx.translate(-cx, -cy);
                }
                if (o.kind === "phone") drawPhone(ctx, sx, G, t);
                else if (o.kind === "clock") drawClock(ctx, sx, G, t);
                else if (o.kind === "barrier") drawBarrier(ctx, sx, G, t);
                else drawBubble(ctx, sx, G, o.bottom, o.top, o.w, o.text, t);
                ctx.restore();
            }

            // runner
            const playing = ph === "playing";
            if (w.boost > 0) {
                ctx.strokeStyle = "rgba(253,224,71,0.55)";
                ctx.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                    const ly = G - 20 - w.playerY - hash(i + Math.floor(t * 20)) * 70;
                    const lx = PLAYER_X - 30 - hash(i * 3 + Math.floor(t * 20)) * 60;
                    ctx.beginPath();
                    ctx.moveTo(lx, ly);
                    ctx.lineTo(lx - 40, ly);
                    ctx.stroke();
                }
            }
            drawRunnerShadow(ctx, PLAYER_X, G, w.playerY);
            drawRunner(ctx, PLAYER_X, G - w.playerY, {
                phase: w.runPhase,
                airborne: w.playerY > 0,
                sliding: w.sliding > 0,
                idle: !playing,
                boost: w.boost > 0,
                stumble: w.stumble > 0 ? 1 - w.stumble / STUMBLE_STALL : 0,
                stretch: w.stretch,
                t,
            });

            // particles
            for (const pt of w.particles) {
                const a = clamp01(pt.life / pt.max);
                const sx = pt.x - w.distance;
                if (pt.text) {
                    ctx.globalAlpha = a;
                    ctx.font = `800 18px ${UI_FONT}`;
                    ctx.textAlign = "center";
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = "rgba(0,0,0,0.5)";
                    ctx.strokeText(pt.text, sx, G - pt.y);
                    ctx.fillStyle = pt.color;
                    ctx.fillText(pt.text, sx, G - pt.y);
                    ctx.textAlign = "left";
                } else {
                    ctx.globalAlpha = a;
                    ctx.fillStyle = pt.color;
                    ctx.beginPath();
                    ctx.arc(sx, G - pt.y, pt.size * (0.5 + 0.5 * a), 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;

            drawVignette(ctx, W, V + 20, s);
            if (w.flash > 0) {
                ctx.fillStyle = `rgba(239,68,68,${w.flash * 0.28})`;
                ctx.fillRect(-20, -20, W + 40, V + 40);
            }

            // HUD
            if (sunFillRef.current) sunFillRef.current.style.width = `${clamp01(sunLeft / w.budget) * 100}%`;
            if (sunTextRef.current) sunTextRef.current.textContent = `${sunLeft.toFixed(1)}s`;
            if (hudSunRef.current) hudSunRef.current.dataset.low = sunLeft < 8 ? "1" : "0";
            const prog = clamp01(w.distance / SHUL_DISTANCE);
            if (progFillRef.current) progFillRef.current.style.width = `${prog * 100}%`;
            if (progDotRef.current) progDotRef.current.style.left = `${prog * 100}%`;
            if (streakRef.current) streakRef.current.textContent = `×${w.streak}`;
        };

        const loop = (now: number) => {
            const dt = Math.min(0.033, (now - last) / 1000);
            last = now;
            const ph = phaseRef.current;
            // 3, 2, 1, then "GO!" stays up for a moment once running starts
            if ((ph === "countdown" || ph === "playing") && countRef.current > -0.6) {
                countRef.current -= dt;
                const shown = countRef.current <= -0.6 ? -1 : Math.max(0, Math.ceil(countRef.current));
                setCount((c) => (c !== shown ? shown : c));
                if (ph === "countdown" && countRef.current <= 0) { phaseRef.current = "playing"; setPhase("playing"); }
            }
            if (phaseRef.current === "playing" && !document.hidden) step(dt);
            draw(now / 1000);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    // toasts fade on their own
    useEffect(() => {
        if (!toast) return;
        const id = setTimeout(() => setToast(null), 1600);
        return () => clearTimeout(id);
    }, [toast]);

    const best = readBest("race-the-sun");
    const showHud = phase === "countdown" || phase === "playing";

    return (
        <GameShell title="Race the Sun" zmanim={zmanim} onExit={onExit}>
            <div
                ref={wrapRef}
                className="absolute inset-0 overflow-hidden bg-slate-950 touch-none select-none"
                onPointerDown={(e) => {
                    if (phaseRef.current !== "playing") return;
                    e.preventDefault();
                    pointerRef.current = { id: e.pointerId, y: e.clientY, swiped: false };
                    press();
                }}
                onPointerMove={(e) => {
                    const p = pointerRef.current;
                    if (!p || p.id !== e.pointerId || p.swiped) return;
                    if (e.clientY - p.y > 28) { p.swiped = true; slide(); }
                }}
                onPointerUp={() => { pointerRef.current = null; release(); }}
                onPointerCancel={() => { pointerRef.current = null; release(); }}
            >
                <canvas ref={canvasRef} className="absolute inset-0 block" aria-label="Race the Sun game" />

                {/* HUD */}
                <div className={`pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4 flex items-start justify-between gap-3 transition-opacity duration-300 ${showHud ? "opacity-100" : "opacity-0"}`}>
                    <div className="flex flex-col gap-2">
                        <div ref={hudSunRef} className="group flex items-center gap-2.5 rounded-2xl bg-slate-950/45 backdrop-blur-md border border-white/15 pl-2.5 pr-3.5 py-2 shadow-lg data-[low=1]:border-rose-400/60 data-[low=1]:animate-pulse">
                            <div className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 shadow-[0_0_18px_rgba(251,191,36,0.6)]">
                                <Sun className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="w-24 sm:w-36 h-2 rounded-full bg-white/15 overflow-hidden">
                                    <div ref={sunFillRef} className="h-full rounded-full bg-gradient-to-r from-rose-500 via-orange-400 to-amber-200" style={{ width: "100%" }} />
                                </div>
                                <span className="text-[11px] font-semibold text-white/85 tracking-wide">
                                    <span ref={sunTextRef} className="font-clock text-white">{budget.toFixed(1)}s</span> of sun
                                </span>
                            </div>
                        </div>
                        <div className="self-start flex items-center gap-1.5 rounded-full bg-slate-950/45 backdrop-blur-md border border-white/15 px-2.5 py-1 text-xs font-bold text-orange-200">
                            <Flame className="w-3.5 h-3.5 text-orange-400" />
                            <span ref={streakRef}>×0</span>
                        </div>
                    </div>

                    <div className="flex-1 max-w-[17rem] rounded-2xl bg-slate-950/45 backdrop-blur-md border border-white/15 px-3.5 py-2.5 shadow-lg">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-white/60 mb-1.5">
                            <span>Home</span><span>Shul</span>
                        </div>
                        <div className="relative h-2 rounded-full bg-white/15">
                            <div ref={progFillRef} className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 to-emerald-300" style={{ width: "0%" }} />
                            <div ref={progDotRef} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" style={{ left: "0%" }} />
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {toast && (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: -10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="pointer-events-none absolute left-1/2 top-[24%] -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-extrabold text-slate-950 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 shadow-[0_0_30px_rgba(251,191,36,0.6)]"
                        >
                            🔥 {toast.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                {phase === "playing" && (
                    <p className="pointer-events-none absolute bottom-3 inset-x-0 text-center text-[11px] font-medium tracking-wide text-white/45">
                        {touch ? "Tap to jump · hold for higher · swipe down to slide" : "Space to jump · hold for higher · ↓ to slide"}
                    </p>
                )}

                {/* 3, 2, 1 */}
                <AnimatePresence>
                    {(phase === "countdown" || phase === "playing") && count >= 0 && (
                        <motion.div key={count} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="pointer-events-none absolute inset-0 grid place-items-center">
                            <span className="text-8xl font-black italic text-white drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]">
                                {count > 0 ? count : "GO!"}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {phase === "intro" && (
                    <Screen key="intro">
                        <Title>Race the Sun</Title>
                        <p className="mt-2 text-sm sm:text-base text-white/75">Get to shul and daven Shachris before shkia.</p>
                        <div className="mt-5 grid grid-cols-3 gap-2 text-left">
                            <Control k={touch ? "Tap" : "Space"} label="Jump" />
                            <Control k="Hold" label="Jump higher" />
                            <Control k={touch ? "Swipe ↓" : "↓"} label="Slide" />
                        </div>
                        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-white/70">
                            <Chip icon={<TriangleAlert className="w-3.5 h-3.5 text-rose-300" />}>Tripping costs {STUMBLE_SUN_COST}s of sun</Chip>
                            <Chip icon={<Coffee className="w-3.5 h-3.5 text-amber-300" />}>Coffee = smash through</Chip>
                            <Chip icon={<Flame className="w-3.5 h-3.5 text-orange-400" />}>{STREAK_EVERY} clean dodges = +{STREAK_BONUS}s</Chip>
                        </div>
                        <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm">
                            <div className="flex items-center justify-center gap-2 font-bold text-amber-200">
                                <Sun className="w-4 h-4" /> {budget} seconds of sun
                            </div>
                            <p className="mt-1 text-xs text-white/55">
                                {afterShkia ? "Shkia already passed today, so this is a practice round." : "The later it really is, the less sun you get."}
                            </p>
                        </div>
                        {best !== null && <p className="mt-3 text-xs text-white/50">Your best: {best.toFixed(1)}s of sun to spare</p>}
                        <div className="mt-6 flex flex-col gap-2">
                            <BigButton onClick={start}>Start running</BigButton>
                            <GhostButton onClick={onExit}>Back to the clock</GhostButton>
                        </div>
                    </Screen>
                )}

                {(phase === "won" || phase === "lost") && result && (
                    <Screen key="end">
                        {result.won ? (
                            <>
                                <div className="flex justify-center gap-2 mb-2">
                                    {[1, 2, 3].map((i) => (
                                        <motion.div key={i} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15 * i, type: "spring", stiffness: 300, damping: 14 }}>
                                            <Star className={`w-10 h-10 ${i <= result.stars ? "text-amber-300 fill-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]" : "text-white/20"}`} />
                                        </motion.div>
                                    ))}
                                </div>
                                <Title>Made it!</Title>
                                <p className="mt-2 text-sm text-white/75">
                                    You reached shul with <b className="text-white">{result.sunLeft.toFixed(1)}s</b> of sun to spare.
                                </p>
                            </>
                        ) : (
                            <>
                                <Title tone="red">Shkia!</Title>
                                <p className="mt-2 text-sm text-white/75">
                                    The sun set <b className="text-white">{result.metersLeft} m</b> before you reached shul.
                                </p>
                            </>
                        )}
                        <div className="mt-5 grid grid-cols-3 gap-2">
                            <Stat label="Best streak" value={`×${result.bestStreak}`} />
                            <Stat label="Stumbles" value={String(result.stumbles)} />
                            <Stat label="Coffee" value={String(result.coffees)} />
                        </div>
                        {result.newBest ? <p className="mt-3 text-sm font-bold text-amber-300">New personal best!</p>
                            : result.best !== null && <p className="mt-3 text-xs text-white/50">Your best: {result.best.toFixed(1)}s of sun to spare</p>}
                        <p className="mt-3 text-sm font-semibold text-emerald-300">
                            {afterShkia
                                ? "Now daven Shachris early tomorrow, and you won't have to race."
                                : result.won ? "Now go daven Shachris for real!" : "The real sun hasn't set yet. Go daven Shachris now!"}
                        </p>
                        <div className="mt-6 flex flex-col gap-2">
                            <BigButton onClick={start}>{result.won ? "Play again" : "Try again"}</BigButton>
                            <GhostButton onClick={onExit}>Back to the clock</GhostButton>
                        </div>
                    </Screen>
                )}
            </AnimatePresence>
        </GameShell>
    );
}

// ---------------------------------------------------------------- screen pieces

function Screen({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 grid place-items-center overflow-y-auto bg-gradient-to-b from-slate-950/40 via-slate-950/65 to-slate-950/85 backdrop-blur-[3px] p-4"
        >
            <motion.div
                initial={{ y: 24, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 24, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="w-full max-w-md text-center rounded-[28px] border border-white/15 bg-slate-900/70 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.55)] px-5 py-7 sm:px-8"
            >
                {children}
            </motion.div>
        </motion.div>
    );
}

function Title({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "red" }) {
    const grad = tone === "gold" ? "from-amber-200 via-orange-300 to-rose-400" : "from-rose-300 via-red-400 to-orange-400";
    return (
        <h3 className={`text-4xl sm:text-5xl font-black italic uppercase tracking-tight bg-gradient-to-r ${grad} bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(251,146,60,0.35)]`}>
            {children}
        </h3>
    );
}

function Control({ k, label }: { k: string; label: string }) {
    return (
        <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 text-center">
            <div className="inline-block rounded-md bg-white/15 border border-white/20 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]">{k}</div>
            <div className="mt-1 text-[11px] font-medium text-white/70">{label}</div>
        </div>
    );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1">{icon}{children}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-white/5 border border-white/10 py-2.5">
            <div className="text-lg font-extrabold text-white">{value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{label}</div>
        </div>
    );
}

function BigButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    return (
        <motion.button
            onClick={onClick}
            autoFocus
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-2xl py-3.5 text-lg font-black uppercase tracking-wide text-slate-950 bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 shadow-[0_10px_30px_rgba(251,146,60,0.45)]"
        >
            {children}
        </motion.button>
    );
}

function GhostButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    return (
        <button onClick={onClick} className="w-full rounded-2xl py-3 text-sm font-semibold text-white/75 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            {children}
        </button>
    );
}
