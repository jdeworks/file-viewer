const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-kc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4D7CE8;color:#fff;vertical-align:middle;margin-right:8px}
.kc-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline}
.kc-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px}
.kc-sec{margin:12px 0}
.kc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.kc-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px}
.kc-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap}
.kc-key{color:var(--fg-2,#888);font-size:12px;min-width:240px;flex-shrink:0}
.kc-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all}
.kc-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f)}
.kc-chip-blue{background:#eff6ff;border-color:#93c5fd;color:#1e40af}
.kc-chip-green{background:#dcfce7;border-color:#86efac;color:#166534}
.kc-chip-red{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
.kc-chip-purple{background:#f5f3ff;border-color:#c4b5fd;color:#5b21b6}
.kc-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888)}
.kc-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic}
`;

const SENSITIVE_RE = /password|secret|token|key/i;

const DB_COLORS = { postgres: 'blue', mysql: 'blue', mariadb: 'blue', oracle: 'purple', mssql: 'blue', 'dev-mem': 'gray', 'dev-file': 'gray' };

function parseKV(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const t2 = t.startsWith('export ') ? t.slice(7) : t;
    const eq = t2.indexOf('=');
    if (eq === -1) continue;
    let val = t2.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    const key = t2.slice(0, eq).trim();
    if (key && !(key in result)) result[key] = val;
  }
  return result;
}

function maskDbUrl(url) {
  if (!url) return '';
  return url.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="kc-chip${cls ? ' kc-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="kc-masked">[configured]</span>';
}

function isSensitive(key) {
  return SENSITIVE_RE.test(key);
}

function row(label, html) {
  if (!html) return '';
  return `<div class="kc-row"><span class="kc-key">${esc(label)}</span><span class="kc-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = String(v ?? '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'enabled') return chip(trueLabel || 'true', trueColor || 'green');
  if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'disabled') return chip(falseLabel || 'false', falseColor || 'gray');
  return chip(String(v), 'gray');
}

function kvRow(kv, key, label, transform) {
  if (!(key in kv)) return '';
  const val = kv[key];
  const html = transform ? transform(val) : (isSensitive(key) ? masked() : chip(esc(val)));
  return row(label || key, html);
}

export function render(intake) {
  const kv = parseKV(intake.text || '');

  const host = document.createElement('div');
  host.className = 'kc-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const titleText = kv.KC_HOSTNAME || 'Keycloak Config';
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px">
      <span class="badge-kc">Keycloak</span>
      <span class="kc-title">${esc(titleText)}</span>
    </div>
    <div class="kc-sub">Keycloak open-source Identity and Access Management</div>
  `;
  host.appendChild(header);

  let body = '';

  // Identity
  const identityRows = [
    kvRow(kv, 'KC_HOSTNAME', 'KC_HOSTNAME', v => chip(v, 'blue')),
    kvRow(kv, 'KC_HOSTNAME_PORT', 'KC_HOSTNAME_PORT', v => chip(v, 'blue')),
    kvRow(kv, 'KC_HTTP_PORT', 'KC_HTTP_PORT', v => chip(v, 'blue')),
    kvRow(kv, 'KC_HTTPS_PORT', 'KC_HTTPS_PORT', v => chip(v, 'blue')),
  ].filter(Boolean).join('');
  if (identityRows) body += `<div class="kc-sec"><h3>Identity</h3><div class="kc-card">${identityRows}</div></div>`;

  // Database
  const dbType = kv.KC_DB || '';
  const dbColor = DB_COLORS[dbType.toLowerCase()] || 'gray';
  const dbRows = [
    dbType ? row('KC_DB', chip(dbType, dbColor)) : '',
    kv.KC_DB_URL ? row('KC_DB_URL', chip(maskDbUrl(kv.KC_DB_URL))) : '',
    kvRow(kv, 'KC_DB_USERNAME', 'KC_DB_USERNAME', v => chip(v)),
    'KC_DB_PASSWORD' in kv ? row('KC_DB_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="kc-sec"><h3>Database</h3><div class="kc-card">${dbRows}</div></div>`;

  // Admin
  const adminRows = [
    kvRow(kv, 'KEYCLOAK_ADMIN', 'KEYCLOAK_ADMIN', v => chip(v)),
    'KEYCLOAK_ADMIN_PASSWORD' in kv ? row('KEYCLOAK_ADMIN_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (adminRows) body += `<div class="kc-sec"><h3>Admin</h3><div class="kc-card">${adminRows}</div></div>`;

  // Features
  const featuresRows = [
    kv.KC_FEATURES ? row('KC_FEATURES', kv.KC_FEATURES.split(',').map(f => chip(f.trim(), 'purple')).join('')) : '',
    kvRow(kv, 'KC_CACHE', 'KC_CACHE', v => chip(v)),
    kvRow(kv, 'KC_PROXY', 'KC_PROXY', v => chip(v)),
  ].filter(Boolean).join('');
  if (featuresRows) body += `<div class="kc-sec"><h3>Features</h3><div class="kc-card">${featuresRows}</div></div>`;

  // Health & Metrics
  const healthRows = [
    kvRow(kv, 'KC_HEALTH_ENABLED', 'KC_HEALTH_ENABLED', v => boolChip(v, 'enabled', 'green', 'disabled', 'gray')),
    kvRow(kv, 'KC_METRICS_ENABLED', 'KC_METRICS_ENABLED', v => boolChip(v, 'enabled', 'green', 'disabled', 'gray')),
  ].filter(Boolean).join('');
  if (healthRows) body += `<div class="kc-sec"><h3>Health &amp; Metrics</h3><div class="kc-card">${healthRows}</div></div>`;

  // TLS
  const tlsRows = [
    kvRow(kv, 'KC_HTTPS_CERTIFICATE_FILE', 'KC_HTTPS_CERTIFICATE_FILE', v => chip(v)),
    kvRow(kv, 'KC_HTTPS_CERTIFICATE_KEY_FILE', 'KC_HTTPS_CERTIFICATE_KEY_FILE', v => chip(v)),
  ].filter(Boolean).join('');
  if (tlsRows) body += `<div class="kc-sec"><h3>TLS</h3><div class="kc-card">${tlsRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Keycloak configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
