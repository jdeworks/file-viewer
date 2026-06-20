const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vw-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-vw{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#175DDC;color:#fff;vertical-align:middle;margin-right:8px}
.vw-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline}
.vw-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px}
.vw-sec{margin:12px 0}
.vw-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.vw-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px}
.vw-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap}
.vw-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0}
.vw-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all}
.vw-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f)}
.vw-chip-blue{background:#eff6ff;border-color:#93c5fd;color:#1e40af}
.vw-chip-green{background:#dcfce7;border-color:#86efac;color:#166534}
.vw-chip-red{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
.vw-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888)}
.vw-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic}
`;

/** Any key that should always be masked */
const SENSITIVE_RE = /secret|password|token|key|api|private/i;

function parseKV(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const t2 = t.startsWith('export ') ? t.slice(7) : t;
    const eq = t2.indexOf('=');
    if (eq === -1) continue;
    let val = t2.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    const key = t2.slice(0, eq).trim();
    if (key && !(key in result)) result[key] = val;
  }
  return result;
}

function maskDbUrl(url) {
  if (!url) return '';
  return url.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="vw-chip${cls ? ' vw-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="vw-masked">[configured]</span>';
}

function isSensitive(key) {
  return SENSITIVE_RE.test(key);
}

function row(label, html) {
  if (!html) return '';
  return `<div class="vw-row"><span class="vw-key">${esc(label)}</span><span class="vw-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = String(v ?? '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  return chip(String(v), 'gray');
}

function kvRow(kv, key, label, transform) {
  if (!(key in kv)) return '';
  const val = kv[key];
  const html = transform ? transform(val) : (isSensitive(key) ? masked() : chip(esc(val)));
  return row(label || key, html);
}

export function render(intake) {
  const kv = parseKV(intake.text || '');

  const host = document.createElement('div');
  host.className = 'vw-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const titleText = kv.DOMAIN || 'Vaultwarden Config';
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px">
      <span class="badge-vw">Vaultwarden</span>
      <span class="vw-title">${esc(titleText)}</span>
    </div>
    <div class="vw-sub">Vaultwarden self-hosted Bitwarden-compatible password manager</div>
  `;
  host.appendChild(header);

  let body = '';

  // App
  const appRows = [
    kvRow(kv, 'DOMAIN', 'DOMAIN', v => chip(v, 'blue')),
    kvRow(kv, 'ROCKET_PORT', 'ROCKET_PORT', v => chip(v, 'blue')),
    kvRow(kv, 'ROCKET_ADDRESS', 'ROCKET_ADDRESS', v => chip(v)),
    kvRow(kv, 'WEBSOCKET_ENABLED', 'WEBSOCKET_ENABLED', v => boolChip(v, 'enabled', 'green', 'disabled', 'gray')),
    kvRow(kv, 'SIGNUPS_ALLOWED', 'SIGNUPS_ALLOWED', v => boolChip(v, 'allowed', 'green', 'disabled', 'red')),
    kvRow(kv, 'INVITATIONS_ALLOWED', 'INVITATIONS_ALLOWED', v => boolChip(v, 'allowed', 'green', 'disabled', 'red')),
    kvRow(kv, 'SIGNUPS_VERIFY', 'SIGNUPS_VERIFY', v => boolChip(v, 'required', 'blue', 'not required', 'gray')),
    kvRow(kv, 'IP_HEADER', 'IP_HEADER', v => chip(v)),
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="vw-sec"><h3>App</h3><div class="vw-card">${appRows}</div></div>`;

  // Security
  const secRows = [
    'ADMIN_TOKEN' in kv ? row('ADMIN_TOKEN', masked()) : '',
    kvRow(kv, 'DISABLE_ADMIN_TOKEN', 'DISABLE_ADMIN_TOKEN', v => boolChip(v, 'disabled', 'red', 'enabled', 'green')),
    kvRow(kv, 'TOKEN_EXPIRATION_TIME', 'TOKEN_EXPIRATION_TIME', v => chip(v)),
    kvRow(kv, 'PASSWORD_ITERATIONS', 'PASSWORD_ITERATIONS', v => chip(v, 'blue')),
    kvRow(kv, 'YUBIKEY_CLIENT_ID', 'YUBIKEY_CLIENT_ID', v => chip(v)),
    'YUBIKEY_SECRET_KEY' in kv ? row('YUBIKEY_SECRET_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="vw-sec"><h3>Security</h3><div class="vw-card">${secRows}</div></div>`;

  // Email
  const smtpRows = [
    kvRow(kv, 'SMTP_HOST', 'SMTP_HOST', v => chip(v)),
    kvRow(kv, 'SMTP_PORT', 'SMTP_PORT', v => chip(v, 'blue')),
    kvRow(kv, 'SMTP_FROM', 'SMTP_FROM', v => chip(v)),
    kvRow(kv, 'SMTP_USERNAME', 'SMTP_USERNAME', v => chip(v)),
    'SMTP_PASSWORD' in kv ? row('SMTP_PASSWORD', masked()) : '',
    kvRow(kv, 'SMTP_SSL', 'SMTP_SSL', v => boolChip(v, 'enabled', 'green', 'disabled', 'gray')),
    kvRow(kv, 'SMTP_FROM_NAME', 'SMTP_FROM_NAME', v => chip(v)),
  ].filter(Boolean).join('');
  if (smtpRows) body += `<div class="vw-sec"><h3>Email</h3><div class="vw-card">${smtpRows}</div></div>`;

  // Storage
  const storageRows = [
    kvRow(kv, 'DATA_FOLDER', 'DATA_FOLDER', v => chip(v)),
    kvRow(kv, 'ATTACHMENTS_FOLDER', 'ATTACHMENTS_FOLDER', v => chip(v)),
    kvRow(kv, 'ICON_CACHE_FOLDER', 'ICON_CACHE_FOLDER', v => chip(v)),
  ].filter(Boolean).join('');
  if (storageRows) body += `<div class="vw-sec"><h3>Storage</h3><div class="vw-card">${storageRows}</div></div>`;

  // Database
  if ('DATABASE_URL' in kv) {
    const masked_url = maskDbUrl(kv.DATABASE_URL);
    body += `<div class="vw-sec"><h3>Database</h3><div class="vw-card">${row('DATABASE_URL', chip(masked_url))}</div></div>`;
  }

  // Push Notifications
  const pushRows = [
    kvRow(kv, 'PUSH_ENABLED', 'PUSH_ENABLED', v => boolChip(v, 'enabled', 'green', 'disabled', 'gray')),
    kvRow(kv, 'PUSH_INSTALLATION_ID', 'PUSH_INSTALLATION_ID', v => chip(v)),
    'PUSH_INSTALLATION_KEY' in kv ? row('PUSH_INSTALLATION_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (pushRows) body += `<div class="vw-sec"><h3>Push Notifications</h3><div class="vw-card">${pushRows}</div></div>`;

  // Advanced
  const advRows = [
    kvRow(kv, 'LOG_LEVEL', 'LOG_LEVEL', v => chip(v)),
    kvRow(kv, 'EXTENDED_LOGGING', 'EXTENDED_LOGGING', v => boolChip(v, 'enabled', 'green', 'disabled', 'gray')),
    kvRow(kv, 'LOG_FILE', 'LOG_FILE', v => chip(v)),
    'HIBP_API_KEY' in kv ? row('HIBP_API_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (advRows) body += `<div class="vw-sec"><h3>Advanced</h3><div class="vw-card">${advRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Vaultwarden configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
