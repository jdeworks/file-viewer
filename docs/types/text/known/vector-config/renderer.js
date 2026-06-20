const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vectorcfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.vectorcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#14B38C;color:#fff;vertical-align:middle;margin-right:8px}
.vectorcfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.vectorcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.vectorcfg-overview{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.vectorcfg-stat{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 14px;font-size:13px;text-align:center}
.vectorcfg-stat-num{font-size:20px;font-weight:700;display:block;color:var(--fg,#24292f)}
.vectorcfg-stat-label{font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em}
.vectorcfg-sec{margin:14px 0}
.vectorcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.vectorcfg-table{width:100%;border-collapse:collapse;font-size:13px}
.vectorcfg-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.vectorcfg-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-size:12px}
.vectorcfg-id{font-family:ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f)}
.vectorcfg-chip{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;font-family:ui-monospace,monospace;margin:1px 2px 1px 0;border:1px solid transparent}
.vectorcfg-chip-file{background:#dbeafe;color:#1e40af;border-color:#93c5fd}
.vectorcfg-chip-kafka{background:#ffedd5;color:#9a3412;border-color:#fdba74}
.vectorcfg-chip-http{background:#f3e8ff;color:#6b21a8;border-color:#d8b4fe}
.vectorcfg-chip-stdin{background:#f3f4f6;color:#374151;border-color:#d1d5db}
.vectorcfg-chip-socket{background:#cffafe;color:#155e75;border-color:#67e8f9}
.vectorcfg-chip-elasticsearch{background:#fef9c3;color:#713f12;border-color:#fde047}
.vectorcfg-chip-prometheus{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
.vectorcfg-chip-console{background:#f3f4f6;color:#374151;border-color:#d1d5db}
.vectorcfg-chip-default{background:var(--bg-2,#f6f8fa);color:var(--fg-2,#555);border-color:var(--border,#e0e0e0)}
.vectorcfg-inputs{color:var(--fg-2,#666);font-size:11px;font-family:ui-monospace,monospace}
`;

function typeChip(type, role) {
  const t = (type || '').toLowerCase();
  let cls = 'vectorcfg-chip-default';
  if (role === 'source') {
    if (t === 'file') cls = 'vectorcfg-chip-file';
    else if (t === 'kafka') cls = 'vectorcfg-chip-kafka';
    else if (t === 'http' || t === 'http_client' || t === 'http_server') cls = 'vectorcfg-chip-http';
    else if (t === 'stdin') cls = 'vectorcfg-chip-stdin';
    else if (t === 'socket') cls = 'vectorcfg-chip-socket';
  } else if (role === 'sink') {
    if (t === 'elasticsearch') cls = 'vectorcfg-chip-elasticsearch';
    else if (t.startsWith('prometheus')) cls = 'vectorcfg-chip-prometheus';
    else if (t === 'kafka') cls = 'vectorcfg-chip-kafka';
    else if (t === 'http') cls = 'vectorcfg-chip-http';
    else if (t === 'console') cls = 'vectorcfg-chip-console';
  }
  return `<span class="vectorcfg-chip ${cls}">${esc(type || '—')}</span>`;
}

// ── TOML parser (minimal — handles [section.name] style blocks) ──
function parseToml(text) {
  const sources = {}, transforms = {}, sinks = {};
  let current = null; // { bucket, name }
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // Section header: [sources.name] or [transforms.name] or [sinks.name]
    const sec = /^\[(sources|transforms|sinks)\.([^\]]+)\]/.exec(line);
    if (sec) {
      const bucket = sec[1], name = sec[2];
      if (bucket === 'sources') { sources[name] = sources[name] || { type: null, paths: [], inputs: [] }; current = { bucket: sources, name }; }
      else if (bucket === 'transforms') { transforms[name] = transforms[name] || { type: null, inputs: [] }; current = { bucket: transforms, name }; }
      else if (bucket === 'sinks') { sinks[name] = sinks[name] || { type: null, inputs: [], endpoint: null }; current = { bucket: sinks, name }; }
      continue;
    }
    // Any other section — stop tracking
    if (/^\[/.test(line)) { current = null; continue; }
    if (!current) continue;
    const obj = current.bucket[current.name];
    const kv = /^(\w+)\s*=\s*(.+)/.exec(line);
    if (!kv) continue;
    const key = kv[1], val = kv[2].trim();
    if (key === 'type') obj.type = val.replace(/^["']|["']$/g, '');
    if (key === 'endpoint' || key === 'address') obj.endpoint = val.replace(/^["']|["']$/g, '');
    if (key === 'inputs') {
      // ["a", "b"] array
      const matches = val.match(/"([^"]+)"/g) || val.match(/'([^']+)'/g) || [];
      obj.inputs = matches.map((m) => m.replace(/^["']|["']$/g, ''));
    }
    if (key === 'include') {
      const matches = val.match(/"([^"]+)"/g) || val.match(/'([^']+)'/g) || [];
      if (matches.length) obj.paths = matches.map((m) => m.replace(/^["']|["']$/g, ''));
    }
  }
  return { sources, transforms, sinks };
}

// ── YAML parser (minimal — handles top-level sources:/transforms:/sinks: blocks) ──
function parseYaml(text) {
  const sources = {}, transforms = {}, sinks = {};
  let bucket = null, current = null;
  for (const raw of text.split('\n')) {
    const line = raw;
    const stripped = line.trimStart();
    if (!stripped || stripped.startsWith('#')) continue;
    const indent = line.length - stripped.length;
    // Top-level key
    if (indent === 0) {
      if (/^sources\s*:/.test(stripped)) { bucket = sources; current = null; }
      else if (/^transforms\s*:/.test(stripped)) { bucket = transforms; current = null; }
      else if (/^sinks\s*:/.test(stripped)) { bucket = sinks; current = null; }
      else { bucket = null; current = null; }
      continue;
    }
    if (!bucket) continue;
    // Indent 2: component name
    if (indent === 2) {
      const nameM = /^(\w[\w-]*):\s*$/.exec(stripped);
      if (nameM) { current = nameM[1]; bucket[current] = bucket[current] || { type: null, inputs: [], paths: [], endpoint: null }; }
      continue;
    }
    if (!current) continue;
    const obj = bucket[current];
    const kv = /^(\w+)\s*:\s*(.*)/.exec(stripped);
    if (!kv) continue;
    const key = kv[1], val = kv[2].trim();
    if (key === 'type') obj.type = val.replace(/^["']|["']$/g, '');
    if (key === 'endpoint' || key === 'address') obj.endpoint = val.replace(/^["']|["']$/g, '');
    if (key === 'inputs' && val.startsWith('[')) {
      obj.inputs = val.replace(/[[\]]/g, '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }
  }
  return { sources, transforms, sinks };
}

function renderTable(title, entries, role) {
  if (!entries.length) return '';
  const isTransform = role === 'transform';
  const rows = entries.map(([id, cfg]) => {
    const inputsHtml = cfg.inputs && cfg.inputs.length
      ? `<span class="vectorcfg-inputs">${cfg.inputs.map(esc).join(', ')}</span>`
      : '<span style="color:var(--fg-2,#888);">—</span>';
    const endpointHtml = cfg.endpoint ? `<span style="font-family:ui-monospace,monospace;font-size:11px;">${esc(cfg.endpoint)}</span>` : '';
    if (isTransform) {
      return `<tr><td><span class="vectorcfg-id">${esc(id)}</span></td><td>${typeChip(cfg.type, 'transform')}</td><td>${inputsHtml}</td></tr>`;
    } else if (role === 'source') {
      const pathsHtml = cfg.paths && cfg.paths.length
        ? `<span style="font-family:ui-monospace,monospace;font-size:11px;color:var(--fg-2,#666);">${cfg.paths.map(esc).join(', ')}</span>`
        : '';
      return `<tr><td><span class="vectorcfg-id">${esc(id)}</span></td><td>${typeChip(cfg.type, 'source')}</td><td>${pathsHtml}</td></tr>`;
    } else {
      return `<tr><td><span class="vectorcfg-id">${esc(id)}</span></td><td>${typeChip(cfg.type, 'sink')}</td><td>${inputsHtml}</td>${endpointHtml ? `<td>${endpointHtml}</td>` : '<td>—</td>'}</tr>`;
    }
  }).join('');

  if (isTransform) {
    return `<div class="vectorcfg-sec"><h3>${esc(title)} (${entries.length})</h3>
<table class="vectorcfg-table"><thead><tr><th>Name</th><th>Type</th><th>Inputs</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  } else if (role === 'source') {
    return `<div class="vectorcfg-sec"><h3>${esc(title)} (${entries.length})</h3>
<table class="vectorcfg-table"><thead><tr><th>Name</th><th>Type</th><th>Paths / Info</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  } else {
    return `<div class="vectorcfg-sec"><h3>${esc(title)} (${entries.length})</h3>
<table class="vectorcfg-table"><thead><tr><th>Name</th><th>Type</th><th>Inputs</th><th>Endpoint</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
}

export function render(intake) {
  const text = intake.text || '';
  const isToml = text.includes('[sources.') || text.includes('[sinks.') || text.includes('[transforms.');
  const { sources, transforms, sinks } = isToml ? parseToml(text) : parseYaml(text);

  const srcEntries = Object.entries(sources);
  const trsEntries = Object.entries(transforms);
  const snkEntries = Object.entries(sinks);

  const overviewHtml = `<div class="vectorcfg-overview">
  <div class="vectorcfg-stat"><span class="vectorcfg-stat-num">${srcEntries.length}</span><span class="vectorcfg-stat-label">Sources</span></div>
  <div class="vectorcfg-stat"><span class="vectorcfg-stat-num">${trsEntries.length}</span><span class="vectorcfg-stat-label">Transforms</span></div>
  <div class="vectorcfg-stat"><span class="vectorcfg-stat-num">${snkEntries.length}</span><span class="vectorcfg-stat-label">Sinks</span></div>
</div>`;

  const sourcesHtml = renderTable('Sources', srcEntries, 'source');
  const transformsHtml = renderTable('Transforms', trsEntries, 'transform');
  const sinksHtml = renderTable('Sinks', snkEntries, 'sink');

  const host = document.createElement('div');
  host.className = 'vectorcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="vectorcfg-badge">Vector</span>
  <span class="vectorcfg-title">Pipeline Configuration</span>
</div>
<div class="vectorcfg-sub">${esc(isToml ? 'TOML' : 'YAML')} format · ${srcEntries.length} source${srcEntries.length !== 1 ? 's' : ''} · ${trsEntries.length} transform${trsEntries.length !== 1 ? 's' : ''} · ${snkEntries.length} sink${snkEntries.length !== 1 ? 's' : ''}</div>
${overviewHtml}${sourcesHtml}${transformsHtml}${sinksHtml}`;

  return { parentNode: host };
}
