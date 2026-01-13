"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface LocationSelectorProps {
    onLocationFound: (lat: number, lng: number, name: string) => void;
}

export default function LocationSelector({ onLocationFound }: LocationSelectorProps) {
    const [manualCity, setManualCity] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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

    const handleManualSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCity.trim()) return;

        setLoading(true);
        setError("");

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                    manualCity
                )}&limit=1`,
                { headers: { "User-Agent": "ShkiaClock/1.0" } }
            );
            const data = await res.json();

            if (data && data.length > 0) {
                onLocationFound(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name.split(',')[0]);
            } else {
                setError("City not found");
            }
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black flex flex-col">

            {/* Header - Logo */}
            <div className="p-6">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                    </div>
                    <span className="text-xl font-bold tracking-tight">SHKIA CLOCK</span>
                </div>
            </div>

            {/* Main Content - Centered */}
            <div className="flex-1 flex items-center justify-center px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-2xl text-center"
                >
                    {/* Title */}
                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
                        Shkia Clock
                    </h1>
                    <p className="text-white/60 text-lg md:text-xl mb-12 tracking-wide">
                        Track sunset times for your location
                    </p>

                    {/* Search Form */}
                    <form onSubmit={handleManualSearch} className="mb-8">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search city..."
                                autoFocus
                                value={manualCity}
                                onChange={(e) => setManualCity(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-full px-6 py-4 pr-12 text-white placeholder-white/40 text-lg focus:outline-none focus:border-white/40 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!manualCity || loading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 hover:bg-white/10 rounded-full transition-all disabled:opacity-30"
                            >
                                {loading ? <Loader2 className="animate-spin text-white" size={20} /> : <Search className="text-white/60" size={20} />}
                            </button>
                        </div>
                    </form>

                    {/* Use Location Button */}
                    <button
                        onClick={handleGeolocation}
                        disabled={loading}
                        className="text-white/60 hover:text-white text-sm uppercase tracking-[0.2em] transition-colors disabled:opacity-50"
                    >
                        Or use my current location
                    </button>

                    {/* Error */}
                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-6 text-red-400 text-sm"
                        >
                            {error}
                        </motion.p>
                    )}
                </motion.div>
            </div>

            {/* Footer */}
            <div className="p-6 text-center">
                <p className="text-white/30 text-xs uppercase tracking-[0.2em]">
                    Based on Hebcal Halachic Algorithms
                </p>
            </div>
        </div>
    );
}
