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
                <div className="absolute inset-0 opacity-50">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(2px 2px at 20% 30%, white, transparent),
                                         radial-gradient(2px 2px at 60% 70%, white, transparent),
                                         radial-gradient(1px 1px at 50% 50%, white, transparent),
                                         radial-gradient(1px 1px at 80% 10%, white, transparent),
                                         radial-gradient(2px 2px at 90% 60%, white, transparent),
                                         radial-gradient(1px 1px at 33% 80%, white, transparent)`,
                        backgroundSize: '200px 200px',
                        backgroundPosition: '0 0, 40px 60px, 130px 270px, 70px 100px, 150px 50px, 90px 180px'
                    }} />
                </div>
            )}

            {/* Sun - Made MUCH larger and more visible */}
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
                        className="absolute w-32 h-32 md:w-56 md:h-56 rounded-full z-10 pointer-events-none transform -translate-x-1/2 translate-y-1/2"
                        style={{
                            background: `radial-gradient(circle, #fef08a 0%, #fbbf24 40%, #f97316 100%)`,
                            boxShadow: `0 0 80px 20px ${sunProgress > 85 ? 'rgba(249, 115, 22, 0.6)' : 'rgba(251, 191, 36, 0.5)'}`
                        }}
                    >
                        {/* Sun Core - Brighter center */}
                        <div className="absolute inset-8 bg-yellow-100 rounded-full opacity-90" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ocean */}
            <div className={`absolute bottom-0 w-full h-[40%] z-20 overflow-hidden`}>
                {/* Ocean Water */}
                <div className={`absolute inset-0 bg-gradient-to-b ${oceanGradient} opacity-95`} />

                {/* Waves/Texture */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `repeating-linear-gradient(
                            0deg,
                            transparent,
                            transparent 10px,
                            rgba(255, 255, 255, 0.03) 10px,
                            rgba(255, 255, 255, 0.03) 20px
                        )`
                    }} />
                </div>

                {/* Shimmer Effect */}
                {!isNight && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-shimmer scale-150" />
                )}

                {/* Sun Reflection - Enhanced */}
                {!isNight && (
                    <motion.div
                        className="absolute h-full w-24 md:w-40 blur-2xl"
                        animate={{ left: `${sunProgress}%` }}
                        style={{
                            transform: 'translateX(-50%)',
                            background: `linear-gradient(to bottom, 
                                ${sunProgress > 85 ? 'rgba(249, 115, 22, 0.4)' : 'rgba(251, 191, 36, 0.3)'} 0%, 
                                transparent 100%)`
                        }}
                    />
                )}

                {/* Horizon Line - Subtle */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
        </>
    );
}
