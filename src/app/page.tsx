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
    // Updated background to solid black
    <main className="min-h-screen bg-black relative selection:bg-yellow-500/30">
      <AnimatePresence mode="wait">
        {location && zmanim ? (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            <LocationSelector onLocationFound={handleLocationFound} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}