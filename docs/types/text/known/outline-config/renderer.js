const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.outline-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.outline-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0069ff;color:#fff;vertical-align:middle;margin-right:8px;}
.outline-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.outline-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.outline-sec{margin:12px 0;}
.outline-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.outline-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.outline-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.outline-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.outline-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.outline-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.outline-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.outline-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.outline-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.outline-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.outline-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function parseKV(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // Strip optional leading "export "
    const stripped = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eq = stripped.indexOf('=');
    if (eq < 1) continue;
    const key = stripped.slice(0, eq).trim();
    const val = stripped.slice(eq + 1).trim();
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

function maskDsn(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="outline-chip${cls ? ' outline-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="outline-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="outline-row"><span class="outline-key">${esc(label)}</span><span class="outline-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  return chip(v, 'gray');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'outline-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  const title = kv.URL || 'Outline Wiki Config';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="outline-badge">Outline</span>
      <span class="outline-title">${esc(title)}</span>
    </div>
    <div class="outline-sub">Outline wiki server configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    kv.URL ? row('URL', chip(kv.URL, 'blue')) : '',
    kv.PORT ? row('PORT', chip(kv.PORT, 'blue')) : '',
    kv.FORCE_HTTPS != null ? row('FORCE_HTTPS', boolChip(kv.FORCE_HTTPS, 'enabled', 'green', 'disabled', 'gray')) : '',
    kv.ENABLE_UPDATES != null ? row('ENABLE_UPDATES', boolChip(kv.ENABLE_UPDATES, 'enabled', 'green', 'disabled', 'gray')) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="outline-sec"><h3>Server</h3><div class="outline-card">${serverRows}</div></div>`;

  // Security
  const secRows = [
    kv.SECRET_KEY != null ? row('SECRET_KEY', masked()) : '',
    kv.UTILS_SECRET != null ? row('UTILS_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="outline-sec"><h3>Security</h3><div class="outline-card">${secRows}</div></div>`;

  // Database
  if (kv.DATABASE_URL) {
    const maskedUrl = maskDsn(kv.DATABASE_URL);
    const display = maskedUrl.length > 80 ? maskedUrl.slice(0, 77) + '…' : maskedUrl;
    body += `<div class="outline-sec"><h3>Database</h3><div class="outline-card">${row('DATABASE_URL', chip(display))}</div></div>`;
  }

  // Redis
  if (kv.REDIS_URL) {
    const maskedUrl = maskDsn(kv.REDIS_URL);
    const display = maskedUrl.length > 80 ? maskedUrl.slice(0, 77) + '…' : maskedUrl;
    body += `<div class="outline-sec"><h3>Redis</h3><div class="outline-card">${row('REDIS_URL', chip(display))}</div></div>`;
  }

  // Storage (S3)
  const s3Rows = [
    kv.AWS_S3_UPLOAD_BUCKET_NAME ? row('AWS_S3_UPLOAD_BUCKET_NAME', chip(kv.AWS_S3_UPLOAD_BUCKET_NAME)) : '',
    kv.AWS_REGION ? row('AWS_REGION', chip(kv.AWS_REGION, 'blue')) : '',
    kv.AWS_S3_UPLOAD_BUCKET_URL ? row('AWS_S3_UPLOAD_BUCKET_URL', chip(kv.AWS_S3_UPLOAD_BUCKET_URL)) : '',
    kv.AWS_ACCESS_KEY_ID ? row('AWS_ACCESS_KEY_ID', chip(kv.AWS_ACCESS_KEY_ID)) : '',
    kv.AWS_SECRET_ACCESS_KEY != null ? row('AWS_SECRET_ACCESS_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (s3Rows) body += `<div class="outline-sec"><h3>Storage (S3)</h3><div class="outline-card">${s3Rows}</div></div>`;

  // Auth (OIDC)
  const oidcRows = [
    kv.OIDC_CLIENT_ID ? row('OIDC_CLIENT_ID', chip(kv.OIDC_CLIENT_ID)) : '',
    kv.OIDC_CLIENT_SECRET != null ? row('OIDC_CLIENT_SECRET', masked()) : '',
    kv.OIDC_AUTH_URI ? row('OIDC_AUTH_URI', chip(kv.OIDC_AUTH_URI)) : '',
  ].filter(Boolean).join('');
  if (oidcRows) body += `<div class="outline-sec"><h3>Auth (OIDC)</h3><div class="outline-card">${oidcRows}</div></div>`;

  // Email
  const emailRows = [
    kv.SMTP_HOST ? row('SMTP_HOST', chip(kv.SMTP_HOST)) : '',
    kv.SMTP_PORT ? row('SMTP_PORT', chip(kv.SMTP_PORT, 'blue')) : '',
    kv.SMTP_FROM_EMAIL ? row('SMTP_FROM_EMAIL', chip(kv.SMTP_FROM_EMAIL)) : '',
    kv.SMTP_USERNAME ? row('SMTP_USERNAME', chip(kv.SMTP_USERNAME)) : '',
    kv.SMTP_PASSWORD != null ? row('SMTP_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="outline-sec"><h3>Email</h3><div class="outline-card">${emailRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Outline configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
