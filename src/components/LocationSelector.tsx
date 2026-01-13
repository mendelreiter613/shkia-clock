"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";

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
            // Using OpenStreetMap Nominatim API (Free, requires User-Agent)
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                    manualCity
                )}&limit=1`,
                {
                    headers: {
                        "User-Agent": "ShkiaClock/1.0"
                    }
                }
            );
            const data = await res.json();

            if (data && data.length > 0) {
                onLocationFound(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name);
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
        <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Set Location</h2>

            <button
                onClick={handleGeolocation}
                disabled={loading}
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 w-full disabled:opacity-50"
            >
                <MapPin size={20} />
                <span>Use My Device Location</span>
            </button>

            <div className="relative flex py-2 items-center w-full">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-400">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <form onSubmit={handleManualSearch} className="w-full space-y-2">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        placeholder="Enter City (e.g., Brooklyn, NY)"
                        value={manualCity}
                        onChange={(e) => setManualCity(e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                        <Search size={20} />
                    </button>
                </div>
            </form>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {loading && <p className="text-gray-500 text-sm animate-pulse">Locating...</p>}
        </div>
    );
}
