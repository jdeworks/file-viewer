// Tiny same-origin HTML template loader + interpolator. Renderers keep their markup in sibling
// .html files — real HTML syntax highlighting, easy to read and extend — and fill {{slots}} here
// instead of concatenating strings in JS. Templates are fetched once and cached in memory; the
// asset-manifest lists them and the service worker caches them, so this stays offline-safe and
// makes zero off-origin requests (templates live next to their renderer under docs/types/…).

const cache = new Map();

// Fetch a template's text (cached by URL). Pass `new URL('./view.html', import.meta.url)`.
export function loadTemplate(url) {
  const key = String(url);
  if (!cache.has(key)) cache.set(key, fetch(url).then((r) => r.text()));
  return cache.get(key);
}

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Fill {{key}} (HTML-escaped — the safe default) and {{&key}} (raw, for fragments YOU built and
// know are safe, e.g. an already-filled child template). Null/undefined/missing → ''. Unknown
// placeholders collapse to '' rather than leaking literal braces.
export function fill(tpl, data = {}) {
  return String(tpl).replace(/\{\{(&?)([\w.-]+)\}\}/g, (_, raw, key) => {
    const v = data[key];
    if (v == null) return '';
    return raw ? String(v) : esc(v);
  });
}

// Fill a row/card template once per item and join — the repeated-fragment pattern. `toData`
// maps an item to its slot values; its output is treated as raw HTML by the caller's {{&…}} slot.
export function fillEach(rowTpl, items, toData) {
  return items.map((it, i) => fill(rowTpl, toData(it, i) || {})).join('');
}
