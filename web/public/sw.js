// Minimal service worker: makes the portal installable and shows a clear
// message when offline. Nothing is cached, so users never see stale data.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Offline</title><body style='font-family:system-ui;padding:40px;text-align:center;color:#101a36'><h1 style='font-size:20px'>You are offline</h1><p>Jain OOA Portal needs an internet connection. Reconnect and try again.</p></body>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        ),
    ),
  );
});
