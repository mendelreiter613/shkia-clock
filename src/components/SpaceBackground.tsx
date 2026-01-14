"use client";

import { useEffect, useRef } from "react";

interface SpaceBackgroundProps {
    sunProgress: number; // 0 to 100
    isNight: boolean;
}

export default function SpaceBackground({ sunProgress, isNight }: SpaceBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        interface Star {
            x: number;
            y: number;
            z: number;
            o: number;
        }

        const stars: Star[] = [];
        const numStars = 1500; // Increased star count
        const centerX = width / 2;
        const centerY = height / 2;
        const focalLength = width;

        // Initialize Stars
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * width - centerX,
                y: Math.random() * height - centerY,
                z: Math.random() * width,
                o: Math.random(),
            });
        }

        let animationFrameId: number;

        const render = () => {
            ctx.fillStyle = isNight ? "#020617" : "#0f172a";
            ctx.fillRect(0, 0, width, height);

            const speed = isNight ? 4 : 0.5;

            stars.forEach((star) => {
                star.z -= speed;

                if (star.z <= 0) {
                    star.z = width;
                    star.x = Math.random() * width - centerX;
                    star.y = Math.random() * height - centerY;
                }

                const x = centerX + (star.x / star.z) * focalLength;
                const y = centerY + (star.y / star.z) * focalLength;

                // FIXED: Math to ensure stars are visible (min 0.8px)
                const size = (1 - star.z / width) * 4;
                const radius = Math.max(0.8, size);
                const alpha = (1 - star.z / width) * star.o;

                ctx.beginPath();
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

                // Dim stars during day
                if (!isNight && sunProgress > 20 && sunProgress < 80) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.2})`;
                }

                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        window.addEventListener("resize", handleResize);
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", handleResize);
        };
    }, [isNight, sunProgress]);

    // Atmosphere Overlay
    let atmosphereGradient = "";
    if (sunProgress < 10) atmosphereGradient = "bg-gradient-to-t from-orange-500/20 via-purple-900/10 to-transparent";
    else if (sunProgress < 90) atmosphereGradient = "bg-gradient-to-t from-blue-400/10 via-transparent to-transparent";
    else atmosphereGradient = "bg-gradient-to-t from-red-600/30 via-purple-900/30 to-transparent";

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
            <div className={`absolute inset-0 transition-all duration-1000 ${atmosphereGradient}`} />
        </div>
    );
}
