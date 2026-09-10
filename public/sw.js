// public/sw.js
// Service Worker minimale per Atelier Lumen PWA.
//
// REGOLA D'ORO: questo SW NON deve mai intercettare chiamate dati
// (Supabase, API, fetch verso il backend). Gestisce SOLO la cache
// delle icone della PWA elencate in SHELL_ASSETS.
// Tutto il resto passa dritto alla rete, senza intervento del SW.

const CACHE_NAME = "atelier-lumen-shell-v1";

// Whitelist: SOLO le icone precaricate della PWA.
// Nessuna pagina, nessuna route, nessuna chiamata dati va qui dentro.
const SHELL_ASSETS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/favicon.ico",
];

// INSTALL: precarica solo le icone in whitelist.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ACTIVATE: elimina eventuali cache vecchie di versioni precedenti del SW.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// FETCH: intercetta SOLO le richieste GET per gli asset in whitelist.
// Qualsiasi altra richiesta (pagine, chiamate dati, API, Supabase,
// POST/PUT/PATCH/DELETE, ecc.) NON viene toccata: il browser la
// gestisce normalmente, come se il Service Worker non esistesse.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Non toccare mai nulla che non sia una GET.
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Non toccare mai richieste verso altri domini (es. Supabase, API esterne).
  if (url.origin !== self.location.origin) {
    return;
  }

  // Intercetta SOLO se il path è esattamente uno degli asset in whitelist.
  const isShellAsset = SHELL_ASSETS.includes(url.pathname);
  if (!isShellAsset) {
    // Non è un'icona precaricata: lascia passare la richiesta senza
    // rispondere con event.respondWith(). Il SW resta trasparente.
    return;
  }

  // Solo per le icone: cache-first con fallback alla rete.
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
      );
    })
  );
});
