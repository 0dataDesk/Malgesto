// Service worker mínimo: hace instalable la app. No guarda páginas (llevan datos
// de cada usuario); solo deja pasar las peticiones y guarda los íconos.
const CACHE = "malgesto-v1";
const ESTATICOS = ["/icons/icon-192.png", "/icons/icon-512.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESTATICOS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !ESTATICOS.includes(url.pathname)) return; // lo demás va directo a la red
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
