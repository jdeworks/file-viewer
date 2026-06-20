const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.joplin-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.joplin-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2d7dd2;color:#fff;vertical-align:middle;margin-right:8px;}
.joplin-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.joplin-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.joplin-sec{margin:12px 0;}
.joplin-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.joplin-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.joplin-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.joplin-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.joplin-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.joplin-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.joplin-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.joplin-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.joplin-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.joplin-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function parseKV(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    result[t.slice(0, eq).trim()] = val;
  }
  return result;
}

function isSensitive(key) {
  return /secret|password|token|key|api|private/i.test(key);
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="joplin-chip${cls ? ' joplin-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="joplin-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="joplin-row"><span class="joplin-key">${esc(label)}</span><span class="joplin-val">${html}</span></div>`;
}

function val(kv, key) {
  if (!(key in kv)) return '';
  return isSensitive(key) ? masked() : chip(kv[key]);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'joplin-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  const title = kv.APP_BASE_URL || kv.JOPLIN_BASE_URL || 'Joplin Server Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="joplin-badge">Joplin Server</span>
      <span class="joplin-title">${esc(title)}</span>
    </div>
    <div class="joplin-sub">Joplin Server self-hosted note-taking server</div>
  `;
  host.appendChild(header);

  let body = '';

  // App
  const appRows = [
    kv.APP_PORT ? row('APP_PORT', chip(kv.APP_PORT, 'blue')) : '',
    kv.APP_BASE_URL ? row('APP_BASE_URL', chip(kv.APP_BASE_URL, 'blue')) : '',
    kv.JOPLIN_BASE_URL ? row('JOPLIN_BASE_URL', chip(kv.JOPLIN_BASE_URL, 'blue')) : '',
    kv.NODE_ENV ? row('NODE_ENV', chip(kv.NODE_ENV, kv.NODE_ENV === 'production' ? 'green' : 'gray')) : '',
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="joplin-sec"><h3>App</h3><div class="joplin-card">${appRows}</div></div>`;

  // Database
  const dbRows = [
    kv.DB_CLIENT ? row('DB_CLIENT', chip(kv.DB_CLIENT, 'blue')) : '',
    kv.DB_HOST ? row('DB_HOST', chip(kv.DB_HOST)) : '',
    kv.DB_PORT ? row('DB_PORT', chip(kv.DB_PORT)) : '',
    kv.DB_DATABASE ? row('DB_DATABASE', chip(kv.DB_DATABASE)) : '',
    kv.DB_USER ? row('DB_USER', chip(kv.DB_USER)) : '',
    'DB_PASSWORD' in kv ? row('DB_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="joplin-sec"><h3>Database</h3><div class="joplin-card">${dbRows}</div></div>`;

  // Mailer
  const mailerRows = [
    kv.MAILER_HOST ? row('MAILER_HOST', chip(kv.MAILER_HOST)) : '',
    kv.MAILER_PORT ? row('MAILER_PORT', chip(kv.MAILER_PORT, 'blue')) : '',
    kv.MAILER_FROM ? row('MAILER_FROM', chip(kv.MAILER_FROM)) : '',
    kv.MAILER_SECURITY ? row('MAILER_SECURITY', chip(kv.MAILER_SECURITY, 'blue')) : '',
    kv.MAILER_AUTH_USER ? row('MAILER_AUTH_USER', chip(kv.MAILER_AUTH_USER)) : '',
    'MAILER_AUTH_PASSWORD' in kv ? row('MAILER_AUTH_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (mailerRows) body += `<div class="joplin-sec"><h3>Mailer</h3><div class="joplin-card">${mailerRows}</div></div>`;

  // Storage
  const storageRows = [
    kv.STORAGE_DRIVER ? row('STORAGE_DRIVER', chip(kv.STORAGE_DRIVER, 'blue')) : '',
    kv.STORAGE_FILESYSTEM_PATH ? row('STORAGE_FILESYSTEM_PATH', chip(kv.STORAGE_FILESYSTEM_PATH)) : '',
    kv.STORAGE_S3_BUCKET ? row('STORAGE_S3_BUCKET', chip(kv.STORAGE_S3_BUCKET)) : '',
    kv.STORAGE_S3_REGION ? row('STORAGE_S3_REGION', chip(kv.STORAGE_S3_REGION)) : '',
    kv.STORAGE_S3_ENDPOINT ? row('STORAGE_S3_ENDPOINT', chip(kv.STORAGE_S3_ENDPOINT)) : '',
    'STORAGE_S3_ACCESS_KEY_ID' in kv ? row('STORAGE_S3_ACCESS_KEY_ID', masked()) : '',
    'STORAGE_S3_SECRET_ACCESS_KEY' in kv ? row('STORAGE_S3_SECRET_ACCESS_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (storageRows) body += `<div class="joplin-sec"><h3>Storage</h3><div class="joplin-card">${storageRows}</div></div>`;

  // Security
  const secRows = [
    'SECRET_KEY' in kv ? row('SECRET_KEY', masked()) : '',
    kv.MAX_TIME_DRIFT ? row('MAX_TIME_DRIFT', chip(kv.MAX_TIME_DRIFT, 'gray')) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="joplin-sec"><h3>Security</h3><div class="joplin-card">${secRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Joplin Server configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
