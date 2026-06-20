const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.twenty-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.twenty-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#fff;vertical-align:middle;margin-right:8px;}
.twenty-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.twenty-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.twenty-sec{margin:12px 0;}
.twenty-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.twenty-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.twenty-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.twenty-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.twenty-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.twenty-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.twenty-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.twenty-chip-purple{background:#f3e5f5;border-color:#9c27b0;color:#4a148c;}
.twenty-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/** Parse KEY=VALUE config, skip # comments and blank lines; strip optional 'export ' prefix */
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
  return `<span class="twenty-chip${cls ? ' twenty-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="twenty-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="twenty-row"><span class="twenty-key">${esc(label)}</span><span class="twenty-val">${html}</span></div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'twenty-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  const title = kv.FRONT_BASE_URL || kv.SERVER_URL || 'Twenty CRM Config';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="twenty-badge">Twenty CRM</span>
      <span class="twenty-title">${esc(title)}</span>
    </div>
    <div class="twenty-sub">Twenty CRM open-source Salesforce alternative configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    kv.FRONT_BASE_URL ? row('FRONT_BASE_URL', chip(kv.FRONT_BASE_URL, 'blue')) : '',
    kv.SERVER_URL ? row('SERVER_URL', chip(kv.SERVER_URL, 'blue')) : '',
    kv.SIGN_IN_PREFILLED != null ? row('SIGN_IN_PREFILLED', chip(kv.SIGN_IN_PREFILLED)) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="twenty-sec"><h3>Server</h3><div class="twenty-card">${serverRows}</div></div>`;

  // Security
  const secRows = [
    kv.ACCESS_TOKEN_SECRET != null ? row('ACCESS_TOKEN_SECRET', masked()) : '',
    kv.LOGIN_TOKEN_SECRET != null ? row('LOGIN_TOKEN_SECRET', masked()) : '',
    kv.REFRESH_TOKEN_SECRET != null ? row('REFRESH_TOKEN_SECRET', masked()) : '',
    kv.FILE_TOKEN_SECRET != null ? row('FILE_TOKEN_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="twenty-sec"><h3>Security</h3><div class="twenty-card">${secRows}</div></div>`;

  // Database
  if (kv.PG_DATABASE_URL) {
    const maskedUrl = maskDsn(kv.PG_DATABASE_URL);
    const display = maskedUrl.length > 80 ? maskedUrl.slice(0, 77) + '…' : maskedUrl;
    body += `<div class="twenty-sec"><h3>Database</h3><div class="twenty-card">${row('PG_DATABASE_URL', chip(display))}</div></div>`;
  }

  // Redis
  if (kv.REDIS_URL) {
    const maskedUrl = maskDsn(kv.REDIS_URL);
    const display = maskedUrl.length > 80 ? maskedUrl.slice(0, 77) + '…' : maskedUrl;
    body += `<div class="twenty-sec"><h3>Redis</h3><div class="twenty-card">${row('REDIS_URL', chip(display))}</div></div>`;
  }

  // Storage
  const storageRows = [
    kv.STORAGE_TYPE ? row('STORAGE_TYPE', chip(kv.STORAGE_TYPE, 'purple')) : '',
    kv.STORAGE_S3_REGION ? row('STORAGE_S3_REGION', chip(kv.STORAGE_S3_REGION)) : '',
    kv.STORAGE_S3_NAME ? row('STORAGE_S3_NAME', chip(kv.STORAGE_S3_NAME)) : '',
    kv.STORAGE_S3_ENDPOINT ? row('STORAGE_S3_ENDPOINT', chip(kv.STORAGE_S3_ENDPOINT)) : '',
  ].filter(Boolean).join('');
  if (storageRows) body += `<div class="twenty-sec"><h3>Storage</h3><div class="twenty-card">${storageRows}</div></div>`;

  // Email
  const emailRows = [
    kv.EMAIL_HOST ? row('EMAIL_HOST', chip(kv.EMAIL_HOST)) : '',
    kv.EMAIL_PORT ? row('EMAIL_PORT', chip(kv.EMAIL_PORT, 'blue')) : '',
    kv.EMAIL_SYSTEM_ADDRESS ? row('EMAIL_SYSTEM_ADDRESS', chip(kv.EMAIL_SYSTEM_ADDRESS)) : '',
    kv.EMAIL_USERNAME ? row('EMAIL_USERNAME', chip(kv.EMAIL_USERNAME)) : '',
    kv.EMAIL_PASSWORD != null ? row('EMAIL_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="twenty-sec"><h3>Email</h3><div class="twenty-card">${emailRows}</div></div>`;

  // Gmail OAuth
  const gmailRows = [
    kv.GMAIL_MESSAGING_PROJECT_CLIENT_ID ? row('GMAIL_MESSAGING_PROJECT_CLIENT_ID', chip(kv.GMAIL_MESSAGING_PROJECT_CLIENT_ID)) : '',
    kv.GMAIL_MESSAGING_PROJECT_CLIENT_SECRET != null ? row('GMAIL_MESSAGING_PROJECT_CLIENT_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (gmailRows) body += `<div class="twenty-sec"><h3>Gmail OAuth</h3><div class="twenty-card">${gmailRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Twenty CRM configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
