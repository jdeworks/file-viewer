function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function bytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return Math.round(n) + ' B';
}

function ms(n) {
  return Math.round(n || 0).toLocaleString() + ' ms';
}

function category(entry) {
  const mime = entry.response?.content?.mimeType || '';
  const type = entry._resourceType || entry.resourceType || '';
  const url = entry.request?.url || '';
  if (/xhr|fetch/i.test(type) || /json|xml/.test(mime)) return 'xhr';
  if (/javascript|ecmascript/.test(mime) || /\.m?js(?:[?#]|$)/i.test(url)) return 'js';
  if (/css/.test(mime) || /\.css(?:[?#]|$)/i.test(url)) return 'css';
  if (/^image\//.test(mime) || /\.(png|jpe?g|gif|webp|svg)(?:[?#]|$)/i.test(url)) return 'image';
  return 'other';
}

function entrySize(entry) {
  const res = entry.response || {};
  const content = res.content || {};
  const parts = [res.bodySize, content.size, res.headersSize, entry._transferSize].filter((n) => Number.isFinite(n) && n > 0);
  return parts.length ? Math.max(...parts) : 0;
}

export function parseHar(intake) {
  const obj = JSON.parse(intake.text || '{}');
  const log = obj.log || {};
  const raw = Array.isArray(log.entries) ? log.entries : [];
  const first = raw.reduce((min, e) => {
    const t = Date.parse(e.startedDateTime || '');
    return Number.isFinite(t) ? Math.min(min, t) : min;
  }, Infinity);
  const base = Number.isFinite(first) ? first : 0;
  const entries = raw.map((entry, i) => {
    const startAbs = Date.parse(entry.startedDateTime || '');
    const start = Number.isFinite(startAbs) ? startAbs - base : 0;
    const duration = Number.isFinite(entry.time) ? Math.max(0, entry.time) : 0;
    const url = entry.request?.url || '';
    return {
      i,
      method: entry.request?.method || 'GET',
      url,
      status: entry.response?.status || 0,
      mime: entry.response?.content?.mimeType || '',
      size: entrySize(entry),
      duration,
      start,
      category: category(entry),
    };
  });
  const end = entries.reduce((m, e) => Math.max(m, e.start + e.duration), 0);
  const creator = [log.creator?.name, log.creator?.version].filter(Boolean).join(' ');
  return {
    entries,
    creator,
    pages: Array.isArray(log.pages) ? log.pages.length : 0,
    date: raw[0]?.startedDateTime || '',
    totalSize: entries.reduce((n, e) => n + e.size, 0),
    totalDuration: end,
  };
}

export async function render(intake, _ctx) {
  let har;
  try { har = parseHar(intake); }
  catch (err) {
    return { bodyHtml: '<div class="har-doc"><p>Preview failed: ' + esc(err.message || err) + '</p></div>', hadUnsafe: false };
  }
  const rows = har.entries.map((e) => `<tr data-cat="${e.category}" data-method="${esc(e.method)}" data-url="${esc(e.url)}" data-status="${e.status}" data-mime="${esc(e.mime)}" data-size="${e.size}" data-duration="${e.duration}">
    <td class="har-method">${esc(e.method)}</td><td class="har-url" title="${esc(e.url)}">${esc(e.url)}</td><td><span class="har-status s${Math.floor(e.status / 100)}">${e.status}</span></td><td>${esc(e.mime || 'unknown')}</td><td>${bytes(e.size)}</td><td>${ms(e.duration)}</td>
  </tr>`).join('');
  const data = JSON.stringify(har.entries.map((e) => ({ url: e.url, status: e.status, start: e.start, duration: e.duration, category: e.category }))).replace(/<\//g, '<\\/');
  const filters = ['all', 'xhr', 'js', 'css', 'image', 'other'].map((f) => '<button type="button" class="har-filter" data-filter="' + f + '" aria-pressed="' + (f === 'all') + '">' + (f === 'xhr' ? 'XHR' : f[0].toUpperCase() + f.slice(1)) + '</button>').join('');
  return {
    hadUnsafe: false,
    bodyHtml: `<section class="har-doc">
  <style>
    .har-doc{max-width:1100px;margin:0 auto;padding:18px;color:#172033;font-family:system-ui,sans-serif}.har-summary{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px}.har-card{border:1px solid #d9e1ec;border-radius:8px;background:#f8fafc;padding:10px 12px;min-width:140px}.har-card strong{display:block;font-size:1.25rem}.har-card span{font-size:.82rem;color:#5a6678}.har-chart{height:260px;border:1px solid #d9e1ec;border-radius:8px;background:#fff;margin-bottom:14px;padding:10px}.har-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.har-filter{border:1px solid #cbd5e1;background:#fff;border-radius:6px;padding:6px 10px;color:#172033}.har-filter[aria-pressed="true"]{background:#172033;color:#fff}.har-table{width:100%;border-collapse:collapse;font-size:.88rem}.har-table th,.har-table td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}.har-table th{cursor:pointer;white-space:nowrap}.har-url{max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.har-status{border-radius:999px;padding:2px 7px;color:#fff;background:#64748b}.har-status.s2{background:#16a34a}.har-status.s3{background:#2563eb}.har-status.s4{background:#f97316}.har-status.s5{background:#dc2626}.fv-dark .har-doc{color:#e8edf7}.fv-dark .har-card,.fv-dark .har-chart,.fv-dark .har-filter{background:#111827;border-color:#304052;color:#e8edf7}.fv-dark .har-card span{color:#aab5c6}.fv-dark .har-table th,.fv-dark .har-table td{border-color:#304052}.fv-dark .har-filter[aria-pressed="true"]{background:#e8edf7;color:#111827}@media (max-width:720px){.har-doc{padding:12px}.har-url{max-width:180px}}
  </style>
  <div class="har-summary"><div class="har-card"><strong>${har.entries.length}</strong><span>Requests</span></div><div class="har-card"><strong>${bytes(har.totalSize)}</strong><span>Transferred</span></div><div class="har-card"><strong>${ms(har.totalDuration)}</strong><span>Total duration</span></div></div>
  <div class="har-chart"><canvas class="har-waterfall" aria-label="HAR waterfall chart"></canvas></div>
  <div class="har-filters">${filters}</div>
  <table class="har-table"><thead><tr><th data-sort="method">Method</th><th data-sort="url">URL</th><th data-sort="status">Status</th><th data-sort="mime">MIME type</th><th data-sort="size">Size</th><th data-sort="duration">Duration</th></tr></thead><tbody>${rows}</tbody></table>
</section>
<script src="/vendor/chartjs/chart.umd.js"></scr` + `ipt>
<script>
(() => {
  const entries = ${data};
  const isDark = document.body.classList.contains('fv-dark');
  const colors = entries.map((e) => e.status >= 500 ? '#dc2626' : e.status >= 400 ? '#f97316' : e.status >= 300 ? '#2563eb' : e.status >= 200 ? '#16a34a' : '#64748b');
  const canvas = document.querySelector('.har-waterfall');
  function fallback() {
    const r = canvas.getBoundingClientRect(), dpr = Math.max(1, devicePixelRatio || 1), ctx = canvas.getContext('2d');
    canvas.width = r.width * dpr; canvas.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
    const max = Math.max(1, ...entries.map((e) => e.start + e.duration)), row = Math.max(10, (r.height - 20) / Math.max(1, entries.length));
    entries.forEach((e, i) => { ctx.fillStyle = colors[i]; ctx.fillRect(12 + e.start / max * (r.width - 24), 10 + i * row, Math.max(2, e.duration / max * (r.width - 24)), Math.max(4, row - 3)); });
  }
  if (window.Chart && entries.length) new Chart(canvas, { type: 'bar', data: { labels: entries.map((e) => new URL(e.url, 'http://x').pathname || e.url), datasets: [{ data: entries.map((e) => [e.start, e.start + e.duration]), backgroundColor: colors, borderWidth: 0 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, parsing: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => entries[c.dataIndex].duration.toFixed(0) + ' ms' } } }, scales: { x: { ticks: { color: isDark ? '#e8edf7' : '#172033' }, grid: { color: isDark ? '#304052' : '#e2e8f0' } }, y: { ticks: { color: isDark ? '#e8edf7' : '#172033' }, grid: { display: false } } } } });
  else fallback();
  const tbody = document.querySelector('.har-table tbody');
  document.querySelectorAll('.har-filter').forEach((b) => b.addEventListener('click', () => { const f = b.dataset.filter; document.querySelectorAll('.har-filter').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); tbody.querySelectorAll('tr').forEach((r) => { r.hidden = f !== 'all' && r.dataset.cat !== f; }); }));
  document.querySelectorAll('.har-table th').forEach((th) => th.addEventListener('click', () => { const key = th.dataset.sort, numeric = key === 'status' || key === 'size' || key === 'duration'; [...tbody.rows].sort((a, b) => numeric ? Number(a.dataset[key]) - Number(b.dataset[key]) : a.dataset[key].localeCompare(b.dataset[key])).forEach((r) => tbody.appendChild(r)); }));
})();
</scr` + `ipt>`,
  };
}
