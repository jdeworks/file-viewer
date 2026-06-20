// Monica Personal CRM monica.env viewer
// Shows Application, Security, Database, Email, Limits, and Features sections.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.monica-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.monica-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e91e8c;color:#fff;vertical-align:middle;margin-right:8px;}
.monica-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.monica-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.monica-sec{margin:12px 0;}
.monica-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.monica-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.monica-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.monica-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.monica-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.monica-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.monica-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.monica-chip-on{background:#d1fae5;border-color:#6ee7b7;color:#065f46;}
.monica-chip-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.monica-chip-blue{background:#e0f2fe;border-color:#7dd3fc;color:#075985;}
.monica-chip-pink{background:#fce7f3;border-color:#f9a8d4;color:#9d174d;}
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

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="monica-chip${cls ? ' monica-chip-' + cls : ''}">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function masked() {
  return '<span class="monica-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="monica-row"><span class="monica-key">${esc(label)}</span><span class="monica-val">${html}</span></div>`;
}

function boolChip(v) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip('enabled', 'on');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip('disabled', 'off');
  return chip(v);
}

function envChip(v) {
  if (!v) return '';
  const lower = v.toLowerCase();
  if (lower === 'production') return chip('production', 'pink');
  if (lower === 'local') return chip('local', 'blue');
  return chip(v);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'monica-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  const title = kv.APP_URL || 'Monica Personal CRM';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="monica-badge">Monica CRM</span>
      <span class="monica-title">${esc(title)}</span>
    </div>
    <div class="monica-sub">Monica Personal CRM environment configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Application
  const appRows = [
    kv.APP_URL ? row('APP_URL', chip(kv.APP_URL, 'blue')) : '',
    kv.APP_ENV ? row('APP_ENV', envChip(kv.APP_ENV)) : '',
    kv.APP_DEBUG != null ? row('APP_DEBUG', boolChip(kv.APP_DEBUG)) : '',
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="monica-sec"><h3>Application</h3><div class="monica-card">${appRows}</div></div>`;

  // Security
  const secRows = [
    kv.APP_KEY ? row('APP_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="monica-sec"><h3>Security</h3><div class="monica-card">${secRows}</div></div>`;

  // Database
  const dbRows = [
    kv.DB_HOST ? row('DB_HOST', chip(kv.DB_HOST)) : '',
    kv.DB_PORT ? row('DB_PORT', chip(kv.DB_PORT, 'blue')) : '',
    kv.DB_DATABASE ? row('DB_DATABASE', chip(kv.DB_DATABASE)) : '',
    kv.DB_USERNAME ? row('DB_USERNAME', chip(kv.DB_USERNAME)) : '',
    kv.DB_PASSWORD != null ? row('DB_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="monica-sec"><h3>Database</h3><div class="monica-card">${dbRows}</div></div>`;

  // Email
  const mailRows = [
    kv.MAIL_MAILER ? row('MAIL_MAILER', chip(kv.MAIL_MAILER, 'blue')) : '',
    kv.MAIL_HOST ? row('MAIL_HOST', chip(kv.MAIL_HOST)) : '',
    kv.MAIL_PORT ? row('MAIL_PORT', chip(kv.MAIL_PORT, 'blue')) : '',
    kv.MAIL_FROM_ADDRESS ? row('MAIL_FROM_ADDRESS', chip(kv.MAIL_FROM_ADDRESS)) : '',
    kv.MAIL_FROM_NAME ? row('MAIL_FROM_NAME', chip(kv.MAIL_FROM_NAME)) : '',
    kv.MAIL_USERNAME ? row('MAIL_USERNAME', chip(kv.MAIL_USERNAME)) : '',
    kv.MAIL_PASSWORD != null ? row('MAIL_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (mailRows) body += `<div class="monica-sec"><h3>Email</h3><div class="monica-card">${mailRows}</div></div>`;

  // Limits
  const limitRows = [
    kv.DEFAULT_MAX_STORAGE_SIZE ? row('DEFAULT_MAX_STORAGE_SIZE', chip(kv.DEFAULT_MAX_STORAGE_SIZE)) : '',
    kv.DEFAULT_MAX_UPLOAD_SIZE ? row('DEFAULT_MAX_UPLOAD_SIZE', chip(kv.DEFAULT_MAX_UPLOAD_SIZE)) : '',
  ].filter(Boolean).join('');
  if (limitRows) body += `<div class="monica-sec"><h3>Limits</h3><div class="monica-card">${limitRows}</div></div>`;

  // Features
  const featRows = [
    kv.MFA_ENABLED != null ? row('MFA_ENABLED', boolChip(kv.MFA_ENABLED)) : '',
    kv.SUBSCRIPTION_ENABLED != null ? row('SUBSCRIPTION_ENABLED', boolChip(kv.SUBSCRIPTION_ENABLED)) : '',
    kv.ALLOW_STATISTICS_CRAWLING != null ? row('ALLOW_STATISTICS_CRAWLING', boolChip(kv.ALLOW_STATISTICS_CRAWLING)) : '',
  ].filter(Boolean).join('');
  if (featRows) body += `<div class="monica-sec"><h3>Features</h3><div class="monica-card">${featRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Monica CRM configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
