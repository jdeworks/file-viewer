const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vwarden-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.vwarden-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a237e;color:#fff;vertical-align:middle;margin-right:8px;}
.vwarden-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.vwarden-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.vwarden-sec{margin:12px 0;}
.vwarden-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.vwarden-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.vwarden-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.vwarden-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.vwarden-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.vwarden-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.vwarden-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.vwarden-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.vwarden-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.vwarden-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.vwarden-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
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

/** Mask credentials in a DSN/URL: postgres://user:pass@host/db → postgres://user:[configured]@host/db */
function maskDsn(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="vwarden-chip${cls ? ' vwarden-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="vwarden-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="vwarden-row"><span class="vwarden-key">${esc(label)}</span><span class="vwarden-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  return chip(v, 'gray');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'vwarden-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  const title = kv.DOMAIN || 'Vaultwarden Config';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="vwarden-badge">Vaultwarden</span>
      <span class="vwarden-title">${esc(title)}</span>
    </div>
    <div class="vwarden-sub">Vaultwarden (Bitwarden_RS fork) self-hosted password manager</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    kv.DOMAIN ? row('DOMAIN', chip(kv.DOMAIN, 'blue')) : '',
    kv.ROCKET_PORT ? row('ROCKET_PORT', chip(kv.ROCKET_PORT, 'blue')) : '',
    kv.ROCKET_WORKERS ? row('ROCKET_WORKERS', chip(kv.ROCKET_WORKERS, 'gray')) : '',
    kv.ROCKET_ADDRESS ? row('ROCKET_ADDRESS', chip(kv.ROCKET_ADDRESS)) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="vwarden-sec"><h3>Server</h3><div class="vwarden-card">${serverRows}</div></div>`;

  // Security
  const secRows = [
    kv.ADMIN_TOKEN != null ? row('ADMIN_TOKEN', masked()) : '',
    kv.SIGNUPS_ALLOWED != null ? row('SIGNUPS_ALLOWED', boolChip(kv.SIGNUPS_ALLOWED, 'allowed', 'green', 'disabled', 'red')) : '',
    kv.INVITATIONS_ALLOWED != null ? row('INVITATIONS_ALLOWED', boolChip(kv.INVITATIONS_ALLOWED, 'allowed', 'green', 'disabled', 'red')) : '',
    kv.SIGNUPS_VERIFY != null ? row('SIGNUPS_VERIFY', boolChip(kv.SIGNUPS_VERIFY, 'required', 'blue', 'not required', 'gray')) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="vwarden-sec"><h3>Security</h3><div class="vwarden-card">${secRows}</div></div>`;

  // Database
  if (kv.DATABASE_URL) {
    const masked = maskDsn(kv.DATABASE_URL);
    const display = masked.length > 80 ? masked.slice(0, 77) + '…' : masked;
    body += `<div class="vwarden-sec"><h3>Database</h3><div class="vwarden-card">${row('DATABASE_URL', chip(display))}</div></div>`;
  }

  // Email / SMTP
  const smtpRows = [
    kv.SMTP_HOST ? row('SMTP_HOST', chip(kv.SMTP_HOST)) : '',
    kv.SMTP_PORT ? row('SMTP_PORT', chip(kv.SMTP_PORT, 'blue')) : '',
    kv.SMTP_SSL != null ? row('SMTP_SSL', boolChip(kv.SMTP_SSL, 'enabled', 'green', 'disabled', 'gray')) : '',
    kv.SMTP_FROM ? row('SMTP_FROM', chip(kv.SMTP_FROM)) : '',
    kv.SMTP_USERNAME ? row('SMTP_USERNAME', chip(kv.SMTP_USERNAME)) : '',
    kv.SMTP_PASSWORD != null ? row('SMTP_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (smtpRows) body += `<div class="vwarden-sec"><h3>Email</h3><div class="vwarden-card">${smtpRows}</div></div>`;

  // WebSocket
  if (kv.WEBSOCKET_ENABLED != null) {
    body += `<div class="vwarden-sec"><h3>WebSocket</h3><div class="vwarden-card">${row('WEBSOCKET_ENABLED', boolChip(kv.WEBSOCKET_ENABLED, 'enabled', 'green', 'disabled', 'gray'))}</div></div>`;
  }

  // Logging
  const logRows = [
    kv.LOG_FILE ? row('LOG_FILE', chip(kv.LOG_FILE)) : '',
    kv.LOG_LEVEL ? row('LOG_LEVEL', chip(kv.LOG_LEVEL, 'blue')) : '',
  ].filter(Boolean).join('');
  if (logRows) body += `<div class="vwarden-sec"><h3>Logging</h3><div class="vwarden-card">${logRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Vaultwarden configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
