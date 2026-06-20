const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.namedcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.namedcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#26863B;color:#fff;vertical-align:middle;margin-right:8px;}
.namedcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.namedcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.namedcfg-sec{margin:12px 0;}
.namedcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.namedcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.namedcfg-card-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px;font-weight:600;}
.namedcfg-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.namedcfg-kv-key{color:var(--fg-2,#888);min-width:120px;flex-shrink:0;}
.namedcfg-kv-val{font-family:ui-monospace,monospace;}
.namedcfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.namedcfg-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.namedcfg-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.namedcfg-type-master{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;font-weight:600;}
.namedcfg-type-slave{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;font-weight:600;}
.namedcfg-type-hint{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);border:1px solid var(--border,#e0e0e0);font-weight:600;}
.namedcfg-type-forward{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#fff7ed;color:#c2410c;border:1px solid #fdba74;font-weight:600;}
`;

/**
 * Extract the body of the first matching top-level block.
 * Returns the content between the outer braces.
 */
function extractBlock(text, pattern) {
  const match = pattern.exec(text);
  if (!match) return null;
  let depth = 0;
  let start = -1;
  for (let i = match.index; i < text.length; i++) {
    if (text[i] === '{') { if (depth === 0) start = i + 1; depth++; }
    else if (text[i] === '}') { depth--; if (depth === 0) return text.slice(start, i); }
  }
  return null;
}

/**
 * Extract all zone blocks: zone "name" [class] { ... }
 */
function extractZones(text) {
  const zones = [];
  const re = /zone\s+"([^"]+)"\s*(?:\w+\s*)?\{/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    // Extract body of this zone block
    let depth = 0;
    let start = -1;
    for (let i = m.index + m[0].length - 1; i < text.length; i++) {
      if (text[i] === '{') { if (depth === 0) start = i + 1; depth++; }
      else if (text[i] === '}') { depth--; if (depth === 0) { zones.push({ name, body: text.slice(start, i) }); break; } }
    }
  }
  return zones;
}

function getDirective(body, key) {
  const m = new RegExp(`\\b${key}\\s+([^;{]+);`).exec(body);
  return m ? m[1].trim() : null;
}

function parseNamedConf(text) {
  // Strip C-style comments
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/#[^\n]*/g, '');

  // Parse options block
  const optionsBody = extractBlock(stripped, /\boptions\s*\{/);
  const options = {};
  if (optionsBody) {
    options.directory = getDirective(optionsBody, 'directory');
    const listenM = /listen-on\s*\{([^}]+)\}/.exec(optionsBody);
    options.listenOn = listenM ? listenM[1].trim().replace(/\s+/g, ' ') : null;
    const aqM = /allow-query\s*\{([^}]+)\}/.exec(optionsBody);
    options.allowQuery = aqM ? aqM[1].trim().replace(/\s+/g, ' ') : null;
    const fwdM = /forwarders\s*\{([^}]+)\}/.exec(optionsBody);
    options.forwarders = fwdM ? fwdM[1].trim().replace(/\s+/g, ' ') : null;
    options.recursion = getDirective(optionsBody, 'recursion');
    options.dnssecValidation = getDirective(optionsBody, 'dnssec-validation');
  }

  // Parse zones
  const rawZones = extractZones(stripped);
  const zones = rawZones.map(({ name, body }) => {
    let type = getDirective(body, 'type') || 'unknown';
    type = type.toLowerCase();
    const file = getDirective(body, 'file');
    return { name, type, file };
  });

  return { options, zones };
}

function typeChipHtml(type) {
  if (type === 'master' || type === 'primary') return `<span class="namedcfg-type-master">${esc(type)}</span>`;
  if (type === 'slave' || type === 'secondary') return `<span class="namedcfg-type-slave">${esc(type)}</span>`;
  if (type === 'hint') return `<span class="namedcfg-type-hint">${esc(type)}</span>`;
  if (type === 'forward') return `<span class="namedcfg-type-forward">${esc(type)}</span>`;
  return `<span class="namedcfg-type-hint">${esc(type)}</span>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'namedcfg-doc';

  const text = intake.text || '';
  const { options, zones } = parseNamedConf(text);

  // Count zones by type
  const typeCounts = {};
  for (const z of zones) {
    const t = z.type === 'primary' ? 'master' : z.type === 'secondary' ? 'slave' : z.type;
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const summaryParts = [`${zones.length} zone${zones.length !== 1 ? 's' : ''}`];
  for (const [t, n] of Object.entries(typeCounts)) summaryParts.push(`${n} ${t}`);

  // Options card
  const optKvs = [
    ['directory', options.directory],
    ['listen-on', options.listenOn],
    ['allow-query', options.allowQuery],
    ['forwarders', options.forwarders],
    ['recursion', options.recursion],
    ['dnssec-validation', options.dnssecValidation],
  ].filter(([, v]) => v != null);

  const optionsHtml = optKvs.length ? `<div class="namedcfg-sec">
  <h3>Options</h3>
  <div class="namedcfg-card">
    ${optKvs.map(([k, v]) => `<div class="namedcfg-kv"><span class="namedcfg-kv-key">${esc(k)}</span><span class="namedcfg-kv-val">${esc(v)}</span></div>`).join('')}
  </div>
</div>` : '';

  // Zones table
  const zoneRowsHtml = zones.map((z) => `<tr>
  <td>${esc(z.name)}</td>
  <td>${typeChipHtml(z.type)}</td>
  <td>${z.file ? esc(z.file) : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
</tr>`).join('');

  const zonesHtml = zones.length ? `<div class="namedcfg-sec">
  <h3>Zones</h3>
  <table class="namedcfg-table">
    <thead><tr><th>Zone name</th><th>Type</th><th>File</th></tr></thead>
    <tbody>${zoneRowsHtml}</tbody>
  </table>
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="namedcfg-title"><span class="namedcfg-badge">BIND DNS</span>BIND DNS configuration</div>
<div class="namedcfg-sub">${esc(summaryParts.join(' · '))}</div>
${optionsHtml}
${zonesHtml}`;

  return { parentNode: host };
}
