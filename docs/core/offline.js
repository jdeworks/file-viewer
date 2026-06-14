// Offline control. The service worker caches every asset it serves (stale-while-revalidate),
// so whatever you actually open while online keeps working offline after a reload — that's
// the DEFAULT (cache-on-use), no action needed. A FULL precache ("save everything so you're
// sure it all works on the train") is OPT-IN: tap the pill.
//
// The pill is a 4-state control:
//   ○ idle     — cache-on-use only; click to save everything offline
//   ⟳ caching  — precaching all assets (resumable across reloads)
//   ✓ ready    — everything cached, matches the current version (green)
//   ✓ update   — everything cached but a newer build exists; serves cache, click to refresh (orange)
//
// No manifest, no install prompt — a service worker is not an installed app.

const VKEY = 'fv:offline:savedVersion';   // version of the last completed full precache

export function initOffline(statusEl) {
  if (!('serviceWorker' in navigator) || !statusEl) return;
  let currentVersion = null;               // latest manifest version (from the SW status)

  const send = (msg) => (navigator.serviceWorker.controller)?.postMessage(msg);

  const setState = (cls, html, title) => {
    statusEl.hidden = false;
    statusEl.className = 'offline-status ' + cls;
    statusEl.innerHTML = html;
    if (title) statusEl.title = title;
  };

  // Resting state derived from saved-vs-current version (works offline; falls back to "saved").
  function rest() {
    const saved = localStorage.getItem(VKEY);
    if (!saved) {
      setState('idle', '<span class="off-ring"></span> Save offline', 'Cache everything so the whole app works without a connection');
    } else if (currentVersion && saved !== currentVersion) {
      setState('update', '<span class="off-check">✓</span> Update available', 'A newer build exists — serving the saved copy. Click to refresh.');
    } else {
      setState('ready', '<span class="off-check">✓</span> Available offline', 'Everything is saved for offline use');
    }
  }

  navigator.serviceWorker.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === 'cache-status') {
      currentVersion = d.version || currentVersion;
      rest();
    } else if (d.type === 'precache-progress') {
      setState('caching', '<span class="off-spin"></span> Saving for offline… ' + d.done + ' / ' + d.total);
    } else if (d.type === 'precache-done') {
      if (d.version) { currentVersion = d.version; localStorage.setItem(VKEY, d.version); }
      rest();
    } else if (d.type === 'precache-error') {
      rest();
    }
  });

  statusEl.style.cursor = 'pointer';
  statusEl.setAttribute('role', 'button');
  statusEl.tabIndex = 0;
  const onActivate = () => {
    if (statusEl.classList.contains('caching')) return;        // already saving
    openCacheModal((files) => {                                // user picked bundles → precache them
      setState('caching', '<span class="off-spin"></span> Saving for offline…');
      send({ type: 'precache', files });
    });
  };
  statusEl.addEventListener('click', onActivate);
  statusEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); } });

  navigator.serviceWorker.register('sw.js').then(async () => {
    await navigator.serviceWorker.ready;
    // Do NOT auto-precache. Just ask for status to pick the resting state.
    send({ type: 'status' });
    // controller may not be set on the very first load; retry once it takes over.
    navigator.serviceWorker.addEventListener('controllerchange', () => send({ type: 'status' }));
  }).catch(() => { /* offline support unavailable — stay online-only */ });
}

// Cache-download modal: pick which asset bundles to save for offline, each with its size.
// Smart defaults: the core app shell is always on; non-heavy bundles are pre-checked; large
// optional libraries (Monaco, pdf.js, …) are shown unchecked so they're opt-in. On confirm,
// the selected bundles' files are handed to the SW to precache. Built on demand, no markup.
function fmtSize(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

async function openCacheModal(onConfirm) {
  let bundles;
  try { bundles = (await (await fetch('asset-manifest.json', { cache: 'no-store' })).json()).bundles || []; }
  catch { onConfirm(undefined); return; }                    // manifest unreachable → just cache all
  if (!bundles.length) { onConfirm(undefined); return; }

  const root = document.createElement('div');
  root.className = 'cache-modal-backdrop';
  root.innerHTML =
    '<div class="cache-modal" role="dialog" aria-label="Save for offline">'
    + '<header class="cm-head"><h2>Save for offline</h2><button class="cm-close" aria-label="Close">✕</button></header>'
    + '<p class="cm-intro">Choose what to cache so it works without a connection. Sizes are downloads.</p>'
    + '<div class="cm-list"></div>'
    + '<footer class="cm-foot"><span class="cm-total"></span><button class="cm-save">Save selected</button></footer>'
    + '</div>';
  document.body.appendChild(root);
  const listEl = root.querySelector('.cm-list');
  const totalEl = root.querySelector('.cm-total');

  listEl.innerHTML = bundles.map((b) => {
    const isCore = b.id === 'core';
    const checked = isCore || !b.heavy;                      // core always; heavy off by default
    return '<label class="cm-row' + (b.heavy ? ' cm-row-heavy' : '') + '">'
      + '<input type="checkbox" class="cm-chk" data-id="' + b.id + '" data-size="' + b.size + '"'
      + (checked ? ' checked' : '') + (isCore ? ' disabled' : '') + '>'
      + '<span class="cm-label">' + (b.label || b.id) + (isCore ? ' <span class="cm-req">(required)</span>' : '') + '</span>'
      + (b.heavy ? '<span class="cm-heavy">large</span>' : '')
      + '<span class="cm-size">' + fmtSize(b.size) + '</span></label>';
  }).join('');

  function updateTotal() {
    let total = 0;
    for (const c of listEl.querySelectorAll('.cm-chk')) if (c.checked) total += Number(c.dataset.size) || 0;
    totalEl.textContent = 'Selected: ' + fmtSize(total);
  }
  updateTotal();
  listEl.addEventListener('change', updateTotal);

  const close = () => root.remove();
  root.querySelector('.cm-close').addEventListener('click', close);
  root.addEventListener('click', (e) => { if (e.target === root) close(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  root.querySelector('.cm-save').addEventListener('click', () => {
    const chosen = new Set();
    for (const c of listEl.querySelectorAll('.cm-chk')) if (c.checked || c.disabled) chosen.add(c.dataset.id);
    const files = bundles.filter((b) => chosen.has(b.id)).flatMap((b) => b.files);
    close();
    onConfirm(files);
  });
}

// Friendly note for a renderer that couldn't load because we're offline and it was never
// cached (cache-on-use never saw it). Points at the opt-in control.
export function offlineMissHtml() {
  return '<div class="offline-miss">'
    + '<div class="om-icon">📡</div>'
    + '<p><strong>Not available offline yet.</strong></p>'
    + '<p>This viewer wasn’t loaded while you were online, so it isn’t in the cache. '
    + 'Anything you’ve already opened still works offline.</p>'
    + '<p>Reconnect once to use it — or, next time you have a connection, tap '
    + '<strong>“Save offline”</strong> (bottom-left) to cache the whole app.</p>'
    + '</div>';
}
