const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.umami-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.umami-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#e0e0ff;vertical-align:middle;margin-right:8px;}
.umami-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.umami-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.umami-sec{margin:12px 0;}
.umami-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.umami-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.umami-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.umami-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.umami-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.umami-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.umami-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.umami-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.umami-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.umami-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.umami-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/** Parse KEY=VALUE config, skip # comments and blank lines, strip optional `export ` prefix */
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

/** Mask credentials in a DSN/URL */
function maskDsn(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="umami-chip${cls ? ' umami-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="umami-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="umami-row"><span class="umami-key">${esc(label)}</span><span class="umami-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  return chip(v, 'gray');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'umami-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const cfg = parseKV(text);

  const title = cfg.HOSTNAME || 'Umami Analytics Config';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="umami-badge">Umami</span>
      <span class="umami-title">${esc(title)}</span>
    </div>
    <div class="umami-sub">Umami website analytics self-hosted server environment configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    cfg.HOSTNAME ? row('HOSTNAME', chip(cfg.HOSTNAME, 'blue')) : '',
    cfg.PORT ? row('PORT', chip(cfg.PORT, 'blue')) : '',
    cfg.FORCE_SSL != null ? row('FORCE_SSL', boolChip(cfg.FORCE_SSL, 'enabled', 'green', 'disabled', 'gray')) : '',
    cfg.DISABLE_LOGIN != null ? row('DISABLE_LOGIN', boolChip(cfg.DISABLE_LOGIN, 'disabled', 'red', 'enabled', 'green')) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="umami-sec"><h3>Server</h3><div class="umami-card">${serverRows}</div></div>`;

  // Security
  if (cfg.APP_SECRET != null) {
    body += `<div class="umami-sec"><h3>Security</h3><div class="umami-card">${row('APP_SECRET', masked())}</div></div>`;
  }

  // Database
  if (cfg.DATABASE_URL) {
    const display = maskDsn(cfg.DATABASE_URL);
    body += `<div class="umami-sec"><h3>Database</h3><div class="umami-card">${row('DATABASE_URL', chip(display))}</div></div>`;
  }

  // Privacy
  const privacyRows = [
    cfg.DISABLE_TELEMETRY != null ? row('DISABLE_TELEMETRY', boolChip(cfg.DISABLE_TELEMETRY, 'disabled', 'green', 'enabled', 'gray')) : '',
    cfg.IGNORE_IP ? row('IGNORE_IP', chip(cfg.IGNORE_IP)) : '',
    cfg.CLIENT_IP_HEADER ? row('CLIENT_IP_HEADER', chip(cfg.CLIENT_IP_HEADER)) : '',
  ].filter(Boolean).join('');
  if (privacyRows) body += `<div class="umami-sec"><h3>Privacy</h3><div class="umami-card">${privacyRows}</div></div>`;

  // Embed
  if (cfg.ALLOWED_FRAME_URLS) {
    body += `<div class="umami-sec"><h3>Embed</h3><div class="umami-card">${row('ALLOWED_FRAME_URLS', chip(cfg.ALLOWED_FRAME_URLS))}</div></div>`;
  }

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Umami Analytics configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
