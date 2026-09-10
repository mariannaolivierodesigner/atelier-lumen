// Service Worker Atelier Lumen — versione minimale e sicura.
// Rende il sito installabile senza mettere in cache dati che devono restare
// sempre aggiornati (disponibilità, prenotazioni). Solo l'involucro statico
// (icone, manifest) viene messo in cache come fallback offline.

const CACHE_NAME = "atelier-lumen-shell-v2";
const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // L'area riservata (gestionale, login) deve SEMPRE arrivare dalla rete, mai
  // dalla cache né passare dal Service Worker: sono dati che cambiano di
  // continuo (prenotazioni, disponibilità) e un intoppo di rete qui non deve
  // mai tradursi in una pagina vuota o rotta. Lasciamo fare al browser come
  // se il Service Worker non esistesse.
  if (url.pathname.startsWith("/gestionale") || url.pathname.startsWith("/auth")) return;

  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached ?? Response.error()),
    ),
  );
});
