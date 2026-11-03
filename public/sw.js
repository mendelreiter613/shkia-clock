// Service worker: receives daily Shachris reminder pushes and shows them, and
// lets the in-tab reminder show notifications on Android (which requires a
// service worker). No offline caching on purpose; the app needs live times.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data ? event.data.text() : "" };
    }
    const title = data.title || "Time to daven Shachris";
    event.waitUntil(
        self.registration.showNotification(title, {
            body: data.body || "Shkia is coming up soon.",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: "shkia-reminder",
            data: { url: data.url || "/" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || "/";
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
            const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
            return open ? open.focus() : self.clients.openWindow(url);
        })
    );
});
