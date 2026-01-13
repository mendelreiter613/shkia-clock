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
    const searchTimeout = useRef<NodeJS.Timeout>();

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
        <div className="flex items-center justify-center min-h-screen p-4">
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="w-full max-w-md glass-card rounded-3xl p-8 relative z-10"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/5 mb-4 border border-white/10 shadow-lg shadow-purple-500/10">
                        <MapPin className="text-white/80" size={24} />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Shkia Clock</h1>
                    <p className="text-white/40 text-sm mt-2">Where are you located?</p>
                </div>

                {/* Input Container */}
                <div className="relative mb-4">
                    <div className="relative z-20">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                        <input
                            type="text"
                            placeholder="Search city (e.g. Brooklyn)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-10 py-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
                            autoFocus
                        />
                        {loading && (
                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 animate-spin" size={18} />
                        )}
                    </div>

                    {/* Suggestions Dropdown */}
                    <AnimatePresence>
                        {showSuggestions && suggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50"
                            >
                                {suggestions.map((city, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSelectCity(city)}
                                        className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex items-center gap-3"
                                    >
                                        <MapPin size={14} className="text-white/40 shrink-0" />
                                        <div className="min-w-0">
                                            <div className="text-white text-sm font-medium truncate">{city.name}</div>
                                            <div className="text-white/30 text-xs truncate">{city.display_name}</div>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink mx-4 text-white/20 text-xs uppercase tracking-wider">Or</span>
                    <div className="flex-grow border-t border-white/10"></div>
                </div>

                {/* GPS Button */}
                <button
                    onClick={handleGeolocation}
                    disabled={loading}
                    className="w-full mt-2 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-4 text-white transition-all disabled:opacity-50"
                >
                    <Navigation size={18} />
                    <span className="text-sm font-medium">Use My Location</span>
                </button>

                {error && (
                    <div className="mt-4 text-center text-red-400 text-xs bg-red-500/10 py-2 rounded-lg">
                        {error}
                    </div>
                )}
            </motion.div>
        </div>
    );
}