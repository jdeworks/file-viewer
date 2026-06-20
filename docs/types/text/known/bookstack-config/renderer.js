const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.bstack-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.bstack-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1976d2;color:#fff;vertical-align:middle;margin-right:8px;}
.bstack-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.bstack-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.bstack-sec{margin:12px 0;}
.bstack-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.bstack-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.bstack-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.bstack-key{color:var(--fg-2,#888);font-size:12px;min-width:240px;flex-shrink:0;}
.bstack-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.bstack-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.bstack-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/** Parse KEY=VALUE config, skip # comments and blank lines. Handles optional `export ` prefix. */
function parseKV(text) {
  const out = {};
  for (const raw of (text || '').split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

function chip(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="bstack-chip">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function masked() {
  return '<span class="bstack-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="bstack-row"><span class="bstack-key">${esc(label)}</span><span class="bstack-val">${html}</span></div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'bstack-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const kv = parseKV(intake.text || '');
  const title = kv['APP_URL'] || 'BookStack Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="bstack-badge">BookStack</span>
      <span class="bstack-title">${esc(title)}</span>
    </div>
    <p class="bstack-sub">BookStack self-hosted wiki/documentation platform configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // App section
  const appRows = [
    kv['APP_URL'] ? row('APP_URL', chip(kv['APP_URL'])) : '',
    kv['APP_KEY'] != null ? row('APP_KEY', masked()) : '',
    kv['APP_ENV'] != null ? row('APP_ENV', chip(kv['APP_ENV'])) : '',
    kv['APP_DEBUG'] != null ? row('APP_DEBUG', chip(kv['APP_DEBUG'])) : '',
    kv['APP_LANG'] ? row('APP_LANG', chip(kv['APP_LANG'])) : '',
    kv['APP_AUTO_LANG_PUBLIC'] != null ? row('APP_AUTO_LANG_PUBLIC', chip(kv['APP_AUTO_LANG_PUBLIC'])) : '',
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="bstack-sec"><h3>App</h3><div class="bstack-card">${appRows}</div></div>`;

  // Database section
  const dbRows = [
    kv['DB_HOST'] ? row('DB_HOST', chip(kv['DB_HOST'])) : '',
    kv['DB_PORT'] ? row('DB_PORT', chip(kv['DB_PORT'])) : '',
    kv['DB_DATABASE'] ? row('DB_DATABASE', chip(kv['DB_DATABASE'])) : '',
    kv['DB_USERNAME'] ? row('DB_USERNAME', chip(kv['DB_USERNAME'])) : '',
    kv['DB_PASSWORD'] != null ? row('DB_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="bstack-sec"><h3>Database</h3><div class="bstack-card">${dbRows}</div></div>`;

  // Cache/Session section
  const cacheRows = [
    kv['CACHE_DRIVER'] ? row('CACHE_DRIVER', chip(kv['CACHE_DRIVER'])) : '',
    kv['SESSION_DRIVER'] ? row('SESSION_DRIVER', chip(kv['SESSION_DRIVER'])) : '',
    kv['SESSION_LIFETIME'] ? row('SESSION_LIFETIME', chip(kv['SESSION_LIFETIME'])) : '',
    kv['QUEUE_CONNECTION'] ? row('QUEUE_CONNECTION', chip(kv['QUEUE_CONNECTION'])) : '',
  ].filter(Boolean).join('');
  if (cacheRows) body += `<div class="bstack-sec"><h3>Cache / Session</h3><div class="bstack-card">${cacheRows}</div></div>`;

  // Mail section
  const mailRows = [
    kv['MAIL_DRIVER'] ? row('MAIL_DRIVER', chip(kv['MAIL_DRIVER'])) : '',
    kv['MAIL_HOST'] ? row('MAIL_HOST', chip(kv['MAIL_HOST'])) : '',
    kv['MAIL_PORT'] ? row('MAIL_PORT', chip(kv['MAIL_PORT'])) : '',
    kv['MAIL_FROM'] ? row('MAIL_FROM', chip(kv['MAIL_FROM'])) : '',
    kv['MAIL_FROM_NAME'] ? row('MAIL_FROM_NAME', chip(kv['MAIL_FROM_NAME'])) : '',
    kv['MAIL_USERNAME'] ? row('MAIL_USERNAME', chip(kv['MAIL_USERNAME'])) : '',
    kv['MAIL_PASSWORD'] != null ? row('MAIL_PASSWORD', masked()) : '',
    kv['MAIL_ENCRYPTION'] ? row('MAIL_ENCRYPTION', chip(kv['MAIL_ENCRYPTION'])) : '',
  ].filter(Boolean).join('');
  if (mailRows) body += `<div class="bstack-sec"><h3>Mail</h3><div class="bstack-card">${mailRows}</div></div>`;

  // Auth section
  const authRows = [
    kv['AUTH_METHOD'] ? row('AUTH_METHOD', chip(kv['AUTH_METHOD'])) : '',
    kv['LDAP_SERVER'] ? row('LDAP_SERVER', chip(kv['LDAP_SERVER'])) : '',
    kv['LDAP_DN'] ? row('LDAP_DN', chip(kv['LDAP_DN'])) : '',
    kv['LDAP_PASS'] != null ? row('LDAP_PASS', masked()) : '',
    kv['SAML2_IDP_ENTITYID'] ? row('SAML2_IDP_ENTITYID', chip(kv['SAML2_IDP_ENTITYID'])) : '',
    kv['OIDC_CLIENT_ID'] ? row('OIDC_CLIENT_ID', chip(kv['OIDC_CLIENT_ID'])) : '',
    kv['OIDC_CLIENT_SECRET'] != null ? row('OIDC_CLIENT_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="bstack-sec"><h3>Auth</h3><div class="bstack-card">${authRows}</div></div>`;

  // Storage section
  const storageRows = [
    kv['STORAGE_TYPE'] ? row('STORAGE_TYPE', chip(kv['STORAGE_TYPE'])) : '',
    kv['STORAGE_S3_KEY'] != null ? row('STORAGE_S3_KEY', masked()) : '',
    kv['STORAGE_S3_SECRET'] != null ? row('STORAGE_S3_SECRET', masked()) : '',
    kv['STORAGE_S3_BUCKET'] ? row('STORAGE_S3_BUCKET', chip(kv['STORAGE_S3_BUCKET'])) : '',
    kv['STORAGE_S3_REGION'] ? row('STORAGE_S3_REGION', chip(kv['STORAGE_S3_REGION'])) : '',
  ].filter(Boolean).join('');
  if (storageRows) body += `<div class="bstack-sec"><h3>Storage</h3><div class="bstack-card">${storageRows}</div></div>`;

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
