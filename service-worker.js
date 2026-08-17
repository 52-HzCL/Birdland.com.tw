// Bumped with every deploy that changes core assets: `activate` deletes every
// cache whose key is not the current one, which is what evicts the previous
// runtime cache. Without it a returning visitor keeps the old CSS for a load.
const VERSION = "birdland-desks-v56";
const CORE_CACHE = `${VERSION}-core`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./partner.html",
  "./executive.html",
  "./guide.html",
  "./team.html",
  "./about.html",
  "./product-101.html",
  "./cost-desk.html",
  "./my-market.html",
  "./contact.html",
  "./site-shell.css",
  "./shell-nav.css",
  "./site-shell.js",
  "./tokens.css",
  "./text-size.js",
  // The desks' own title bar. terminal.* and desk-banner.* used to be listed
  // here; the desks stopped loading either when they became apps, and Guide
  // is the only page that still wants them.
  "./app-bar.css",
  "./app-bar.js",
  // The desks translate at run time from a dictionary per language, so the
  // runtime and all ten dictionaries are core: a desk installed in German
  // must not come back in English the first time it opens offline.
  "./i18n.js",
  "./i18n/app.en.json",
  "./i18n/app.nl.json",
  "./i18n/app.de.json",
  "./i18n/app.fr.json",
  "./i18n/app.es.json",
  "./i18n/app.pt-br.json",
  "./i18n/app.pl.json",
  "./i18n/app.it.json",
  "./i18n/app.ja.json",
  "./i18n/app.zh-tw.json",
  "./terminal.css",
  "./terminal.js",
  "./terminal.json",
  "./desk-banner.css",
  "./desk-banner.js",
  "./favicon.svg",
  "./birdland-visual.css",
  "./daily-journal.css",
  "./privacy.html",
  // One manifest per installable desk. partner-desk stays for anyone who
  // installed AsiaSource before it was renamed.
  "./partner-desk.webmanifest",
  "./buyer-desk.webmanifest",
  "./cost-desk.webmanifest",
  "./executive-desk.webmanifest",
  "./market-desk.webmanifest",
  "./images/app-news-tile.png",
  "./images/app-buyer-tile.png",
  "./images/app-cost-tile.png",
  "./images/app-market-tile.png",
  "./images/app-news-192.png",
  "./images/app-news-512.png",
  "./images/app-buyer-192.png",
  "./images/app-buyer-512.png",
  "./images/app-cost-192.png",
  "./images/app-cost-512.png",
  "./images/app-market-192.png",
  "./images/app-market-512.png",
  // iOS reads none of the manifest fields above; without these it screenshots
  // the page itself for the home-screen icon.
  "./images/apple-touch-news.png",
  "./images/apple-touch-buyer.png",
  "./images/apple-touch-cost.png",
  "./images/apple-touch-market.png",
  // My Market is nothing without the quarterly customs file, and at ~65KB it
  // costs less to precache than one of the photographs above. An app whose
  // only content arrives over the network is a web page with an icon.
  "./trade.json",
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
    // Search EVERY cache, not just the runtime one. install() precaches all of
    // CORE_ASSETS into CORE_CACHE, so the page being asked for is almost always
    // already on disk — but this only ever looked in RUNTIME_CACHE, which holds
    // just what the reader had visited since. Offline, a page they had not
    // revisited fell straight through to the fallback below, and the fallback
    // is "partner.html unless the URL ends in executive.html". Measured: an
    // offline reload of CostNow, My Market and the home page all rendered
    // AsiaSource under their own URL, while the correct page sat in
    // CORE_CACHE the whole time.
    const cached = (await caches.match(request)) || (await cache.match(request));
    if (cached) return cached;
    return caches.match(fallbackUrl);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  // Same reason as networkFirst: the precached copy lives in CORE_CACHE.
  const cached = (await cache.match(request)) || (await caches.match(request));
  const network = fetch(request).then((response) => {
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  if (cached) return cached;
  // The old line was `cached || network || fetch(request)`. network is a
  // Promise, so it is always truthy and the third branch was unreachable —
  // and when nothing was cached and the fetch failed, this resolved to null.
  // respondWith(null) is what Chrome reports as net::ERR_FAILED, which is how
  // an offline reload produced 12-20 of them per page instead of one clean
  // failure per genuinely missing file.
  const fromNetwork = await network;
  if (fromNetwork) return fromNetwork;
  // Last resort, and only once the network is genuinely gone: match without
  // the query string. CORE_ASSETS lists "./tokens.css" while every page asks
  // for "tokens.css?v=20260814a", and Cache.match is exact on the full URL —
  // so every cache-busted asset on the site has always missed offline, no
  // matter which token was current. That is why an offline page came back
  // unstyled. Kept out of the lookup above on purpose: matching loosely while
  // the network is up would serve the previous CSS to a reader whose page
  // just asked for the new one, which is the whole point of the token.
  const ignoringToken = await caches.match(request, { ignoreSearch: true });
  return ignoringToken || Response.error();
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
