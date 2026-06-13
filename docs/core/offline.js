// Registers the service worker and drives the background offline precache with a small
// progress pill (spinner while caching, green check when done). Resumable: the SW skips
// already-cached assets, so a reload mid-progress just continues. No-op where service
// workers aren't supported — the app simply stays online-only.
export function initOffline(statusEl) {
  if (!('serviceWorker' in navigator) || !statusEl) return;

  navigator.serviceWorker.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === 'precache-progress') {
      statusEl.hidden = false;
      statusEl.className = 'offline-status caching';
      statusEl.innerHTML = '<span class="off-spin"></span> Saving for offline… ' + d.done + ' / ' + d.total;
      if (d.done >= d.total) done(statusEl);
    } else if (d.type === 'precache-done') {
      done(statusEl);
    } else if (d.type === 'precache-error') {
      statusEl.hidden = true;
    }
  });

  navigator.serviceWorker.register('sw.js').then(async () => {
    const reg = await navigator.serviceWorker.ready;
    (reg.active || navigator.serviceWorker.controller)?.postMessage({ type: 'precache' });
  }).catch(() => { /* offline support unavailable — stay online-only */ });
}

function done(el) {
  el.hidden = false;
  el.className = 'offline-status ready';
  el.innerHTML = '<span class="off-check">✓</span> Available offline';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 4000);
}
