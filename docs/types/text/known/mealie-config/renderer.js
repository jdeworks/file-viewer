const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mealie-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.mealie-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4caf50;color:#fff;vertical-align:middle;margin-right:8px;}
.mealie-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mealie-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.mealie-sec{margin:12px 0;}
.mealie-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.mealie-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.mealie-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.mealie-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.mealie-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.mealie-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.mealie-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
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
  return `<span class="mealie-chip">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function masked() {
  return '<span class="mealie-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="mealie-row"><span class="mealie-key">${esc(label)}</span><span class="mealie-val">${html}</span></div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'mealie-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const cfg = parseKV(text);

  const serverKeys = ['BASE_URL', 'WEB_GUNICORN_WORKERS', 'MAX_WORKERS', 'WEB_CONCURRENCY'];
  const dbKeys = ['DB_ENGINE', 'POSTGRES_SERVER', 'POSTGRES_DB', 'POSTGRES_USER'];
  const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_AUTH_STRATEGY', 'SMTP_FROM_NAME', 'SMTP_FROM_EMAIL'];
  const secKeys = ['TOKEN_TIME', 'DEFAULT_EMAIL'];

  const allKnown = new Set([...serverKeys, ...dbKeys, ...smtpKeys, ...secKeys,
    'POSTGRES_PASSWORD', 'SMTP_PASSWORD', 'DEFAULT_PASSWORD']);

  function renderVal(key, val) {
    if (['POSTGRES_PASSWORD', 'SMTP_PASSWORD', 'DEFAULT_PASSWORD'].includes(key)) return masked();
    return chip(val);
  }

  function sectionRows(keys) {
    return keys.map((k) => cfg[k] != null ? row(k, renderVal(k, cfg[k])) : '').filter(Boolean).join('');
  }

  const title = cfg.BASE_URL || 'Mealie Recipe Manager';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="mealie-badge">Mealie</span>
      <span class="mealie-title">${esc(title)}</span>
    </div>
    <p class="mealie-sub">Mealie recipe manager environment-variable configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  const serverRows = sectionRows(serverKeys);
  if (serverRows) body += `<div class="mealie-sec"><h3>Server</h3><div class="mealie-card">${serverRows}</div></div>`;

  // Database section (password masked separately)
  const dbRender = dbKeys.map((k) => cfg[k] != null ? row(k, chip(cfg[k])) : '').filter(Boolean).join('');
  const pgPass = cfg.POSTGRES_PASSWORD != null ? row('POSTGRES_PASSWORD', masked()) : '';
  if (dbRender || pgPass) body += `<div class="mealie-sec"><h3>Database</h3><div class="mealie-card">${dbRender}${pgPass}</div></div>`;

  // SMTP section (password masked separately)
  const smtpRender = smtpKeys.map((k) => cfg[k] != null ? row(k, chip(cfg[k])) : '').filter(Boolean).join('');
  const smtpPass = cfg.SMTP_PASSWORD != null ? row('SMTP_PASSWORD', masked()) : '';
  if (smtpRender || smtpPass) body += `<div class="mealie-sec"><h3>Email / SMTP</h3><div class="mealie-card">${smtpRender}${smtpPass}</div></div>`;

  // Security section (DEFAULT_PASSWORD masked separately)
  const secRender = secKeys.map((k) => cfg[k] != null ? row(k, chip(cfg[k])) : '').filter(Boolean).join('');
  const defPass = cfg.DEFAULT_PASSWORD != null ? row('DEFAULT_PASSWORD', masked()) : '';
  if (secRender || defPass) body += `<div class="mealie-sec"><h3>Security</h3><div class="mealie-card">${secRender}${defPass}</div></div>`;

  // Other settings
  const otherRows = Object.entries(cfg)
    .filter(([k]) => !allKnown.has(k))
    .map(([k, v]) => row(k, chip(v)))
    .filter(Boolean)
    .join('');
  if (otherRows) body += `<div class="mealie-sec"><h3>Other Settings</h3><div class="mealie-card">${otherRows}</div></div>`;

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
