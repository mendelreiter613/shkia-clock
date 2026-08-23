"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Search, MapPin, ArrowRight, Sparkles } from "lucide-react";
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
    const [searchLoading, setSearchLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
    const abortController = useRef<AbortController | undefined>(undefined);

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            abortController.current?.abort();
            const controller = new AbortController();
            abortController.current = controller;

            setSearchLoading(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
                    { headers: { "User-Agent": "ShkiaClock/2.0" }, signal: controller.signal }
                );
                const data: { display_name: string; lat: string; lon: string }[] = await res.json();
                const cities = data.map((item) => ({
                    display_name: item.display_name,
                    lat: item.lat,
                    lon: item.lon,
                    name: item.display_name.split(',')[0]
                }));
                setSuggestions(cities);
                setShowSuggestions(cities.length > 0);
            } catch (err) {
                if ((err as Error).name !== "AbortError") console.error("Search failed");
            } finally {
                if (abortController.current === controller) setSearchLoading(false);
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
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onLocationFound(position.coords.latitude, position.coords.longitude, "Current Location");
                setLocating(false);
            },
            () => setLocating(false)
        );
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 w-full relative">
            
            {/* Decorative Elements */}
            <div className="absolute top-20 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[520px] relative z-10"
            >
                {/* Header with Sparkle Icon */}
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10"
                    >
                        <Sparkles className="w-8 h-8 text-blue-400" />
                    </motion.div>
                    
                    <h1 className="text-5xl font-bold text-white tracking-tight mb-3 glow-text">
                        Shkia Clock
                    </h1>
                    <p className="text-white/50 text-base">Begin your countdown to sunset</p>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col gap-5"
                >
                    
                    {/* Search Input - Enhanced */}
                    <div className="relative w-full group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                            </div>
                            
                            <input
                                type="text"
                                className="block w-full pl-14 pr-5 h-16 bg-white/5 border border-white/10 rounded-2xl text-white text-lg placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all duration-300 backdrop-blur-xl"
                                placeholder="Search for a city..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                autoFocus
                            />
                            
                            {searchLoading && (
                                <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
                                    <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Suggestions Dropdown - Enhanced */}
                        <AnimatePresence>
                            {showSuggestions && suggestions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute top-full left-0 right-0 mt-3 bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden z-50 border border-white/10"
                                >
                                    {suggestions.map((city, i) => (
                                        <motion.button
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => handleSelectCity(city)}
                                            className="w-full text-left px-6 py-4 hover:bg-white/10 transition-all duration-200 border-b border-white/5 last:border-0 group/item"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-white font-semibold text-lg mb-1 group-hover/item:text-blue-400 transition-colors">
                                                        {city.name}
                                                    </div>
                                                    <div className="text-white/40 text-sm truncate">
                                                        {city.display_name}
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-white/20 group-hover/item:text-blue-400 group-hover/item:translate-x-1 transition-all" />
                                            </div>
                                        </motion.button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Divider - Enhanced */}
                    <div className="flex items-center gap-4 my-2">
                        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
                        <span className="text-white/30 text-xs font-semibold uppercase tracking-[0.2em]">Or</span>
                        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
                    </div>

                    {/* Current Location Button - Premium */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGeolocation}
                        disabled={locating}
                        className="relative w-full h-16 flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/20 rounded-2xl text-white font-semibold text-lg hover:border-white/40 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20 transition-all duration-300 group overflow-hidden disabled:opacity-60"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-white/5 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                        {locating ? (
                            <Loader2 size={22} className="relative z-10 animate-spin" />
                        ) : (
                            <MapPin size={22} className="relative z-10 group-hover:scale-110 transition-transform" />
                        )}
                        <span className="relative z-10">{locating ? "Locating..." : "Use current location"}</span>
                    </motion.button>
                
                </motion.div>

                {/* Subtle hint text */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center text-white/30 text-sm mt-8"
                >
                    Accurate zmanim calculations for your location
                </motion.p>
            </motion.div>
        </div>
    );
}