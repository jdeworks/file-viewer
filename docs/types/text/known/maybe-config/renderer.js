const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.maybe-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.maybe-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0f172a;color:#e2e8f0;vertical-align:middle;margin-right:8px;}
.maybe-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.maybe-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.maybe-sec{margin:12px 0;}
.maybe-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.maybe-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.maybe-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.maybe-key{color:var(--fg-2,#888);font-size:12px;min-width:310px;flex-shrink:0;}
.maybe-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.maybe-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.maybe-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.maybe-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.maybe-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.maybe-chip-orange{background:#fff3e0;border-color:#ff9800;color:#e65100;}
.maybe-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.maybe-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

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
    result[t2.slice(0, eq).trim()] = val;
  }
  return result;
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="maybe-chip${cls ? ' maybe-chip-' + cls : ''}">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function masked() {
  return '<span class="maybe-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="maybe-row"><span class="maybe-key">${esc(label)}</span><span class="maybe-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  if (v != null && v !== '') return chip(v, 'gray');
  return '';
}

export function render(intake) {
  const kv = parseKV(intake.text || '');

  const host = document.createElement('div');
  host.className = 'maybe-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = kv['DOMAIN_URL'] || 'Maybe Finance Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="maybe-badge">Maybe</span>
      <span class="maybe-title">${esc(title)}</span>
    </div>
    <p class="maybe-sub">Maybe Finance self-hosted personal finance application configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // App
  const appRows = [
    kv['DOMAIN_URL'] ? row('DOMAIN_URL', chip(kv['DOMAIN_URL'], 'blue')) : '',
    kv['RAILS_ENV'] ? row('RAILS_ENV', chip(kv['RAILS_ENV'], kv['RAILS_ENV'] === 'production' ? 'orange' : 'green')) : '',
    kv['PORT'] ? row('PORT', chip(kv['PORT'], 'blue')) : '',
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="maybe-sec"><h3>App</h3><div class="maybe-card">${appRows}</div></div>`;

  // Security
  const secRows = [
    kv['SECRET_KEY_BASE'] != null ? row('SECRET_KEY_BASE', masked()) : '',
    kv['ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY'] != null ? row('ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY', masked()) : '',
    kv['ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT'] != null ? row('ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT', masked()) : '',
    kv['ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY'] != null ? row('ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="maybe-sec"><h3>Security</h3><div class="maybe-card">${secRows}</div></div>`;

  // Database
  const dbRows = [
    kv['DB_HOST'] ? row('DB_HOST', chip(kv['DB_HOST'])) : '',
    kv['DB_PORT'] ? row('DB_PORT', chip(kv['DB_PORT'], 'blue')) : '',
    kv['DB_NAME'] ? row('DB_NAME', chip(kv['DB_NAME'])) : '',
    kv['DB_USER'] ? row('DB_USER', chip(kv['DB_USER'])) : '',
    kv['DB_PASS'] != null ? row('DB_PASS', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="maybe-sec"><h3>Database</h3><div class="maybe-card">${dbRows}</div></div>`;

  // Email
  const emailRows = [
    kv['SMTP_ADDRESS'] ? row('SMTP_ADDRESS', chip(kv['SMTP_ADDRESS'])) : '',
    kv['SMTP_PORT'] ? row('SMTP_PORT', chip(kv['SMTP_PORT'], 'blue')) : '',
    kv['SMTP_USERNAME'] ? row('SMTP_USERNAME', chip(kv['SMTP_USERNAME'])) : '',
    kv['SMTP_PASSWORD'] != null ? row('SMTP_PASSWORD', masked()) : '',
    kv['SMTP_FROM_ADDRESS'] ? row('SMTP_FROM_ADDRESS', chip(kv['SMTP_FROM_ADDRESS'])) : '',
    kv['REQUIRE_EMAIL_CONFIRMATION'] != null ? row('REQUIRE_EMAIL_CONFIRMATION', boolChip(kv['REQUIRE_EMAIL_CONFIRMATION'], 'required', 'orange', 'disabled', 'gray')) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="maybe-sec"><h3>Email</h3><div class="maybe-card">${emailRows}</div></div>`;

  // Features
  const featRows = [
    kv['SELF_HOSTED_TEAM'] != null ? row('SELF_HOSTED_TEAM', boolChip(kv['SELF_HOSTED_TEAM'], 'enabled', 'green', 'disabled', 'gray')) : '',
    kv['SIGNUPS_DISABLED'] != null ? row('SIGNUPS_DISABLED', boolChip(kv['SIGNUPS_DISABLED'], 'signups disabled', 'red', 'signups open', 'green')) : '',
  ].filter(Boolean).join('');
  if (featRows) body += `<div class="maybe-sec"><h3>Features</h3><div class="maybe-card">${featRows}</div></div>`;

  // Synth
  const synthRows = [
    kv['SYNTH_ID'] ? row('SYNTH_ID', chip(kv['SYNTH_ID'])) : '',
    kv['SYNTH_SECRET'] != null ? row('SYNTH_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (synthRows) body += `<div class="maybe-sec"><h3>Synth</h3><div class="maybe-card">${synthRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Maybe Finance configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
