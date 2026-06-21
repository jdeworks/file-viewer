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

  // Show the pill immediately in its derived resting state. Previously it only appeared once the
  // SW replied with a cache-status message — but `send` no-ops when there's no controller yet
  // (first load / after a deploy / hard reload), so the pill could stay hidden ("disappears").
  // rest() reads localStorage and works without the SW; the SW message just refines it later.
  rest();

  navigator.serviceWorker.register('sw.js').then(async () => {
    await navigator.serviceWorker.ready;
    // Do NOT auto-precache. Just ask for status to pick the resting state.
    send({ type: 'status' });
    // controller may not be set on the very first load; retry once it takes over.
    navigator.serviceWorker.addEventListener('controllerchange', () => send({ type: 'status' }));
  }).catch(() => { /* offline support unavailable — stay online-only */ });
}

// Cache-download modal: grouped, collapsible bundle picker with select-all, per-group meta, and
// a running size total. Emulator bundles are hidden unless enableEmulators is on in Advanced settings.
function fmtSize(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

function emulatorsEnabled() {
  try {
    const saved = JSON.parse(localStorage.getItem('fv:settings:global') || 'null');
    return saved?.enableEmulators === true;
  } catch { return false; }
}

const GROUP_ORDER = ['App shell', 'File viewers', 'Editor', 'Data & charts', 'Documents', 'Archives', 'Media', 'Games', 'Content', 'Emulators'];

async function openCacheModal(onConfirm) {
  let bundles;
  try { bundles = (await (await fetch('asset-manifest.json', { cache: 'no-store' })).json()).bundles || []; }
  catch { onConfirm(undefined); return; }
  if (!bundles.length) { onConfirm(undefined); return; }

  // Filter emulator bundles unless enabled in Advanced settings
  if (!emulatorsEnabled()) bundles = bundles.filter((b) => b.group !== 'Emulators');

  // Group by b.group preserving GROUP_ORDER
  const grouped = new Map();
  for (const b of bundles) {
    const g = b.group || 'Other';
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g).push(b);
  }
  const cats = [...grouped.keys()].sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a), ib = GROUP_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });

  const root = document.createElement('div');
  root.className = 'cache-modal-backdrop';
  root.innerHTML =
    '<div class="cache-modal" role="dialog" aria-label="Save for offline">'
    + '<header class="cm-head"><h2>Save for offline</h2><button class="cm-close" aria-label="Close">✕</button></header>'
    + '<p class="cm-intro">Choose what to cache so it works without a connection. Sizes are downloads.</p>'
    + '<div class="cm-toolbar"><button class="cm-all">Select all</button><button class="cm-none">Deselect all</button><span class="cm-grand-total"></span></div>'
    + '<div class="cm-groups"></div>'
    + '<footer class="cm-foot"><span class="cm-total"></span><button class="cm-save">Save selected</button></footer>'
    + '</div>';
  document.body.appendChild(root);

  const groupsEl = root.querySelector('.cm-groups');
  const totalEl = root.querySelector('.cm-total');
  const grandEl = root.querySelector('.cm-grand-total');

  function rowHtml(b) {
    const isCore = b.id === 'core' || b.id === 'known';
    const checked = isCore || !b.heavy;
    return '<label class="cm-row' + (b.heavy ? ' cm-row-heavy' : '') + '">'
      + '<input type="checkbox" class="cm-chk" data-id="' + b.id + '" data-size="' + b.size + '"'
      + (checked ? ' checked' : '') + (isCore ? ' disabled' : '') + '>'
      + '<span class="cm-label">' + (b.label || b.id) + (isCore ? ' <span class="cm-req">(required)</span>' : '') + '</span>'
      + (b.heavy ? '<span class="cm-heavy">large</span>' : '')
      + '<span class="cm-size">' + fmtSize(b.size) + '</span></label>';
  }

  // Build group sections
  for (const cat of cats) {
    const bs = grouped.get(cat);
    const isAppShell = cat === 'App shell';
    const sec = document.createElement('div');
    sec.className = 'cm-group';
    const head = document.createElement('div');
    head.className = 'cm-group-head';
    head.innerHTML = '<button class="cm-toggle">' + (isAppShell ? '▸' : '▾') + '</button>'
      + '<span class="cm-group-label">' + cat + '</span>'
      + '<span class="cm-group-meta"></span>';
    const body = document.createElement('div');
    body.className = 'cm-group-body' + (isAppShell ? ' cm-collapsed' : '');
    body.innerHTML = bs.map(rowHtml).join('');
    sec.appendChild(head);
    sec.appendChild(body);
    groupsEl.appendChild(sec);

    head.addEventListener('click', () => {
      const collapsed = body.classList.toggle('cm-collapsed');
      head.querySelector('.cm-toggle').textContent = collapsed ? '▸' : '▾';
    });
  }

  function updateTotals() {
    let grand = 0;
    for (const sec of groupsEl.querySelectorAll('.cm-group')) {
      let sel = 0, tot = 0, selSize = 0;
      for (const c of sec.querySelectorAll('.cm-chk')) {
        tot++;
        const sz = Number(c.dataset.size) || 0;
        if (c.checked) { sel++; selSize += sz; grand += sz; }
      }
      const meta = sec.querySelector('.cm-group-meta');
      if (meta) meta.textContent = sel + ' / ' + tot + ' selected · ' + fmtSize(selSize);
    }
    totalEl.textContent = 'Selected: ' + fmtSize(grand);
    grandEl.textContent = 'Total: ' + fmtSize(grand);
  }
  updateTotals();
  groupsEl.addEventListener('change', updateTotals);

  root.querySelector('.cm-all').addEventListener('click', () => {
    for (const c of root.querySelectorAll('.cm-chk:not(:disabled)')) c.checked = true;
    updateTotals();
  });
  root.querySelector('.cm-none').addEventListener('click', () => {
    for (const c of root.querySelectorAll('.cm-chk:not(:disabled)')) c.checked = false;
    updateTotals();
  });

  const close = () => root.remove();
  root.querySelector('.cm-close').addEventListener('click', close);
  root.addEventListener('click', (e) => { if (e.target === root) close(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  root.querySelector('.cm-save').addEventListener('click', () => {
    const chosen = new Set();
    for (const c of root.querySelectorAll('.cm-chk')) if (c.checked || c.disabled) chosen.add(c.dataset.id);
    const files = bundles.filter((b) => chosen.has(b.id)).flatMap((b) => b.files);
    close();
    onConfirm(files);
  });
}

export function initOfflineBadge() {
  const badge = document.getElementById('offlineBadge');
  if (!badge) return;
  badge.textContent = 'Offline';
  if (!navigator.onLine) badge.hidden = false;
  window.addEventListener('online', () => { badge.hidden = true; });
  window.addEventListener('offline', () => { badge.hidden = false; });
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
