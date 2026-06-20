const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return Math.round(n) + ' B';
}

function fmtMs(n) {
  return Math.round(n || 0).toLocaleString() + ' ms';
}

function shortMime(mime) {
  if (!mime) return '';
  const m = mime.split(';')[0].trim();
  const map = {
    'text/html': 'html',
    'text/css': 'css',
    'text/plain': 'text',
    'application/javascript': 'js',
    'application/json': 'json',
    'application/xml': 'xml',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'font/woff': 'woff',
    'font/woff2': 'woff2',
  };
  return map[m] || m.split('/').pop().slice(0, 12);
}

function barColor(status) {
  if (status >= 500) return '#dc2626';
  if (status >= 400) return '#f97316';
  if (status >= 300) return '#2563eb';
  if (status >= 200) return '#16a34a';
  return '#94a3b8';
}

function statusClass(status) {
  if (status >= 500) return 'har-s5';
  if (status >= 400) return 'har-s4';
  if (status >= 300) return 'har-s3';
  if (status >= 200) return 'har-s2';
  return 'har-s0';
}

const CSS = `
.har-kn{padding:16px 18px;max-width:1100px;margin:0 auto;font:13px/1.5 system-ui,sans-serif;color:var(--fg,#172033);}
.har-kn-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;}
.har-kn-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:130px;}
.har-kn-card strong{display:block;font-size:1.2rem;font-weight:700;}
.har-kn-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.har-kn-note{font-size:.82rem;color:var(--fg-2,#5a6678);margin:0 0 10px;}
.har-kn-table{width:100%;border-collapse:collapse;font-size:.82rem;}
.har-kn-table th{background:var(--bg-2,#f8fafc);border-bottom:2px solid var(--border,#d9e1ec);padding:7px 6px;text-align:left;white-space:nowrap;font-weight:600;}
.har-kn-table td{border-bottom:1px solid var(--border,#e8eef5);padding:6px 6px;vertical-align:middle;}
.har-kn-table tr:last-child td{border-bottom:none;}
.har-kn-num{font-family:ui-monospace,monospace;color:var(--fg-2,#5a6678);text-align:right;padding-right:4px;}
.har-kn-method{font-family:ui-monospace,monospace;font-weight:700;font-size:.78rem;padding:1px 6px;border-radius:3px;background:var(--bg-2,#f1f5f9);color:var(--fg,#172033);}
.har-kn-url{font-family:ui-monospace,monospace;font-size:.78rem;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.har-kn-status{border-radius:10px;padding:1px 7px;font-size:.78rem;font-weight:700;color:#fff;}
.har-s2{background:#16a34a;}.har-s3{background:#2563eb;}.har-s4{background:#f97316;}.har-s5{background:#dc2626;}.har-s0{background:#94a3b8;}
.har-kn-bar-wrap{width:80px;background:var(--bg-2,#f1f5f9);border-radius:3px;overflow:hidden;height:12px;min-width:50px;}
.har-kn-bar{height:100%;border-radius:3px;min-width:2px;}
.har-kn-dur{font-family:ui-monospace,monospace;font-size:.78rem;color:var(--fg-2,#5a6678);}
`;

export function render(intake) {
  let log;
  try {
    const obj = intake.parsed ?? JSON.parse(intake.text || '{}');
    log = obj.log || {};
  } catch {
    const host = document.createElement('div');
    host.className = 'har-kn';
    host.textContent = 'Failed to parse HAR file.';
    return { parentNode: host };
  }

  const rawEntries = Array.isArray(log.entries) ? log.entries : [];
  const CAP = 500;
  const truncated = rawEntries.length > CAP;
  const entries = truncated ? rawEntries.slice(0, CAP) : rawEntries;

  // Compute totals
  const totalSize = entries.reduce((sum, e) => {
    const s = e.response?.bodySize ?? e.response?.content?.size ?? 0;
    return sum + (s > 0 ? s : 0);
  }, 0);
  const firstTs = rawEntries.reduce((min, e) => {
    const t = Date.parse(e.startedDateTime || '');
    return Number.isFinite(t) ? Math.min(min, t) : min;
  }, Infinity);
  const base = Number.isFinite(firstTs) ? firstTs : 0;
  const totalTime = rawEntries.reduce((max, e) => {
    const start = Date.parse(e.startedDateTime || '') - base;
    const dur = Number.isFinite(e.time) ? e.time : 0;
    return Math.max(max, (Number.isFinite(start) ? start : 0) + dur);
  }, 0);

  const maxDuration = Math.max(1, ...entries.map((e) => Number.isFinite(e.time) ? e.time : 0));

  const host = document.createElement('div');
  host.className = 'har-kn';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'har-kn-summary';
  const cards = [
    { value: rawEntries.length, label: 'Requests' },
    { value: fmtBytes(totalSize), label: 'Transferred' },
    { value: fmtMs(totalTime), label: 'Total time' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'har-kn-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  if (truncated) {
    const note = document.createElement('p');
    note.className = 'har-kn-note';
    note.textContent = `Showing first ${CAP} of ${rawEntries.length} requests.`;
    host.appendChild(note);
  }

  // Table
  const table = document.createElement('table');
  table.className = 'har-kn-table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>#</th><th>Method</th><th>URL</th><th>Status</th><th>Type</th><th>Size</th><th>Duration</th><th>Bar</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  entries.forEach((entry, i) => {
    const method = entry.request?.method || 'GET';
    const url = entry.request?.url || '';
    const status = entry.response?.status || 0;
    const mime = entry.response?.content?.mimeType || '';
    const size = entry.response?.bodySize ?? entry.response?.content?.size ?? 0;
    const duration = Number.isFinite(entry.time) ? Math.max(0, entry.time) : 0;
    const barPct = Math.round((duration / maxDuration) * 100);
    const color = barColor(status);
    const sc = statusClass(status);
    const truncUrl = url.length > 50 ? url.slice(0, 50) + '…' : url;

    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="har-kn-num">${i + 1}</td>` +
      `<td><span class="har-kn-method">${esc(method)}</span></td>` +
      `<td><span class="har-kn-url" title="${esc(url)}">${esc(truncUrl)}</span></td>` +
      `<td><span class="har-kn-status ${sc}">${status || '—'}</span></td>` +
      `<td>${esc(shortMime(mime))}</td>` +
      `<td class="har-kn-num">${size > 0 ? fmtBytes(size) : '—'}</td>` +
      `<td class="har-kn-dur">${fmtMs(duration)}</td>` +
      `<td><div class="har-kn-bar-wrap"><div class="har-kn-bar" style="width:${barPct}%;background:${color};"></div></div></td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  host.appendChild(table);

  return { parentNode: host };
}
