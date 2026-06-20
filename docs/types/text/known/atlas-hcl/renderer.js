// Enhanced atlas.hcl / atlas.sum viewer.
// For atlas.hcl: parses env blocks, variable declarations, data sources.
// For atlas.sum: shows file count and hash integrity table.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.at-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-at{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px}
.at-title{font-size:18px;font-weight:700;margin:0 0 4px}
.at-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.at-sec{margin:12px 0}
.at-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.at-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.at-card-title{font-size:13px;font-weight:600;margin:0 0 8px;color:var(--fg,#24292f)}
.at-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.at-row:last-child{border-bottom:none}
.at-key{color:var(--fg-2,#888);min-width:130px;flex-shrink:0;font-size:12px}
.at-val{font-family:ui-monospace,monospace;word-break:break-all}
.at-val.masked{color:var(--fg-2,#aaa)}
.at-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:#e3f2fd;border:1px solid #90caf9;color:#0d47a1;margin:1px 3px 1px 0}
.at-sum-table{width:100%;border-collapse:collapse;font-size:12px}
.at-sum-table th{text-align:left;padding:4px 8px;border-bottom:2px solid var(--border,#e0e0e0);color:var(--fg-2,#888);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.at-sum-table td{padding:4px 8px;border-bottom:1px solid var(--border,#f0f0f0);font-family:ui-monospace,monospace}
.at-sum-table tr:last-child td{border-bottom:none}
.at-hash{color:var(--fg-2,#aaa);font-size:11px}
.at-info{background:#e3f2fd;border:1px solid #90caf9;border-radius:6px;padding:8px 12px;font-size:12px;color:#0d47a1;margin-top:8px}
`;

function maskUrl(url) {
  if (!url) return url;
  return url.replace(/:\/\/([^:@/?#]+):([^@/?#]+)@/, '://$1:***@');
}

function hasCredentials(url) {
  return url && /:\/\/[^:@/?#]+:[^@/?#]+@/.test(url);
}

// Minimal HCL parser: extracts top-level blocks with optional labels
// Handles: env "name" { ... }, variable "x" { ... }, data "source" "name" { ... }
function parseAtlasHcl(text) {
  const envs = [];
  const variables = [];
  const datasources = [];

  // Strip comments
  const cleaned = text.replace(/\/\/[^\n]*/g, '').replace(/#[^\n]*/g, '');

  // Match top-level blocks
  const blockRe = /(\w+)\s+(?:"([^"]+)"\s+)?(?:"([^"]+)"\s+)?\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let m;
  while ((m = blockRe.exec(cleaned)) !== null) {
    const blockType = m[1].toLowerCase();
    const label1 = m[2] || null;
    const label2 = m[3] || null;
    const body = m[4] || '';

    // Parse key = value pairs inside block
    const kv = {};
    const kvRe = /(\w+)\s*=\s*"([^"]*?)"/g;
    let km;
    while ((km = kvRe.exec(body)) !== null) {
      kv[km[1]] = km[2];
    }
    // Also unquoted values (e.g. booleans, numbers)
    const kvReUnquoted = /(\w+)\s*=\s*([^"{\s][^\n,}]*)/g;
    while ((km = kvReUnquoted.exec(body)) !== null) {
      if (!kv[km[1]]) kv[km[1]] = km[2].trim();
    }

    if (blockType === 'env') envs.push({ name: label1 || 'default', kv });
    else if (blockType === 'variable') variables.push({ name: label1, kv });
    else if (blockType === 'data') datasources.push({ type: label1, name: label2, kv });
  }

  return { envs, variables, datasources };
}

// Render atlas.sum file
function renderSum(text, name) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0] || '';
  const entries = lines.slice(1).map((l) => {
    const parts = l.split(/\s+/);
    return { file: parts[1] || parts[0] || l, hash: parts[0] };
  }).filter((e) => e.file);

  const tableRows = entries.map((e) =>
    `<tr><td>${esc(e.file)}</td><td class="at-hash">${esc(e.hash ? e.hash.slice(0, 16) + '…' : '')}</td></tr>`
  ).join('');

  const host = document.createElement('div');
  host.className = 'at-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="at-title"><span class="badge-at">Atlas</span>${esc(name)}</div>
<div class="at-sub">Atlas migration directory integrity file</div>
${header ? `<div class="at-sec"><h3>Header</h3><div class="at-card"><div class="at-row"><span class="at-key">checksum</span><span class="at-val">${esc(header)}</span></div></div></div>` : ''}
<div class="at-sec"><h3>Migration Files (${entries.length})</h3><div class="at-card">
  <table class="at-sum-table"><thead><tr><th>File</th><th>Hash (prefix)</th></tr></thead>
  <tbody>${tableRows}</tbody></table>
</div></div>
<div class="at-info">atlas.sum is a tamper-detection file. Do not edit it manually — it is managed by the Atlas CLI.</div>`;
  return { parentNode: host };
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.filename || intake.name || 'atlas.hcl').split('/').pop();

  if (name.toLowerCase() === 'atlas.sum') {
    return renderSum(text, name);
  }

  // atlas.hcl
  const { envs, variables, datasources } = parseAtlasHcl(text);

  // Env blocks
  const envsHtml = envs.length
    ? `<div class="at-sec"><h3>Environments (${envs.length})</h3>${envs.map((env) => {
        const url = env.kv.url || env.kv.dev || '';
        const masked = maskUrl(url);
        const credFlag = hasCredentials(url);
        const rows = [
          url ? `<div class="at-row"><span class="at-key">url</span><span class="at-val ${credFlag ? 'masked' : ''}">${esc(masked)}</span></div>` : '',
          env.kv.dev && env.kv.dev !== url ? `<div class="at-row"><span class="at-key">dev</span><span class="at-val ${hasCredentials(env.kv.dev) ? 'masked' : ''}">${esc(maskUrl(env.kv.dev))}</span></div>` : '',
          env.kv.src ? `<div class="at-row"><span class="at-key">src</span><span class="at-val">${esc(env.kv.src)}</span></div>` : '',
          env.kv.migration_dir || env.kv['migration_dir'] ? `<div class="at-row"><span class="at-key">migration_dir</span><span class="at-val">${esc(env.kv.migration_dir)}</span></div>` : '',
          ...Object.entries(env.kv)
            .filter(([k]) => !['url', 'dev', 'src', 'migration_dir'].includes(k))
            .map(([k, v]) => `<div class="at-row"><span class="at-key">${esc(k)}</span><span class="at-val">${esc(v)}</span></div>`),
        ].filter(Boolean).join('');
        return `<div class="at-card"><div class="at-card-title">env <span class="at-chip">${esc(env.name)}</span></div>${rows}</div>`;
      }).join('')}</div>`
    : '';

  // Variable declarations
  const varsHtml = variables.length
    ? `<div class="at-sec"><h3>Variables (${variables.length})</h3><div class="at-card">${variables.map((v) => {
        const type = v.kv.type || 'string';
        const def = v.kv.default;
        return `<div class="at-row"><span class="at-key">${esc(v.name)}</span><span class="at-val">${esc(type)}${def != null ? ' = ' + esc(def) : ''}</span></div>`;
      }).join('')}</div></div>`
    : '';

  // Data sources
  const dsHtml = datasources.length
    ? `<div class="at-sec"><h3>Data Sources (${datasources.length})</h3>${datasources.map((ds) => {
        const rows = Object.entries(ds.kv).map(([k, v]) =>
          `<div class="at-row"><span class="at-key">${esc(k)}</span><span class="at-val">${esc(v)}</span></div>`
        ).join('');
        return `<div class="at-card"><div class="at-card-title">data <span class="at-chip">${esc(ds.type)}</span>${ds.name ? ` <span class="at-chip">${esc(ds.name)}</span>` : ''}</div>${rows}</div>`;
      }).join('')}</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'at-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="at-title"><span class="badge-at">Atlas</span>${esc(name)}</div>
<div class="at-sub">Database schema migration configuration</div>
${envsHtml}${varsHtml}${dsHtml}`;
  return { parentNode: host };
}
