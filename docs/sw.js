// Service worker — makes the viewer work fully offline without becoming an "installed app"
// (no manifest, no install prompt). The page drives a background precache via a 'precache'
// message: the SW caches every asset in asset-manifest.json, skipping ones already cached
// so it RESUMES if interrupted or reloaded, and reports progress back. Requests are served
// stale-while-revalidate for assets (instant from cache, refreshed in the background when
// online) and network-first for navigations (fresh HTML online, cached shell offline).
// Same-origin GET only — never touches a third party.

const CACHE = 'file-viewer';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

async function notify(msg) {
  for (const c of await self.clients.matchAll()) c.postMessage(msg);
}

let precaching = false;
// `only`: optional list of asset paths to cache (a per-bundle selection from the cache modal).
// When omitted, the whole manifest is cached (the old "save everything" behaviour).
async function precache(only) {
  if (precaching) return;
  precaching = true;
  try {
    const manifest = await (await fetch('asset-manifest.json', { cache: 'no-store' })).json();
    const cache = await caches.open(CACHE);
    let assets = manifest.assets || [];
    if (Array.isArray(only) && only.length) { const set = new Set(only); assets = assets.filter((a) => set.has(a)); }
    const pending = [];
    let done = 0;
    for (const a of assets) { if (await cache.match(a)) done++; else pending.push(a); }   // resume
    await notify({ type: 'precache-progress', done, total: assets.length });
    const queue = pending.slice();
    const worker = async () => {
      while (queue.length) {
        const a = queue.shift();
        try { await cache.add(a); } catch { /* skip a failed asset */ }
        done++;
        if (done % 4 === 0 || !queue.length) await notify({ type: 'precache-progress', done, total: assets.length });
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    await notify({ type: 'precache-done', total: assets.length, version: manifest.version });
  } catch (err) {
    await notify({ type: 'precache-error', error: String(err) });
  } finally {
    precaching = false;
  }
}

// Report how much of the manifest is already cached + the current manifest version,
// WITHOUT fetching anything new — lets the page show a resting pill state (cache-on-use is
// the default; a full precache is opt-in). Offline: falls back to the cached manifest.
async function status() {
  let version = null, total = 0, cached = 0;
  try {
    const res = await fetch('asset-manifest.json', { cache: 'no-store' }).catch(() => caches.match('asset-manifest.json'));
    const manifest = await res.json();
    version = manifest.version;
    const assets = manifest.assets || [];
    total = assets.length;
    const cache = await caches.open(CACHE);
    for (const a of assets) { if (await cache.match(a)) cached++; }
  } catch { /* no manifest reachable — report unknown (version stays null) */ }
  await notify({ type: 'cache-status', cached, total, version });
}

self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'precache') e.waitUntil(precache(e.data.files));
  else if (e.data.type === 'status') e.waitUntil(status());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const isNavigate = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isNavigate) {
      try { const net = await fetch(req); cache.put(req, net.clone()); return net; }
      catch { return (await cache.match(req)) || (await cache.match('index.html')) || Response.error(); }
    }
    const hit = await cache.match(req);
    const network = fetch(req).then((net) => { if (net && net.ok) cache.put(req, net.clone()); return net; }).catch(() => null);
    if (hit) { e.waitUntil(network); return hit; }
    return (await network) || Response.error();
  })());
});
