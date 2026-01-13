"use client";

import { useState } from "react";
import LocationSelector from "@/components/LocationSelector";
import CountdownDisplay from "@/components/CountdownDisplay";
import { getComingShkia } from "@/lib/zmanim";

export default function Home() {
  const [location, setLocation] = useState<{ lat: number, lng: number, name: string } | null>(null);
  const [shkia, setShkia] = useState<Date | null>(null);

  const handleLocationFound = (lat: number, lng: number, name: string) => {
    setLocation({ lat, lng, name });
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nextShkia = getComingShkia(lat, lng, timeZone);
    setShkia(nextShkia);
  };

  const handleReset = () => {
    setLocation(null);
    setShkia(null);
  };

  if (location && shkia) {
    return <CountdownDisplay shkiaTime={shkia} locationName={location.name} onReset={handleReset} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100 dark:bg-zinc-900 text-black dark:text-white">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Shkia Clock
        </h1>
        <p className="text-lg opacity-75">Don't miss the zman.</p>
      </div>
      <LocationSelector onLocationFound={handleLocationFound} />
    </main>
  );
}
