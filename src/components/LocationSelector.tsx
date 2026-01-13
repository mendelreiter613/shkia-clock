"use client";

import { useState } from "react";
import { MapPin, ArrowRight, Loader2 } from "lucide-react";
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
        <div className="flex flex-col items-center justify-center min-h-screen w-full p-4 relative overflow-hidden bg-black text-white">
            {/* Cinematic Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-black to-black opacity-80 z-0" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-lg text-center"
            >
                <h1 className="text-4xl md:text-5xl font-thin tracking-wide mb-12 text-white/90">
                    Shkia Clock
                </h1>

                {/* Improved Input Layout - No Overlap */}
                <form onSubmit={handleManualSearch} className="relative w-full flex flex-col items-center space-y-6">
                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder="Enter City..."
                            autoFocus
                            value={manualCity}
                            onChange={(e) => setManualCity(e.target.value)}
                            className="w-full bg-transparent border-b border-white/30 py-4 text-3xl text-center font-light focus:outline-none focus:border-blue-400 transition-colors placeholder-white/20"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!manualCity || loading}
                        className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-full text-sm uppercase tracking-widest transition-all disabled:opacity-0 flex items-center justify-center space-x-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <span>Search</span>}
                        {!loading && <ArrowRight size={16} />}
                    </button>
                </form>

                <div className="mt-12 flex items-center justify-center w-full">
                    <div className="h-px bg-white/10 w-12 mx-4"></div>
                    <span className="text-white/30 text-xs uppercase tracking-widest">OR</span>
                    <div className="h-px bg-white/10 w-12 mx-4"></div>
                </div>

                <div className="mt-8">
                    <button
                        onClick={handleGeolocation}
                        disabled={loading}
                        className="flex items-center justify-center space-x-2 mx-auto text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest text-xs border border-blue-400/30 px-6 py-3 rounded-full hover:bg-blue-400/10"
                    >
                        <MapPin size={14} />
                        <span>Use My Location</span>
                    </button>
                </div>

                {error && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-6 text-red-500 font-mono text-sm tracking-wider"
                    >
                        {error}
                    </motion.p>
                )}
            </motion.div>
        </div>
    );
}
