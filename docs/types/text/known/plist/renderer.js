const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.plist-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.plist-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#A2AAAD;color:#fff;vertical-align:middle;margin-right:8px;}
.plist-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.plist-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.plist-table{width:100%;border-collapse:collapse;margin:0 0 14px;font-size:13px;}
.plist-table td{padding:5px 10px;border-bottom:1px solid var(--border,#e8e8e8);vertical-align:top;}
.plist-table tr:last-child td{border-bottom:none;}
.plist-key{font-weight:600;color:var(--fg,#24292f);width:40%;font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.plist-val{color:var(--fg,#24292f);word-break:break-all;}
.plist-str{color:var(--plist-string,#a31515);font-family:ui-monospace,monospace;}
.plist-num{color:var(--plist-number,#098658);font-family:ui-monospace,monospace;}
.plist-true{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:700;background:#dcfce7;color:#14532d;border:1px solid #86efac;}
.plist-false{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:700;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;}
.plist-date{color:var(--plist-date,#7a3e9d);font-family:ui-monospace,monospace;}
.plist-data{color:var(--plist-data,#7a5c00);font-family:ui-monospace,monospace;font-style:italic;}
.plist-nested{font-style:italic;color:var(--fg-2,#888);}
.plist-card{border:1px solid var(--border,#e0e0e0);border-radius:10px;overflow:hidden;margin:0 0 14px;background:var(--bg,#fff);}
.plist-card-title{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:10px 14px 6px;border-bottom:1px solid var(--border,#e8e8e8);}
.plist-more{padding:6px 14px;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.plist-array-item{padding:4px 14px;border-bottom:1px solid var(--border,#f0f0f0);font-size:13px;}
.plist-array-item:last-child{border-bottom:none;}
[data-theme="dark"] .plist-str{--plist-string:#f4897b;}
[data-theme="dark"] .plist-num{--plist-number:#4ec9a0;}
[data-theme="dark"] .plist-date{--plist-date:#c586c0;}
[data-theme="dark"] .plist-data{--plist-data:#d4a84b;}
[data-theme="dark"] .plist-true{background:#14532d;color:#86efac;border-color:#166534;}
[data-theme="dark"] .plist-false{background:#7f1d1d;color:#fca5a5;border-color:#991b1b;}
`;

function renderValue(el, depth) {
  if (!el) return '<span class="plist-val">—</span>';
  const tag = el.tagName;
  if (tag === 'true') return '<span class="plist-true">true</span>';
  if (tag === 'false') return '<span class="plist-false">false</span>';
  if (tag === 'integer' || tag === 'real') return `<span class="plist-num">${esc(el.textContent)}</span>`;
  if (tag === 'date') {
    let formatted = el.textContent;
    try { formatted = new Date(el.textContent).toLocaleString(); } catch { /* keep raw */ }
    return `<span class="plist-date" title="${esc(el.textContent)}">${esc(formatted)}</span>`;
  }
  if (tag === 'data') {
    const bytes = el.textContent.trim().length;
    return `<span class="plist-data">Binary data (${bytes} bytes)</span>`;
  }
  if (tag === 'string') {
    const text = el.textContent;
    const truncated = text.length > 200 ? text.slice(0, 200) + '…' : text;
    return `<span class="plist-str">${esc(truncated)}</span>`;
  }
  if (tag === 'dict' || tag === 'array') {
    if (depth >= 3) return '<span class="plist-nested">[nested object]</span>';
    if (tag === 'dict') return renderDict(el, depth + 1);
    return renderArray(el, depth + 1);
  }
  return `<span class="plist-val">${esc(el.textContent)}</span>`;
}

function renderDict(dictEl, depth) {
  const children = [...dictEl.children];
  const entries = [];
  for (let i = 0; i < children.length - 1; i += 2) {
    entries.push([children[i].textContent, children[i + 1]]);
  }
  const MAX = 50;
  const shown = entries.slice(0, MAX);
  const extra = entries.length - shown.length;
  if (depth > 0) {
    // Inline nested dict
    const rows = shown.map(([k, v]) =>
      `<div class="plist-array-item"><span class="plist-key" style="display:inline;margin-right:8px">${esc(k)}</span>${renderValue(v, depth)}</div>`
    ).join('');
    const moreHtml = extra > 0 ? `<div class="plist-more">…and ${extra} more entries</div>` : '';
    return `<div style="border:1px solid var(--border,#e8e8e8);border-radius:6px;overflow:hidden;margin:2px 0">${rows}${moreHtml}</div>`;
  }
  // Top-level dict: full table
  const rows = shown.map(([k, v]) =>
    `<tr><td class="plist-key">${esc(k)}</td><td class="plist-val">${renderValue(v, depth)}</td></tr>`
  ).join('');
  const moreHtml = extra > 0 ? `<tr><td colspan="2" class="plist-more">…and ${extra} more entries</td></tr>` : '';
  return `<table class="plist-table">${rows}${moreHtml}</table>`;
}

function renderArray(arrEl, depth) {
  const items = [...arrEl.children];
  const MAX = 20;
  const shown = items.slice(0, MAX);
  const extra = items.length - shown.length;
  const rows = shown.map((item) =>
    `<div class="plist-array-item">${renderValue(item, depth)}</div>`
  ).join('');
  const moreHtml = extra > 0 ? `<div class="plist-more">…and ${extra} more items</div>` : '';
  return `<div style="border:1px solid var(--border,#e8e8e8);border-radius:6px;overflow:hidden;margin:2px 0">${rows}${moreHtml}</div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();

  let plistEl, plistVersion = '';
  try {
    const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
    const parseErr = xmlDoc.querySelector('parsererror');
    if (parseErr) throw new Error('parse error');
    plistEl = xmlDoc.querySelector('plist');
    if (plistEl) plistVersion = plistEl.getAttribute('version') || '';
  } catch {
    const host = document.createElement('div');
    host.className = 'plist-doc';
    host.innerHTML = `<style>${CSS}</style><div class="plist-title"><span class="plist-badge">plist</span>${esc(name)}</div><div class="plist-sub">Could not parse plist XML.</div>`;
    return { parentNode: host };
  }

  const rootEl = plistEl ? plistEl.firstElementChild : null;
  const rootTag = rootEl ? rootEl.tagName : null;

  let contentHtml = '';
  let keyCount = '';

  if (rootTag === 'dict') {
    const children = [...rootEl.children];
    const numKeys = Math.floor(children.length / 2);
    keyCount = `${numKeys} key${numKeys === 1 ? '' : 's'}`;
    const entries = [];
    for (let i = 0; i < children.length - 1; i += 2) {
      entries.push([children[i].textContent, children[i + 1]]);
    }
    const MAX = 50;
    const shown = entries.slice(0, MAX);
    const extra = entries.length - shown.length;
    const rows = shown.map(([k, v]) =>
      `<tr><td class="plist-key">${esc(k)}</td><td class="plist-val">${renderValue(v, 0)}</td></tr>`
    ).join('');
    const moreRow = extra > 0 ? `<tr><td colspan="2" class="plist-more">…and ${extra} more entries</td></tr>` : '';
    contentHtml = `<div class="plist-card"><div class="plist-card-title">Properties</div><table class="plist-table">${rows}${moreRow}</table></div>`;
  } else if (rootTag === 'array') {
    const items = [...rootEl.children];
    keyCount = `${items.length} item${items.length === 1 ? '' : 's'}`;
    const MAX = 20;
    const shown = items.slice(0, MAX);
    const extra = items.length - shown.length;
    const rows = shown.map((item) =>
      `<div class="plist-array-item">${renderValue(item, 0)}</div>`
    ).join('');
    const moreHtml = extra > 0 ? `<div class="plist-more">…and ${extra} more items</div>` : '';
    contentHtml = `<div class="plist-card"><div class="plist-card-title">Array</div>${rows}${moreHtml}</div>`;
  } else if (rootEl) {
    contentHtml = `<div class="plist-card"><div class="plist-card-title">Value</div><div style="padding:10px 14px">${renderValue(rootEl, 0)}</div></div>`;
  }

  const sub = [
    `Apple Property List${plistVersion ? ` v${plistVersion}` : ''}`,
    keyCount,
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'plist-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="plist-title"><span class="plist-badge">plist</span>${esc(name)}</div>
<div class="plist-sub">${esc(sub)}</div>
${contentHtml}`;

  return { parentNode: host };
}
