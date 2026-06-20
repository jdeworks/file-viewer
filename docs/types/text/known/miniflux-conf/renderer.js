const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mflux-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.mflux-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px;}
.mflux-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mflux-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.mflux-sec{margin:12px 0;}
.mflux-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.mflux-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.mflux-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.mflux-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.mflux-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.mflux-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.mflux-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.mflux-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.mflux-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.mflux-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/** Parse KEY=VALUE config, skip # comments and blank lines */
function parseKV(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

/** Mask credentials in a DSN/URL like postgres://user:pass@host/db */
function maskDsn(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="mflux-chip${cls ? ' mflux-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="mflux-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="mflux-row"><span class="mflux-key">${esc(label)}</span><span class="mflux-val">${html}</span></div>`;
}

const SENSITIVE = new Set(['ADMIN_PASSWORD', 'OAUTH2_CLIENT_SECRET', 'SECRET_KEY']);

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'mflux-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  // Collect known keys by section
  const serverKeys = ['LISTEN_ADDR', 'BASE_URL', 'PORT', 'HTTPS'];
  const dbKeys = ['DATABASE_URL'];
  const authKeys = ['OAUTH2_CLIENT_ID', 'OAUTH2_CLIENT_SECRET', 'DISABLE_LOCAL_AUTH'];
  const feedKeys = ['POLLING_FREQUENCY', 'POLLING_PARSING_ERROR_LIMIT', 'BATCH_SIZE'];
  const adminKeys = ['ADMIN_USERNAME', 'ADMIN_PASSWORD'];

  const allKnown = new Set([...serverKeys, ...dbKeys, ...authKeys, ...feedKeys, ...adminKeys]);

  function renderVal(key, val) {
    if (SENSITIVE.has(key)) return masked();
    if (key === 'DATABASE_URL') {
      const masked = maskDsn(val);
      return chip(masked.length > 80 ? masked.slice(0, 77) + '…' : masked);
    }
    if (val.length > 80) return chip(val.slice(0, 77) + '…');
    return chip(val);
  }

  function sectionRows(keys) {
    return keys.map((k) => kv[k] != null ? row(k, renderVal(k, kv[k])) : '').filter(Boolean).join('');
  }

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="mflux-badge">Miniflux</span>
      <span class="mflux-title">Miniflux RSS Reader Config</span>
    </div>
    <p class="mflux-sub">Miniflux RSS reader environment-variable configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  const serverRows = sectionRows(serverKeys);
  if (serverRows) body += `<div class="mflux-sec"><h3>Server</h3><div class="mflux-card">${serverRows}</div></div>`;

  const dbRows = sectionRows(dbKeys);
  if (dbRows) body += `<div class="mflux-sec"><h3>Database</h3><div class="mflux-card">${dbRows}</div></div>`;

  const authRows = sectionRows(authKeys);
  if (authRows) body += `<div class="mflux-sec"><h3>Auth</h3><div class="mflux-card">${authRows}</div></div>`;

  const feedRows = sectionRows(feedKeys);
  if (feedRows) body += `<div class="mflux-sec"><h3>Feed</h3><div class="mflux-card">${feedRows}</div></div>`;

  const adminRows = sectionRows(adminKeys);
  if (adminRows) body += `<div class="mflux-sec"><h3>Admin</h3><div class="mflux-card">${adminRows}</div></div>`;

  // Other settings
  const otherRows = Object.entries(kv)
    .filter(([k]) => !allKnown.has(k))
    .map(([k, v]) => row(k, SENSITIVE.has(k) ? masked() : chip(v.length > 80 ? v.slice(0, 77) + '…' : v)))
    .filter(Boolean)
    .join('');
  if (otherRows) body += `<div class="mflux-sec"><h3>Other Settings</h3><div class="mflux-card">${otherRows}</div></div>`;

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
