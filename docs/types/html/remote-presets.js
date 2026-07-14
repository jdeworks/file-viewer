// Explicit remote dependency presets for HTML previews. Merely selecting a preset performs no
// request: the preview presents a Load button first. After that user gesture, resources are read
// from this app's dedicated Cache Storage or fetched with CORS and optionally cached.

const CACHE_NAME = 'fv-html-dependencies-v1';

export const HTML_REMOTE_PRESETS = Object.freeze({
  bootstrap: {
    id: 'bootstrap',
    label: 'Bootstrap 5.3.8 (CSS + JS)',
    note: 'Loads Bootstrap CSS and its JavaScript bundle from jsDelivr. JavaScript runs only in the sandboxed preview.',
    resources: [
      {
        type: 'style',
        url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css',
        integrity: 'sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB',
      },
      {
        type: 'script',
        url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js',
        integrity: 'sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI',
      },
    ],
  },
  tailwind: {
    id: 'tailwind',
    label: 'Tailwind Play CDN v4',
    note: 'Loads Tailwind’s development-only browser runtime from jsDelivr. It scans this sandboxed preview and generates utility CSS locally.',
    resources: [
      { type: 'script', url: 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4' },
    ],
  },
});

export function remotePreset(id) {
  return HTML_REMOTE_PRESETS[id] || null;
}

async function openCache() {
  if (typeof caches === 'undefined') return null;
  try { return await caches.open(CACHE_NAME); } catch { return null; }
}

export async function remotePresetStatus(id) {
  const preset = remotePreset(id);
  if (!preset) return null;
  const cache = await openCache();
  let cached = 0;
  if (cache) {
    for (const resource of preset.resources) if (await cache.match(resource.url)) cached++;
  }
  return {
    cached,
    total: preset.resources.length,
    cacheAvailable: !!cache,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
  };
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function verifyIntegrity(buffer, integrity) {
  if (!integrity) return true;
  const [algorithm, expected] = integrity.split('-', 2);
  if (algorithm !== 'sha384' || !expected || !crypto?.subtle) return false;
  const digest = await crypto.subtle.digest('SHA-384', buffer);
  return bytesToBase64(new Uint8Array(digest)) === expected;
}

async function loadResource(resource, { cacheEnabled, signal }) {
  const cache = cacheEnabled ? await openCache() : null;
  let response = cache ? await cache.match(resource.url) : null;
  let source = response ? 'cache' : 'network';
  if (!response) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('This dependency is not cached and the browser is offline.');
    }
    response = await fetch(resource.url, {
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal,
    });
    if (!response.ok) throw new Error('Dependency request failed (' + response.status + ').');
  }
  const buffer = await response.arrayBuffer();
  if (!(await verifyIntegrity(buffer, resource.integrity))) {
    throw new Error('Dependency integrity check failed; the response was not used.');
  }
  if (cache && source === 'network') {
    try {
      await cache.put(resource.url, new Response(buffer.slice(0), {
        headers: { 'content-type': resource.type === 'style' ? 'text/css' : 'text/javascript' },
      }));
    } catch { /* cache quota/availability is reported in the resulting status */ }
  }
  // Script blob URLs inherit the parent origin and are not executable from the preview's opaque
  // sandbox in every browser. A data URL keeps the bytes self-contained inside that sandbox and
  // preserves the same explicit consent boundary. Styles can stay as compact blob URLs.
  const url = resource.type === 'script'
    ? 'data:text/javascript;base64,' + bytesToBase64(new Uint8Array(buffer))
    : URL.createObjectURL(new Blob([buffer], { type: 'text/css' }));
  return { url, source, originalUrl: resource.url, type: resource.type };
}

export async function loadRemotePreset(id, { cacheEnabled = true, signal } = {}) {
  const preset = remotePreset(id);
  if (!preset) return null;
  const loaded = [];
  try {
    for (const resource of preset.resources) loaded.push(await loadResource(resource, { cacheEnabled, signal }));
  } catch (error) {
    for (const resource of loaded) URL.revokeObjectURL(resource.url);
    throw error;
  }
  const extraHead = loaded.map((resource) => resource.type === 'style'
    ? '<link rel="stylesheet" href="' + resource.url + '">'
    : '<script src="' + resource.url + '"></scr' + 'ipt>').join('\n');
  return {
    preset,
    extraHead,
    usedCache: loaded.every((resource) => resource.source === 'cache'),
    fetched: loaded.some((resource) => resource.source === 'network'),
    hasScripts: loaded.some((resource) => resource.type === 'script'),
    revoke() { for (const resource of loaded) if (resource.url.startsWith('blob:')) URL.revokeObjectURL(resource.url); },
  };
}
