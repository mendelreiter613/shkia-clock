// Drawing for Race the Sun. Everything is vector art drawn on a 2D canvas:
// a sky that follows the sun down, parallax hills, skyline and street, the
// runner, the obstacles and the shul. Coordinates are in logical pixels with
// the ground line at `G`; "height" values are measured up from the ground.

export type RGB = [number, number, number];

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// Stable pseudo-random value in [0, 1) for an integer, so scenery is the same every frame.
export const hash = (i: number) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
};

export const UI_FONT = `Inter, "Segoe UI", system-ui, sans-serif`;

// ---------------------------------------------------------------- palette

export interface Palette {
    top: RGB; mid: RGB; bottom: RGB; sun: RGB;
    farHill: RGB; nearHill: RGB; city: RGB; street: RGB;
    lights: number;   // 0 in daylight, 1 once the street lights are fully on
}

const KEYS: { s: number; top: RGB; mid: RGB; bottom: RGB; sun: RGB }[] = [
    { s: 0, top: [16, 9, 42], mid: [88, 28, 86], bottom: [222, 74, 58], sun: [255, 110, 64] },
    { s: 0.3, top: [42, 36, 112], mid: [158, 72, 128], bottom: [255, 142, 66], sun: [255, 168, 88] },
    { s: 0.6, top: [34, 88, 196], mid: [104, 150, 232], bottom: [255, 212, 140], sun: [255, 232, 168] },
    { s: 1, top: [22, 104, 214], mid: [86, 168, 246], bottom: [176, 224, 255], sun: [255, 250, 226] },
];

// s: 1 = the sun high in the sky, 0 = touching the horizon.
export function paletteAt(s: number): Palette {
    s = clamp01(s);
    let i = 0;
    while (i < KEYS.length - 2 && s > KEYS[i + 1].s) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = (s - a.s) / (b.s - a.s);
    const top = mixRGB(a.top, b.top, t), mid = mixRGB(a.mid, b.mid, t), bottom = mixRGB(a.bottom, b.bottom, t);
    const night: RGB = [14, 16, 36];
    return {
        top, mid, bottom, sun: mixRGB(a.sun, b.sun, t),
        farHill: mixRGB(bottom, night, 0.38),
        nearHill: mixRGB(mid, night, 0.6),
        // hazy blue-gray in daylight, near-black silhouettes at dusk
        city: mixRGB(mixRGB(mid, top, 0.4), night, lerp(0.86, 0.42, s)),
        street: mixRGB(mixRGB(mid, top, 0.5), [6, 8, 20], lerp(0.9, 0.62, s)),
        lights: clamp01((0.55 - s) / 0.4),
    };
}

// ---------------------------------------------------------------- scenery

export function drawSky(ctx: CanvasRenderingContext2D, W: number, G: number, pal: Palette, s: number, sunX: number, sunY: number, t: number) {
    const sky = ctx.createLinearGradient(0, 0, 0, G);
    sky.addColorStop(0, rgba(pal.top));
    sky.addColorStop(0.55, rgba(pal.mid));
    sky.addColorStop(1, rgba(pal.bottom));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, G + 2);

    // stars come out as it gets late
    const starA = clamp01((0.28 - s) / 0.25);
    if (starA > 0) {
        for (let i = 0; i < 60; i++) {
            const x = hash(i) * W, y = hash(i + 99) * G * 0.55;
            const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
            ctx.fillStyle = `rgba(255,255,255,${starA * (0.3 + 0.5 * tw)})`;
            ctx.fillRect(x, y, 1.6, 1.6);
        }
    }

    // big soft bloom around the sun
    const bloom = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 320);
    bloom.addColorStop(0, rgba(pal.sun, 0.55));
    bloom.addColorStop(0.35, rgba(pal.sun, 0.16));
    bloom.addColorStop(1, rgba(pal.sun, 0));
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, W, G);

    // slow light rays
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(t * 0.04);
    ctx.fillStyle = rgba(pal.sun, 0.05 + 0.04 * s);
    for (let i = 0; i < 12; i++) {
        ctx.rotate((Math.PI * 2) / 12);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(900, -38);
        ctx.lineTo(900, 38);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    // the sun itself
    const r = 30;
    const disc = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, r);
    disc.addColorStop(0, "rgba(255,255,255,1)");
    disc.addColorStop(0.55, rgba(mixRGB(pal.sun, [255, 255, 255], 0.5)));
    disc.addColorStop(1, rgba(pal.sun));
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(sunX, sunY, r, 0, Math.PI * 2);
    ctx.fill();
}

