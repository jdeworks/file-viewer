// Enhanced sqitch.conf viewer.
// Parses INI-like sections: [core], [engine "pg"], [target "name"].
// Masks credentials in URIs.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sq-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-sq{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px}
.sq-title{font-size:18px;font-weight:700;margin:0 0 4px}
.sq-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.sq-sec{margin:12px 0}
.sq-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.sq-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.sq-card-title{font-size:13px;font-weight:600;margin:0 0 8px;color:var(--fg,#24292f)}
.sq-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.sq-row:last-child{border-bottom:none}
.sq-key{color:var(--fg-2,#888);min-width:130px;flex-shrink:0;font-size:12px}
.sq-val{font-family:ui-monospace,monospace;word-break:break-all}
.sq-val.masked{color:var(--fg-2,#aaa)}
.sq-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:#e3f2fd;border:1px solid #90caf9;color:#0d47a1;margin:1px 3px 1px 0}
`;

function parseSqitchConf(text) {
  // Returns { core: {key:val}, engines: [{name, kv}], targets: [{name, kv}], user: {key:val} }
  const result = { core: {}, engines: [], targets: [], user: {}, raw: {} };
  let currentSection = null;
  let currentName = null;
  let currentType = null;
  let currentKv = null;

  function flush() {
    if (!currentType) return;
    if (currentType === 'core') { /* already writing to result.core */ }
    else if (currentType === 'engine') result.engines.push({ name: currentName, kv: currentKv });
    else if (currentType === 'target') result.targets.push({ name: currentName, kv: currentKv });
    else if (currentType === 'user') { /* already writing to result.user */ }
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    // Section header: [core], [engine "pg"], [target "dev"]
    const secMatch = line.match(/^\[(\w+)(?:\s+"([^"]+)")?\]$/);
    if (secMatch) {
      flush();
      currentSection = secMatch[1].toLowerCase();
      currentName = secMatch[2] || null;
      if (currentSection === 'core') { currentType = 'core'; currentKv = result.core; }
      else if (currentSection === 'engine') { currentType = 'engine'; currentKv = {}; }
      else if (currentSection === 'target') { currentType = 'target'; currentKv = {}; }
      else if (currentSection === 'user') { currentType = 'user'; currentKv = result.user; }
      else { currentType = 'other'; currentKv = {}; }
      continue;
    }

    // key = value
    const eq = line.indexOf('=');
    if (eq >= 0 && currentKv) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      currentKv[key] = val;
    }
  }
  flush();
  return result;
}

function maskUri(uri) {
  if (!uri) return uri;
  return uri.replace(/:\/\/([^:@/?#]+):([^@/?#]+)@/, '://$1:***@');
}

function hasCredentials(uri) {
  return uri && /:\/\/[^:@/?#]+:[^@/?#]+@/.test(uri);
}

function renderKv(kv, maskKeys = ['password', 'pass']) {
  return Object.entries(kv).map(([k, v]) => {
    const isMasked = maskKeys.some((mk) => k.toLowerCase().includes(mk));
    const displayVal = isMasked ? '••••••••' : k === 'uri' || k === 'target' ? maskUri(v) : v;
    const maskedClass = isMasked || (k === 'uri' && hasCredentials(v)) ? ' masked' : '';
    return `<div class="sq-row"><span class="sq-key">${esc(k)}</span><span class="sq-val${maskedClass}">${esc(displayVal)}</span></div>`;
  }).join('');
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.filename || intake.name || 'sqitch.conf').split('/').pop();
  const parsed = parseSqitchConf(text);

  // Core section
  const coreRows = Object.keys(parsed.core).length ? renderKv(parsed.core) : '';
  const coreHtml = coreRows
    ? `<div class="sq-sec"><h3>Core</h3><div class="sq-card">${coreRows}</div></div>`
    : '';

  // Engine sections
  const enginesHtml = parsed.engines.length
    ? `<div class="sq-sec"><h3>Engines (${parsed.engines.length})</h3>${parsed.engines.map((e) =>
        `<div class="sq-card"><div class="sq-card-title">engine "<span class="sq-chip">${esc(e.name)}</span>"</div>${renderKv(e.kv)}</div>`
      ).join('')}</div>`
    : '';

  // Target sections
  const targetsHtml = parsed.targets.length
    ? `<div class="sq-sec"><h3>Targets (${parsed.targets.length})</h3>${parsed.targets.map((t) =>
        `<div class="sq-card"><div class="sq-card-title">target "<span class="sq-chip">${esc(t.name)}</span>"</div>${renderKv(t.kv)}</div>`
      ).join('')}</div>`
    : '';

  // User section
  const userRows = Object.keys(parsed.user).length ? renderKv(parsed.user) : '';
  const userHtml = userRows
    ? `<div class="sq-sec"><h3>User</h3><div class="sq-card">${userRows}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'sq-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sq-title"><span class="badge-sq">Sqitch</span>${esc(name)}</div>
<div class="sq-sub">Database change management configuration</div>
${coreHtml}${enginesHtml}${targetsHtml}${userHtml}`;
  return { parentNode: host };
}
