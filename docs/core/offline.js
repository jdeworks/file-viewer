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
  let currentVersion = null;
  let statusKnown = false;
  let fullAvailable = false;
  let cachedAssets = 0;
  let totalAssets = 0;
  let pendingMessage = null;
  let activePrecacheRequest = null;
  let activeClearRequest = null;
  let requestSequence = 0;

  const nextRequestId = () => {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    return `offline-${Date.now().toString(36)}-${(++requestSequence).toString(36)}-${random[0].toString(36)}`;
  };

  const send = (msg) => {
    const controller = navigator.serviceWorker.controller;
    if (!controller) return false;
    controller.postMessage(msg);
    return true;
  };

  const setState = (cls, html, title) => {
    statusEl.hidden = false;
    statusEl.className = 'offline-status ' + cls;
    statusEl.innerHTML = html;
    if (title) statusEl.title = title;
  };

  // Cache Storage status is authoritative. localStorage is only a fast startup hint: browsers can
  // evict Cache Storage without evicting localStorage, so it must never independently claim ready.
  function rest() {
    const saved = localStorage.getItem(VKEY);
    if (!statusKnown) {
      if (saved) setState('checking', '<span class="off-spin"></span> Checking offline save…', 'Verifying the saved offline files');
      else setState('idle', '<span class="off-ring"></span> Save offline', 'Choose files and viewers to make available without a connection');
    } else if (fullAvailable && currentVersion) {
      localStorage.setItem(VKEY, currentVersion);
      setState('ready', '<span class="off-check">✓</span> Available offline', 'The complete current viewer is saved for offline use');
    } else if (cachedAssets > 0) {
      localStorage.removeItem(VKEY);
      const count = totalAssets ? cachedAssets + ' / ' + totalAssets + ' assets saved' : 'Selected bundles are saved';
      setState('partial', '<span class="off-check">✓</span> Selected bundles saved', count + '. Choose more bundles at any time.');
    } else {
      localStorage.removeItem(VKEY);
      setState('idle', '<span class="off-ring"></span> Save offline', 'Choose bundles to make available without a connection');
    }
  }

  navigator.serviceWorker.addEventListener('message', (e) => {
    const d = e.data || {};
    const isPrecacheMessage = d.type === 'precache-progress' || d.type === 'precache-done' || d.type === 'precache-error';
    // Each save is queued by the worker and replies only to its initiating tab. The request check
    // is a second guard against a stale/broadcast worker making one tab claim another tab's save.
    if (isPrecacheMessage && (!activePrecacheRequest || d.requestId !== activePrecacheRequest)) return;
    if (d.type === 'cache-status') {
      currentVersion = d.version || currentVersion;
      statusKnown = true;
      fullAvailable = !!d.full;
      cachedAssets = Number(d.cached) || 0;
      totalAssets = Number(d.total) || 0;
      rest();
    } else if (d.type === 'precache-progress') {
      setState('caching', '<span class="off-spin"></span> Saving for offline… ' + d.done + ' / ' + d.total);
    } else if (d.type === 'precache-done') {
      currentVersion = d.version || currentVersion;
      statusKnown = true;
      fullAvailable = !!d.full;
      cachedAssets = Number(d.cached) || 0;
      totalAssets = Number(d.total) || 0;
      activePrecacheRequest = null;
      rest();
    } else if (d.type === 'precache-error') {
      activePrecacheRequest = null;
      fullAvailable = false;
      localStorage.removeItem(VKEY);
      setState('error', '<span aria-hidden="true">!</span> Offline save incomplete — retry', d.error || 'Some files could not be saved. Retry while online.');
    } else if (d.type === 'cache-cleared') {
      // Only react to the clear this tab initiated (a broadcast from another tab's clear must not
      // reset our in-flight state); requestId-less replies are treated as ours for resilience.
      if (activeClearRequest && d.requestId && d.requestId !== activeClearRequest) return;
      markCleared();
    }
  });

  // Reset to a clean "nothing saved" state after the offline cache has been emptied.
  const markCleared = () => {
    activeClearRequest = null;
    statusKnown = true;
    fullAvailable = false;
    cachedAssets = 0;
    totalAssets = 0;
    localStorage.removeItem(VKEY);
    rest();
  };

  // Empty the offline cache. Preferred path is a message to the controlling worker (single cache
  // authority, mirroring precache/status); if this tab has no controller yet we clear the caches we
  // own directly from the page, since Cache Storage is reachable from both contexts.
  const clearOffline = async () => {
    activeClearRequest = nextRequestId();
    setState('caching', '<span class="off-spin"></span> Clearing offline data…');
    if (send({ type: 'clear-cache', requestId: activeClearRequest })) return;   // markCleared on reply
    try {
      if (window.caches) {
        for (const key of await caches.keys()) {
          if (key === 'file-viewer' || key.startsWith('file-viewer-')) await caches.delete(key);
        }
      }
    } catch { /* private mode / storage disabled: nothing to clear */ }
    markCleared();
  };

  statusEl.style.cursor = 'pointer';
  statusEl.setAttribute('role', 'button');
  statusEl.tabIndex = 0;
  const onActivate = () => {
    if (statusEl.classList.contains('caching') || statusEl.classList.contains('preparing')) return;
    openCacheModal((files) => {
      activePrecacheRequest = nextRequestId();
      const message = { type: 'precache', files, requestId: activePrecacheRequest };
      if (send(message)) setState('caching', '<span class="off-spin"></span> Saving for offline…');
      else {
        pendingMessage = message;
        setState('preparing', '<span class="off-spin"></span> Preparing offline save…', 'Waiting for offline support to become ready');
      }
    }, (error) => {
      setState('error', '<span aria-hidden="true">!</span> Offline options unavailable — retry', error?.message || String(error));
    }, clearOffline);
  };
  statusEl.addEventListener('click', onActivate);
  statusEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); } });

  // Show the control immediately, but do not call a localStorage hint "ready" until the SW verifies it.
  rest();

  navigator.serviceWorker.register('sw.js').then(async (reg) => {
    await navigator.serviceWorker.ready;
    const onController = () => {
      if (pendingMessage && send(pendingMessage)) {
        pendingMessage = null;
        setState('caching', '<span class="off-spin"></span> Saving for offline…');
      } else {
        send({ type: 'status' });
      }
    };
    onController();
    navigator.serviceWorker.addEventListener('controllerchange', onController);

    // ── Update guard ──────────────────────────────────────────────────────────
    // A deploy bumps the version stamped into sw.js, so its bytes change → the browser installs a
    // NEW service worker that parks in 'waiting'. We deliberately do NOT let it auto-activate (that
    // would serve a mix of old+new modules — the version-skew that masqueraded as a hard hang).
    // Instead, surface a "new version — reload?" banner and let the new SW take over only on click.
    // The `controller != null` guard means we prompt for an UPDATE, never the very first install.
    const promptIfWaiting = (worker) => { if (worker && navigator.serviceWorker.controller) showUpdateBanner(worker); };
    promptIfWaiting(reg.waiting);                                   // update already downloaded before this load
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw?.addEventListener('statechange', () => { if (sw.state === 'installed') promptIfWaiting(sw); });
    });
    // Notice a deploy that lands while this tab sits open: re-check when the tab regains focus.
    let checking = false;
    const checkForUpdate = () => {
      if (checking || document.hidden) return;
      checking = true;
      reg.update().catch(() => {}).finally(() => { checking = false; });
    };
    document.addEventListener('visibilitychange', checkForUpdate);
    window.addEventListener('focus', checkForUpdate);
  }).catch((error) => {
    pendingMessage = null;
    activePrecacheRequest = null;
    setState('error', '<span aria-hidden="true">!</span> Offline support unavailable', error?.message || 'Service worker registration failed.');
  });
}

