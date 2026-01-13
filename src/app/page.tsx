"use client";

import { useState } from "react";
import LocationSelector from "@/components/LocationSelector";
import CountdownDisplay from "@/components/CountdownDisplay";
import { getZmanimData, ZmanimData } from "@/lib/zmanim";

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

  if (location && zmanim) {
    return <CountdownDisplay zmanim={zmanim} locationName={location.name} onReset={handleReset} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-0 bg-black text-white selection:bg-blue-500/30">
      <LocationSelector onLocationFound={handleLocationFound} />
    </main>
  );
}
