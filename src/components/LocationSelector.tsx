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
            setError("Geolocation is not supported by your browser");
            setLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onLocationFound(position.coords.latitude, position.coords.longitude, "Your Location");
                setLoading(false);
            },
            () => {
                setError("Unable to retrieve your location");
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
            setError("Error searching for city");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-8 rounded-2xl w-full max-w-md text-white"
        >
            <h2 className="text-3xl font-bold mb-6 text-center tracking-tight">Set Location</h2>

            <button
                onClick={handleGeolocation}
                disabled={loading}
                className="flex items-center justify-center space-x-2 w-full py-3 bg-blue-600 hover:bg-blue-500 transition-all rounded-xl font-medium shadow-lg shadow-blue-900/50 disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <MapPin size={20} />}
                <span>Auto-Detect Location</span>
            </button>

            <div className="relative flex py-6 items-center w-full">
                <div className="flex-grow border-t border-white/20"></div>
                <span className="flex-shrink mx-4 text-white/40 text-sm tracking-widest uppercase">Or Enter City</span>
                <div className="flex-grow border-t border-white/20"></div>
            </div>

            <form onSubmit={handleManualSearch} className="w-full relative">
                <input
                    type="text"
                    placeholder="New York, Jerusalem, London..."
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-white/30 transition-all"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
            </form>

            {error && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-400 text-sm mt-4 text-center bg-red-900/20 p-2 rounded-lg border border-red-500/20"
                >
                    {error}
                </motion.p>
            )}
        </motion.div>
    );
}
