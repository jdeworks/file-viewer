const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gtip-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.gtip-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c0392b;color:#fff;vertical-align:middle;margin-right:8px;}
.gtip-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;}
.gtip-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.gtip-sec{margin:14px 0;}
.gtip-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.gtip-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.gtip-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.gtip-kv-k{color:var(--fg-2,#888);min-width:240px;flex-shrink:0;}
.gtip-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.gtip-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.gtip-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.gtip-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.gtip-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
`;

/** Parse KEY=VALUE config, skip # comments and blank lines. Handles optional `export ` prefix. */
function parseKV(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

/** Mask credentials in a DSN/URL: postgres://user:pass@host/db → postgres://user:[configured]@host/db */
function maskDsn(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function kv(label, value, masked) {
  if (value == null || value === '') return '';
  const valHtml = masked
    ? `<span class="gtip-masked">[configured]</span>`
    : `<span class="gtip-kv-v">${esc(String(value))}</span>`;
  return `<div class="gtip-kv"><span class="gtip-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

function chip(val) {
  if (val == null || val === '') return '';
  return `<span class="gtip-chip">${esc(String(val).length > 80 ? String(val).slice(0, 77) + '…' : String(val))}</span>`;
}

function boolChip(label, value) {
  if (value == null || value === '') return '';
  const lower = String(value).trim().toLowerCase();
  const on = lower === 'true' || lower === '1' || lower === 'yes';
  const html = on
    ? `<span class="gtip-chip gtip-chip-green">enabled</span>`
    : `<span class="gtip-chip gtip-chip-gray">disabled</span>`;
  return `<div class="gtip-kv"><span class="gtip-kv-k">${esc(label)}</span>${html}</div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'gtip-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const env = parseKV(text);

  const title = env.GLITCHTIP_DOMAIN || 'GlitchTip Error Tracker';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="gtip-badge">GlitchTip</span>
      <span class="gtip-title">${esc(title)}</span>
    </div>
    <div class="gtip-sub">GlitchTip open-source error tracking configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    env.GLITCHTIP_DOMAIN ? kv('GLITCHTIP_DOMAIN', env.GLITCHTIP_DOMAIN) : '',
    env.ENABLE_OPEN_USER_REGISTRATION != null ? boolChip('ENABLE_OPEN_USER_REGISTRATION', env.ENABLE_OPEN_USER_REGISTRATION) : '',
    env.ORGANIZATION_CREATION_OPEN != null ? boolChip('ORGANIZATION_CREATION_OPEN', env.ORGANIZATION_CREATION_OPEN) : '',
    env.CELERY_WORKER_CONCURRENCY ? kv('CELERY_WORKER_CONCURRENCY', env.CELERY_WORKER_CONCURRENCY) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="gtip-sec"><h3>Server</h3><div class="gtip-card">${serverRows}</div></div>`;

  // Security
  if (env.SECRET_KEY != null) {
    body += `<div class="gtip-sec"><h3>Security</h3><div class="gtip-card">${kv('SECRET_KEY', null, true)}</div></div>`;
  }

  // Database
  if (env.DATABASE_URL) {
    const masked = maskDsn(env.DATABASE_URL);
    const display = masked.length > 100 ? masked.slice(0, 97) + '…' : masked;
    body += `<div class="gtip-sec"><h3>Database</h3><div class="gtip-card">${kv('DATABASE_URL', display)}</div></div>`;
  }

  // Redis
  if (env.REDIS_URL) {
    const masked = maskDsn(env.REDIS_URL);
    const display = masked.length > 100 ? masked.slice(0, 97) + '…' : masked;
    body += `<div class="gtip-sec"><h3>Redis</h3><div class="gtip-card">${kv('REDIS_URL', display)}</div></div>`;
  }

  // Email
  const emailRows = [
    env.EMAIL_URL ? kv('EMAIL_URL', maskDsn(env.EMAIL_URL)) : '',
    env.DEFAULT_FROM_EMAIL ? kv('DEFAULT_FROM_EMAIL', env.DEFAULT_FROM_EMAIL) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="gtip-sec"><h3>Email</h3><div class="gtip-card">${emailRows}</div></div>`;

  // OAuth — GitHub
  const githubRows = [
    env.GITHUB_AUTH_KEY ? kv('GITHUB_AUTH_KEY', env.GITHUB_AUTH_KEY) : '',
    env.GITHUB_AUTH_SECRET != null ? kv('GITHUB_AUTH_SECRET', null, true) : '',
  ].filter(Boolean).join('');
  if (githubRows) body += `<div class="gtip-sec"><h3>OAuth (GitHub)</h3><div class="gtip-card">${githubRows}</div></div>`;

  // OAuth — Google
  const googleRows = [
    env.GOOGLE_AUTH_KEY ? kv('GOOGLE_AUTH_KEY', env.GOOGLE_AUTH_KEY) : '',
    env.GOOGLE_AUTH_SECRET != null ? kv('GOOGLE_AUTH_SECRET', null, true) : '',
  ].filter(Boolean).join('');
  if (googleRows) body += `<div class="gtip-sec"><h3>OAuth (Google)</h3><div class="gtip-card">${googleRows}</div></div>`;

  // OAuth — Microsoft
  const msRows = [
    env.MICROSOFT_AUTH_KEY ? kv('MICROSOFT_AUTH_KEY', env.MICROSOFT_AUTH_KEY) : '',
    env.MICROSOFT_AUTH_SECRET != null ? kv('MICROSOFT_AUTH_SECRET', null, true) : '',
  ].filter(Boolean).join('');
  if (msRows) body += `<div class="gtip-sec"><h3>OAuth (Microsoft)</h3><div class="gtip-card">${msRows}</div></div>`;

  // Data Retention
  if (env.MAX_EVENT_LIFE_DAYS) {
    body += `<div class="gtip-sec"><h3>Data Retention</h3><div class="gtip-card">${kv('MAX_EVENT_LIFE_DAYS', env.MAX_EVENT_LIFE_DAYS + ' days')}</div></div>`;
  }

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No GlitchTip configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
