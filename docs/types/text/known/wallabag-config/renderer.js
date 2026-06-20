const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wallabag-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wallabag-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c3222c;color:#fff;vertical-align:middle;margin-right:8px;}
.wallabag-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.wallabag-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.wallabag-sec{margin:12px 0;}
.wallabag-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.wallabag-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.wallabag-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.wallabag-key{color:var(--fg-2,#888);font-size:12px;min-width:280px;flex-shrink:0;}
.wallabag-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.wallabag-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.wallabag-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.wallabag-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.wallabag-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.wallabag-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.wallabag-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function parseKV(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    result[t.slice(0, eq).trim()] = val;
  }
  return result;
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  const s = String(val);
  const display = s.length > 80 ? s.slice(0, 77) + '…' : s;
  return `<span class="wallabag-chip${cls ? ' wallabag-chip-' + cls : ''}">${esc(display)}</span>`;
}

function masked() {
  return '<span class="wallabag-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="wallabag-row"><span class="wallabag-key">${esc(label)}</span><span class="wallabag-val">${html}</span></div>`;
}

function isSensitive(key) {
  const k = key.toUpperCase();
  return k.includes('SECRET') || k.includes('PASSWORD');
}

function dbDriverChip(val) {
  if (!val) return '';
  const v = val.toLowerCase();
  if (v.includes('pgsql') || v.includes('postgres')) return chip(val, 'blue');
  if (v.includes('mysql')) return chip(val, 'green');
  if (v.includes('sqlite')) return chip(val, 'gray');
  return chip(val);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'wallabag-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  const title = kv['WALLABAG_URL'] || 'Wallabag Config';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="wallabag-badge">Wallabag</span>
      <span class="wallabag-title">${esc(title)}</span>
    </div>
    <div class="wallabag-sub">Wallabag self-hosted read-it-later application configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // App section
  const appRows = [
    kv['WALLABAG_URL'] ? row('WALLABAG_URL', chip(kv['WALLABAG_URL'])) : '',
    kv['SYMFONY__ENV__LOCALE'] ? row('SYMFONY__ENV__LOCALE', chip(kv['SYMFONY__ENV__LOCALE'])) : '',
    kv['SYMFONY__ENV__FOSUSER_REGISTRATION'] != null ? row('SYMFONY__ENV__FOSUSER_REGISTRATION', chip(kv['SYMFONY__ENV__FOSUSER_REGISTRATION'])) : '',
    kv['SYMFONY__ENV__FOSUSER_CONFIRMATION'] != null ? row('SYMFONY__ENV__FOSUSER_CONFIRMATION', chip(kv['SYMFONY__ENV__FOSUSER_CONFIRMATION'])) : '',
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="wallabag-sec"><h3>App</h3><div class="wallabag-card">${appRows}</div></div>`;

  // Database section
  const dbRows = [
    kv['SYMFONY__ENV__DATABASE_DRIVER'] ? row('SYMFONY__ENV__DATABASE_DRIVER', dbDriverChip(kv['SYMFONY__ENV__DATABASE_DRIVER'])) : '',
    kv['SYMFONY__ENV__DATABASE_HOST'] ? row('SYMFONY__ENV__DATABASE_HOST', chip(kv['SYMFONY__ENV__DATABASE_HOST'])) : '',
    kv['SYMFONY__ENV__DATABASE_PORT'] ? row('SYMFONY__ENV__DATABASE_PORT', chip(kv['SYMFONY__ENV__DATABASE_PORT'], 'blue')) : '',
    kv['SYMFONY__ENV__DATABASE_NAME'] ? row('SYMFONY__ENV__DATABASE_NAME', chip(kv['SYMFONY__ENV__DATABASE_NAME'])) : '',
    kv['SYMFONY__ENV__DATABASE_USER'] ? row('SYMFONY__ENV__DATABASE_USER', chip(kv['SYMFONY__ENV__DATABASE_USER'])) : '',
    kv['SYMFONY__ENV__DATABASE_PASSWORD'] != null ? row('SYMFONY__ENV__DATABASE_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="wallabag-sec"><h3>Database</h3><div class="wallabag-card">${dbRows}</div></div>`;

  // Security section
  const secRows = [
    kv['SYMFONY__ENV__SECRET'] != null ? row('SYMFONY__ENV__SECRET', masked()) : '',
    kv['SYMFONY__ENV__TWOFACTOR_AUTH'] != null ? row('SYMFONY__ENV__TWOFACTOR_AUTH', chip(kv['SYMFONY__ENV__TWOFACTOR_AUTH'])) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="wallabag-sec"><h3>Security</h3><div class="wallabag-card">${secRows}</div></div>`;

  // Email section
  const emailRows = [
    kv['SYMFONY__ENV__MAILER_TRANSPORT'] ? row('SYMFONY__ENV__MAILER_TRANSPORT', chip(kv['SYMFONY__ENV__MAILER_TRANSPORT'])) : '',
    kv['SYMFONY__ENV__MAILER_HOST'] ? row('SYMFONY__ENV__MAILER_HOST', chip(kv['SYMFONY__ENV__MAILER_HOST'])) : '',
    kv['SYMFONY__ENV__MAILER_USER'] ? row('SYMFONY__ENV__MAILER_USER', chip(kv['SYMFONY__ENV__MAILER_USER'])) : '',
    kv['SYMFONY__ENV__MAILER_PASSWORD'] != null ? row('SYMFONY__ENV__MAILER_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="wallabag-sec"><h3>Email</h3><div class="wallabag-card">${emailRows}</div></div>`;

  // Redis section
  const redisRows = [
    kv['SYMFONY__ENV__REDIS_HOST'] ? row('SYMFONY__ENV__REDIS_HOST', chip(kv['SYMFONY__ENV__REDIS_HOST'])) : '',
    kv['SYMFONY__ENV__REDIS_PASSWORD'] != null ? row('SYMFONY__ENV__REDIS_PASSWORD', kv['SYMFONY__ENV__REDIS_PASSWORD'] === '' ? chip('(none)', 'gray') : masked()) : '',
  ].filter(Boolean).join('');
  if (redisRows) body += `<div class="wallabag-sec"><h3>Redis</h3><div class="wallabag-card">${redisRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Wallabag configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
