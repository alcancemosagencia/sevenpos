const CACHE_NAME = "sevenpos-static-v3";
const LEGACY_CACHE_PREFIX = "sevenpos-";
const STATIC_ASSETS = [
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/maskable-icon.svg",
  "/icons/apple-touch-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key.startsWith(LEGACY_CACHE_PREFIX))
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SEVENPOS_CLEAR_LEGACY_CACHES") return;

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key.startsWith(LEGACY_CACHE_PREFIX))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/sign-in") || url.pathname.startsWith("/sign-up")) return;

  // Next chunks are already fingerprinted and managed by Next/Vercel. Caching
  // them here can serve stale client code with obsolete Server Action ids.
  if (url.pathname.startsWith("/_next/static/")) return;

  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