// "New version available — reload?" banner. Shown once a newer build's SW is installed and waiting.
// Reloading is the user's choice: clicking Reload tells the waiting SW to take over, and we reload
// the moment it does (controllerchange) so the whole page comes up on one consistent version.
let updateBannerShown = false;
function showUpdateBanner(worker) {
  if (updateBannerShown || document.getElementById('updateBanner')) return;
  updateBannerShown = true;
  const bar = document.createElement('div');
  bar.id = 'updateBanner';
  bar.className = 'update-banner';
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-live', 'polite');
  bar.innerHTML = '<span class="ub-msg">A new version of the viewer is available.</span>'
    + '<button class="ub-reload" type="button">Reload</button>'
    + '<button class="ub-dismiss" type="button" aria-label="Dismiss">✕</button>';
  document.body.appendChild(bar);

  let reloading = false;
  const reload = () => { if (!reloading) { reloading = true; location.reload(); } };
  bar.querySelector('.ub-reload').addEventListener('click', () => {
    bar.querySelector('.ub-reload').textContent = 'Reloading…';
    navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
    worker.postMessage({ type: 'skip-waiting' });
    setTimeout(reload, 2500);          // fallback if controllerchange never fires
  });
  bar.querySelector('.ub-dismiss').addEventListener('click', () => { bar.remove(); });
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
    // Settings persists a versioned value bag. Keep the legacy flat read for older local data, but
    // never require a test-only shape that the real Settings UI cannot produce.
    return saved?.values?.enableEmulators === true || saved?.enableEmulators === true;
  } catch { return false; }
}

const GROUP_ORDER = ['App shell', 'File viewers', 'Editor', 'Data & charts', 'Documents', 'Archives', 'Media', 'Games', 'Easter eggs', 'Content', 'Emulators'];

