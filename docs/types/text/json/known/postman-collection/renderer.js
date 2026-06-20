const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.postman-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-postman{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FF6C37;color:#fff;vertical-align:middle;margin-right:8px}
.postman-title{font-size:18px;font-weight:700;margin:0 0 4px}
.postman-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.postman-sec{margin:14px 0}
.postman-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.postman-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.postman-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.postman-kv-k{color:var(--fg-2,#888);min-width:120px;flex-shrink:0}
.postman-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.postman-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.postman-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.postman-method{display:inline-block;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;margin-right:6px;font-family:ui-monospace,monospace;min-width:52px;text-align:center}
.method-GET{background:#e6f4ea;color:#1a7f37}
.method-POST{background:#fff3cd;color:#9a6700}
.method-PUT{background:#e1effe;color:#1d4ed8}
.method-PATCH{background:#ede9fe;color:#6d28d9}
.method-DELETE{background:#fde8e8;color:#b91c1c}
.method-default{background:#f3f4f6;color:#374151}
.postman-folder{font-weight:600;margin:8px 0 4px;font-size:13px;color:var(--fg,#24292f)}
.postman-folder-icon{margin-right:4px;opacity:0.6}
.postman-item{margin:2px 0 2px 12px;font-size:13px;display:flex;align-items:center}
`;

function methodBadge(method) {
  const m = (method || 'GET').toUpperCase();
  const cls = ['GET','POST','PUT','PATCH','DELETE'].includes(m) ? `method-${m}` : 'method-default';
  return `<span class="postman-method ${cls}">${esc(m)}</span>`;
}

function countItems(items) {
  let total = 0;
  const methods = {};
  function walk(arr) {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (Array.isArray(item.item)) {
        walk(item.item);
      } else if (item.request) {
        total++;
        const m = (item.request.method || 'GET').toUpperCase();
        methods[m] = (methods[m] || 0) + 1;
      }
    }
  }
  walk(items);
  return { total, methods };
}

function renderStructure(items, depth) {
  if (!Array.isArray(items)) return '';
  let html = '';
  for (const item of items) {
    if (Array.isArray(item.item)) {
      html += `<div class="postman-folder"><span class="postman-folder-icon">📁</span>${esc(item.name)}</div>`;
      if (depth < 2) html += renderStructure(item.item, depth + 1);
    } else {
      const method = item.request ? (item.request.method || 'GET') : 'GET';
      html += `<div class="postman-item">${methodBadge(method)}${esc(item.name)}</div>`;
    }
  }
  return html;
}

export function render(intake) {
  let col = {};
  try { col = intake.parsed ?? JSON.parse(intake.text || '{}'); } catch { col = {}; }
  const info = col.info || {};
  const items = Array.isArray(col.item) ? col.item : [];
  const variables = Array.isArray(col.variable) ? col.variable : [];

  const { total, methods } = countItems(items);

  // Schema version display (shorten long URLs)
  const schemaRaw = info.schema || '';
  const schemaVersion = schemaRaw.match(/v(\d+\.\d+\.\d+)/) ? schemaRaw.match(/v(\d+\.\d+\.\d+)/)[0] : (schemaRaw || '—');

  const subParts = [
    `${total} request${total !== 1 ? 's' : ''}`,
    `${items.length} top-level item${items.length !== 1 ? 's' : ''}`,
    variables.length ? `${variables.length} variable${variables.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  // Overview card
  const overviewHtml = `<div class="postman-sec"><h3>Overview</h3><div class="postman-card">
<div class="postman-kv"><span class="postman-kv-k">Schema</span><span class="postman-kv-v">${esc(schemaVersion)}</span></div>
<div class="postman-kv"><span class="postman-kv-k">Total requests</span><span class="postman-kv-v">${total}</span></div>
${variables.length ? `<div class="postman-kv"><span class="postman-kv-k">Variables</span><span class="postman-kv-v">${variables.length}</span></div>` : ''}
${info.description ? `<div class="postman-kv"><span class="postman-kv-k">Description</span><span class="postman-kv-v">${esc(info.description)}</span></div>` : ''}
</div></div>`;

  // HTTP methods breakdown
  const methodEntries = Object.entries(methods).sort((a, b) => b[1] - a[1]);
  const methodsHtml = methodEntries.length ? `<div class="postman-sec"><h3>HTTP Methods</h3>
<div class="postman-pills">
${methodEntries.map(([m, c]) => `<span class="postman-pill">${methodBadge(m)} ×${c}</span>`).join('')}
</div></div>` : '';

  // Variables section
  const varsHtml = variables.length ? `<div class="postman-sec"><h3>Variables (${variables.length})</h3>
<div class="postman-pills">
${variables.map((v) => `<span class="postman-pill">${esc(v.key || v.name || '?')}</span>`).join('')}
</div></div>` : '';

  // Structure section
  const structureHtml = items.length ? `<div class="postman-sec"><h3>Structure</h3>
<div class="postman-card">${renderStructure(items, 0)}</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'postman-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-postman">Postman</span>
  <span class="postman-title">${esc(info.name || 'Postman Collection')}</span>
</div>
<div class="postman-sub">${esc(subParts.join(' · '))}</div>
${overviewHtml}${methodsHtml}${varsHtml}${structureHtml}`;
  return { parentNode: host };
}
