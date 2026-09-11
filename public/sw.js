// Service Worker Atelier Lumen — versione minimale e sicura (v3).
//
// Il tentativo precedente escludeva le pagine del gestionale per percorso
// (/gestionale, /auth), ma le chiamate che portano davvero i dati (le
// funzioni server come getWorkspace) passano da un indirizzo tecnico
// diverso da quello della pagina, quindi restavano comunque intercettate.
//
// Soluzione più sicura: il Service Worker ora risponde SOLO alle richieste
// dei file dell'involucro statico (icone, manifest) che ha già in cache —
// e per ogni altra richiesta, di qualunque tipo o pagina, non interviene
// affatto: il browser la gestisce esattamente come se il Service Worker
// non esistesse. Ottiene comunque tutto ciò che serve per installare il
// sito come app, senza nessun rischio di interferire con i dati.

const CACHE_NAME = "atelier-lumen-shell-v3";
const SHELL_ASSETS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.ico"];

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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Solo per i 4 file dell'involucro statico: rispondi dalla cache se il
  // dispositivo è offline, altrimenti lascia fare alla rete normalmente.
  // Per TUTTO il resto (pagine, dati, chiamate alle funzioni server):
  // nessun intervento, nessun respondWith — il Service Worker si
  // "toglie di mezzo" completamente.
  if (!SHELL_ASSETS.includes(url.pathname)) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached ?? Response.error())),
  );
});
