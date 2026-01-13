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
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 opacity-50 z-0" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-xl text-center"
            >
                <h1 className="text-4xl md:text-6xl font-extralight tracking-tight mb-12 opacity-80">
                    Where are you?
                </h1>

                <form onSubmit={handleManualSearch} className="relative w-full group">
                    <input
                        type="text"
                        placeholder="Type your city..."
                        autoFocus
                        value={manualCity}
                        onChange={(e) => setManualCity(e.target.value)}
                        className="w-full bg-transparent border-b-2 border-white/20 py-4 text-3xl md:text-5xl text-center font-light focus:outline-none focus:border-white/60 transition-colors placeholder-white/10"
                    />

                    <button
                        type="submit"
                        disabled={!manualCity || loading}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 opacity-0 group-focus-within:opacity-100 disabled:opacity-0 transition-opacity"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={32} />}
                    </button>
                </form>

                <div className="mt-16">
                    <button
                        onClick={handleGeolocation}
                        disabled={loading}
                        className="flex items-center justify-center space-x-3 mx-auto text-white/40 hover:text-white transition-colors uppercase tracking-widest text-sm"
                    >
                        <MapPin size={16} />
                        <span>Use Current Location</span>
                    </button>
                </div>

                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 text-red-500 font-mono tracking-widest"
                    >
                        {error}
                    </motion.p>
                )}
            </motion.div>
        </div>
    );
}
