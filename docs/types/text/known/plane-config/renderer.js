const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.plane-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.plane-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3730a3;color:#fff;vertical-align:middle;margin-right:8px;}
.plane-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.plane-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.plane-sec{margin:12px 0;}
.plane-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.plane-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.plane-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.plane-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.plane-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.plane-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.plane-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.plane-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.plane-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.plane-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

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

function maskDsn(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="plane-chip${cls ? ' plane-chip-' + cls : ''}">${esc(val)}</span>`;
}

function boolChip(v) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(v, 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(v, 'gray');
  return chip(v, 'gray');
}

function masked() {
  return '<span class="plane-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="plane-row"><span class="plane-key">${esc(label)}</span><span class="plane-val">${html}</span></div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'plane-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  const title = kv['WEB_URL'] || 'Plane Project Management';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="plane-badge">Plane</span>
      <span class="plane-title">${esc(title)}</span>
    </div>
    <p class="plane-sub">Plane project management configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    kv['WEB_URL'] ? row('WEB_URL', chip(kv['WEB_URL'])) : '',
    kv['DEBUG'] != null ? row('DEBUG', boolChip(kv['DEBUG'])) : '',
    kv['CORS_ALLOWED_ORIGINS'] ? row('CORS_ALLOWED_ORIGINS', chip(kv['CORS_ALLOWED_ORIGINS'])) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="plane-sec"><h3>Server</h3><div class="plane-card">${serverRows}</div></div>`;

  // Security
  const secRows = [
    kv['SECRET_KEY'] != null ? row('SECRET_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="plane-sec"><h3>Security</h3><div class="plane-card">${secRows}</div></div>`;

  // Database
  const dbRows = [
    kv['DATABASE_URL'] ? row('DATABASE_URL', chip(maskDsn(kv['DATABASE_URL']))) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="plane-sec"><h3>Database</h3><div class="plane-card">${dbRows}</div></div>`;

  // Redis
  const redisRows = [
    kv['REDIS_URL'] ? row('REDIS_URL', chip(maskDsn(kv['REDIS_URL']))) : '',
  ].filter(Boolean).join('');
  if (redisRows) body += `<div class="plane-sec"><h3>Redis</h3><div class="plane-card">${redisRows}</div></div>`;

  // Storage (S3/MinIO)
  const storageRows = [
    kv['AWS_S3_BUCKET_NAME'] ? row('AWS_S3_BUCKET_NAME', chip(kv['AWS_S3_BUCKET_NAME'])) : '',
    kv['AWS_S3_ENDPOINT_URL'] ? row('AWS_S3_ENDPOINT_URL', chip(kv['AWS_S3_ENDPOINT_URL'])) : '',
    kv['AWS_REGION'] ? row('AWS_REGION', chip(kv['AWS_REGION'])) : '',
    kv['MINIO_ROOT_USER'] ? row('MINIO_ROOT_USER', chip(kv['MINIO_ROOT_USER'])) : '',
    kv['MINIO_ROOT_PASSWORD'] != null ? row('MINIO_ROOT_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (storageRows) body += `<div class="plane-sec"><h3>Storage (S3 / MinIO)</h3><div class="plane-card">${storageRows}</div></div>`;

  // Email
  const emailRows = [
    kv['EMAIL_HOST'] ? row('EMAIL_HOST', chip(kv['EMAIL_HOST'])) : '',
    kv['EMAIL_PORT'] ? row('EMAIL_PORT', chip(kv['EMAIL_PORT'])) : '',
    kv['EMAIL_USE_TLS'] != null ? row('EMAIL_USE_TLS', boolChip(kv['EMAIL_USE_TLS'])) : '',
    kv['EMAIL_FROM'] ? row('EMAIL_FROM', chip(kv['EMAIL_FROM'])) : '',
    kv['EMAIL_HOST_USER'] ? row('EMAIL_HOST_USER', chip(kv['EMAIL_HOST_USER'])) : '',
    kv['EMAIL_HOST_PASSWORD'] != null ? row('EMAIL_HOST_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="plane-sec"><h3>Email</h3><div class="plane-card">${emailRows}</div></div>`;

  // Auth
  const authRows = [
    kv['ENABLE_SIGNUP'] != null ? row('ENABLE_SIGNUP', boolChip(kv['ENABLE_SIGNUP'])) : '',
    kv['ENABLE_EMAIL_PASSWORD'] != null ? row('ENABLE_EMAIL_PASSWORD', boolChip(kv['ENABLE_EMAIL_PASSWORD'])) : '',
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="plane-sec"><h3>Auth</h3><div class="plane-card">${authRows}</div></div>`;

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
