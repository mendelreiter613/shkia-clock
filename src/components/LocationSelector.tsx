"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Search, MapPin, ArrowRight } from "lucide-react";
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
                console.error("Search failed");
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
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                onLocationFound(position.coords.latitude, position.coords.longitude, "Current Location");
            },
            () => setLoading(false)
        );
    };

    return (
        <div className="flex items-center justify-center h-screen bg-black p-4">

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Minimal Header */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Shkia Clock</h1>
                    <p className="text-white/40">Enter your location to synchronize.</p>
                </div>

                {/* Input Field - Dark Theme */}
                <div className="relative group z-20">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-white/30 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-11 pr-4 py-4 bg-[#111] border border-[#333] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/40 transition-all text-lg"
                        placeholder="Search city..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        autoFocus
                    />
                    {loading && (
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                            <Loader2 className="h-5 w-5 text-white/30 animate-spin" />
                        </div>
                    )}

                    {/* Dropdown Results */}
                    <AnimatePresence>
                        {showSuggestions && suggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-[#333] rounded-xl shadow-2xl overflow-hidden z-50"
                            >
                                {suggestions.map((city, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSelectCity(city)}
                                        className="w-full text-left px-5 py-3 hover:bg-[#252525] transition-colors border-b border-white/5 last:border-0"
                                    >
                                        <div className="text-white font-medium">{city.name}</div>
                                        <div className="text-white/40 text-xs truncate">{city.display_name}</div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 my-8">
                    <div className="h-px bg-[#222] flex-1" />
                    <span className="text-[#444] text-xs font-bold uppercase tracking-widest">or</span>
                    <div className="h-px bg-[#222] flex-1" />
                </div>

                {/* Geo Button */}
                <button
                    onClick={handleGeolocation}
                    className="w-full flex items-center justify-between px-6 py-4 bg-[#111] hover:bg-[#161616] border border-[#333] hover:border-[#444] rounded-xl text-white transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <MapPin className="text-white/40 group-hover:text-white transition-colors" size={20} />
                        <span className="font-medium">Use current location</span>
                    </div>
                    <ArrowRight className="text-white/20 group-hover:text-white transition-colors" size={18} />
                </button>

            </motion.div>
        </div>
    );
}