export function drawClouds(ctx: CanvasRenderingContext2D, W: number, G: number, pal: Palette, s: number, scroll: number, t: number) {
    // Flat, soft-edged clouds: a rounded base with a few puffs on top,
    // tinted by the sky so they turn pink and orange toward shkia.
    const tile = Math.max(W + 400, 1400);
    const color = mixRGB([255, 255, 255], pal.bottom, 0.5 - s * 0.35);
    const shade = mixRGB(color, pal.mid, 0.45);
    for (let i = 0; i < 6; i++) {
        const speed = 0.04 + hash(i + 7) * 0.05;
        let x = (hash(i) * tile - scroll * speed - t * (5 + i)) % tile;
        if (x < -320) x += tile;
        const y = 40 + hash(i + 3) * G * 0.38;
        const sc = 0.55 + hash(i + 5) * 0.75;
        const bw = 150 * sc, bh = 26 * sc;
        ctx.globalAlpha = 0.55 + 0.3 * s;
        ctx.fillStyle = rgba(color);
        ctx.beginPath();
        ctx.roundRect(x - bw / 2, y - bh, bw, bh, bh / 2);
        const puffs = 3 + Math.floor(hash(i + 11) * 2);
        for (let b = 0; b < puffs; b++) {
            const px = x - bw / 2 + bw * ((b + 0.7) / (puffs + 0.4));
            const pr = (18 + hash(i * 9 + b) * 16) * sc;
            ctx.moveTo(px + pr, y - bh * 0.6);
            ctx.arc(px, y - bh * 0.6, pr, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.fillStyle = rgba(shade, 0.5);
        ctx.beginPath();
        ctx.roundRect(x - bw / 2 + 6, y - bh * 0.45, bw - 12, bh * 0.45, bh * 0.22);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function ridge(ctx: CanvasRenderingContext2D, W: number, G: number, offset: number, base: number, amp: number, freq: number, seed: number) {
    ctx.beginPath();
    ctx.moveTo(0, G);
    for (let x = 0; x <= W + 8; x += 8) {
        const wx = x + offset;
        const n = 0.5 * Math.sin(wx * freq + seed) + 0.3 * Math.sin(wx * freq * 2.3 + seed * 2) + 0.2 * Math.sin(wx * freq * 5.1 + seed * 3);
        ctx.lineTo(x, G - base - amp * (n + 1) * 0.5);
    }
    ctx.lineTo(W, G);
    ctx.closePath();
    ctx.fill();
}

export function drawHills(ctx: CanvasRenderingContext2D, W: number, G: number, pal: Palette, scroll: number) {
    ctx.fillStyle = rgba(pal.farHill, 0.9);
    ridge(ctx, W, G, scroll * 0.06, 50, 110, 0.006, 1.3);
    ctx.fillStyle = rgba(pal.nearHill, 0.95);
    ridge(ctx, W, G, scroll * 0.12, 25, 80, 0.009, 4.1);

    // haze where the hills meet the city
    const haze = ctx.createLinearGradient(0, G - 120, 0, G);
    haze.addColorStop(0, rgba(pal.bottom, 0));
    haze.addColorStop(1, rgba(pal.bottom, 0.35));
    ctx.fillStyle = haze;
    ctx.fillRect(0, G - 120, W, 120);
}

export function drawCity(ctx: CanvasRenderingContext2D, W: number, G: number, pal: Palette, scroll: number) {
    const slot = 74;
    const off = scroll * 0.3;
    const first = Math.floor(off / slot);
    for (let i = first - 1; i < first + W / slot + 2; i++) {
        const x = i * slot - off;
        const h = 46 + hash(i) * 96;
        const bw = 50 + hash(i + 0.5) * 20;
        const top = G - h;
        const g = ctx.createLinearGradient(0, top, 0, G);
        g.addColorStop(0, rgba(mixRGB(pal.city, pal.mid, 0.18)));
        g.addColorStop(1, rgba(pal.city));
        ctx.fillStyle = g;
        ctx.fillRect(x, top, bw, h);
        // rooftop details
        if (hash(i + 2) > 0.6) ctx.fillRect(x + bw * 0.6, top - 14, 3, 14);
        if (hash(i + 4) > 0.75) ctx.fillRect(x + 8, top - 8, 14, 8);
        // lit windows once it gets late
        if (pal.lights > 0) {
            const cols = Math.floor((bw - 8) / 10), rows = Math.floor((h - 12) / 14);
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                if (hash(i * 31 + r * 7 + c * 3) < 0.55) continue;
                ctx.fillStyle = `rgba(255,${200 + ((hash(i + r + c) * 40) | 0)},120,${0.85 * pal.lights})`;
                ctx.fillRect(x + 6 + c * 10, top + 8 + r * 14, 5, 7);
            }
        }
    }
}

export function drawStreetLayer(ctx: CanvasRenderingContext2D, W: number, G: number, pal: Palette, scroll: number) {
    const slot = 190;
    const off = scroll * 0.62;
    const first = Math.floor(off / slot);
    const dark = rgba(mixRGB(pal.street, pal.city, 0.4));
    for (let i = first - 1; i < first + W / slot + 2; i++) {
        const x = i * slot - off + hash(i) * 50;
        if (i % 2 === 0) {
            // tree
            ctx.fillStyle = dark;
            ctx.fillRect(x - 3, G - 46, 6, 46);
            for (let b = 0; b < 4; b++) {
                ctx.beginPath();
                ctx.arc(x + (b - 1.5) * 12, G - 58 - Math.sin((b / 3) * Math.PI) * 14, 17, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // street lamp, glowing once the lights come on
            ctx.fillStyle = dark;
            ctx.fillRect(x - 2, G - 92, 4, 92);
            ctx.fillRect(x - 2, G - 92, 18, 4);
            if (pal.lights > 0) {
                const glow = ctx.createRadialGradient(x + 15, G - 86, 1, x + 15, G - 86, 70);
                glow.addColorStop(0, `rgba(255,214,140,${0.75 * pal.lights})`);
                glow.addColorStop(1, "rgba(255,214,140,0)");
                ctx.fillStyle = glow;
                ctx.fillRect(x - 60, G - 160, 150, 160);
            }
            ctx.fillStyle = pal.lights > 0 ? `rgba(255,236,190,${0.4 + 0.6 * pal.lights})` : dark;
            ctx.fillRect(x + 10, G - 88, 10, 4);
        }
    }
}

export function drawGround(ctx: CanvasRenderingContext2D, W: number, V: number, G: number, pal: Palette, scroll: number, sunX: number, s: number) {
    // sidewalk
    const walk = ctx.createLinearGradient(0, G, 0, G + 16);
    walk.addColorStop(0, rgba(mixRGB(pal.street, [120, 130, 160], 0.45)));
    walk.addColorStop(1, rgba(mixRGB(pal.street, [70, 80, 110], 0.35)));
    ctx.fillStyle = walk;
    ctx.fillRect(0, G, W, 16);
    // rim light along the edge, colored by the sky
    ctx.fillStyle = rgba(mixRGB(pal.bottom, [255, 255, 255], 0.35), 0.75);
    ctx.fillRect(0, G, W, 2);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    const tile = 46, tOff = scroll % tile;
    for (let x = -tOff; x < W; x += tile) ctx.fillRect(x, G + 2, 2, 14);

    // road
    const road = ctx.createLinearGradient(0, G + 16, 0, V);
    road.addColorStop(0, rgba(mixRGB(pal.street, [40, 44, 66], 0.5)));
    road.addColorStop(1, rgba(pal.street));
    ctx.fillStyle = road;
    ctx.fillRect(0, G + 16, W, V - G - 16);

    // the sun reflected on the road
    const refl = ctx.createRadialGradient(sunX, G + 30, 4, sunX, G + 30, 200);
    refl.addColorStop(0, rgba(pal.sun, 0.18 + 0.12 * (1 - s)));
    refl.addColorStop(1, rgba(pal.sun, 0));
    ctx.fillStyle = refl;
    ctx.fillRect(sunX - 200, G + 16, 400, V - G - 16);

    // lane dashes
    const laneY = G + 16 + (V - G - 16) * 0.5;
    ctx.fillStyle = "rgba(255,236,180,0.35)";
    const dash = 90, dOff = scroll % dash;
    for (let x = -dOff; x < W; x += dash) ctx.fillRect(x, laneY, 44, 3);
}

export function drawVignette(ctx: CanvasRenderingContext2D, W: number, V: number, s: number) {
    const v = ctx.createRadialGradient(W / 2, V * 0.45, Math.min(W, V) * 0.35, W / 2, V * 0.5, Math.max(W, V) * 0.8);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, V);
    const late = clamp01((0.2 - s) / 0.2);
    if (late > 0) {
        ctx.fillStyle = `rgba(190,20,40,${late * 0.18})`;
        ctx.fillRect(0, 0, W, V);
    }
}

// ---------------------------------------------------------------- the runner

export interface RunnerPose {
    phase: number;       // running cycle angle
    airborne: boolean;
    sliding: boolean;
    idle: boolean;
    boost: boolean;
    stumble: number;     // 0..1, how far into a stumble
    stretch: number;     // squash (negative) / stretch (positive)
    t: number;
}

const LEG = 21;

function limb(ctx: CanvasRenderingContext2D, hx: number, hy: number, a1: number, a2: number, len1: number, len2: number, width: number, color: string) {
    const kx = hx + Math.sin(a1) * len1, ky = hy + Math.cos(a1) * len1;
    const fx = kx + Math.sin(a2) * len2, fy = ky + Math.cos(a2) * len2;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(kx, ky);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    return { fx, fy, a2 };
}

function legAngles(p: RunnerPose, i: number): [number, number] {
    if (p.sliding) return [1.35, 1.45];
    if (p.idle) return i === 0 ? [0.08, 0] : [-0.06, -0.1];
    if (p.airborne) return i === 0 ? [1.0, -0.05] : [-0.35, -1.25];
    const a = p.phase + i * Math.PI;
    const thigh = Math.sin(a) * 0.95;
    const bend = 0.2 + Math.max(0, Math.cos(a)) * 1.35;
    return [thigh, thigh - bend];
}

export function drawRunnerShadow(ctx: CanvasRenderingContext2D, x: number, G: number, height: number) {
    const k = Math.max(0.35, 1 - height / 220);
    ctx.fillStyle = `rgba(0,0,0,${0.35 * k})`;
    ctx.beginPath();
    ctx.ellipse(x, G + 3, 24 * k, 5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
}

export function drawRunner(ctx: CanvasRenderingContext2D, x: number, footY: number, p: RunnerPose) {
    ctx.save();
    ctx.translate(x, footY);

    if (p.boost) {
        const pulse = 0.85 + 0.15 * Math.sin(p.t * 18);
        const aura = ctx.createRadialGradient(0, -46, 6, 0, -46, 78 * pulse);
        aura.addColorStop(0, "rgba(253,224,71,0.45)");
        aura.addColorStop(1, "rgba(253,224,71,0)");
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, -46, 78 * pulse, 0, Math.PI * 2);
        ctx.fill();
    }

    if (p.stumble > 0) ctx.rotate(Math.sin(p.stumble * Math.PI) * 0.55);
    const sy = 1 + p.stretch, sx = 1 / sy;
    ctx.scale(sx, sy);

    // sliding: the whole body leans way back, feet first
    const hipY = p.sliding ? -14 : -40;
    const lean = p.sliding ? -1.25 : p.idle ? 0.02 : p.airborne ? 0.08 : p.boost ? 0.26 : 0.16;
    const armSwing = p.idle || p.sliding ? 0 : p.airborne ? 0 : Math.sin(p.phase) * 1.0;

    // back leg and back arm first, so the body covers them
    const [bt, bs] = legAngles(p, 1);
    const back = limb(ctx, 0, hipY, bt, bs, LEG, LEG, 8, "#151a2b");
    shoe(ctx, back.fx, back.fy, "#0b0d14");

    ctx.save();
    ctx.translate(0, hipY);
    ctx.rotate(lean);
    // back arm
    const backArm = p.airborne && !p.sliding ? -2.6 : armSwing;
    limb(ctx, 3, -30, backArm, backArm + 0.9, 14, 13, 6.5, "#161b2c");
    ctx.restore();

    const [ft, fs] = legAngles(p, 0);
    const front = limb(ctx, 0, hipY, ft, fs, LEG, LEG, 8.5, "#20263a");
    shoe(ctx, front.fx, front.fy, "#0d0f17");

    // torso
    ctx.save();
    ctx.translate(0, hipY);
    ctx.rotate(lean);

    // tzitzis strings trailing behind
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 1.4;
    for (let k = 0; k < 3; k++) {
        const wave = Math.sin(p.t * 22 + k) * 3;
        ctx.beginPath();
        ctx.moveTo(-9 + k, 0);
        ctx.quadraticCurveTo(-16 - k * 2, 6 + wave, -24 - k * 3, 9 + wave * 1.4);
        ctx.stroke();
    }

    // frock coat tail flapping
    const flap = p.idle ? 0 : Math.sin(p.t * 20) * 4 + (p.boost ? 6 : 2);
    ctx.fillStyle = "#0f1220";
    ctx.beginPath();
    ctx.moveTo(-11, -6);
    ctx.lineTo(-19 - flap, 9);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();

    const coat = ctx.createLinearGradient(-12, -36, 12, 0);
    coat.addColorStop(0, "#343b57");
    coat.addColorStop(1, "#141827");
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.roundRect(-12, -36, 24, 40, 9);
    ctx.fill();
    // white shirt and lapels
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(-1, -36); ctx.lineTo(9, -36); ctx.lineTo(4, -22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(-10, -34, 3, 30);

    // head
    const hx = 5, hy = -47;
    const skin = ctx.createRadialGradient(hx + 3, hy - 3, 2, hx, hy, 12);
    skin.addColorStop(0, "#ffe2c6");
    skin.addColorStop(1, "#e7b48c");
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(hx, hy, 11, 0, Math.PI * 2);
    ctx.fill();
    // beard and peyos
    ctx.fillStyle = "#3b2416";
    ctx.beginPath();
    ctx.ellipse(hx + 3, hy + 6, 9, 8, 0.2, 0, Math.PI);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#3b2416";
    ctx.beginPath();
    ctx.moveTo(hx - 6, hy - 2);
    ctx.bezierCurveTo(hx - 10, hy + 3, hx - 4, hy + 6, hx - 8, hy + 10);
    ctx.stroke();
    // eye
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(hx + 7, hy - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // hat
    ctx.fillStyle = "#07080c";
    ctx.beginPath();
    ctx.ellipse(hx + 1, hy - 9, 17, 3.6, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(hx - 10, hy - 26, 21, 18, [6, 6, 2, 2]);
    ctx.fill();
    ctx.fillStyle = "#2a2d38";
    ctx.fillRect(hx - 10, hy - 13, 21, 3);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(hx - 7, hy - 24, 2, 9);

    // front arm with the tallis bag
    const frontArm = p.airborne && !p.sliding ? -2.3 : -armSwing;
    const hand = limb(ctx, 4, -30, frontArm, frontArm + 0.9, 14, 13, 7, "#252c43");
    ctx.save();
    ctx.translate(hand.fx, hand.fy);
    ctx.rotate(-lean * 0.5);
    const bag = ctx.createLinearGradient(-2, 0, 18, 14);
    bag.addColorStop(0, "#2747b8");
    bag.addColorStop(1, "#162a73");
    ctx.fillStyle = bag;
    ctx.beginPath();
    ctx.roundRect(-3, 0, 19, 15, 3);
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(0, 3, 13, 9);
    ctx.restore();

    ctx.restore();
    ctx.restore();
}

function shoe(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 3, 13, 6, 3);
    ctx.fill();
}

// ---------------------------------------------------------------- obstacles and pickups

export function drawPhone(ctx: CanvasRenderingContext2D, x: number, G: number, t: number) {
    const w = 30, h = 50, y = G - h;
    const halo = ctx.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, 52);
    halo.addColorStop(0, "rgba(129,140,248,0.45)");
    halo.addColorStop(1, "rgba(129,140,248,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(x - 40, y - 40, w + 80, h + 80);

    ctx.fillStyle = "#0b0d16";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    const scr = ctx.createLinearGradient(x, y, x + w, y + h);
    scr.addColorStop(0, "#38bdf8");
    scr.addColorStop(1, "#8b5cf6");
    ctx.fillStyle = scr;
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 5, w - 6, h - 12, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 6, y + 11 + i * 9, (w - 12) * (i === 2 ? 0.6 : 1), 4);

    // notification badge with a ping ring
    const ping = (t * 1.6) % 1;
    ctx.strokeStyle = `rgba(239,68,68,${1 - ping})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + w - 2, y + 2, 7 + ping * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(x + w - 2, y + 2, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `bold 10px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("9", x + w - 2, y + 2.5);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}

export function drawClock(ctx: CanvasRenderingContext2D, x: number, G: number, t: number) {
    const cx = x + 22, cy = G - 22;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 30) * 0.12);
    // ringing lines
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 30)})`;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(0, -4, 28, side < 0 ? Math.PI * 0.8 : -Math.PI * 0.2, side < 0 ? Math.PI * 1.2 : Math.PI * 0.2);
        ctx.stroke();
    }
    // legs
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 12); ctx.lineTo(-14, 22);
    ctx.moveTo(10, 12); ctx.lineTo(14, 22);
    ctx.stroke();
    // bells
    ctx.fillStyle = "#fbbf24";
    for (const bx of [-12, 12]) {
        ctx.beginPath();
        ctx.arc(bx, -17, 7, Math.PI, 0);
        ctx.fill();
    }
    const body = ctx.createRadialGradient(-6, -8, 2, 0, 0, 20);
    body.addColorStop(0, "#fb7185");
    body.addColorStop(1, "#be123c");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff7ed";
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -9);
    ctx.moveTo(0, 0); ctx.lineTo(6, 3);
    ctx.stroke();
    ctx.restore();
}

export function drawBarrier(ctx: CanvasRenderingContext2D, x: number, G: number, t: number) {
    const w = 64, h = 74, y = G - h;
    // posts
    ctx.fillStyle = "#475569";
    ctx.fillRect(x + 6, y + 8, 5, h - 8);
    ctx.fillRect(x + w - 11, y + 8, 5, h - 8);
    // striped boards
    for (const by of [y + 14, y + 40]) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, by, w, 13, 3);
        ctx.clip();
        ctx.fillStyle = "#fff7ed";
        ctx.fillRect(x, by, w, 13);
        ctx.fillStyle = "#f97316";
        for (let sx = -20; sx < w + 20; sx += 16) {
            ctx.beginPath();
            ctx.moveTo(x + sx, by + 13);
            ctx.lineTo(x + sx + 8, by + 13);
            ctx.lineTo(x + sx + 20, by);
            ctx.lineTo(x + sx + 12, by);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
    // blinking warning light
    const on = Math.sin(t * 9) > 0;
    if (on) {
        const glow = ctx.createRadialGradient(x + 8, y + 4, 1, x + 8, y + 4, 34);
        glow.addColorStop(0, "rgba(251,191,36,0.85)");
        glow.addColorStop(1, "rgba(251,191,36,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(x - 30, y - 30, 76, 68);
    }
    ctx.fillStyle = on ? "#fde047" : "#92400e";
    ctx.beginPath();
    ctx.arc(x + 8, y + 4, 5, 0, Math.PI * 2);
    ctx.fill();
}

export const BUBBLE_MESSAGES = [
    "5 more minutes?",
    "Group chat · 99+",
    "Breaking news!",
    "Flash sale ends soon",
    "Snooze again?",
    "New episode out",
    "Your order shipped",
];

export function bubbleWidth(text: string) {
    return 54 + text.length * 6.6;
}

export function drawBubble(ctx: CanvasRenderingContext2D, x: number, G: number, bottom: number, top: number, w: number, text: string, t: number) {
    const h = top - bottom;
    const y = G - top + Math.sin(t * 3 + x * 0.01) * 1.5;
    const glow = ctx.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, w * 0.7);
    glow.addColorStop(0, "rgba(255,255,255,0.35)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 30, y - 30, w + 60, h + 60);

    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    // app icon
    const icon = ctx.createLinearGradient(x + 8, y + 8, x + 32, y + 32);
    icon.addColorStop(0, "#4ade80");
    icon.addColorStop(1, "#16a34a");
    ctx.fillStyle = icon;
    ctx.beginPath();
    ctx.roundRect(x + 8, y + h / 2 - 12, 24, 24, 7);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(x + 13, y + h / 2 - 5, 14, 9, 3);
    ctx.fill();
    // text
    ctx.fillStyle = "#0f172a";
    ctx.font = `600 12px ${UI_FONT}`;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + 40, y + h / 2 - 5);
    ctx.fillStyle = "#64748b";
    ctx.font = `10px ${UI_FONT}`;
    ctx.fillText("now · tap to open", x + 40, y + h / 2 + 8);
    ctx.textBaseline = "alphabetic";
    // unread dot
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(x + w - 9, y + 9, 4.5, 0, Math.PI * 2);
    ctx.fill();
}

export function drawCoffee(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
    // spinning golden ring
    ctx.save();
    ctx.translate(cx, cy);
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
    glow.addColorStop(0, "rgba(253,224,71,0.55)");
    glow.addColorStop(1, "rgba(253,224,71,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(t * 2.5);
    ctx.strokeStyle = "rgba(253,224,71,0.9)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    const y = cy + Math.sin(t * 4) * 2;
    // cup
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(cx - 9, y - 9);
    ctx.lineTo(cx + 9, y - 9);
    ctx.lineTo(cx + 7, y + 13);
    ctx.lineTo(cx - 7, y + 13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#92400e";
    ctx.fillRect(cx - 8.5, y - 2, 17, 8);
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.roundRect(cx - 11, y - 13, 22, 5, 2);
    ctx.fill();
    // steam
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.6;
    for (let k = -1; k <= 1; k += 2) {
        const ph = t * 4 + k;
        ctx.beginPath();
        ctx.moveTo(cx + k * 4, y - 15);
        ctx.bezierCurveTo(cx + k * 4 + Math.sin(ph) * 4, y - 20, cx + k * 4 - Math.sin(ph) * 4, y - 24, cx + k * 4, y - 29);
        ctx.stroke();
    }
}

export function drawShul(ctx: CanvasRenderingContext2D, x: number, G: number, pal: Palette, t: number) {
    const w = 210, h = 160, top = G - h;
    // warm light spilling out onto the street
    const spill = ctx.createRadialGradient(x + w / 2, G, 10, x + w / 2, G, 180);
    spill.addColorStop(0, "rgba(255,200,120,0.55)");
    spill.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = spill;
    ctx.fillRect(x - 100, G - 160, w + 200, 220);

    // building
    const stone = ctx.createLinearGradient(x, top, x, G);
    stone.addColorStop(0, "#f1e4c8");
    stone.addColorStop(1, "#c9b48c");
    ctx.fillStyle = stone;
    ctx.fillRect(x, top, w, h);
    ctx.fillStyle = rgba(pal.top, 0.15);
    ctx.fillRect(x, top, w, h);
    // stone courses
    ctx.fillStyle = "rgba(90,70,40,0.12)";
    for (let r = top + 18; r < G; r += 18) ctx.fillRect(x, r, w, 1.5);
    // roof
    ctx.fillStyle = "#7c2d12";
    ctx.beginPath();
    ctx.moveTo(x - 12, top);
    ctx.lineTo(x + w / 2, top - 52);
    ctx.lineTo(x + w + 12, top);
    ctx.closePath();
    ctx.fill();

    // glowing Magen David
    const cx = x + w / 2, cy = top - 22, r = 14;
    const halo = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
    halo.addColorStop(0, "rgba(253,224,71,0.8)");
    halo.addColorStop(1, "rgba(253,224,71,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(cx - 34, cy - 34, 68, 68);
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 2.6;
    for (const start of [-Math.PI / 2, Math.PI / 2]) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = start + (i * 2 * Math.PI) / 3;
            const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
    }

    // arched windows, warm inside
    const flicker = 0.9 + 0.1 * Math.sin(t * 5);
    for (const wx of [x + 18, x + 56, x + w - 86, x + w - 48]) {
        const win = ctx.createLinearGradient(0, top + 28, 0, top + 78);
        win.addColorStop(0, `rgba(255,224,150,${flicker})`);
        win.addColorStop(1, "rgba(255,160,70,0.95)");
        ctx.fillStyle = win;
        ctx.beginPath();
        ctx.roundRect(wx, top + 28, 30, 50, [15, 15, 2, 2]);
        ctx.fill();
        ctx.fillStyle = "rgba(90,50,20,0.5)";
        ctx.fillRect(wx + 14, top + 28, 2, 50);
    }
    // doorway
    const door = ctx.createLinearGradient(0, G - 76, 0, G);
    door.addColorStop(0, "#ffe7b0");
    door.addColorStop(1, "#ffb25b");
    ctx.fillStyle = door;
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 24, G - 78, 48, 78, [24, 24, 0, 0]);
    ctx.fill();
    // steps
    ctx.fillStyle = "#a8956f";
    ctx.fillRect(x + w / 2 - 40, G - 6, 80, 6);
}
