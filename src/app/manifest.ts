import type { MetadataRoute } from "next";

// Makes the site installable ("Add to Home Screen"). iOS only delivers web
// push to sites opened from the home screen, so this is what unlocks daily
// reminders there.
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Shkia Trusher",
        short_name: "Shkia Trusher",
        description: "Countdown to shkia, with a daily Shachris reminder",
        start_url: "/",
        display: "standalone",
        background_color: "#020617",
        theme_color: "#020617",
        icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
