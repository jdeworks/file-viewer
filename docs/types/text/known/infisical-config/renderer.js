const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.infsc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.infsc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#fff;vertical-align:middle;margin-right:8px;}
.infsc-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.infsc-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.infsc-sec{margin:12px 0;}
.infsc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.infsc-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.infsc-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.infsc-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.infsc-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.infsc-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.infsc-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.infsc-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.infsc-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.infsc-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
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
  return `<span class="infsc-chip${cls ? ' infsc-chip-' + cls : ''}">${esc(val)}</span>`;
}

function boolChip(v) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(v, 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(v, 'gray');
  return chip(v, 'gray');
}

function masked() {
  return '<span class="infsc-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="infsc-row"><span class="infsc-key">${esc(label)}</span><span class="infsc-val">${html}</span></div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'infsc-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  const title = kv['SITE_URL'] || 'Infisical Secrets Manager';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="infsc-badge">Infisical</span>
      <span class="infsc-title">${esc(title)}</span>
    </div>
    <p class="infsc-sub">Infisical secrets management platform configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    kv['SITE_URL'] ? row('SITE_URL', chip(kv['SITE_URL'])) : '',
    kv['INVITE_ONLY_SIGNUP'] != null ? row('INVITE_ONLY_SIGNUP', boolChip(kv['INVITE_ONLY_SIGNUP'])) : '',
    kv['TELEMETRY_ENABLED'] != null ? row('TELEMETRY_ENABLED', boolChip(kv['TELEMETRY_ENABLED'])) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="infsc-sec"><h3>Server</h3><div class="infsc-card">${serverRows}</div></div>`;

  // Security
  const secKeys = ['ENCRYPTION_KEY', 'AUTH_SECRET', 'JWT_AUTH_SECRET', 'JWT_MFA_SECRET', 'JWT_SERVICE_SECRET'];
  const secRows = secKeys
    .filter((k) => kv[k] != null)
    .map((k) => row(k, masked()))
    .join('');
  if (secRows) body += `<div class="infsc-sec"><h3>Security</h3><div class="infsc-card">${secRows}</div></div>`;

  // Database (MongoDB)
  const dbRows = [
    kv['MONGO_URL'] ? row('MONGO_URL', chip(maskDsn(kv['MONGO_URL']))) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="infsc-sec"><h3>Database</h3><div class="infsc-card">${dbRows}</div></div>`;

  // Redis
  const redisRows = [
    kv['REDIS_URL'] ? row('REDIS_URL', chip(maskDsn(kv['REDIS_URL']))) : '',
  ].filter(Boolean).join('');
  if (redisRows) body += `<div class="infsc-sec"><h3>Redis</h3><div class="infsc-card">${redisRows}</div></div>`;

  // Email (SMTP)
  const emailRows = [
    kv['SMTP_HOST'] ? row('SMTP_HOST', chip(kv['SMTP_HOST'])) : '',
    kv['SMTP_PORT'] ? row('SMTP_PORT', chip(kv['SMTP_PORT'])) : '',
    kv['SMTP_SECURE'] != null ? row('SMTP_SECURE', boolChip(kv['SMTP_SECURE'])) : '',
    kv['SMTP_FROM_ADDRESS'] ? row('SMTP_FROM_ADDRESS', chip(kv['SMTP_FROM_ADDRESS'])) : '',
    kv['SMTP_USERNAME'] ? row('SMTP_USERNAME', chip(kv['SMTP_USERNAME'])) : '',
    kv['SMTP_PASSWORD'] != null ? row('SMTP_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="infsc-sec"><h3>Email</h3><div class="infsc-card">${emailRows}</div></div>`;

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
