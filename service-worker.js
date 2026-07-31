const VERSION = "birdland-desks-v29";
const CORE_CACHE = `${VERSION}-core`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./partner.html",
  "./executive.html",
  "./news.html",
  "./team.html",
  "./about.html",
  "./product-101.html",
  "./cost-desk.html",
  "./contact.html",
  "./site-shell.css",
  "./shell-nav.css",
  "./site-shell.js",
  "./terminal-strip.css",
  "./birdland-visual.css",
  "./daily-journal.css",
  "./privacy.html",
  "./birdland-intro.html",
  "./partner-desk.webmanifest",
  "./executive-desk.webmanifest",
  "./product-offers.json",
  "./calendar-events.json",
  "./calendars/global.ics",
  "./calendars/regulation.ics",
  "./partner-desk-icon.svg",
  "./images/thumbs/finished-goods-warehouse.webp",
  "./images/thumbs/blade-forming.webp",
  "./images/thumbs/chairman-inspection.webp",
  "./images/thumbs/assembly-calibration.webp",
  "./images/hero-forged-trowel.webp",
  "./images/hero-supply-firewall-option-a-dutch-trowel.png",
  "./images/hero-oem-program-production-quality-v2.webp",
  "./images/free-subscription-mailbox-option-a.webp",
  "./images/foundry-engraving.webp",
  "./images/pruner-inspection.webp",
  "./images/buyer-anatomy-pruner.webp",
  "./images/buyer-anatomy-hand-trowel-v5.webp",
  "./images/buyer-anatomy-rake-direct-v4.webp",
  "./images/buyer-anatomy-sprinkler.webp",
  "./images/buyer-anatomy-packaging.webp",
  "./images/asia-supply-map.webp",
  "./images/thumbs/raw-materials.webp",
  "./images/thumbs/tooling-die-library.webp",
  "./images/thumbs/frame-welding.webp",
  "./images/thumbs/surface-treatment.webp",
  "./images/thumbs/pre-shipment-sampling.webp",
  "./images/thumbs/wooden-handle.webp",
  "./images/thumbs/outbound-shipping.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CORE_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isSameOrigin(requestUrl) {
  return new URL(requestUrl).origin === self.location.origin;
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return caches.match(fallbackUrl);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  return cached || network || fetch(request);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isSameOrigin(request.url)) return;

  const url = new URL(request.url);
  if (request.mode === "navigate" || request.destination === "document" || url.pathname.endsWith(".json")) {
    const fallback = url.pathname.endsWith("/executive.html") ? "./executive.html" : "./partner.html";
    event.respondWith(networkFirst(request, fallback));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
