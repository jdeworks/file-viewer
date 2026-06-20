const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ldng-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ldng-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#fff;vertical-align:middle;margin-right:8px;}
.ldng-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.ldng-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.ldng-sec{margin:12px 0;}
.ldng-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ldng-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.ldng-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.ldng-key{color:var(--fg-2,#888);font-size:12px;min-width:240px;flex-shrink:0;}
.ldng-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.ldng-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.ldng-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.ldng-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.ldng-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.ldng-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.ldng-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function parseKV(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const stripped = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eq = stripped.indexOf('=');
    if (eq < 1) continue;
    const key = stripped.slice(0, eq).trim();
    const val = stripped.slice(eq + 1).trim();
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="ldng-chip${cls ? ' ldng-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="ldng-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="ldng-row"><span class="ldng-key">${esc(label)}</span><span class="ldng-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  return chip(v, 'gray');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'ldng-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="ldng-badge">Linkding</span>
      <span class="ldng-title">Linkding Bookmark Manager</span>
    </div>
    <div class="ldng-sub">Linkding self-hosted bookmark manager configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Admin
  const adminRows = [
    kv.LD_SUPERUSER_NAME ? row('LD_SUPERUSER_NAME', chip(kv.LD_SUPERUSER_NAME)) : '',
    kv.LD_SUPERUSER_PASSWORD != null ? row('LD_SUPERUSER_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (adminRows) body += `<div class="ldng-sec"><h3>Admin</h3><div class="ldng-card">${adminRows}</div></div>`;

  // Server
  const serverRows = [
    kv.LD_SERVER_PORT ? row('LD_SERVER_PORT', chip(kv.LD_SERVER_PORT, 'blue')) : '',
    kv.LD_CONTEXT_PATH ? row('LD_CONTEXT_PATH', chip(kv.LD_CONTEXT_PATH)) : '',
    kv.CSRF_TRUSTED_ORIGINS ? row('CSRF_TRUSTED_ORIGINS', chip(kv.CSRF_TRUSTED_ORIGINS)) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="ldng-sec"><h3>Server</h3><div class="ldng-card">${serverRows}</div></div>`;

  // Database
  const dbRows = [
    kv.LD_DB_ENGINE ? row('LD_DB_ENGINE', chip(kv.LD_DB_ENGINE, 'blue')) : '',
    kv.LD_DB_HOST ? row('LD_DB_HOST', chip(kv.LD_DB_HOST)) : '',
    kv.LD_DB_PORT ? row('LD_DB_PORT', chip(kv.LD_DB_PORT, 'blue')) : '',
    kv.LD_DB_DATABASE ? row('LD_DB_DATABASE', chip(kv.LD_DB_DATABASE)) : '',
    kv.LD_DB_USER ? row('LD_DB_USER', chip(kv.LD_DB_USER)) : '',
    kv.LD_DB_PASSWORD != null ? row('LD_DB_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="ldng-sec"><h3>Database</h3><div class="ldng-card">${dbRows}</div></div>`;

  // Auth Proxy
  const proxyRows = [
    kv.LD_ENABLE_AUTH_PROXY != null ? row('LD_ENABLE_AUTH_PROXY', boolChip(kv.LD_ENABLE_AUTH_PROXY, 'enabled', 'green', 'disabled', 'gray')) : '',
    kv.LD_AUTH_PROXY_USERNAME_HEADER ? row('LD_AUTH_PROXY_USERNAME_HEADER', chip(kv.LD_AUTH_PROXY_USERNAME_HEADER)) : '',
  ].filter(Boolean).join('');
  if (proxyRows) body += `<div class="ldng-sec"><h3>Auth Proxy</h3><div class="ldng-card">${proxyRows}</div></div>`;

  // Features
  const featureRows = [
    kv.LD_DISABLE_BACKGROUND_TASKS != null ? row('LD_DISABLE_BACKGROUND_TASKS', boolChip(kv.LD_DISABLE_BACKGROUND_TASKS, 'disabled', 'red', 'enabled', 'green')) : '',
    kv.LD_DISABLE_URL_VALIDATION != null ? row('LD_DISABLE_URL_VALIDATION', boolChip(kv.LD_DISABLE_URL_VALIDATION, 'disabled', 'red', 'enabled', 'green')) : '',
    kv.LD_REQUEST_TIMEOUT ? row('LD_REQUEST_TIMEOUT', chip(kv.LD_REQUEST_TIMEOUT, 'gray')) : '',
  ].filter(Boolean).join('');
  if (featureRows) body += `<div class="ldng-sec"><h3>Features</h3><div class="ldng-card">${featureRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Linkding configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
