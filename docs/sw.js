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
const VERSION = '8f11f57ae03c';   // stamped by scripts/gen-asset-manifest.mjs
const CACHE_PREFIX = 'file-viewer-';
const CACHE = 'file-viewer-' + VERSION;
const SCOPE = self.registration.scope;
const STATUS_KEY = new Request(new URL('__fv-cache-status__/' + VERSION, SCOPE));

function appCache() {
  // Do not retain a Cache object forever: users/browsers can evict or delete the named cache while
  // this worker stays alive. Re-opening by name makes status reflect that loss instead of reading a
  // detached object and falsely claiming the old full save still exists.
  return caches.open(CACHE);
}

self.addEventListener('install', () => {
  // First install (no worker is active yet): activate immediately so cache-on-use starts now.
  // An UPDATE (an old worker is still active): stay in 'waiting' so the page can prompt the user
  // before we switch versions — auto-takeover would serve a mix of old+new modules (version skew).
  if (!self.registration.active) self.skipWaiting();
});
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  // Drop caches from older versions so we never serve stale assets after an update activates.
  for (const k of await caches.keys()) {
    if (k !== CACHE && (k === 'file-viewer' || k.startsWith(CACHE_PREFIX))) await caches.delete(k);
  }
  await self.clients.claim();
})()));

async function notify(msg) {
  for (const c of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) c.postMessage(msg);
}

async function reply(msg, client, requestId = null) {
  const payload = requestId ? { ...msg, requestId } : msg;
  if (client?.postMessage) {
    try { client.postMessage(payload); } catch { /* the requesting tab closed */ }
    return;
  }
  await notify(payload);
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

let precacheQueue = Promise.resolve();
// `only`: optional list of asset paths to cache (a per-bundle selection from the cache modal).
// When omitted, the whole manifest is cached (the old "save everything" behaviour).
async function precache(only, client, requestId) {
  try {
    const manifestResponse = await fetch(new URL('asset-manifest.json', SCOPE), { cache: 'no-store' });
    if (!manifestResponse.ok) throw new Error('Could not load the offline asset list (' + manifestResponse.status + ').');
    const manifest = await manifestResponse.json();
    if (manifest.version !== VERSION) throw new Error('Offline asset version changed; reload before saving.');
    const cache = await appCache();
    const allAssets = [...new Set((manifest.assets || []).filter((asset) => typeof asset === 'string' && asset))];
    const allowed = new Set(allAssets);
    const requested = Array.isArray(only) ? only : allAssets;
    const requestedSet = new Set(requested.filter((asset) => allowed.has(asset)));
    const assets = allAssets.filter((asset) => requestedSet.has(asset));
    if (!assets.length) throw new Error('No offline assets were selected.');

    const previous = await readStatusMeta();
    const savedFiles = new Set(previous?.version === VERSION && Array.isArray(previous.savedFiles)
      ? previous.savedFiles.filter((asset) => allowed.has(asset)) : []);
    const pending = [];
    let done = 0;
    for (const asset of assets) {
      if (await cache.match(asset)) { done++; savedFiles.add(asset); }
      else pending.push(asset);
    }
    let processed = done;
    const failures = [];
    await reply({ type: 'precache-progress', done, processed, failed: 0, total: assets.length }, client, requestId);
    const queue = pending.slice();
    const worker = async () => {
      while (queue.length) {
        const asset = queue.shift();
        try {
          const url = new URL(asset, SCOPE);
          if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(SCOPE).pathname)) {
            throw new Error('Asset is outside the service-worker scope.');
          }
          const request = new Request(url, { cache: 'reload', credentials: 'same-origin', redirect: 'error' });
          const response = await fetch(request);
          if (!response.ok) throw new Error('HTTP ' + response.status);
          await cache.put(request, response);
          savedFiles.add(asset);
          done++;
        } catch (error) {
          failures.push({ asset, error: String(error?.message || error) });
        }
        processed++;
        if (processed % 4 === 0 || !queue.length) {
          await reply({ type: 'precache-progress', done, processed, failed: failures.length, total: assets.length }, client, requestId);
        }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));

    // Reconcile metadata against actual Cache Storage after every save. A stale status record may
    // outlive individual entries deleted in DevTools or by storage pressure; never count those as
    // saved, even when they were outside the just-requested bundle selection.
    savedFiles.clear();
    for (let offset = 0; offset < allAssets.length; offset += 64) {
      const slice = allAssets.slice(offset, offset + 64);
      const hits = await Promise.all(slice.map((asset) => cache.match(asset)));
      hits.forEach((hit, index) => { if (hit) savedFiles.add(slice[index]); });
    }
    const full = failures.length === 0 && savedFiles.size === allAssets.length;
    const meta = {
      cached: savedFiles.size,
      total: allAssets.length,
      selected: assets.length,
      version: VERSION,
      complete: full,
      full,
      selectionComplete: failures.length === 0,
      savedFiles: [...savedFiles],
      failed: failures.map(({ asset }) => asset),
      updatedAt: Date.now(),
    };
    await writeStatusMeta(meta);
    if (failures.length) {
      await reply({
        type: 'precache-error',
        error: failures.length + ' offline asset' + (failures.length === 1 ? '' : 's') + ' could not be saved.',
        failed: failures.slice(0, 20),
        done,
        total: assets.length,
      }, client, requestId);
    } else {
      await reply({
        type: 'precache-done',
        selected: assets.length,
        cached: savedFiles.size,
        total: allAssets.length,
        full,
        version: VERSION,
      }, client, requestId);
    }
  } catch (err) {
    await reply({ type: 'precache-error', error: String(err) }, client, requestId);
  }
}

