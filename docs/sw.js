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
async function precache() {
  if (precaching) return;
  precaching = true;
  try {
    const manifest = await (await fetch('asset-manifest.json', { cache: 'no-store' })).json();
    const cache = await caches.open(CACHE);
    const assets = manifest.assets || [];
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

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'precache') e.waitUntil(precache());
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
