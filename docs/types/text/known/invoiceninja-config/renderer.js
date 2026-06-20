const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.invninja-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.invninja-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f97316;color:#fff;vertical-align:middle;margin-right:8px;}
.invninja-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.invninja-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.invninja-sec{margin:12px 0;}
.invninja-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.invninja-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.invninja-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.invninja-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.invninja-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.invninja-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.invninja-chip-orange{background:#fff7ed;border-color:#f97316;color:#9a3412;}
.invninja-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.invninja-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.invninja-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.invninja-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.invninja-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function parseKV(text) {
  const out = {};
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const stripped = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eq = stripped.indexOf('=');
    if (eq < 1) continue;
    const key = stripped.slice(0, eq).trim();
    let val = stripped.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="invninja-chip${cls ? ' invninja-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="invninja-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="invninja-row"><span class="invninja-key">${esc(label)}</span><span class="invninja-val">${html}</span></div>`;
}

function envChip(val) {
  if (!val) return '';
  const lower = val.toLowerCase();
  if (lower === 'production') return chip(val, 'green');
  if (lower === 'local' || lower === 'development') return chip(val, 'blue');
  return chip(val, 'gray');
}

function selfhostedChip(val) {
  if (!val) return '';
  const lower = val.toLowerCase();
  if (lower === 'selfhosted') return chip(val, 'orange');
  if (lower === 'hosted') return chip(val, 'blue');
  return chip(val, 'gray');
}

function mailerChip(val) {
  if (!val) return '';
  const lower = val.toLowerCase();
  if (lower === 'smtp') return chip(val, 'blue');
  if (lower === 'mailgun') return chip(val, 'orange');
  if (lower === 'ses') return chip(val, 'orange');
  if (lower === 'log') return chip(val, 'gray');
  return chip(val, 'gray');
}

function fsChip(val) {
  if (!val) return '';
  const lower = val.toLowerCase();
  if (lower === 's3') return chip(val, 'orange');
  if (lower === 'local') return chip(val, 'green');
  return chip(val, 'gray');
}

function pdfChip(val) {
  if (!val) return '';
  const lower = val.toLowerCase();
  if (lower === 'snappdf') return chip(val, 'green');
  if (lower === 'phantom') return chip(val, 'blue');
  if (lower === 'hosted_ninja') return chip(val, 'orange');
  return chip(val, 'gray');
}

function queueChip(val) {
  if (!val) return '';
  const lower = val.toLowerCase();
  if (lower === 'sync') return chip(val, 'gray');
  if (lower === 'redis') return chip(val, 'orange');
  if (lower === 'database') return chip(val, 'blue');
  return chip(val, 'gray');
}

function encChip(val) {
  if (!val) return '';
  const lower = val.toLowerCase();
  if (lower === 'tls' || lower === 'ssl') return chip(val, 'green');
  if (lower === 'starttls') return chip(val, 'blue');
  if (lower === 'null' || lower === 'false' || lower === '') return chip('none', 'gray');
  return chip(val, 'gray');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'invninja-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  const title = kv.APP_URL || 'Invoice Ninja Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="invninja-badge">Invoice Ninja</span>
      <span class="invninja-title">${esc(title)}</span>
    </div>
    <div class="invninja-sub">Invoice Ninja self-hosted invoicing configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // App
  const appRows = [
    kv.APP_URL ? row('APP_URL', chip(kv.APP_URL, 'blue')) : '',
    kv.APP_ENV != null ? row('APP_ENV', envChip(kv.APP_ENV)) : '',
    kv.NINJA_ENVIRONMENT != null ? row('NINJA_ENVIRONMENT', selfhostedChip(kv.NINJA_ENVIRONMENT)) : '',
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="invninja-sec"><h3>App</h3><div class="invninja-card">${appRows}</div></div>`;

  // Security
  const secRows = [
    kv.APP_KEY != null ? row('APP_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="invninja-sec"><h3>Security</h3><div class="invninja-card">${secRows}</div></div>`;

  // Database
  const dbRows = [
    kv.DB_HOST ? row('DB_HOST', chip(kv.DB_HOST)) : '',
    kv.DB_PORT ? row('DB_PORT', chip(kv.DB_PORT, 'blue')) : '',
    kv.DB_DATABASE ? row('DB_DATABASE', chip(kv.DB_DATABASE)) : '',
    kv.DB_USERNAME ? row('DB_USERNAME', chip(kv.DB_USERNAME)) : '',
    kv.DB_PASSWORD != null ? row('DB_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="invninja-sec"><h3>Database</h3><div class="invninja-card">${dbRows}</div></div>`;

  // Mail
  const mailRows = [
    kv.MAIL_MAILER != null ? row('MAIL_MAILER', mailerChip(kv.MAIL_MAILER)) : '',
    kv.MAIL_HOST ? row('MAIL_HOST', chip(kv.MAIL_HOST)) : '',
    kv.MAIL_PORT ? row('MAIL_PORT', chip(kv.MAIL_PORT, 'blue')) : '',
    kv.MAIL_USERNAME ? row('MAIL_USERNAME', chip(kv.MAIL_USERNAME)) : '',
    kv.MAIL_PASSWORD != null ? row('MAIL_PASSWORD', masked()) : '',
    kv.MAIL_FROM_ADDRESS ? row('MAIL_FROM_ADDRESS', chip(kv.MAIL_FROM_ADDRESS)) : '',
    kv.MAIL_FROM_NAME ? row('MAIL_FROM_NAME', chip(kv.MAIL_FROM_NAME)) : '',
    kv.MAIL_ENCRYPTION != null ? row('MAIL_ENCRYPTION', encChip(kv.MAIL_ENCRYPTION)) : '',
  ].filter(Boolean).join('');
  if (mailRows) body += `<div class="invninja-sec"><h3>Mail</h3><div class="invninja-card">${mailRows}</div></div>`;

  // Storage
  const storageRows = [
    kv.FILESYSTEM_DRIVER != null ? row('FILESYSTEM_DRIVER', fsChip(kv.FILESYSTEM_DRIVER)) : '',
    kv.AWS_ACCESS_KEY_ID ? row('AWS_ACCESS_KEY_ID', chip(kv.AWS_ACCESS_KEY_ID)) : '',
    kv.AWS_SECRET_ACCESS_KEY != null ? row('AWS_SECRET_ACCESS_KEY', masked()) : '',
    kv.AWS_DEFAULT_REGION ? row('AWS_DEFAULT_REGION', chip(kv.AWS_DEFAULT_REGION, 'blue')) : '',
    kv.AWS_BUCKET ? row('AWS_BUCKET', chip(kv.AWS_BUCKET)) : '',
  ].filter(Boolean).join('');
  if (storageRows) body += `<div class="invninja-sec"><h3>Storage</h3><div class="invninja-card">${storageRows}</div></div>`;

  // PDF
  const pdfRows = [
    kv.PDF_GENERATOR != null ? row('PDF_GENERATOR', pdfChip(kv.PDF_GENERATOR)) : '',
  ].filter(Boolean).join('');
  if (pdfRows) body += `<div class="invninja-sec"><h3>PDF</h3><div class="invninja-card">${pdfRows}</div></div>`;

  // Queue
  const queueRows = [
    kv.QUEUE_CONNECTION != null ? row('QUEUE_CONNECTION', queueChip(kv.QUEUE_CONNECTION)) : '',
    kv.REDIS_HOST ? row('REDIS_HOST', chip(kv.REDIS_HOST)) : '',
    kv.REDIS_PASSWORD != null ? row('REDIS_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (queueRows) body += `<div class="invninja-sec"><h3>Queue</h3><div class="invninja-card">${queueRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Invoice Ninja configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
