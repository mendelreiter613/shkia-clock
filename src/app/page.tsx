"use client";

import { useEffect, useState } from "react";
import LocationSelector from "@/components/LocationSelector";
import CountdownDisplay from "@/components/CountdownDisplay";
import { getZmanimData, ZmanimData } from "@/lib/zmanim";
import { AnimatePresence, motion } from "framer-motion";
import tz from "tz-lookup";

// How often to recompute zmanim for the current location. The countdown
// target and sun-position background are only as fresh as this data, so a
// tab left open across a day boundary (or just for hours) needs it
// refreshed periodically to keep both live and accurate.
const ZMANIM_REFRESH_MS = 10 * 60 * 1000;

export default function Home() {
  const [location, setLocation] = useState<{ lat: number, lng: number, name: string } | null>(null);
  const [zmanim, setZmanim] = useState<ZmanimData | null>(null);

  const handleLocationFound = (lat: number, lng: number, name: string) => {
    setLocation({ lat, lng, name });
    const timeZone = tz(lat, lng);
    const data = getZmanimData(lat, lng, timeZone);
    setZmanim(data);
  };

  useEffect(() => {
    if (!location) return;
    const timeZone = tz(location.lat, location.lng);
    const interval = setInterval(() => {
      const data = getZmanimData(location.lat, location.lng, timeZone);
      if (data) setZmanim(data);
    }, ZMANIM_REFRESH_MS);
    return () => clearInterval(interval);
  }, [location]);

  const handleReset = () => {
    setLocation(null);
    setZmanim(null);
  };

  return (
    // FIXED: h-[100dvh] prevents mobile cutoff
    <main className="h-[100dvh] w-full bg-deep-atmosphere relative selection:bg-white/20 overflow-hidden">
      <AnimatePresence mode="wait">
        {location && zmanim ? (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
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
            className="w-full h-full bg-deep-atmosphere"
          >
            <LocationSelector onLocationFound={handleLocationFound} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}