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
    
    // Strict TypeScript definition as requested
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
        <div className="flex flex-col items-center justify-center min-h-screen p-6 w-full">
            
            {/* Main Container - Constrained Width */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[500px]"
            >
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-light text-white tracking-tight mb-2">Shkia Clock</h1>
                    <p className="text-white/40 text-sm">Synchronize with your location</p>
                </div>

                {/* THE FORM STACK: Using Gap to prevent squashed layout */}
                <div className="flex flex-col gap-6 relative z-20">
                    
                    {/* 1. Search Input */}
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-white/40" />
                        </div>
                        <input
                            type="text"
                            // Padding-left 12 (48px) prevents text overlap with icon
                            // h-14 (56px) sets standard height
                            // bg-[#1e293b] is Dark Slate Blue
                            className="block w-full pl-12 pr-4 h-14 bg-[#1e293b] border border-[#334155] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
                            placeholder="Search for a city..."
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

                        {/* Suggestions Dropdown */}
                        <AnimatePresence>
                            {showSuggestions && suggestions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] rounded-xl shadow-2xl overflow-hidden z-50 border border-[#334155]"
                                >
                                    {suggestions.map((city, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelectCity(city)}
                                            className="w-full text-left px-5 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                        >
                                            <div className="text-white font-medium">{city.name}</div>
                                            <div className="text-white/40 text-xs truncate">{city.display_name}</div>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 2. 'OR' Divider */}
                    <div className="flex items-center gap-4">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-white/30 text-xs font-medium uppercase tracking-widest">Or</span>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    {/* 3. Current Location Button */}
                    <button
                        onClick={handleGeolocation}
                        // Transparent bg, White Border, Centered Flex
                        className="w-full h-14 flex items-center justify-center gap-3 bg-transparent border border-white/80 rounded-xl text-white hover:bg-white hover:text-[#0f172a] transition-all duration-300 group"
                    >
                        <MapPin size={20} />
                        <span className="font-medium">Use current location</span>
                    </button>
                
                </div>

            </motion.div>
        </div>
    );
}