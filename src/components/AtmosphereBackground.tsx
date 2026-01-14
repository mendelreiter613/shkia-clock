"use client";

import { motion, AnimatePresence } from "framer-motion";

interface AtmosphereBackgroundProps {
    sunProgress: number;
    isNight: boolean;
    sunBottomPosition: number;
    skyGradient: string;
    oceanGradient: string;
}

export default function AtmosphereBackground({
    sunProgress,
    isNight,
    sunBottomPosition,
    skyGradient,
    oceanGradient
}: AtmosphereBackgroundProps) {
    return (
        <>
            {/* Sky */}
            <div className={`absolute inset-0 bg-gradient-to-b ${isNight ? 'from-slate-900 to-slate-800' : skyGradient} transition-all duration-1000 ease-in-out`} />

            {/* Stars (Night only) */}
            {isNight && (
                <div className="absolute inset-0 bg-[url('/stars.png')] opacity-50" />
            )}

            {/* Sun */}
            <AnimatePresence>
                {!isNight && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: 1,
                            left: `${sunProgress}%`,
                            bottom: `${sunBottomPosition}%`
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, ease: "linear" }}
                        className="absolute w-24 h-24 md:w-40 md:h-40 rounded-full z-10 pointer-events-none transform -translate-x-1/2 translate-y-1/2 shadow-2xl shadow-orange-500/50"
                        style={{
                            background: `radial-gradient(circle, #fbbf24 10%, #f97316 90%)`
                        }}
                    >
                        {/* Sun Glow */}
                        <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-40 rounded-full" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ocean */}
            <div className={`absolute bottom-0 w-full h-[35%] z-20 overflow-hidden backdrop-blur-sm`}>
                <div className={`absolute inset-0 bg-gradient-to-b ${oceanGradient} opacity-90`} />

                {/* Shimmer Effect */}
                {!isNight && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer scale-150" />
                )}

                {/* Sun Reflection */}
                {!isNight && (
                    <motion.div
                        className="absolute h-full w-20 md:w-32 bg-orange-400/20 blur-xl"
                        animate={{ left: `${sunProgress}%` }}
                        style={{ transform: 'translateX(-50%)' }}
                    />
                )}
            </div>
        </>
    );
}