const CACHE_PRESETS = [
  {
    id: 'common-v',
    label: 'Common V',
    title: 'Common viewing: app shell, file viewers, common document/data/media libraries, and common sample files.',
    bundles: ['core', 'known', 'types', 'vendor:dompurify', 'vendor:markdown-it', 'vendor:js-yaml', 'vendor:papaparse',
      'vendor:jszip', 'vendor:pdfjs', 'vendor:xlsx', 'vendor:mammoth', 'vendor:pptxviewjs', 'vendor:cfb',
      'vendor:html2canvas', 'vendor:gifuct', 'vendor:utif', 'vendor:libheif', 'vendor:fonts',
      'vendor:monaco',
      'examples:catalog', 'examples:text-config', 'examples:data', 'examples:office'],
  },
  {
    id: 'common-e',
    label: 'Common E',
    title: 'Common editing: Common V plus Monaco, TipTap, and common export/editing helpers.',
    bundles: ['core', 'known', 'types', 'vendor:dompurify', 'vendor:markdown-it', 'vendor:js-yaml', 'vendor:papaparse',
      'vendor:jszip', 'vendor:pdfjs', 'vendor:xlsx', 'vendor:mammoth', 'vendor:pptxviewjs', 'vendor:cfb',
      'vendor:html2canvas', 'vendor:gifuct', 'vendor:gifenc', 'vendor:utif', 'vendor:libheif', 'vendor:fonts',
      'vendor:monaco', 'vendor:tiptap', 'vendor:pdf-lib', 'vendor:konva',
      'examples:catalog', 'examples:text-config', 'examples:data', 'examples:office'],
  },
  {
    id: 'office-v',
    label: 'Office V',
    title: 'Office viewing: Markdown, PDF, spreadsheets, slides, Word/OpenDocument, archives used by Office formats, and office examples.',
    bundles: ['core', 'known', 'types', 'vendor:dompurify', 'vendor:markdown-it', 'vendor:js-yaml',
      'vendor:jszip', 'vendor:pdfjs', 'vendor:xlsx', 'vendor:mammoth', 'vendor:pptxviewjs', 'vendor:cfb',
      'vendor:html2canvas', 'vendor:monaco',
      'examples:catalog', 'examples:office', 'examples:text-config', 'examples:data'],
  },
  {
    id: 'office-e',
    label: 'Office E',
    title: 'Office editing: Office V plus source editor, Markdown WYSIWYG, and document export/editing helpers.',
    bundles: ['core', 'known', 'types', 'vendor:dompurify', 'vendor:markdown-it', 'vendor:js-yaml',
      'vendor:jszip', 'vendor:pdfjs', 'vendor:xlsx', 'vendor:mammoth', 'vendor:pptxviewjs', 'vendor:cfb',
      'vendor:html2canvas', 'vendor:monaco', 'vendor:tiptap', 'vendor:pdf-lib',
      'examples:catalog', 'examples:office', 'examples:text-config', 'examples:data'],
  },
];
const DEFAULT_CACHE_BUNDLES = new Set(CACHE_PRESETS[0].bundles);

