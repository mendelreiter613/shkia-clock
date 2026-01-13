"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Search, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LocationSelectorProps {
    onLocationFound: (lat: number, lng: number, name: string) => void;
}

interface CityResult {
    display_name: string;
    lat: string;
    lon: string;
    name: string;
}

export default function LocationSelector({ onLocationFound }: LocationSelectorProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<CityResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [error, setError] = useState("");
    const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
                    { headers: { "User-Agent": "ShkiaClock/2.0" } }
                );
                const data = await res.json();
                const cities = data.map((item: any) => ({
                    display_name: item.display_name,
                    lat: item.lat,
                    lon: item.lon,
                    name: item.display_name.split(',')[0]
                }));
                setSuggestions(cities);
                setShowSuggestions(cities.length > 0);
            } catch {
                setError("Could not search cities.");
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [searchQuery]);

    const handleSelectCity = (city: CityResult) => {
        onLocationFound(parseFloat(city.lat), parseFloat(city.lon), city.name);
    };

    const handleGeolocation = () => {
        setLoading(true);
        setError("");
        if (!navigator.geolocation) {
            setError("Geolocation is not supported");
            setLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onLocationFound(position.coords.latitude, position.coords.longitude, "Current Location");
            },
            () => {
                setError("Location access denied");
                setLoading(false);
            }
        );
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 w-full max-w-lg mx-auto relative z-10">

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-10"
            >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4 ring-1 ring-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                    <div className="w-2 h-2 bg-orange-400 rounded-full shadow-[0_0_10px_orange]" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                    Shkia Clock
                </h1>
                <p className="text-white/40 mt-2 font-light tracking-wide">
                    Set your location to begin
                </p>
            </motion.div>

            {/* Glass Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="w-full glass-panel rounded-3xl p-2 shadow-2xl"
            >
                <div className="relative">
                    <div className="absolute left-4 top-3.5 text-white/40">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search city..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        className="w-full bg-transparent text-white placeholder-white/30 px-12 py-3 focus:outline-none text-lg"
                        autoFocus
                    />
                    {loading && (
                        <div className="absolute right-4 top-3.5 text-white/40 animate-spin">
                            <Loader2 size={20} />
                        </div>
                    )}
                </div>

                {/* Suggestions List */}
                <AnimatePresence>
                    {showSuggestions && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-white/10"
                        >
                            <ul className="py-2">
                                {suggestions.map((city, i) => (
                                    <li key={i}>
                                        <button
                                            onClick={() => handleSelectCity(city)}
                                            className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center gap-3 group"
                                        >
                                            <MapPin size={16} className="text-white/40 group-hover:text-orange-300 transition-colors" />
                                            <div>
                                                <div className="font-medium text-white/90">{city.name}</div>
                                                <div className="text-xs text-white/40 truncate max-w-[250px]">{city.display_name}</div>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* GPS Button */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                onClick={handleGeolocation}
                disabled={loading}
                className="mt-4 flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white/70 hover:text-white transition-all w-full max-w-xs"
            >
                <Navigation size={14} />
                <span>Use Current Location</span>
            </motion.button>

            {/* Error Toast */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm"
                >
                    {error}
                </motion.div>
            )}
        </div>
    );
}