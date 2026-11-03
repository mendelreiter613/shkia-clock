"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "@/lib/pushClient";

export default function ServiceWorkerRegister() {
    useEffect(() => {
        captureInstallPrompt();
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js").catch(() => {
                // Reminders just won't be available; the clock itself is unaffected.
            });
        }
    }, []);
    return null;
}