let cacheModalOpening = false;
async function openCacheModal(onConfirm, onError = () => {}, onClear = null) {
  const existing = document.querySelector('.cache-modal');
  if (existing) { existing.querySelector('.cm-close')?.focus(); return; }
  if (cacheModalOpening) return;
  cacheModalOpening = true;
  let bundles;
  try {
    const response = await fetch('asset-manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load offline options (' + response.status + ').');
    bundles = (await response.json()).bundles || [];
    if (!bundles.length) throw new Error('No offline bundles are available.');
  } catch (error) {
    cacheModalOpening = false;
    onError(error);
    return;
  }
  cacheModalOpening = false;

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
    '<div class="cache-modal" role="dialog" aria-modal="true" aria-labelledby="cacheModalTitle">'
    + '<header class="cm-head"><h2 id="cacheModalTitle">Save for offline</h2><button type="button" class="cm-close" aria-label="Close">✕</button></header>'
    + '<p class="cm-intro">Choose what to cache so it works without a connection. Sizes are downloads.</p>'
    + '<div class="cm-toolbar"><button type="button" class="cm-all">Select all</button><button type="button" class="cm-none">Deselect all</button>'
    + CACHE_PRESETS.map((p) => '<button type="button" class="cm-preset" data-preset="' + p.id + '" title="' + p.title + '" aria-pressed="' + (p.id === 'common-v') + '">' + p.label + '</button>').join('')
    + '<span class="cm-grand-total"></span></div>'
    + '<div class="cm-groups"></div>'
    + '<footer class="cm-foot">'
    + (onClear ? '<button type="button" class="cm-clear">Clear offline data</button>' : '')
    + '<span class="cm-total"></span><button type="button" class="cm-save">Save selected</button></footer>'
    + '</div>';
  const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.body.appendChild(root);
  document.body.classList.add('cache-modal-open');

  const groupsEl = root.querySelector('.cm-groups');
  const totalEl = root.querySelector('.cm-total');
  const grandEl = root.querySelector('.cm-grand-total');

  function rowHtml(b) {
    const isCore = b.id === 'core' || b.id === 'known';
    const checked = isCore || DEFAULT_CACHE_BUNDLES.has(b.id);
    return '<label class="cm-row' + (b.heavy ? ' cm-row-heavy' : '') + '">'
      + '<input type="checkbox" class="cm-chk" data-id="' + b.id + '" data-size="' + b.size + '"'
      + (checked ? ' checked' : '') + (isCore ? ' disabled' : '') + '>'
      + '<span class="cm-label">' + (b.label || b.id) + (isCore ? ' <span class="cm-req">(required)</span>' : '') + '</span>'
      + (b.heavy ? '<span class="cm-heavy">large</span>' : '')
      + '<span class="cm-size">' + fmtSize(b.size) + '</span></label>';
  }

  // Build group sections
  cats.forEach((cat, groupIndex) => {
    const bs = grouped.get(cat);
    const isAppShell = cat === 'App shell';
    const sec = document.createElement('div');
    sec.className = 'cm-group';
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'cm-group-head';
    head.setAttribute('aria-expanded', String(!isAppShell));
    const bodyId = 'cacheModalGroup' + groupIndex;
    head.setAttribute('aria-controls', bodyId);
    head.innerHTML = '<span class="cm-toggle" aria-hidden="true">' + (isAppShell ? '▸' : '▾') + '</span>'
      + '<span class="cm-group-label">' + cat + '</span>'
      + '<span class="cm-group-meta"></span>';
    const body = document.createElement('div');
    body.id = bodyId;
    body.className = 'cm-group-body' + (isAppShell ? ' cm-collapsed' : '');
    body.hidden = isAppShell;
    body.innerHTML = bs.map(rowHtml).join('');
    sec.appendChild(head);
    sec.appendChild(body);
    groupsEl.appendChild(sec);

    head.addEventListener('click', () => {
      const collapsed = body.classList.toggle('cm-collapsed');
      body.hidden = collapsed;
      head.setAttribute('aria-expanded', String(!collapsed));
      head.querySelector('.cm-toggle').textContent = collapsed ? '▸' : '▾';
    });
  });

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
  const setActivePreset = (id = null) => {
    root.querySelectorAll('.cm-preset').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.preset === id)));
  };
  groupsEl.addEventListener('change', () => { setActivePreset(); updateTotals(); });

  root.querySelector('.cm-all').addEventListener('click', () => {
    for (const c of root.querySelectorAll('.cm-chk:not(:disabled)')) c.checked = true;
    setActivePreset();
    updateTotals();
  });
  root.querySelector('.cm-none').addEventListener('click', () => {
    for (const c of root.querySelectorAll('.cm-chk:not(:disabled)')) c.checked = false;
    setActivePreset();
    updateTotals();
  });
  root.querySelectorAll('.cm-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = CACHE_PRESETS.find((p) => p.id === btn.dataset.preset);
      if (!preset) return;
      const ids = new Set(preset.bundles);
      for (const c of root.querySelectorAll('.cm-chk:not(:disabled)')) c.checked = ids.has(c.dataset.id);
      setActivePreset(preset.id);
      updateTotals();
    });
  });

  const focusable = () => [...root.querySelectorAll('button:not(:disabled), input:not(:disabled)')]
    .filter((element) => !element.hidden && element.getClientRects().length > 0);
  const onKeydown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    root.remove();
    document.body.classList.remove('cache-modal-open');
    if (previousActive?.isConnected) previousActive.focus();
  };
  root.querySelector('.cm-close').addEventListener('click', close);
  root.querySelector('.cm-clear')?.addEventListener('click', () => {
    if (!confirm('Remove all files saved for offline use?\n\nThe viewer keeps working while you’re online, and your settings and edits are kept. You can save offline again anytime.')) return;
    close();
    onClear();
  });
  root.addEventListener('click', (e) => { if (e.target === root) close(); });
  document.addEventListener('keydown', onKeydown);
  root.querySelector('.cm-save').addEventListener('click', () => {
    const chosen = new Set();
    for (const c of root.querySelectorAll('.cm-chk')) if (c.checked || c.disabled) chosen.add(c.dataset.id);
    const files = [...new Set(bundles.filter((b) => chosen.has(b.id)).flatMap((b) => b.files))];
    close();
    onConfirm(files);
  });
  root.querySelector('.cm-close').focus();
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
    + '<strong>“Save offline”</strong> in the top bar (under More controls on a phone) and include the bundle this viewer needs.</p>'
    + '</div>';
}
