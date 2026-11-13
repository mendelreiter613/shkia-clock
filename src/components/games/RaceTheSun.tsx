"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZmanimData } from "@/lib/zmanim";
import { gameSeconds, getGameClock, readBest, writeBest } from "@/lib/games";
import { GameMessage, GameShell, PrimaryButton, SecondaryButton } from "./GameShell";

// Logical drawing space. Height is fixed; width follows the screen's shape
// within limits so a phone held upright still shows enough road ahead.
const H = 360;
const MIN_W = 560;
const MAX_W = 1000;
const GROUND_Y = H - 70;
const PLAYER_X = 110;
const EMOJI_FONT = `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;

const BASE_SPEED = 300;       // px per second
const BOOST_SPEED = 480;      // with coffee
const BOOST_SECONDS = 2.5;
const STUMBLE_SECONDS = 0.7;
const STUMBLE_SUN_COST = 2.5; // each stumble also drops the sun, so never jumping loses
const GRAVITY = 2300;
const JUMP_VELOCITY = -800;
const SHUL_DISTANCE = 7500;   // about 25 seconds at base speed
const MAX_SUN_SECONDS = 60;   // the most sun a round can start with
const MIN_SUN_SECONDS = 30;

const OBSTACLES = [
    { emoji: "📱", w: 30, h: 38, label: "phone" },
    { emoji: "📰", w: 38, h: 32, label: "newspaper" },
    { emoji: "🚧", w: 44, h: 40, label: "roadwork" },
    { emoji: "🐕", w: 50, h: 40, label: "dog" },
] as const;

interface Obstacle { x: number; kind: number }   // x in world distance
interface Coffee { x: number; high: boolean; taken: boolean }

interface World {
    distance: number;
    elapsed: number;
    budget: number;
    playerY: number;      // feet height above ground (0 = on the ground)
    vy: number;
    boost: number;        // seconds of boost left
    stumble: number;      // seconds of stumble left
    penaltyFlash: number; // seconds left to show the "-2.5s" note
    obstacles: Obstacle[];
    coffees: Coffee[];
    nextObstacle: number;
    nextCoffee: number;
    stumbles: number;
    coffeesTaken: number;
}

type Phase = "intro" | "playing" | "won" | "lost";

interface Result { sunLeft: number; metersLeft: number; stumbles: number; coffees: number; best: number | null; newBest: boolean }

function newWorld(budget: number): World {
    return {
        distance: 0, elapsed: 0, budget,
        playerY: 0, vy: 0, boost: 0, stumble: 0, penaltyFlash: 0,
        obstacles: [], coffees: [],
        nextObstacle: 700, nextCoffee: 1400,
        stumbles: 0, coffeesTaken: 0,
    };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mix(c1: [number, number, number], c2: [number, number, number], t: number) {
    return `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`;
}

// Sky colors from full day (1) down to the sun touching the horizon (0).
function skyColors(s: number): [string, string] {
    const day: [[number, number, number], [number, number, number]] = [[14, 165, 233], [186, 230, 253]];
    const golden: [[number, number, number], [number, number, number]] = [[29, 78, 216], [251, 191, 36]];
    const dusk: [[number, number, number], [number, number, number]] = [[30, 27, 75], [234, 88, 12]];
    if (s > 0.5) { const t = (s - 0.5) / 0.5; return [mix(golden[0], day[0], t), mix(golden[1], day[1], t)]; }
    const t = s / 0.5;
    return [mix(dusk[0], golden[0], t), mix(dusk[1], golden[1], t)];
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, footY: number, t: number, w: World) {
    const running = w.playerY === 0 && w.stumble === 0;
    const stride = running ? Math.sin(t * (w.boost > 0 ? 26 : 18)) : 0;
    const flash = w.stumble > 0 && Math.floor(t * 12) % 2 === 0;
    if (flash) ctx.globalAlpha = 0.45;

    ctx.lineCap = "round";
    // legs
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, footY - 30); ctx.lineTo(x + stride * 10, footY);
    ctx.moveTo(x, footY - 30); ctx.lineTo(x - stride * 10, footY);
    ctx.stroke();
    // body: white shirt, black jacket
    ctx.fillStyle = "#111827";
    ctx.fillRect(x - 10, footY - 62, 20, 34);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(x - 3, footY - 62, 6, 26);
    // arm holding the tallis bag
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + 6, footY - 56); ctx.lineTo(x + 16 - stride * 4, footY - 38);
    ctx.stroke();
    // tallis bag (blue velvet with a gold Magen David hint)
    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(x + 10 - stride * 4, footY - 40, 18, 16);
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(x + 17 - stride * 4, footY - 34, 4, 4);
    // head
    ctx.fillStyle = "#fcd9b6";
    ctx.beginPath(); ctx.arc(x + 1, footY - 72, 10, 0, Math.PI * 2); ctx.fill();
    // beard
    ctx.fillStyle = "#3f2a1d";
    ctx.beginPath(); ctx.arc(x + 3, footY - 66, 7, 0, Math.PI); ctx.fill();
    // hat: brim and crown
    ctx.fillStyle = "#0b0b0f";
    ctx.fillRect(x - 13, footY - 82, 28, 4);
    ctx.fillRect(x - 8, footY - 96, 18, 15);
    ctx.globalAlpha = 1;
}

function drawShul(ctx: CanvasRenderingContext2D, x: number) {
    const base = GROUND_Y;
    ctx.fillStyle = "#e7d8b5";
    ctx.fillRect(x, base - 150, 170, 150);
    // roof
    ctx.fillStyle = "#7c2d12";
    ctx.beginPath(); ctx.moveTo(x - 12, base - 150); ctx.lineTo(x + 85, base - 205); ctx.lineTo(x + 182, base - 150); ctx.closePath(); ctx.fill();
    // Magen David on the roof
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 3;
    const cx = x + 85, cy = base - 172, r = 13;
    for (const startAngle of [-Math.PI / 2, Math.PI / 2]) {   // one triangle up, one down
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = startAngle + (i * 2 * Math.PI) / 3;
            const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
    }
    // door and windows
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x + 66, base - 62, 38, 62);
    ctx.fillStyle = "#93c5fd";
    ctx.fillRect(x + 18, base - 120, 30, 40);
    ctx.fillRect(x + 122, base - 120, 30, 40);
    // sign
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + 50, base - 100, 70, 22);
    ctx.fillStyle = "#fde68a";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SHUL", x + 85, base - 84);
    ctx.textAlign = "left";
}

export default function RaceTheSun({ zmanim, onExit }: { zmanim: ZmanimData; onExit: () => void }) {
    const [phase, setPhase] = useState<Phase>("intro");
    const [result, setResult] = useState<Result | null>(null);
    const [budget, setBudget] = useState(() => gameSeconds(getGameClock(zmanim), MIN_SUN_SECONDS, MAX_SUN_SECONDS));
    const [afterShkia] = useState(() => getGameClock(zmanim).afterShkia);

    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const worldRef = useRef<World>(newWorld(budget));
    const phaseRef = useRef<Phase>("intro");
    const sizeRef = useRef({ w: MIN_W, scale: 1 });

    const jump = useCallback(() => {
        const w = worldRef.current;
        if (phaseRef.current !== "playing") return;
        if (w.playerY === 0 && w.stumble === 0) w.vy = JUMP_VELOCITY;
    }, []);

    const start = useCallback(() => {
        const b = gameSeconds(getGameClock(zmanim), MIN_SUN_SECONDS, MAX_SUN_SECONDS);
        setBudget(b);
        worldRef.current = newWorld(b);
        phaseRef.current = "playing";
        setPhase("playing");
        setResult(null);
    }, [zmanim]);

    // Size the canvas to the available space (letterboxed on tall screens).
    useEffect(() => {
        const wrap = wrapRef.current, canvas = canvasRef.current;
        if (!wrap || !canvas) return;
        const resize = () => {
            const cw = wrap.clientWidth, ch = wrap.clientHeight;
            const w = Math.max(MIN_W, Math.min(MAX_W, (cw / ch) * H));
            const scale = Math.min(cw / w, ch / H);
            const dpr = window.devicePixelRatio || 1;
            canvas.style.width = `${w * scale}px`;
            canvas.style.height = `${H * scale}px`;
            canvas.width = Math.round(w * scale * dpr);
            canvas.height = Math.round(H * scale * dpr);
            sizeRef.current = { w, scale: scale * dpr };
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(wrap);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Only while playing, so Space still presses the focused button on the cards.
            if (phaseRef.current !== "playing") return;
            if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
                e.preventDefault();
                jump();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [jump]);

    // Main loop: runs the whole time so the scene is drawn behind the intro
    // and end cards too; the world only advances while playing.
    useEffect(() => {
        let raf = 0;
        let last = performance.now();
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        const finish = (won: boolean) => {
            const w = worldRef.current;
            const sunLeft = Math.max(0, w.budget - w.elapsed);
            const prev = readBest("race-the-sun");
            const newBest = won && (prev === null || sunLeft > prev);
            if (newBest) writeBest("race-the-sun", Math.round(sunLeft * 10) / 10);
            phaseRef.current = won ? "won" : "lost";
            setResult({
                sunLeft,
                metersLeft: Math.max(0, Math.round((SHUL_DISTANCE - w.distance) / 10)),
                stumbles: w.stumbles,
                coffees: w.coffeesTaken,
                best: newBest ? sunLeft : prev,
                newBest,
            });
            setPhase(won ? "won" : "lost");
        };

        const step = (dt: number) => {
            const w = worldRef.current;
            w.elapsed += dt;
            w.boost = Math.max(0, w.boost - dt);
            w.stumble = Math.max(0, w.stumble - dt);
            w.penaltyFlash = Math.max(0, w.penaltyFlash - dt);

            const speed = w.stumble > 0 ? 0 : w.boost > 0 ? BOOST_SPEED : BASE_SPEED;
            w.distance += speed * dt;

            // jump physics (playerY is height above ground, so up is positive)
            if (w.playerY > 0 || w.vy < 0) {
                w.vy += GRAVITY * dt;
                w.playerY -= w.vy * dt;
                if (w.playerY <= 0) { w.playerY = 0; w.vy = 0; }
            }

            // spawn ahead of the screen, never right in front of the shul
            const ahead = w.distance + sizeRef.current.w + 100;
            while (w.nextObstacle < ahead && w.nextObstacle < SHUL_DISTANCE - 500) {
                w.obstacles.push({ x: w.nextObstacle, kind: Math.floor(Math.random() * OBSTACLES.length) });
                w.nextObstacle += 340 + Math.random() * 380;
            }
            while (w.nextCoffee < ahead && w.nextCoffee < SHUL_DISTANCE - 500) {
                // keep coffee clear of obstacles so grabbing it is never a trap
                const clash = w.obstacles.some((o) => Math.abs(o.x - w.nextCoffee) < 110);
                if (!clash) w.coffees.push({ x: w.nextCoffee, high: Math.random() < 0.5, taken: false });
                w.nextCoffee += clash ? 90 : 1500 + Math.random() * 900;
            }

            // collisions, in world coordinates: the player stands at distance + PLAYER_X
            const px = w.distance + PLAYER_X;
            for (let i = w.obstacles.length - 1; i >= 0; i--) {
                const o = w.obstacles[i];
                const def = OBSTACLES[o.kind];
                const overlapX = px + 10 > o.x + 6 && px - 10 < o.x + def.w - 6;
                if (overlapX && w.playerY < def.h - 8 && w.stumble === 0) {
                    w.stumble = STUMBLE_SECONDS;
                    w.elapsed += STUMBLE_SUN_COST;
                    w.penaltyFlash = 1;
                    w.boost = 0;
                    w.stumbles++;
                    w.obstacles.splice(i, 1);
                } else if (o.x + def.w < w.distance - 50) {
                    w.obstacles.splice(i, 1);
                }
            }
            for (const c of w.coffees) {
                if (c.taken) continue;
                const cy = c.high ? 134 : 18;   // height of the cup's middle above ground; high ones need a jump
                const near = Math.abs(px - (c.x + 14)) < 26;
                const hit = c.high ? w.playerY + 90 > cy - 12 && w.playerY + 10 < cy + 12 : w.playerY < 30;
                if (near && hit) { c.taken = true; w.boost = BOOST_SECONDS; w.coffeesTaken++; }
            }
            w.coffees = w.coffees.filter((c) => c.x > w.distance - 60);

            if (w.distance >= SHUL_DISTANCE - PLAYER_X + 70) finish(true);
            else if (w.elapsed >= w.budget) finish(false);
        };

        const draw = (t: number) => {
            const { w: W, scale } = sizeRef.current;
            const w = worldRef.current;
            ctx.setTransform(scale, 0, 0, scale, 0, 0);

            const sunLeft = Math.max(0, w.budget - w.elapsed);
            const s = sunLeft / MAX_SUN_SECONDS;     // 0..1 sun height
            const [top, bottom] = skyColors(s);
            const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
            sky.addColorStop(0, top); sky.addColorStop(1, bottom);
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, W, H);

            // sun sinks toward the horizon as the round's sun-time runs out
            const sunX = W * 0.72;
            const sunY = lerp(GROUND_Y - 30, 50, s);
            const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 70);
            glow.addColorStop(0, s < 0.3 ? "rgba(249,115,22,0.9)" : "rgba(253,224,71,0.9)");
            glow.addColorStop(1, "rgba(253,224,71,0)");
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(sunX, sunY, 70, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = s < 0.3 ? "#fdba74" : "#fef9c3";
            ctx.beginPath(); ctx.arc(sunX, sunY, 24, 0, Math.PI * 2); ctx.fill();

            // far houses (slow parallax), drawn in front of the sun so it sets behind them
            ctx.fillStyle = "rgba(15,23,42,0.55)";
            const farOff = (w.distance * 0.2) % 160;
            const firstHouse = Math.floor((w.distance * 0.2) / 160);
            for (let i = -1; i < W / 160 + 2; i++) {
                const hx = i * 160 - farOff;
                const hh = 50 + (Math.abs((firstHouse + i) * 7919) % 5) * 12;   // steady per-house height
                ctx.fillRect(hx, GROUND_Y - hh, 120, hh);
                ctx.beginPath(); ctx.moveTo(hx - 6, GROUND_Y - hh); ctx.lineTo(hx + 60, GROUND_Y - hh - 30); ctx.lineTo(hx + 126, GROUND_Y - hh); ctx.fill();
            }

            // ground and sidewalk
            ctx.fillStyle = "#334155";
            ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
            ctx.fillStyle = "#64748b";
            ctx.fillRect(0, GROUND_Y, W, 8);
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            const tileOff = w.distance % 60;
            for (let x = -tileOff; x < W; x += 60) ctx.fillRect(x, GROUND_Y + 8, 2, 30);

            // shul at the finish
            const shulScreenX = SHUL_DISTANCE - w.distance;
            if (shulScreenX < W + 40) drawShul(ctx, shulScreenX);

            // obstacles and coffee. Emoji fonts go first: system-ui on Windows
            // falls back to a single-color symbol font, which would draw them gray.
            ctx.textBaseline = "bottom";
            ctx.fillStyle = "#000";
            for (const o of w.obstacles) {
                const def = OBSTACLES[o.kind];
                ctx.font = `${def.h}px ${EMOJI_FONT}`;
                ctx.fillText(def.emoji, o.x - w.distance, GROUND_Y + 4);
            }
            ctx.font = `28px ${EMOJI_FONT}`;
            for (const c of w.coffees) {
                if (c.taken) continue;
                const bob = Math.sin(t * 4 + c.x) * 3;
                ctx.fillText("☕", c.x - w.distance, GROUND_Y - (c.high ? 120 : 4) + bob);
            }
            ctx.textBaseline = "alphabetic";

            drawPlayer(ctx, PLAYER_X, GROUND_Y - w.playerY, t, w);
            if (w.boost > 0) {
                ctx.fillStyle = "rgba(253,224,71,0.8)";
                for (let i = 0; i < 3; i++) ctx.fillRect(PLAYER_X - 30 - i * 12, GROUND_Y - w.playerY - 50 + i * 12, 16, 3);
            }

            // HUD: sun-time left and progress to shul
            if (phaseRef.current === "playing" || phaseRef.current === "won" || phaseRef.current === "lost") {
                ctx.fillStyle = "rgba(2,6,23,0.55)";
                ctx.fillRect(12, 12, 170, 30);
                ctx.fillStyle = sunLeft < 8 ? "#fca5a5" : "#fef3c7";
                ctx.font = "bold 16px ui-monospace, Menlo, monospace";
                ctx.fillText(`☀ ${sunLeft.toFixed(1)}s of sun`, 22, 33);
                if (w.penaltyFlash > 0) {
                    ctx.globalAlpha = w.penaltyFlash;
                    ctx.fillStyle = "#f87171";
                    ctx.fillText(`−${STUMBLE_SUN_COST}s`, 190, 33 + (1 - w.penaltyFlash) * 14);
                    ctx.globalAlpha = 1;
                }

                const barW = Math.min(260, W - 220);
                const bx = W - barW - 16;
                ctx.fillStyle = "rgba(2,6,23,0.55)";
                ctx.fillRect(bx - 8, 12, barW + 16, 30);
                ctx.fillStyle = "rgba(255,255,255,0.2)";
                ctx.fillRect(bx, 24, barW, 6);
                const prog = Math.min(1, w.distance / (SHUL_DISTANCE - PLAYER_X + 70));
                ctx.fillStyle = "#fbbf24";
                ctx.fillRect(bx, 24, barW * prog, 6);
                ctx.font = `14px ${EMOJI_FONT}`;
                ctx.fillText("🏃", bx + barW * prog - 8, 22);
                ctx.fillText("🏛️", bx + barW - 6, 22);
            }
        };

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (phaseRef.current === "playing") step(dt);
            draw(now / 1000);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const best = readBest("race-the-sun");

    return (
        <GameShell title="Race the Sun" zmanim={zmanim} onExit={onExit}>
            <div
                ref={wrapRef}
                className="absolute inset-0 flex items-center justify-center bg-slate-900 touch-none select-none"
                onPointerDown={(e) => { if (phase === "playing") { e.preventDefault(); jump(); } }}
            >
                <canvas ref={canvasRef} className="block" aria-label="Race the Sun game" />
                {phase === "playing" && (
                    <p className="absolute bottom-4 inset-x-0 text-center text-xs text-white/40 pointer-events-none">
                        Tap anywhere or press Space to jump
                    </p>
                )}
            </div>

            {phase === "intro" && (
                <GameMessage
                    emoji="🏃‍♂️"
                    title="Race the Sun"
                    actions={<>
                        <PrimaryButton onClick={start}>Start running</PrimaryButton>
                        <SecondaryButton onClick={onExit}>Back to the clock</SecondaryButton>
                    </>}
                >
                    <p>Get to shul and daven Shachris before the sun goes down.</p>
                    <p>Jump over phones, newspapers and other distractions. Tripping costs sun. Grab ☕ to run faster.</p>
                    <p className="text-amber-200/90">
                        {afterShkia
                            ? `Shkia already passed today, so this is a practice round with ${budget} seconds of sun.`
                            : `The later it really is, the less sun you get. Right now you have ${budget} seconds.`}
                    </p>
                    {best !== null && <p className="text-white/50">Your best: {best.toFixed(1)}s of sun to spare</p>}
                </GameMessage>
            )}

            {phase === "won" && result && (
                <GameMessage
                    emoji="🙌"
                    title="You made it to shul!"
                    actions={<>
                        <PrimaryButton onClick={start}>Play again</PrimaryButton>
                        <SecondaryButton onClick={onExit}>Back to the clock</SecondaryButton>
                    </>}
                >
                    <p>You got there with <span className="font-bold text-white">{result.sunLeft.toFixed(1)} seconds</span> of sun to spare.</p>
                    <p>{result.stumbles === 0 ? "No stumbles!" : `${result.stumbles} stumble${result.stumbles === 1 ? "" : "s"}`} · {result.coffees} ☕</p>
                    {result.newBest ? <p className="text-amber-300 font-semibold">New personal best!</p>
                        : result.best !== null && <p className="text-white/50">Your best: {result.best.toFixed(1)}s</p>}
                    <p className="text-emerald-300 pt-1">{afterShkia ? "Now get ready to daven Shachris on time tomorrow." : "Now go daven Shachris for real!"}</p>
                </GameMessage>
            )}

            {phase === "lost" && result && (
                <GameMessage
                    emoji="🌇"
                    title="The sun set first"
                    actions={<>
                        <PrimaryButton onClick={start}>Try again</PrimaryButton>
                        <SecondaryButton onClick={onExit}>Back to the clock</SecondaryButton>
                    </>}
                >
                    <p>You were <span className="font-bold text-white">{result.metersLeft} meters</span> from shul.</p>
                    <p>{result.stumbles} stumble{result.stumbles === 1 ? "" : "s"} · {result.coffees} ☕</p>
                    <p className="text-emerald-300 pt-1">{afterShkia ? "Tomorrow, daven Shachris early and you won't have to race." : "The real sun hasn't set yet. Go daven Shachris now!"}</p>
                </GameMessage>
            )}
        </GameShell>
    );
}