function enqueuePrecache(only, client, requestId) {
  const run = precacheQueue.then(() => precache(only, client, requestId));
  // Keep the queue usable even if a future change lets an unexpected rejection escape precache().
  precacheQueue = run.catch(() => {});
  return run;
}

// Report the last known completed precache status without fetching or scanning the whole manifest.
// Cache-on-use is the default; exact bundle accounting happens when the user opens the modal.
async function status(client) {
  const meta = await readStatusMeta();
  await reply({
    type: 'cache-status',
    cached: meta?.cached || 0,
    total: meta?.total || 0,
    version: VERSION,
    complete: !!meta?.full,
    full: !!meta?.full,
    selectionComplete: !!meta?.selectionComplete,
  }, client);
}

self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'precache') {
    const requestId = typeof e.data.requestId === 'string' ? e.data.requestId : null;
    e.waitUntil(enqueuePrecache(e.data.files, e.source, requestId));
  }
  else if (e.data.type === 'status') e.waitUntil(status(e.source));
  // The page's update banner asks us to take over once the user clicks Reload; activating now fires
  // controllerchange in the page, which then reloads into the consistent new version.
  else if (e.data.type === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const isNavigate = req.mode === 'navigate';
  const cacheLater = (cache, request, response) => {
    const write = cache.put(request, response).catch(() => { /* quota/private-mode failures stay online-only */ });
    try { e.waitUntil(write); } catch { /* respondWith still returns the network response */ }
  };
  e.respondWith((async () => {
    const cache = await appCache();
    if (isNavigate) {
      try {
        const net = await fetch(req);
        if (net && net.ok) cacheLater(cache, req, net.clone());
        return net;
      }
      catch { return (await cache.match(req)) || (await cache.match('index.html')) || Response.error(); }
    }
    const requestPath = new URL(req.url).pathname;
    const scopePath = new URL(SCOPE).pathname;
    const path = requestPath.startsWith(scopePath) ? requestPath.slice(scopePath.length) : '';
    if (path === 'sw.js' || path === 'asset-manifest.json') {
      try {
        const net = await fetch(req, { cache: 'no-store' });
        if (net && net.ok) cacheLater(cache, req, net.clone());
        return net;
      }
      catch { return (await cache.match(req)) || Response.error(); }
    }
    const hit = await cache.match(req);
    if (hit) return hit;
    const net = await fetch(req);
    if (net && net.ok) cacheLater(cache, req, net.clone());
    return net;
  })());
});
