/*
 * Offline support for exam-centre pages only. Registered from /exam/centre/<testId> when the
 * test allows offline, with scope /exam/centre/ so it never touches the rest of the app.
 *
 * - The exam-centre page itself: network first, cached copy when offline, so a reload or a
 *   reboot during an offline exam reopens the exam.
 * - Next.js build assets (/_next/static/): cache first; they are immutable per build.
 *   (Requests for them from the controlled page reach this worker even though the scope is
 *   narrower, because fetch events follow the page, not the URL.)
 */
const CACHE = "astra-exam-centre-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("astra-exam-centre-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// The page that registers this worker loaded its scripts before the worker existed, so it
// sends their URLs (and its own) to be cached now; otherwise the first offline reload would fail.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "precache" || !Array.isArray(data.urls)) return;
  const urls = data.urls.filter((u) => {
    try {
      const url = new URL(u, self.location.origin);
      return url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/exam/centre/"));
    } catch {
      return false;
    }
  });
  const keyFor = (u) => {
    const url = new URL(u, self.location.origin);
    return url.pathname.startsWith("/exam/centre/") ? url.pathname : url.href;
  };
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          urls.map((u) =>
            fetch(u, { credentials: "same-origin" })
              .then((res) => (res.ok && !res.redirected ? cache.put(keyFor(u), res).then(() => true) : false))
              .catch(() => false)
          )
        ).then(async (saved) => {
          // Ready only if the page itself is cached; tell the page so it can say "ready to work offline"
          const pageCached = !!(await cache.match(keyFor(urls.find((u) => keyFor(u).startsWith("/exam/centre/")) || "/exam/centre/")));
          if (event.source) event.source.postMessage({ type: "precached", ok: pageCached && saved.every(Boolean) });
        })
      )
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  if (req.mode === "navigate" && url.pathname.startsWith("/exam/centre/")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) caches.open(CACHE).then((cache) => cache.put(url.pathname, res.clone()));
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || Response.error())
    );
  }
});
