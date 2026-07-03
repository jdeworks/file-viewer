function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const SEVERITY_ORDER = ['error', 'warning', 'note', 'none'];
const SEVERITY_COLORS = {
  error: { bg: '#ffebee', border: '#c62828', text: '#b71c1c', badge: '#c62828' },
  warning: { bg: '#fff8e1', border: '#f57f17', text: '#e65100', badge: '#f57f17' },
  note: { bg: '#e3f2fd', border: '#1565c0', text: '#0d47a1', badge: '#1565c0' },
  none: { bg: '#f5f5f5', border: '#9e9e9e', text: '#616161', badge: '#757575' },
};

export function render(intake) {
  const src = intake.text || intake.textSample || '';
  let sarif;
  try { sarif = JSON.parse(src); } catch { return { bodyHtml: '<p style="color:#c62828">Invalid SARIF JSON</p>', hadUnsafe: false }; }

  const runs = Array.isArray(sarif.runs) ? sarif.runs : [];
  const version = sarif.version || '?';

  const allResults = [];
  const tools = [];
  for (const run of runs) {
    const toolName = run?.tool?.driver?.name || 'Unknown';
    const toolVersion = run?.tool?.driver?.version || '';
    tools.push(toolVersion ? `${toolName} ${toolVersion}` : toolName);
    const rules = {};
    for (const rule of (run?.tool?.driver?.rules || [])) {
      rules[rule.id] = rule;
    }
    for (const result of (run?.results || [])) {
      const loc = result?.locations?.[0]?.physicalLocation;
      const file = loc?.artifactLocation?.uri || '';
      const line = loc?.region?.startLine || null;
      const severity = (result.level || 'warning').toLowerCase();
      const ruleId = result.ruleId || '';
      const msg = result.message?.text || result.message?.markdown || '';
      allResults.push({ severity, ruleId, msg, file, line, toolName });
    }
  }

  // Count by severity
  const counts = {};
  for (const r of allResults) counts[r.severity] = (counts[r.severity] || 0) + 1;

  const summaryBadges = SEVERITY_ORDER
    .filter(s => counts[s])
    .map(s => {
      const c = SEVERITY_COLORS[s] || SEVERITY_COLORS.none;
      return `<span class="sarif-sev-badge" style="background:${c.badge};color:#fff">${counts[s]} ${s}</span>`;
    }).join(' ');

  // Findings table — every finding (no 20-row cap), with a client-side severity filter and
  // pagination handled by the inline script below. A hard render cap keeps the DOM bounded for
  // pathologically large reports; the cap is surfaced (never silent).
  const MAX_RENDER = 2000;
  const PAGE_SIZE = 50;
  const rendered = allResults.slice(0, MAX_RENDER);
  const capped = allResults.length > MAX_RENDER;
  const rows = rendered.map(r => {
    const c = SEVERITY_COLORS[r.severity] || SEVERITY_COLORS.none;
    const loc = r.file ? `${esc(r.file.split('/').pop())}${r.line ? ':' + esc(String(r.line)) : ''}` : '';
    return `<tr data-sev="${esc(r.severity)}" style="background:${c.bg}">
      <td><span class="sarif-level" style="background:${c.badge};color:#fff">${esc(r.severity)}</span></td>
      <td><code style="font-size:0.8rem">${esc(r.ruleId)}</code></td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.msg)}">${esc(r.msg.slice(0, 120))}${r.msg.length > 120 ? '…' : ''}</td>
      <td style="font-size:0.8rem;color:#546e7a">${loc}</td>
    </tr>`;
  }).join('');

  // Severity filter chips (All + each present severity), driven by the inline script.
  const filterChips = [`<button type="button" class="sarif-filter active" data-sev="all">All ${allResults.length}</button>`]
    .concat(SEVERITY_ORDER.filter(s => counts[s]).map(s => {
      const c = SEVERITY_COLORS[s] || SEVERITY_COLORS.none;
      return `<button type="button" class="sarif-filter" data-sev="${s}" style="border-color:${c.badge};color:${c.text}">${counts[s]} ${s}</button>`;
    })).join('');

  const overviewHtml = `
    <div class="meta-row"><span class="meta-key">SARIF version</span><span class="meta-val">${esc(version)}</span></div>
    <div class="meta-row"><span class="meta-key">Runs</span><span class="meta-val">${runs.length}</span></div>
    <div class="meta-row"><span class="meta-key">Tool(s)</span><span class="meta-val">${tools.map(esc).join(', ') || '—'}</span></div>
    <div class="meta-row"><span class="meta-key">Total findings</span><span class="meta-val">${allResults.length}</span></div>
    <div class="meta-row"><span class="meta-key">By severity</span><span class="meta-val">${summaryBadges || '—'}</span></div>
  `;

  return {
    bodyHtml: `
      <style>
        .badge-sarif { background: #b71c1c; color: #fff; }
        .sarif-sev-badge { display:inline-block; border-radius:3px; padding:2px 8px; font-size:0.82rem; margin:2px; font-weight:bold; }
        .sarif-level { display:inline-block; border-radius:3px; padding:1px 6px; font-size:0.78rem; font-weight:bold; }
        .sarif-table { width:100%; border-collapse:collapse; font-size:0.85rem; }
        .sarif-table th { text-align:left; padding:6px 8px; background:#eceff1; font-weight:600; }
        .sarif-table td { padding:5px 8px; border-bottom:1px solid #f0f0f0; vertical-align:top; }
        .sarif-filters { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 10px; }
        .sarif-filter { cursor:pointer; border:1px solid #b0bec5; background:#fff; color:#37474f;
          border-radius:14px; padding:3px 11px; font-size:0.8rem; font-weight:600; }
        .sarif-filter.active { background:#37474f; color:#fff; border-color:#37474f; }
        .sarif-pager { display:flex; align-items:center; gap:12px; margin:10px 0 4px; font-size:0.85rem; }
        .sarif-pg-btn { cursor:pointer; border:1px solid #b0bec5; background:#fff; color:#37474f;
          border-radius:6px; padding:4px 12px; font-size:0.85rem; }
        .sarif-pg-btn:disabled { opacity:0.4; cursor:default; }
        .sarif-page-info { color:#546e7a; }
        .sarif-cap-note { color:#e65100; font-size:0.8rem; margin:4px 0 0; }
      </style>
      <div class="badge-row"><span class="badge badge-sarif">SARIF</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">Overview</h4>
        ${overviewHtml}
      </div>
      ${rows ? `<div class="meta-section">
        <h4 class="meta-section-title">Findings</h4>
        <div class="sarif-filters">${filterChips}</div>
        <table class="sarif-table">
          <thead><tr><th>Level</th><th>Rule</th><th>Message</th><th>Location</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="sarif-pager">
          <button type="button" id="sarif-prev" class="sarif-pg-btn">‹ Prev</button>
          <span id="sarif-page-info" class="sarif-page-info"></span>
          <button type="button" id="sarif-next" class="sarif-pg-btn">Next ›</button>
        </div>
        ${capped ? `<p class="sarif-cap-note">Showing the first ${MAX_RENDER} findings of ${allResults.length} — download the file for the full set.</p>` : ''}
        <script>
        (function () {
          var PAGE = ${PAGE_SIZE}, page = 0, sev = 'all';
          var rows = [].slice.call(document.querySelectorAll('tr[data-sev]'));
          var info = document.getElementById('sarif-page-info');
          var prev = document.getElementById('sarif-prev');
          var next = document.getElementById('sarif-next');
          function filtered() { return sev === 'all' ? rows : rows.filter(function (r) { return r.getAttribute('data-sev') === sev; }); }
          function render() {
            var f = filtered(), total = f.length, pages = Math.max(1, Math.ceil(total / PAGE));
            if (page >= pages) page = pages - 1;
            if (page < 0) page = 0;
            var start = page * PAGE, end = Math.min(start + PAGE, total);
            rows.forEach(function (r) { r.style.display = 'none'; });
            f.slice(start, end).forEach(function (r) { r.style.display = ''; });
            info.textContent = total ? ('Showing ' + (start + 1) + '–' + end + ' of ' + total) : 'No findings for this filter';
            prev.disabled = page <= 0;
            next.disabled = page >= pages - 1;
          }
          document.querySelectorAll('.sarif-filter').forEach(function (b) {
            b.addEventListener('click', function () {
              sev = b.getAttribute('data-sev'); page = 0;
              document.querySelectorAll('.sarif-filter').forEach(function (x) { x.classList.toggle('active', x === b); });
              render();
            });
          });
          prev.addEventListener('click', function () { page--; render(); });
          next.addEventListener('click', function () { page++; render(); });
          render();
        })();
        </script>
      </div>` : '<p style="color:#388e3c;padding:8px">No findings — clean scan!</p>'}
    `,
    hadUnsafe: false,
  };
}
