import { openDb, query } from '../../sqlite/sqlitelib.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function firstValue(row, names) {
  if (!row) return '';
  const keys = Object.keys(row);
  const key = keys.find((k) => names.some((n) => k.toLowerCase() === n.toLowerCase()));
  return key ? row[key] : '';
}

function rowsToObjects(result) {
  return result.rows.map((row) => Object.fromEntries(result.columns.map((c, i) => [c, row[i]])));
}

function tableExists(tables, name) {
  return tables.some((t) => t.toLowerCase() === name.toLowerCase());
}

function blobMime(bytes) {
  if (!bytes || bytes.length < 4) return '';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  return '';
}

export async function inspectClip(intake) {
  const db = await openDb(intake.bytes);
  try {
    const master = query(db, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const tables = master.rows.map((r) => String(r[0]));
    const canvasRows = tableExists(tables, 'Canvas') ? rowsToObjects(query(db, 'SELECT * FROM Canvas LIMIT 1')) : [];
    const layerCount = tableExists(tables, 'Layer') ? query(db, 'SELECT COUNT(*) FROM Layer').rows[0]?.[0] || 0 : 0;
    let preview = null;
    if (tableExists(tables, 'CanvasPreview')) {
      const r = query(db, 'SELECT * FROM CanvasPreview LIMIT 10');
      for (const row of r.rows) {
        for (const cell of row) {
          const mime = blobMime(cell);
          if (mime) { preview = { bytes: cell, mime }; break; }
        }
        if (preview) break;
      }
    }
    const canvas = canvasRows[0] || {};
    return {
      db,
      tables,
      width: firstValue(canvas, ['width', 'Width', 'canvas_width', 'CanvasWidth']),
      height: firstValue(canvas, ['height', 'Height', 'canvas_height', 'CanvasHeight']),
      created: firstValue(canvas, ['created', 'Created', 'creationDate', 'CreationDate', 'created_at']),
      modified: firstValue(canvas, ['modified', 'Modified', 'updated', 'Updated', 'modified_at']),
      layerCount,
      preview,
    };
  } catch (err) {
    try { db.close(); } catch {}
    throw err;
  }
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'clip-doc';
  let info;
  try { info = await inspectClip(intake); }
  catch (err) { host.innerHTML = '<div class="json-error"><strong>Could not open Clip database</strong><br>' + esc(err.message) + '</div>'; return { parentNode: host }; }
  let previewUrl = '';
  if (info.preview) previewUrl = URL.createObjectURL(new Blob([info.preview.bytes], { type: info.preview.mime }));
  const dimensions = info.width && info.height ? info.width + ' x ' + info.height + ' px' : 'unknown';
  host.innerHTML = `<style>
    .clip-doc{padding:18px;color:var(--fg);font-family:system-ui,sans-serif}.clip-card{border:1px solid var(--border);border-radius:8px;background:var(--bg-1);padding:16px;max-width:900px}.clip-banner{border:1px solid #f59e0b;background:rgba(245,158,11,.12);border-radius:8px;padding:10px 12px;margin-bottom:14px}.clip-grid{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px}.clip-thumb{max-width:220px;border:1px solid var(--border);border-radius:6px;background:#fff}.clip-missing{width:220px;height:150px;border:1px dashed var(--border);border-radius:6px;display:grid;place-items:center;color:var(--muted)}.clip-table{border-collapse:collapse;width:100%}.clip-table th,.clip-table td{border-bottom:1px solid var(--border);padding:8px;text-align:left}.clip-table th{width:180px;color:var(--muted)}.clip-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.clip-tags span{border:1px solid var(--border);border-radius:999px;padding:3px 8px;font-size:12px}
  </style>
  <div class="clip-card"><div class="clip-banner">Layer pixel data is proprietary — showing structure only.</div>
    <div class="clip-grid">${previewUrl ? '<img class="clip-thumb" src="' + previewUrl + '" alt="Canvas preview">' : '<div class="clip-missing">No thumbnail</div>'}
      <div><h2>Clip Studio Paint file</h2><table class="clip-table"><tbody>
        <tr><th>Canvas</th><td>${esc(dimensions)}</td></tr>
        <tr><th>Layers</th><td>${esc(info.layerCount)}</td></tr>
        <tr><th>Created</th><td>${esc(info.created || 'unknown')}</td></tr>
        <tr><th>Modified</th><td>${esc(info.modified || 'unknown')}</td></tr>
        <tr><th>Tables</th><td>${esc(info.tables.length)}</td></tr>
      </tbody></table><div class="clip-tags">${info.tables.map((t) => '<span>' + esc(t) + '</span>').join('')}</div></div>
    </div></div>`;
  return { parentNode: host, revoke: () => { if (previewUrl) URL.revokeObjectURL(previewUrl); try { info.db.close(); } catch {} } };
}
