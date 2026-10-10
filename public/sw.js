/* Service worker de "Posibles regalos" (escrito a mano, sin librerías).
 *
 * - Guarda en caché lo básico (página, iconos, manifest y los JS/CSS de Next)
 *   para que la app abra rápido.
 * - NUNCA toca las peticiones a Supabase: los regalos siempre van en directo.
 * - Cuando hay versión nueva se queda esperando; solo se activa cuando la
 *   página le manda SKIP_WAITING (botón "Actualizar").
 *
 * /sw-version.js lo genera Next en cada build (define self.APP_VERSION).
 * Como el navegador compara también los scripts importados, cada despliegue
 * cuenta como versión nueva del service worker aunque este archivo no cambie.
 */
importScripts("/sw-version.js");

const VERSION = self.APP_VERSION || "dev";
const CACHE = `regalos-${VERSION}`;
const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  // Sin skipWaiting(): la versión nueva espera a que el usuario pulse "Actualizar".
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("regalos-") && k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function esSupabase(url) {
  return url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.in");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Supabase (y cualquier otro dominio) va directo a la red, sin pasar por la caché.
  if (esSupabase(url) || url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js" || url.pathname === "/sw-version.js") return;

  // Páginas: primero la red (siempre lo último); si no hay conexión, la copia guardada.
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // JS/CSS de Next: llevan hash en el nombre y no cambian nunca → caché primero.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Iconos y manifest: se sirven de la caché y se refrescan por detrás.
  if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put("/", res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await cache.match("/")) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const refresh = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || refresh;
}
