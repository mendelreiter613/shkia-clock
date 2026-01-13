"use client";

import { useState } from "react";
import LocationSelector from "@/components/LocationSelector";
import CountdownDisplay from "@/components/CountdownDisplay";
import { getZmanimData, ZmanimData } from "@/lib/zmanim";
import { AnimatePresence, motion } from "framer-motion";

export default function Home() {
  const [location, setLocation] = useState<{ lat: number, lng: number, name: string } | null>(null);
  const [zmanim, setZmanim] = useState<ZmanimData | null>(null);

  const handleLocationFound = (lat: number, lng: number, name: string) => {
    setLocation({ lat, lng, name });
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const data = getZmanimData(lat, lng, timeZone);
    setZmanim(data);
  };

  const handleReset = () => {
    setLocation(null);
    setZmanim(null);
  };

  return (
    <main className="min-h-screen bg-twilight relative">
      {/* Background Noise Texture (Optional for aesthetics) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
      />

      <AnimatePresence mode="wait">
        {location && zmanim ? (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <CountdownDisplay 
              zmanim={zmanim} 
              locationName={location.name} 
              onReset={handleReset} 
            />
          </motion.div>
        ) : (
          <motion.div
            key="selector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <LocationSelector onLocationFound={handleLocationFound} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}