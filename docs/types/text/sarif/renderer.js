function esc(s) {
  return String(s).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

const SEVERITY_ORDER = ['error', 'warning', 'note', 'none'];
const severityClass = (severity) => SEVERITY_ORDER.includes(severity) ? severity : 'none';

export function render(intake) {
  const src = intake.text || intake.textSample || '';
  let sarif;
  try { sarif = JSON.parse(src); } catch { return { bodyHtml: '<p class="sarif-preview sarif-invalid">Invalid SARIF JSON</p>', hadUnsafe: false }; }

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
      return `<span class="sarif-sev-badge sarif-sev-${severityClass(s)}">${counts[s]} ${s}</span>`;
    }).join(' ');

  // Findings table — every finding (no 20-row cap), with a client-side severity filter and
  // pagination handled by the inline script below. A hard render cap keeps the DOM bounded for
  // pathologically large reports; the cap is surfaced (never silent).
  const MAX_RENDER = 2000;
  const PAGE_SIZE = 50;
  const rendered = allResults.slice(0, MAX_RENDER);
  const capped = allResults.length > MAX_RENDER;
  const rows = rendered.map(r => {
    const sevClass = severityClass(r.severity);
    const loc = r.file ? `${esc(r.file.split('/').pop())}${r.line ? ':' + esc(String(r.line)) : ''}` : '';
    return `<tr data-sev="${esc(r.severity)}" class="sarif-row-${sevClass}">
      <td data-label="Level"><span class="sarif-level sarif-sev-${sevClass}">${esc(r.severity)}</span></td>
      <td data-label="Rule"><code class="sarif-rule">${esc(r.ruleId)}</code></td>
      <td data-label="Message" class="sarif-message" title="${esc(r.msg)}">${esc(r.msg.slice(0, 120))}${r.msg.length > 120 ? '…' : ''}</td>
      <td data-label="Location" class="sarif-location">${loc}</td>
    </tr>`;
  }).join('');

  // Severity filter chips (All + each present severity), driven by the inline script.
  const filterChips = [`<button type="button" class="sarif-filter active" data-sev="all">All ${allResults.length}</button>`]
    .concat(SEVERITY_ORDER.filter(s => counts[s]).map(s => {
      return `<button type="button" class="sarif-filter sarif-filter-${severityClass(s)}" data-sev="${s}">${counts[s]} ${s}</button>`;
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
      <section class="sarif-preview">
      <div class="badge-row"><span class="badge-sarif">SARIF</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">Overview</h4>
        ${overviewHtml}
      </div>
      ${rows ? `<div class="meta-section">
        <h4 class="meta-section-title">Findings</h4>
        <div class="sarif-filters">${filterChips}</div>
        <div class="sarif-pager">
          <button type="button" id="sarif-prev" class="sarif-pg-btn">‹ Prev</button>
          <span id="sarif-page-info" class="sarif-page-info"></span>
          <button type="button" id="sarif-next" class="sarif-pg-btn">Next ›</button>
        </div>
        <div class="sarif-table-wrap">
        <table class="sarif-table">
          <thead><tr><th>Level</th><th>Rule</th><th>Message</th><th>Location</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
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
      </div>` : '<p class="sarif-empty">No findings — clean scan!</p>'}
      </section>
    `,
    hadUnsafe: false,
  };
}
