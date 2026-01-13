"use client";

import { useState } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
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
        <div className="flex flex-col items-center justify-center min-h-screen w-full p-6 relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-2000"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Title */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl md:text-6xl font-bold text-white mb-3 drop-shadow-2xl">
                        Shkia Clock
                    </h1>
                    <p className="text-white/70 text-lg tracking-wide">Track the sunset, never miss the zman</p>
                </div>

                {/* Search Form */}
                <form onSubmit={handleManualSearch} className="space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Enter your city..."
                            autoFocus
                            value={manualCity}
                            onChange={(e) => setManualCity(e.target.value)}
                            className="w-full bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-2xl px-6 py-4 text-white placeholder-white/40 text-lg focus:outline-none focus:border-white/60 transition-all shadow-xl"
                        />
                        <button
                            type="submit"
                            disabled={!manualCity || loading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all disabled:opacity-0"
                        >
                            {loading ? <Loader2 className="animate-spin text-white" size={20} /> : <Search className="text-white" size={20} />}
                        </button>
                    </div>
                </form>

                {/* Divider */}
                <div className="flex items-center my-8">
                    <div className="flex-1 h-px bg-white/20"></div>
                    <span className="px-4 text-white/50 text-sm uppercase tracking-widest">Or</span>
                    <div className="flex-1 h-px bg-white/20"></div>
                </div>

                {/* Geolocation Button */}
                <button
                    onClick={handleGeolocation}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border-2 border-white/20 rounded-2xl px-6 py-4 text-white transition-all shadow-xl disabled:opacity-50"
                >
                    <MapPin size={20} />
                    <span className="text-lg font-medium">Use My Location</span>
                </button>

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-center backdrop-blur-sm"
                    >
                        {error}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
