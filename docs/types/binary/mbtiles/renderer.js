// MBTiles viewer — reads the metadata table from the SQLite tile archive.
// sql.js is already vendored (used by sqliteType and clipType).
import { openDb, query } from '../../sqlite/sqlitelib.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const FORMAT_LABEL = { png: 'PNG rasters', jpg: 'JPEG rasters', webp: 'WebP rasters', pbf: 'PBF vector tiles' };

function fmtBounds(val) {
  if (!val) return null;
  const parts = val.split(',').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return val;
  const [w, s, e, n] = parts.map((v) => v.toFixed(4));
  return `${n}°N, ${w}°E → ${s}°S, ${e}°E`;
}

export async function render(intake) {
  let db;
  try {
    db = await openDb(intake.bytes);
  } catch (e) {
    return { bodyHtml: `<div class="mbt-preview"><p class="mbt-error">Could not open database: ${esc(e.message)}</p></div>` };
  }

  // Read metadata table
  const meta = {};
  try {
    const { rows } = query(db, 'SELECT name, value FROM metadata');
    for (const [k, v] of rows) if (k && v != null) meta[k] = String(v);
  } catch (e) {
    return { bodyHtml: `<div class="mbt-preview"><p class="mbt-error">Not a valid MBTiles database: ${esc(e.message)}</p></div>` };
  }

  // Count tiles
  let tileCount = null;
  try {
    const { rows } = query(db, 'SELECT COUNT(*) FROM tiles');
    tileCount = rows[0]?.[0] ?? null;
  } catch { /* tiles table may not exist */ }

  // Zoom level histogram
  const zoomRows = [];
  try {
    const { rows } = query(db, 'SELECT zoom_level, COUNT(*) as cnt FROM tiles GROUP BY zoom_level ORDER BY zoom_level');
    for (const [z, c] of rows) zoomRows.push({ z: Number(z), c: Number(c) });
  } catch { /* ignore */ }

  db.close?.();

  const name = meta['name'] || '(unnamed)';
  const desc = meta['description'] || '';
  const fmt = meta['format'] || '';
  const type = meta['type'] || '';
  const version = meta['version'] || '';
  const minz = meta['minzoom'] ?? '';
  const maxz = meta['maxzoom'] ?? '';
  const bounds = fmtBounds(meta['bounds']);
  const center = meta['center'] || '';
  const attr = meta['attribution'] || '';

  const infoRows = [
    type && `<tr><td class="mbt-key">Type</td><td>${esc(type)}</td></tr>`,
    fmt && `<tr><td class="mbt-key">Format</td><td>${esc(FORMAT_LABEL[fmt] || fmt)}</td></tr>`,
    version && `<tr><td class="mbt-key">Version</td><td>${esc(version)}</td></tr>`,
    (minz !== '' || maxz !== '') && `<tr><td class="mbt-key">Zoom levels</td><td>${esc(minz)} – ${esc(maxz)}</td></tr>`,
    bounds && `<tr><td class="mbt-key">Bounds</td><td>${esc(bounds)}</td></tr>`,
    center && `<tr><td class="mbt-key">Center</td><td>${esc(center)}</td></tr>`,
    tileCount !== null && `<tr><td class="mbt-key">Total tiles</td><td>${Number(tileCount).toLocaleString()}</td></tr>`,
    attr && `<tr><td class="mbt-key">Attribution</td><td>${esc(attr)}</td></tr>`,
  ].filter(Boolean).join('');

  const zoomTable = zoomRows.length ? `
<h3 class="mbt-section">Tiles per zoom level</h3>
<table class="mbt-zoom-table">
  <thead><tr><th>Zoom</th><th>Tiles</th></tr></thead>
  <tbody>${zoomRows.map(({ z, c }) => `<tr><td>z${z}</td><td>${c.toLocaleString()}</td></tr>`).join('')}</tbody>
</table>` : '';

  const bodyHtml = `<div class="mbt-preview">
  <div class="mbt-header">
    <span class="badge-mbt">MBTiles</span>
    <span class="mbt-name">${esc(name)}</span>
  </div>
  ${desc ? `<p class="mbt-desc">${esc(desc)}</p>` : ''}
  <table class="mbt-info">${infoRows}</table>
  ${zoomTable}
</div>`;

  return { bodyHtml };
}
