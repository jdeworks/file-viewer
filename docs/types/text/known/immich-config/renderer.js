const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.immich-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.immich-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4250AF;color:#fff;vertical-align:middle;margin-right:8px;}
.immich-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.immich-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.immich-sec{margin:12px 0;}
.immich-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.immich-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.immich-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.immich-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.immich-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.immich-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.immich-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/** Parse KEY=VALUE config, skip # comments and blank lines, strip optional 'export ' prefix */
function parseKV(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

function chip(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="immich-chip">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function masked() {
  return '<span class="immich-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="immich-row"><span class="immich-key">${esc(label)}</span><span class="immich-val">${html}</span></div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'immich-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const cfg = parseKV(text);

  const serverKeys = ['IMMICH_SERVER_URL', 'PUBLIC_IMMICH_SERVER_URL', 'IMMICH_VERSION', 'UPLOAD_LOCATION'];
  const dbKeys = ['DB_HOSTNAME', 'DB_DATABASE_NAME', 'DB_USERNAME'];
  const redisKeys = ['REDIS_HOSTNAME', 'REDIS_PORT'];
  const mlKeys = ['MACHINE_LEARNING_GPU_ACCELERATION'];

  const alwaysMasked = new Set(['DB_PASSWORD', 'JWT_SECRET', 'TYPESENSE_API_KEY']);
  const allKnown = new Set([...serverKeys, ...dbKeys, ...redisKeys, ...mlKeys, ...alwaysMasked]);

  const title = cfg.IMMICH_SERVER_URL || 'Immich Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="immich-badge">Immich</span>
      <span class="immich-title">${esc(title)}</span>
    </div>
    <p class="immich-sub">Immich photo/video management environment-variable configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = serverKeys.map((k) => cfg[k] != null ? row(k, chip(cfg[k])) : '').filter(Boolean).join('');
  if (serverRows) body += `<div class="immich-sec"><h3>Server</h3><div class="immich-card">${serverRows}</div></div>`;

  // Database (DB_PASSWORD masked)
  const dbRender = dbKeys.map((k) => cfg[k] != null ? row(k, chip(cfg[k])) : '').filter(Boolean).join('');
  const dbPass = cfg.DB_PASSWORD != null ? row('DB_PASSWORD', masked()) : '';
  if (dbRender || dbPass) body += `<div class="immich-sec"><h3>Database</h3><div class="immich-card">${dbRender}${dbPass}</div></div>`;

  // Redis
  const redisRows = redisKeys.map((k) => cfg[k] != null ? row(k, chip(cfg[k])) : '').filter(Boolean).join('');
  if (redisRows) body += `<div class="immich-sec"><h3>Redis</h3><div class="immich-card">${redisRows}</div></div>`;

  // Security (JWT_SECRET and TYPESENSE_API_KEY always masked)
  const jwtRow = cfg.JWT_SECRET != null ? row('JWT_SECRET', masked()) : '';
  const tsRow = cfg.TYPESENSE_API_KEY != null ? row('TYPESENSE_API_KEY', masked()) : '';
  if (jwtRow || tsRow) body += `<div class="immich-sec"><h3>Security</h3><div class="immich-card">${jwtRow}${tsRow}</div></div>`;

  // ML
  const mlRows = mlKeys.map((k) => cfg[k] != null ? row(k, chip(cfg[k])) : '').filter(Boolean).join('');
  if (mlRows) body += `<div class="immich-sec"><h3>Machine Learning</h3><div class="immich-card">${mlRows}</div></div>`;

  // Other settings
  const otherRows = Object.entries(cfg)
    .filter(([k]) => !allKnown.has(k))
    .map(([k, v]) => row(k, chip(v)))
    .filter(Boolean)
    .join('');
  if (otherRows) body += `<div class="immich-sec"><h3>Other Settings</h3><div class="immich-card">${otherRows}</div></div>`;

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
