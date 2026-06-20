const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.grist-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.grist-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#16a34a;color:#fff;vertical-align:middle;margin-right:8px;}
.grist-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.grist-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.grist-sec{margin:12px 0;}
.grist-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.grist-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.grist-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.grist-key{color:var(--fg-2,#888);font-size:12px;min-width:240px;flex-shrink:0;}
.grist-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.grist-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.grist-chip-green{background:#dcfce7;border-color:#16a34a;color:#14532d;}
.grist-chip-red{background:#fee2e2;border-color:#dc2626;color:#7f1d1d;}
.grist-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#ccc);color:var(--fg-2,#888);}
.grist-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

function isSensitive(key) {
  return /SECRET|PASSWORD|PASSWD|TOKEN|API_KEY|APIKEY|PRIVATE|CREDENTIALS|CREDENTIAL/i.test(key);
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="grist-chip${cls ? ' grist-chip-' + cls : ''}">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function masked() {
  return '<span class="grist-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="grist-row"><span class="grist-key">${esc(label)}</span><span class="grist-val">${html}</span></div>`;
}

function valRow(kv, key, label) {
  if (!(key in kv)) return '';
  const v = kv[key];
  if (isSensitive(key)) return row(label || key, masked());
  return v ? row(label || key, chip(v)) : '';
}

function boolRow(kv, key, label) {
  if (!(key in kv)) return '';
  const v = kv[key];
  const on = v === '1' || v === 'true' || v === 'yes';
  return row(label || key, chip(on ? 'yes' : 'no', on ? 'green' : 'gray'));
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'grist-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const kv = parseKV(intake.text || '');

  const title = kv['APP_HOME_URL'] || 'Grist Config';

  const subParts = [
    kv['GRIST_SINGLE_ORG'] ? `org: ${kv['GRIST_SINGLE_ORG']}` : null,
    kv['TYPEORM_TYPE'] ? `db: ${kv['TYPEORM_TYPE']}` : null,
    kv['GRIST_SANDBOX_FLAVOR'] ? `sandbox: ${kv['GRIST_SANDBOX_FLAVOR']}` : null,
  ].filter(Boolean).join(' · ');

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="grist-badge">Grist</span>
      <span class="grist-title">${esc(title)}</span>
    </div>
    <p class="grist-sub">${esc(subParts) || 'Grist self-hosted spreadsheet database configuration'}</p>
  `;
  host.appendChild(header);

  let body = '';

  // App section
  const appRows = [
    valRow(kv, 'APP_HOME_URL'),
    valRow(kv, 'GRIST_SINGLE_ORG'),
    valRow(kv, 'GRIST_DEFAULT_EMAIL'),
    valRow(kv, 'GRIST_PAGE_TITLE_SUFFIX'),
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="grist-sec"><h3>App</h3><div class="grist-card">${appRows}</div></div>`;

  // Auth section
  const authRows = [
    kv['GRIST_SESSION_SECRET'] ? row('GRIST_SESSION_SECRET', masked()) : '',
    boolRow(kv, 'GRIST_FORCE_LOGIN'),
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="grist-sec"><h3>Auth</h3><div class="grist-card">${authRows}</div></div>`;

  // Database section
  const dbRows = [
    valRow(kv, 'TYPEORM_TYPE'),
    valRow(kv, 'TYPEORM_HOST'),
    valRow(kv, 'TYPEORM_DATABASE'),
    valRow(kv, 'TYPEORM_USERNAME'),
    kv['TYPEORM_PASSWORD'] != null ? row('TYPEORM_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="grist-sec"><h3>Database</h3><div class="grist-card">${dbRows}</div></div>`;

  // Storage section
  const storageRows = [
    valRow(kv, 'GRIST_DATA_DIR'),
    valRow(kv, 'GRIST_DOCS_DIR'),
    valRow(kv, 'GRIST_BLOB_STORE_DIR'),
  ].filter(Boolean).join('');
  if (storageRows) body += `<div class="grist-sec"><h3>Storage</h3><div class="grist-card">${storageRows}</div></div>`;

  // Sandbox section
  const sandboxRows = [
    valRow(kv, 'GRIST_SANDBOX_FLAVOR'),
  ].filter(Boolean).join('');
  if (sandboxRows) body += `<div class="grist-sec"><h3>Sandbox</h3><div class="grist-card">${sandboxRows}</div></div>`;

  // Email section
  const emailRows = [
    kv['SENDGRID_API_KEY'] != null ? row('SENDGRID_API_KEY', masked()) : '',
    valRow(kv, 'GRIST_SUPPORT_EMAIL'),
    valRow(kv, 'GRIST_INST_DIR'),
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="grist-sec"><h3>Email</h3><div class="grist-card">${emailRows}</div></div>`;

  // OAuth / OIDC section
  const oauthRows = [
    valRow(kv, 'GRIST_OIDC_IDP_ISSUER'),
    valRow(kv, 'GRIST_OIDC_IDP_CLIENT_ID'),
    kv['GRIST_OIDC_IDP_CLIENT_SECRET'] != null ? row('GRIST_OIDC_IDP_CLIENT_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (oauthRows) body += `<div class="grist-sec"><h3>OAuth / OIDC</h3><div class="grist-card">${oauthRows}</div></div>`;

  // Limits section
  const limitsRows = [
    valRow(kv, 'GRIST_MAX_UPLOAD_ATTACHMENT_MB'),
    valRow(kv, 'GRIST_MAX_UPLOAD_IMPORT_MB'),
  ].filter(Boolean).join('');
  if (limitsRows) body += `<div class="grist-sec"><h3>Limits</h3><div class="grist-card">${limitsRows}</div></div>`;

  // Features section
  const featRows = [
    valRow(kv, 'GRIST_HIDE_UI_ELEMENTS'),
    valRow(kv, 'GRIST_TELEMETRY_LEVEL'),
  ].filter(Boolean).join('');
  if (featRows) body += `<div class="grist-sec"><h3>Features</h3><div class="grist-card">${featRows}</div></div>`;

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
