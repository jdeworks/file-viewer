// Paperless-ngx paperless.conf viewer
// Parses key=value env-var config and displays grouped sections.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.plngx-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.plngx-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#166534;color:#fff;vertical-align:middle;margin-right:8px;}
.plngx-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.plngx-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.plngx-sec{margin:12px 0;}
.plngx-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.plngx-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.plngx-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.plngx-key{color:var(--fg-2,#888);font-size:12px;min-width:240px;flex-shrink:0;}
.plngx-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.plngx-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.plngx-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.plngx-chip-green{background:#dcfce7;border-color:#86efac;color:#166534;}
`;

/** Parse KEY=VALUE config, skip # comments, ignore 'export' keyword */
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
    // strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

/** Mask credentials in a redis/postgres URL */
function maskUrl(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="plngx-chip${cls ? ' ' + cls : ''}">${esc(String(val))}</span>`;
}

function masked() {
  return '<span class="plngx-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="plngx-row"><span class="plngx-key">${esc(label)}</span><span class="plngx-val">${html}</span></div>`;
}

export function render(intake) {
  const kv = parseKV(intake.text || '');

  const totalKeys = Object.keys(kv).length;

  // ── Database ──
  const dbRows = [
    kv.PAPERLESS_DBHOST != null ? row('PAPERLESS_DBHOST', chip(kv.PAPERLESS_DBHOST, 'plngx-chip-green')) : '',
    kv.PAPERLESS_DBPORT != null ? row('PAPERLESS_DBPORT', chip(kv.PAPERLESS_DBPORT)) : '',
    kv.PAPERLESS_DBNAME != null ? row('PAPERLESS_DBNAME', chip(kv.PAPERLESS_DBNAME)) : '',
    kv.PAPERLESS_DBUSER != null ? row('PAPERLESS_DBUSER', chip(kv.PAPERLESS_DBUSER)) : '',
    kv.PAPERLESS_DBPASS != null ? row('PAPERLESS_DBPASS', masked()) : '',
  ].filter(Boolean).join('');

  // ── Redis ──
  const redisRows = [
    kv.PAPERLESS_REDIS != null ? row('PAPERLESS_REDIS', chip(maskUrl(kv.PAPERLESS_REDIS))) : '',
  ].filter(Boolean).join('');

  // ── Security ──
  const secRows = [
    kv.PAPERLESS_SECRET_KEY != null ? row('PAPERLESS_SECRET_KEY', masked()) : '',
    kv.PAPERLESS_ALLOWED_HOSTS != null ? row('PAPERLESS_ALLOWED_HOSTS', chip(kv.PAPERLESS_ALLOWED_HOSTS)) : '',
  ].filter(Boolean).join('');

  // ── Admin ──
  const adminRows = [
    kv.PAPERLESS_ADMIN_USER != null ? row('PAPERLESS_ADMIN_USER', chip(kv.PAPERLESS_ADMIN_USER, 'plngx-chip-green')) : '',
    kv.PAPERLESS_ADMIN_PASSWORD != null ? row('PAPERLESS_ADMIN_PASSWORD', masked()) : '',
    kv.PAPERLESS_ADMIN_MAIL != null ? row('PAPERLESS_ADMIN_MAIL', chip(kv.PAPERLESS_ADMIN_MAIL)) : '',
  ].filter(Boolean).join('');

  // ── OCR ──
  const ocrRows = [
    kv.PAPERLESS_OCR_LANGUAGE != null ? row('PAPERLESS_OCR_LANGUAGE', chip(kv.PAPERLESS_OCR_LANGUAGE, 'plngx-chip-green')) : '',
    kv.PAPERLESS_OCR_MODE != null ? row('PAPERLESS_OCR_MODE', chip(kv.PAPERLESS_OCR_MODE)) : '',
    kv.PAPERLESS_OCR_OUTPUT_TYPE != null ? row('PAPERLESS_OCR_OUTPUT_TYPE', chip(kv.PAPERLESS_OCR_OUTPUT_TYPE)) : '',
  ].filter(Boolean).join('');

  // ── System ──
  const systemRows = [
    kv.PAPERLESS_TIME_ZONE != null ? row('PAPERLESS_TIME_ZONE', chip(kv.PAPERLESS_TIME_ZONE)) : '',
    kv.PAPERLESS_CONSUMPTION_DIR != null ? row('PAPERLESS_CONSUMPTION_DIR', chip(kv.PAPERLESS_CONSUMPTION_DIR)) : '',
    kv.PAPERLESS_DATA_DIR != null ? row('PAPERLESS_DATA_DIR', chip(kv.PAPERLESS_DATA_DIR)) : '',
    kv.PAPERLESS_MEDIA_ROOT != null ? row('PAPERLESS_MEDIA_ROOT', chip(kv.PAPERLESS_MEDIA_ROOT)) : '',
  ].filter(Boolean).join('');

  const knownKeys = new Set([
    'PAPERLESS_DBHOST','PAPERLESS_DBPORT','PAPERLESS_DBNAME','PAPERLESS_DBUSER','PAPERLESS_DBPASS',
    'PAPERLESS_REDIS',
    'PAPERLESS_SECRET_KEY','PAPERLESS_ALLOWED_HOSTS',
    'PAPERLESS_ADMIN_USER','PAPERLESS_ADMIN_PASSWORD','PAPERLESS_ADMIN_MAIL',
    'PAPERLESS_OCR_LANGUAGE','PAPERLESS_OCR_MODE','PAPERLESS_OCR_OUTPUT_TYPE',
    'PAPERLESS_TIME_ZONE','PAPERLESS_CONSUMPTION_DIR','PAPERLESS_DATA_DIR','PAPERLESS_MEDIA_ROOT',
  ]);

  const otherRows = Object.entries(kv)
    .filter(([k]) => !knownKeys.has(k))
    .map(([k, v]) => row(k, chip(v.length > 80 ? v.slice(0, 77) + '…' : v)))
    .filter(Boolean)
    .join('');

  let body = '';
  if (dbRows) body += `<div class="plngx-sec"><h3>Database</h3><div class="plngx-card">${dbRows}</div></div>`;
  if (redisRows) body += `<div class="plngx-sec"><h3>Redis</h3><div class="plngx-card">${redisRows}</div></div>`;
  if (secRows) body += `<div class="plngx-sec"><h3>Security</h3><div class="plngx-card">${secRows}</div></div>`;
  if (adminRows) body += `<div class="plngx-sec"><h3>Admin</h3><div class="plngx-card">${adminRows}</div></div>`;
  if (ocrRows) body += `<div class="plngx-sec"><h3>OCR</h3><div class="plngx-card">${ocrRows}</div></div>`;
  if (systemRows) body += `<div class="plngx-sec"><h3>System</h3><div class="plngx-card">${systemRows}</div></div>`;
  if (otherRows) body += `<div class="plngx-sec"><h3>Other Settings</h3><div class="plngx-card">${otherRows}</div></div>`;

  const host = document.createElement('div');
  host.className = 'plngx-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;"><span class="plngx-badge">Paperless-ngx</span><span class="plngx-title">Paperless-ngx Configuration</span></div>
<div class="plngx-sub">${totalKeys} setting${totalKeys !== 1 ? 's' : ''}</div>
${body || '<div style="color:var(--fg-2,#888);font-size:13px;">No configuration found.</div>'}`;

  return { parentNode: host };
}
