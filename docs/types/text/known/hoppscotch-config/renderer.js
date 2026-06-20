const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hopp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.hopp-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00bfa5;color:#fff;vertical-align:middle;margin-right:8px;}
.hopp-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.hopp-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.hopp-sec{margin:12px 0;}
.hopp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.hopp-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.hopp-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.hopp-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.hopp-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.hopp-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.hopp-chip-teal{background:#e0f7fa;border-color:#00bfa5;color:#00695c;}
.hopp-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.hopp-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
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
  return `<span class="hopp-chip${cls ? ' hopp-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="hopp-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="hopp-row"><span class="hopp-key">${esc(label)}</span><span class="hopp-val">${html}</span></div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'hopp-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  const title = kv.REDIRECT_URL || 'Hoppscotch API Platform';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="hopp-badge">Hoppscotch</span>
      <span class="hopp-title">${esc(title)}</span>
    </div>
    <div class="hopp-sub">Hoppscotch API testing platform configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    kv.REDIRECT_URL ? row('REDIRECT_URL', chip(kv.REDIRECT_URL, 'teal')) : '',
    kv.WHITELISTED_ORIGINS ? row('WHITELISTED_ORIGINS', kv.WHITELISTED_ORIGINS.split(',').map(s => chip(s.trim())).join('')) : '',
    kv.VITE_ALLOWED_AUTH_PROVIDERS ? row('VITE_ALLOWED_AUTH_PROVIDERS', kv.VITE_ALLOWED_AUTH_PROVIDERS.split(',').map(s => chip(s.trim(), 'blue')).join('')) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="hopp-sec"><h3>Server</h3><div class="hopp-card">${serverRows}</div></div>`;

  // Security
  const secRows = [
    kv.JWT_SECRET != null ? row('JWT_SECRET', masked()) : '',
    kv.SESSION_SECRET != null ? row('SESSION_SECRET', masked()) : '',
    kv.TOKEN_SALT_COMPLEXITY ? row('TOKEN_SALT_COMPLEXITY', chip(kv.TOKEN_SALT_COMPLEXITY)) : '',
    kv.MAGIC_LINK_TOKEN_VALIDITY ? row('MAGIC_LINK_TOKEN_VALIDITY', chip(kv.MAGIC_LINK_TOKEN_VALIDITY)) : '',
    kv.REFRESH_TOKEN_VALIDITY ? row('REFRESH_TOKEN_VALIDITY', chip(kv.REFRESH_TOKEN_VALIDITY)) : '',
    kv.ACCESS_TOKEN_VALIDITY ? row('ACCESS_TOKEN_VALIDITY', chip(kv.ACCESS_TOKEN_VALIDITY)) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="hopp-sec"><h3>Security</h3><div class="hopp-card">${secRows}</div></div>`;

  // Database
  if (kv.DATABASE_URL) {
    const masked = maskDsn(kv.DATABASE_URL);
    const display = masked.length > 80 ? masked.slice(0, 77) + '…' : masked;
    body += `<div class="hopp-sec"><h3>Database</h3><div class="hopp-card">${row('DATABASE_URL', chip(display))}</div></div>`;
  }

  // Email
  const emailRows = [
    kv.MAILER_SMTP_HOST ? row('MAILER_SMTP_HOST', chip(kv.MAILER_SMTP_HOST)) : '',
    kv.MAILER_SMTP_PORT ? row('MAILER_SMTP_PORT', chip(kv.MAILER_SMTP_PORT, 'blue')) : '',
    kv.MAILER_ADDRESS_FROM ? row('MAILER_ADDRESS_FROM', chip(kv.MAILER_ADDRESS_FROM)) : '',
    kv.MAILER_SMTP_USER ? row('MAILER_SMTP_USER', chip(kv.MAILER_SMTP_USER)) : '',
    kv.MAILER_SMTP_PASSWORD != null ? row('MAILER_SMTP_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="hopp-sec"><h3>Email</h3><div class="hopp-card">${emailRows}</div></div>`;

  // OAuth — Google
  const googleRows = [
    kv.GOOGLE_CLIENT_ID ? row('GOOGLE_CLIENT_ID', chip(kv.GOOGLE_CLIENT_ID)) : '',
    kv.GOOGLE_CLIENT_SECRET != null ? row('GOOGLE_CLIENT_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (googleRows) body += `<div class="hopp-sec"><h3>OAuth (Google)</h3><div class="hopp-card">${googleRows}</div></div>`;

  // OAuth — GitHub
  const githubRows = [
    kv.GITHUB_CLIENT_ID ? row('GITHUB_CLIENT_ID', chip(kv.GITHUB_CLIENT_ID)) : '',
    kv.GITHUB_CLIENT_SECRET != null ? row('GITHUB_CLIENT_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (githubRows) body += `<div class="hopp-sec"><h3>OAuth (GitHub)</h3><div class="hopp-card">${githubRows}</div></div>`;

  // OAuth — Microsoft
  const msRows = [
    kv.MICROSOFT_CLIENT_ID ? row('MICROSOFT_CLIENT_ID', chip(kv.MICROSOFT_CLIENT_ID)) : '',
    kv.MICROSOFT_CLIENT_SECRET != null ? row('MICROSOFT_CLIENT_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (msRows) body += `<div class="hopp-sec"><h3>OAuth (Microsoft)</h3><div class="hopp-card">${msRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Hoppscotch configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
