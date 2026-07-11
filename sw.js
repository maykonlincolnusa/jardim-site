const CACHE_VERSION = "jardim-pwa-v11";
const APP_SHELL = [
  "/",
  "/index.html",
  "/politica-de-privacidade.html",
  "/produtos.html",
  "/jardim-acolher.html",
  "/jardim-baby-care.html",
  "/jardim-integral-humanizado.html",
  "/jardim-familia.html",
  "/jardim-club.html",
  "/css/style.css",
  "/js/main.js",
  "/manifest.webmanifest",
  "/assets/icons/pwa-icon.svg",
  "/assets/images/logo-jardim.png",
  "/assets/images/hero-roda.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match("/index.html"));
    })
  );
});
