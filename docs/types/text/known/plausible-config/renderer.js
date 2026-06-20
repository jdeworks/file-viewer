const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.plsbl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.plsbl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5850ec;color:#fff;vertical-align:middle;margin-right:8px;}
.plsbl-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.plsbl-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.plsbl-sec{margin:12px 0;}
.plsbl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.plsbl-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.plsbl-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.plsbl-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.plsbl-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.plsbl-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.plsbl-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.plsbl-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.plsbl-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.plsbl-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.plsbl-chip-purple{background:#f3e5f5;border-color:#9c27b0;color:#4a148c;}
.plsbl-chip-orange{background:#fff3e0;border-color:#ff9800;color:#e65100;}
.plsbl-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/** Parse KEY=VALUE config, skip # comments and blank lines, strip optional `export ` prefix */
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

/** Mask credentials in a DSN/URL: postgres://user:pass@host/db → postgres://[configured]@host/db */
function maskDsn(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="plsbl-chip${cls ? ' plsbl-chip-' + cls : ''}">${esc(String(val))}</span>`;
}

function masked() {
  return '<span class="plsbl-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="plsbl-row"><span class="plsbl-key">${esc(label)}</span><span class="plsbl-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  return chip(v, 'gray');
}

function registrationChip(v) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1') return chip('disabled', 'red');
  if (lower === 'false' || lower === '0') return chip('open', 'green');
  if (lower === 'invite_only') return chip('invite_only', 'orange');
  return chip(v, 'gray');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'plsbl-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const cfg = parseKV(text);

  const title = cfg.BASE_URL || 'Plausible Analytics Config';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="plsbl-badge">Plausible</span>
      <span class="plsbl-title">${esc(title)}</span>
    </div>
    <div class="plsbl-sub">Plausible Analytics self-hosted server environment configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // App
  const appRows = [
    cfg.BASE_URL ? row('BASE_URL', chip(cfg.BASE_URL, 'blue')) : '',
    cfg.PORT ? row('PORT', chip(cfg.PORT, 'blue')) : '',
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="plsbl-sec"><h3>App</h3><div class="plsbl-card">${appRows}</div></div>`;

  // Security
  const secRows = [
    cfg.SECRET_KEY_BASE != null ? row('SECRET_KEY_BASE', masked()) : '',
    cfg.TOTP_VAULT_KEY != null ? row('TOTP_VAULT_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="plsbl-sec"><h3>Security</h3><div class="plsbl-card">${secRows}</div></div>`;

  // Database
  const dbRows = [
    cfg.DATABASE_URL ? row('DATABASE_URL', chip(maskDsn(cfg.DATABASE_URL))) : '',
    cfg.CLICKHOUSE_DATABASE_URL ? row('CLICKHOUSE_DATABASE_URL', chip(maskDsn(cfg.CLICKHOUSE_DATABASE_URL))) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="plsbl-sec"><h3>Database</h3><div class="plsbl-card">${dbRows}</div></div>`;

  // Email / SMTP
  const smtpRows = [
    cfg.MAILER_EMAIL ? row('MAILER_EMAIL', chip(cfg.MAILER_EMAIL)) : '',
    cfg.SMTP_HOST_ADDR ? row('SMTP_HOST_ADDR', chip(cfg.SMTP_HOST_ADDR)) : '',
    cfg.SMTP_HOST_PORT ? row('SMTP_HOST_PORT', chip(cfg.SMTP_HOST_PORT, 'blue')) : '',
    cfg.SMTP_USER_NAME ? row('SMTP_USER_NAME', chip(cfg.SMTP_USER_NAME)) : '',
    cfg.SMTP_USER_PWD != null ? row('SMTP_USER_PWD', masked()) : '',
    cfg.SMTP_RETRIES ? row('SMTP_RETRIES', chip(cfg.SMTP_RETRIES)) : '',
  ].filter(Boolean).join('');
  if (smtpRows) body += `<div class="plsbl-sec"><h3>Email</h3><div class="plsbl-card">${smtpRows}</div></div>`;

  // Registration
  const regRows = [
    cfg.DISABLE_REGISTRATION != null ? row('DISABLE_REGISTRATION', registrationChip(cfg.DISABLE_REGISTRATION)) : '',
    cfg.ENABLE_EMAIL_VERIFICATION != null ? row('ENABLE_EMAIL_VERIFICATION', boolChip(cfg.ENABLE_EMAIL_VERIFICATION, 'enabled', 'green', 'disabled', 'gray')) : '',
  ].filter(Boolean).join('');
  if (regRows) body += `<div class="plsbl-sec"><h3>Registration</h3><div class="plsbl-card">${regRows}</div></div>`;

  // Google OAuth
  const oauthRows = [
    cfg.GOOGLE_CLIENT_ID ? row('GOOGLE_CLIENT_ID', chip(cfg.GOOGLE_CLIENT_ID, 'purple')) : '',
    cfg.GOOGLE_CLIENT_SECRET != null ? row('GOOGLE_CLIENT_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (oauthRows) body += `<div class="plsbl-sec"><h3>Google</h3><div class="plsbl-card">${oauthRows}</div></div>`;

  // MaxMind GeoIP
  const maxmindRows = [
    cfg.MAXMIND_LICENSE_KEY != null ? row('MAXMIND_LICENSE_KEY', masked()) : '',
    cfg.MAXMIND_EDITION ? row('MAXMIND_EDITION', chip(cfg.MAXMIND_EDITION)) : '',
  ].filter(Boolean).join('');
  if (maxmindRows) body += `<div class="plsbl-sec"><h3>MaxMind GeoIP</h3><div class="plsbl-card">${maxmindRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Plausible Analytics configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
