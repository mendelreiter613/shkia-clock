"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Search } from "lucide-react";
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

        // Debounce search
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        searchTimeout.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                        searchQuery
                    )}&limit=5`,
                    { headers: { "User-Agent": "ShkiaClock/1.0" } }
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
                setError("Search failed");
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchQuery]);

    const handleSelectCity = (city: CityResult) => {
        onLocationFound(parseFloat(city.lat), parseFloat(city.lon), city.name);
        setShowSuggestions(false);
    };

    const handleGeolocation = () => {
        setLoading(true);
        setError("");
        if (!navigator.geolocation) {
            setError("Geolocation not supported");
            setLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onLocationFound(position.coords.latitude, position.coords.longitude, "Your Location");
                setLoading(false);
            },
            () => {
                setError("Location access denied");
                setLoading(false);
            }
        );
    };

    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center p-6">

            {/* Logo - Top Left */}
            <div className="absolute top-6 left-6 flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                </div>
                <span className="text-xl font-bold tracking-tight">SHKIA CLOCK</span>
            </div>

            {/* Main Content */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl"
            >
                {/* Title */}
                <div className="text-center mb-12">
                    <h1 className="text-6xl md:text-7xl font-bold text-white mb-3 tracking-tight">
                        Shkia Clock
                    </h1>
                    <p className="text-white/60 text-lg">
                        Track sunset times for your location
                    </p>
                </div>

                {/* Search with Autocomplete */}
                <div className="relative mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                        <input
                            type="text"
                            placeholder="Search for a city..."
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                            className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-white/40 text-lg focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                        />
                        {loading && (
                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 animate-spin" size={20} />
                        )}
                    </div>

                    {/* Suggestions Dropdown */}
                    <AnimatePresence>
                        {showSuggestions && suggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full mt-2 w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl z-50"
                            >
                                {suggestions.map((city, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSelectCity(city)}
                                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <MapPin size={16} className="text-white/60 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{city.name}</div>
                                                <div className="text-sm text-white/50 truncate">{city.display_name}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 my-8">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <span className="text-white/40 text-sm uppercase tracking-widest">Or</span>
                    <div className="flex-1 h-px bg-white/10"></div>
                </div>

                {/* Use Location Button */}
                <button
                    onClick={handleGeolocation}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-2xl px-6 py-4 text-white transition-all disabled:opacity-50"
                >
                    <MapPin size={20} />
                    <span className="text-lg font-medium">Use My Current Location</span>
                </button>

                {/* Error */}
                {error && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 text-center text-red-400 text-sm"
                    >
                        {error}
                    </motion.p>
                )}
            </motion.div>

            {/* Footer */}
            <div className="absolute bottom-6 left-0 right-0 text-center">
                <p className="text-white/30 text-xs uppercase tracking-[0.2em]">
                    Based on Hebcal Halachic Algorithms
                </p>
            </div>
        </div>
    );
}
