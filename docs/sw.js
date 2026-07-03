// Service worker — makes the viewer work fully offline without becoming an "installed app"
// (no manifest, no install prompt). The page drives an opt-in precache via a 'precache'
// message: the SW caches selected assets from asset-manifest.json, skipping ones already cached
// so it RESUMES if interrupted or reloaded, and reports progress back. Versioned static assets
// are cache-first once seen; navigations stay network-first with a cached shell fallback. We avoid
// background revalidating every JS/CSS/JSON request on reload because GitHub Pages request latency
// is a bigger startup cost than the transfer size alone. Same-origin GET only — never third-party.

// VERSION is stamped at build time by scripts/gen-asset-manifest.mjs (it equals the asset-manifest
// version). Two things hang off it: (1) the SW's bytes change every deploy, so the browser detects
// an update and installs a new SW; (2) the cache is NAMED per version, so a new SW serves a single
// CONSISTENT asset set instead of a stale mix of old+new modules (the version-skew that looked like
// a hang). Keep this line in the exact `const VERSION = '...';` shape — the generator rewrites it.
const VERSION = '6976ae1508b9';   // stamped by scripts/gen-asset-manifest.mjs
const CACHE = 'file-viewer-' + VERSION;
const STATUS_KEY = new Request('/__fv-cache-status__/' + VERSION);

let cachePromise = null;
function appCache() {
  if (!cachePromise) cachePromise = caches.open(CACHE);
  return cachePromise;
}

self.addEventListener('install', () => {
  // First install (no worker is active yet): activate immediately so cache-on-use starts now.
  // An UPDATE (an old worker is still active): stay in 'waiting' so the page can prompt the user
  // before we switch versions — auto-takeover would serve a mix of old+new modules (version skew).
  if (!self.registration.active) self.skipWaiting();
});
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  // Drop caches from older versions so we never serve stale assets after an update activates.
  for (const k of await caches.keys()) if (k !== CACHE && k.startsWith('file-viewer')) await caches.delete(k);
  await self.clients.claim();
})()));

async function notify(msg) {
  for (const c of await self.clients.matchAll()) c.postMessage(msg);
}

async function readStatusMeta() {
  const hit = await (await appCache()).match(STATUS_KEY);
  if (!hit) return null;
  try { return await hit.json(); } catch { return null; }
}

async function writeStatusMeta(meta) {
  await (await appCache()).put(STATUS_KEY, new Response(JSON.stringify(meta), {
    headers: { 'content-type': 'application/json' },
  }));
}

let precaching = false;
// `only`: optional list of asset paths to cache (a per-bundle selection from the cache modal).
// When omitted, the whole manifest is cached (the old "save everything" behaviour).
async function precache(only) {
  if (precaching) return;
  precaching = true;
  try {
    const manifest = await (await fetch('asset-manifest.json', { cache: 'no-store' })).json();
    const cache = await appCache();
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
    await writeStatusMeta({ cached: assets.length, total: assets.length, version: manifest.version, complete: true, updatedAt: Date.now() });
    await notify({ type: 'precache-done', total: assets.length, version: manifest.version });
  } catch (err) {
    await notify({ type: 'precache-error', error: String(err) });
  } finally {
    precaching = false;
  }
}

// Report the last known completed precache status without fetching or scanning the whole manifest.
// Cache-on-use is the default; exact bundle accounting happens when the user opens the modal.
async function status() {
  const meta = await readStatusMeta();
  await notify({ type: 'cache-status', cached: meta?.cached || 0, total: meta?.total || 0, version: meta?.version || VERSION, complete: !!meta?.complete });
}

self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'precache') e.waitUntil(precache(e.data.files));
  else if (e.data.type === 'status') e.waitUntil(status());
  // The page's update banner asks us to take over once the user clicks Reload; activating now fires
  // controllerchange in the page, which then reloads into the consistent new version.
  else if (e.data.type === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const isNavigate = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await appCache();
    if (isNavigate) {
      try { const net = await fetch(req); cache.put(req, net.clone()); return net; }
      catch { return (await cache.match(req)) || (await cache.match('index.html')) || Response.error(); }
    }
    const path = new URL(req.url).pathname.replace(/^\//, '');
    if (path === 'sw.js' || path === 'asset-manifest.json') {
      try { const net = await fetch(req, { cache: 'no-store' }); if (net && net.ok) cache.put(req, net.clone()); return net; }
      catch { return (await cache.match(req)) || Response.error(); }
    }
    const hit = await cache.match(req);
    if (hit) return hit;
    const net = await fetch(req);
    if (net && net.ok) e.waitUntil(cache.put(req, net.clone()));
    return net;
  })());
});
