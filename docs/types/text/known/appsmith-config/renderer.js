const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.appsm-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-appsm{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e96c00;color:#fff;vertical-align:middle;margin-right:8px;}
.appsm-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;}
.appsm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.appsm-sec{margin:14px 0;}
.appsm-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.appsm-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.appsm-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.appsm-kv-k{color:var(--fg-2,#888);min-width:240px;flex-shrink:0;}
.appsm-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.appsm-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.appsm-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.appsm-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.appsm-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.appsm-chip-orange{background:#fff3e0;border-color:#e96c00;color:#bf360c;}
.appsm-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
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

/** Mask credentials in a DSN/URL: mongodb://user:pass@host/db → mongodb://user:[configured]@host/db */
function maskDsn(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function kv(label, value, masked) {
  if (value == null || value === '') return '';
  const valHtml = masked
    ? `<span class="appsm-masked">[configured]</span>`
    : `<span class="appsm-kv-v">${esc(String(value))}</span>`;
  return `<div class="appsm-kv"><span class="appsm-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="appsm-chip${cls ? ' appsm-chip-' + cls : ''}">${esc(String(val))}</span>`;
}

function boolChip(label, value) {
  if (value == null || value === '') return '';
  const lower = value.trim().toLowerCase();
  const on = lower === 'true' || lower === '1' || lower === 'yes';
  const html = on ? chip('enabled', 'green') : chip('disabled', 'gray');
  return `<div class="appsm-kv"><span class="appsm-kv-k">${esc(label)}</span>${html}</div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'appsm-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const env = parseKV(text);

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="badge-appsm">Appsmith</span>
      <span class="appsm-title">Appsmith Config</span>
    </div>
    <div class="appsm-sub">Appsmith low-code internal tool builder configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Security
  const secRows = [
    env.APPSMITH_ENCRYPTION_PASSWORD != null ? kv('APPSMITH_ENCRYPTION_PASSWORD', '***', true) : '',
    env.APPSMITH_ENCRYPTION_SALT != null ? kv('APPSMITH_ENCRYPTION_SALT', '***', true) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="appsm-sec"><h3>Security</h3><div class="appsm-card">${secRows}</div></div>`;

  // Database
  if (env.APPSMITH_MONGODB_URI) {
    const masked = maskDsn(env.APPSMITH_MONGODB_URI);
    const display = masked.length > 80 ? masked.slice(0, 77) + '…' : masked;
    body += `<div class="appsm-sec"><h3>Database</h3><div class="appsm-card">${kv('APPSMITH_MONGODB_URI', display)}</div></div>`;
  }

  // Redis
  if (env.APPSMITH_REDIS_URL) {
    const masked = maskDsn(env.APPSMITH_REDIS_URL);
    const display = masked.length > 80 ? masked.slice(0, 77) + '…' : masked;
    body += `<div class="appsm-sec"><h3>Redis</h3><div class="appsm-card">${kv('APPSMITH_REDIS_URL', display)}</div></div>`;
  }

  // Email
  const emailRows = [
    env.APPSMITH_MAIL_HOST ? kv('APPSMITH_MAIL_HOST', env.APPSMITH_MAIL_HOST) : '',
    env.APPSMITH_MAIL_PORT ? kv('APPSMITH_MAIL_PORT', env.APPSMITH_MAIL_PORT) : '',
    env.APPSMITH_MAIL_FROM ? kv('APPSMITH_MAIL_FROM', env.APPSMITH_MAIL_FROM) : '',
    env.APPSMITH_MAIL_USERNAME ? kv('APPSMITH_MAIL_USERNAME', env.APPSMITH_MAIL_USERNAME) : '',
    env.APPSMITH_MAIL_PASSWORD != null ? kv('APPSMITH_MAIL_PASSWORD', '***', true) : '',
    env.APPSMITH_MAIL_SMTP_AUTH != null ? boolChip('APPSMITH_MAIL_SMTP_AUTH', env.APPSMITH_MAIL_SMTP_AUTH) : '',
    env.APPSMITH_MAIL_SMTP_TLS_ENABLED != null ? boolChip('APPSMITH_MAIL_SMTP_TLS_ENABLED', env.APPSMITH_MAIL_SMTP_TLS_ENABLED) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="appsm-sec"><h3>Email</h3><div class="appsm-card">${emailRows}</div></div>`;

  // OAuth — Google
  const googleRows = [
    env.APPSMITH_GOOGLE_CLIENT_ID ? kv('APPSMITH_GOOGLE_CLIENT_ID', env.APPSMITH_GOOGLE_CLIENT_ID) : '',
    env.APPSMITH_GOOGLE_CLIENT_SECRET != null ? kv('APPSMITH_GOOGLE_CLIENT_SECRET', '***', true) : '',
  ].filter(Boolean).join('');
  if (googleRows) body += `<div class="appsm-sec"><h3>OAuth (Google)</h3><div class="appsm-card">${googleRows}</div></div>`;

  // OAuth — GitHub
  const githubRows = [
    env.APPSMITH_GITHUB_CLIENT_ID ? kv('APPSMITH_GITHUB_CLIENT_ID', env.APPSMITH_GITHUB_CLIENT_ID) : '',
    env.APPSMITH_GITHUB_CLIENT_SECRET != null ? kv('APPSMITH_GITHUB_CLIENT_SECRET', '***', true) : '',
  ].filter(Boolean).join('');
  if (githubRows) body += `<div class="appsm-sec"><h3>OAuth (GitHub)</h3><div class="appsm-card">${githubRows}</div></div>`;

  // Features
  const featureRows = [
    env.APPSMITH_DISABLE_TELEMETRY != null ? boolChip('APPSMITH_DISABLE_TELEMETRY', env.APPSMITH_DISABLE_TELEMETRY) : '',
    env.APPSMITH_DISABLE_INTERCOM != null ? boolChip('APPSMITH_DISABLE_INTERCOM', env.APPSMITH_DISABLE_INTERCOM) : '',
  ].filter(Boolean).join('');
  if (featureRows) body += `<div class="appsm-sec"><h3>Features</h3><div class="appsm-card">${featureRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Appsmith configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
