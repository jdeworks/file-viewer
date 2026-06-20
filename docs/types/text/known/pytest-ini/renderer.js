const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pytestini-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pytestini-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0a9edc;color:#fff;vertical-align:middle;margin-right:8px;}
.pytestini-chip-ver{display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;background:#e0f2fe;border:1px solid #7dd3fc;color:#0369a1;font-family:ui-monospace,monospace;margin-left:8px;vertical-align:middle;}
.pytestini-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pytestini-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pytestini-sec{margin:14px 0;}
.pytestini-sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;color:var(--fg-2,#888);margin:0 0 8px;}
.pytestini-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.pytestini-kv{display:flex;gap:8px;font-size:13px;padding:3px 0;}
.pytestini-kv-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.pytestini-kv-val{font-family:ui-monospace,monospace;word-break:break-all;}
.pytestini-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;}
.pytestini-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#e0f2fe;border:1px solid #7dd3fc;color:#0369a1;font-family:ui-monospace,monospace;}
.pytestini-chip.path{background:#f0fdf4;border-color:#86efac;color:#166534;}
.pytestini-chip.flag{background:#f0f9ff;border-color:#93c5fd;color:#1e40af;}
.pytestini-chip.warn{background:#fff7ed;border-color:#fdba74;color:#9a3412;}
.pytestini-chip.warn.err{background:#fef2f2;border-color:#fca5a5;color:#991b1b;}
.pytestini-cov-thresh{display:inline-block;padding:3px 10px;border-radius:8px;font-size:12px;font-weight:700;font-family:ui-monospace,monospace;}
.pytestini-cov-thresh.pass{background:#f0fdf4;border:1px solid #86efac;color:#166534;}
.pytestini-cov-thresh.fail{background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;}
.pytestini-table{width:100%;border-collapse:collapse;font-size:13px;}
.pytestini-table th{text-align:left;font-size:11px;font-weight:600;color:var(--fg-2,#888);padding:4px 10px;border-bottom:2px solid var(--border,#e0e0e0);}
.pytestini-table td{padding:5px 10px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.pytestini-table td:first-child{font-family:ui-monospace,monospace;font-size:12px;font-weight:600;white-space:nowrap;}
.pytestini-table td.desc{color:var(--fg-2,#888);font-size:12px;}
`;

function parseIni(text) {
  const secs = {};
  const secOrder = [];
  let cur = null;
  let lastKey = null;
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    const sec = trimmed.match(/^\[([^\]]+)\]/);
    if (sec) {
      cur = sec[1].trim();
      if (!secs[cur]) { secs[cur] = {}; secOrder.push(cur); }
      lastKey = null;
      continue;
    }
    if (cur) {
      const kv = trimmed.match(/^([^=:]+)[=:](.*)/);
      if (kv) {
        lastKey = kv[1].trim();
        if (secs[cur][lastKey] == null) secs[cur][lastKey] = kv[2].trim();
        else secs[cur][lastKey] += '\n' + kv[2].trim();
      } else if (lastKey && rawLine.match(/^\s+/)) {
        secs[cur][lastKey] = (secs[cur][lastKey] || '') + '\n' + trimmed;
      }
    }
  }
  return { secs, secOrder };
}

export function render(intake) {
  const { secs } = parseIni(intake.text || '');
  // Support both [pytest] and [tool:pytest]
  const cfg = secs['pytest'] || secs['tool:pytest'] || {};
  const sectionName = secs['pytest'] ? '[pytest]' : '[tool:pytest]';

  const minversion = cfg['minversion'] || '';
  const addoptsRaw = cfg['addopts'] || '';
  const addopts = addoptsRaw.replace(/\\\s*\n/g, ' ').split(/[\n\s]+/).map((s) => s.trim()).filter(Boolean);
  const testpathsRaw = cfg['testpaths'] || '';
  const testpaths = testpathsRaw.split(/[\n\s,]+/).map((s) => s.trim()).filter(Boolean);
  const pythonFiles = cfg['python_files'] || '';
  const pythonClasses = cfg['python_classes'] || '';
  const pythonFunctions = cfg['python_functions'] || '';
  const asyncioMode = cfg['asyncio_mode'] || '';
  const markersRaw = cfg['markers'] || '';
  const markers = markersRaw.split(/\n/).map((s) => s.trim()).filter(Boolean);
  const filterwarningsRaw = cfg['filterwarnings'] || '';
  const filterwarnings = filterwarningsRaw.split(/\n/).map((s) => s.trim()).filter(Boolean);

  // Coverage from addopts
  const covTarget = (addopts.find((f) => f.startsWith('--cov=')) || '').replace('--cov=', '');
  const covFailUnder = (addopts.find((f) => f.startsWith('--cov-fail-under=')) || '').replace('--cov-fail-under=', '');
  const covThresh = covFailUnder ? parseInt(covFailUnder, 10) : null;

  // Flags: addopts chips (only -flag style, not --cov-report which is verbose)
  const flagChips = addopts
    .filter((f) => f.startsWith('-'))
    .filter((f) => !f.startsWith('--cov-report'))
    .map((f) => `<span class="pytestini-chip flag">${esc(f)}</span>`)
    .join('');

  // Settings card
  const settingsRows = [];
  if (testpaths.length) {
    settingsRows.push(`<div class="pytestini-kv"><span class="pytestini-kv-key">testpaths</span>
      <span class="pytestini-kv-val"><div class="pytestini-chips">${testpaths.map((p) => `<span class="pytestini-chip path">${esc(p)}</span>`).join('')}</div></span></div>`);
  }
  if (flagChips) {
    settingsRows.push(`<div class="pytestini-kv"><span class="pytestini-kv-key">addopts</span>
      <span class="pytestini-kv-val"><div class="pytestini-chips">${flagChips}</div></span></div>`);
  }
  if (pythonFiles) settingsRows.push(`<div class="pytestini-kv"><span class="pytestini-kv-key">python_files</span><span class="pytestini-kv-val">${esc(pythonFiles)}</span></div>`);
  if (pythonClasses) settingsRows.push(`<div class="pytestini-kv"><span class="pytestini-kv-key">python_classes</span><span class="pytestini-kv-val">${esc(pythonClasses)}</span></div>`);
  if (pythonFunctions) settingsRows.push(`<div class="pytestini-kv"><span class="pytestini-kv-key">python_functions</span><span class="pytestini-kv-val">${esc(pythonFunctions)}</span></div>`);
  if (asyncioMode) settingsRows.push(`<div class="pytestini-kv"><span class="pytestini-kv-key">asyncio_mode</span><span class="pytestini-kv-val">${esc(asyncioMode)}</span></div>`);

  const settingsHtml = settingsRows.length ? `
<div class="pytestini-sec"><h3>Settings</h3><div class="pytestini-card">${settingsRows.join('')}</div></div>` : '';

  // Coverage card
  let covCardHtml = '';
  if (covTarget || covThresh !== null) {
    const threshClass = covThresh === null ? '' : (covThresh >= 80 ? 'pass' : 'fail');
    covCardHtml = `
<div class="pytestini-sec"><h3>Coverage</h3><div class="pytestini-card">
  ${covTarget ? `<div class="pytestini-kv"><span class="pytestini-kv-key">target</span><span class="pytestini-kv-val">${esc(covTarget)}</span></div>` : ''}
  ${covThresh !== null ? `<div class="pytestini-kv"><span class="pytestini-kv-key">fail-under</span><span class="pytestini-kv-val"><span class="pytestini-cov-thresh ${threshClass}">${esc(covFailUnder)}%</span></span></div>` : ''}
</div></div>`;
  }

  // Markers table
  let markersHtml = '';
  if (markers.length) {
    const rows = markers.map((m) => {
      const colon = m.indexOf(':');
      const name = colon >= 0 ? m.slice(0, colon).trim() : m;
      const desc = colon >= 0 ? m.slice(colon + 1).trim() : '';
      return `<tr><td>${esc(name)}</td><td class="desc">${esc(desc)}</td></tr>`;
    }).join('');
    markersHtml = `
<div class="pytestini-sec"><h3>Markers (${markers.length})</h3>
<table class="pytestini-table">
  <thead><tr><th>Marker</th><th>Description</th></tr></thead>
  <tbody>${rows}</tbody>
</table></div>`;
  }

  // Warning filters
  let warningsHtml = '';
  if (filterwarnings.length) {
    const chips = filterwarnings.map((w) => {
      const isError = w.startsWith('error');
      return `<span class="pytestini-chip warn${isError ? ' err' : ''}">${esc(w.slice(0, 60))}${w.length > 60 ? '…' : ''}</span>`;
    }).join('');
    warningsHtml = `<div class="pytestini-sec"><h3>Warning Filters</h3><div class="pytestini-chips">${chips}</div></div>`;
  }

  const subParts = [];
  if (testpaths.length) subParts.push(`${testpaths.length} path${testpaths.length !== 1 ? 's' : ''}`);
  if (markers.length) subParts.push(`${markers.length} marker${markers.length !== 1 ? 's' : ''}`);
  if (covTarget) subParts.push(`cov: ${covTarget}`);
  const sub = subParts.join(' · ') || 'pytest configuration';

  const n = (intake.name || intake.filename || '').split('/').pop() || 'pytest.ini';

  const host = document.createElement('div');
  host.className = 'pytestini-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pytestini-title">
  <span class="pytestini-badge">pytest</span>${esc(n)}${minversion ? `<span class="pytestini-chip-ver">v${esc(minversion)}+</span>` : ''}
</div>
<div class="pytestini-sub">${esc(sub)} · ${esc(sectionName)}</div>
${settingsHtml}
${covCardHtml}
${markersHtml}
${warningsHtml}`;
  return { parentNode: host };
}
