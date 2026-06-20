const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.speedtest-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.speedtest-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#10b981;color:#fff;vertical-align:middle;margin-right:8px;}
.speedtest-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.speedtest-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.speedtest-sec{margin:12px 0;}
.speedtest-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.speedtest-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.speedtest-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.speedtest-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.speedtest-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.speedtest-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.speedtest-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.speedtest-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.speedtest-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.speedtest-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
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

function isSensitive(key) {
  return /secret|password|token|key|api|private/i.test(key);
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="speedtest-chip${cls ? ' speedtest-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="speedtest-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="speedtest-row"><span class="speedtest-key">${esc(label)}</span><span class="speedtest-val">${html}</span></div>`;
}

function serverIdChips(ids) {
  if (!ids) return '';
  return ids.split(',').map((s) => s.trim()).filter(Boolean).map((id) => chip(id, 'blue')).join('');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'speedtest-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  const title = kv.APP_NAME || kv.APP_URL || 'Speedtest Tracker Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="speedtest-badge">Speedtest Tracker</span>
      <span class="speedtest-title">${esc(title)}</span>
    </div>
    <div class="speedtest-sub">Speedtest Tracker automated internet speed monitoring</div>
  `;
  host.appendChild(header);

  let body = '';

  // App
  const appRows = [
    kv.APP_NAME ? row('APP_NAME', chip(kv.APP_NAME)) : '',
    kv.APP_URL ? row('APP_URL', chip(kv.APP_URL, 'blue')) : '',
    'APP_KEY' in kv ? row('APP_KEY', masked()) : '',
    kv.APP_TIMEZONE ? row('APP_TIMEZONE', chip(kv.APP_TIMEZONE, 'gray')) : '',
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="speedtest-sec"><h3>App</h3><div class="speedtest-card">${appRows}</div></div>`;

  // Speedtest
  const stRows = [
    kv.SPEEDTEST_SCHEDULE ? row('SPEEDTEST_SCHEDULE', chip(kv.SPEEDTEST_SCHEDULE, 'blue')) : '',
    kv.SPEEDTEST_SERVER_IDS ? row('SPEEDTEST_SERVER_IDS', serverIdChips(kv.SPEEDTEST_SERVER_IDS) || chip(kv.SPEEDTEST_SERVER_IDS)) : '',
    kv.SPEEDTEST_SERVERS ? row('SPEEDTEST_SERVERS', chip(kv.SPEEDTEST_SERVERS)) : '',
  ].filter(Boolean).join('');
  if (stRows) body += `<div class="speedtest-sec"><h3>Speedtest</h3><div class="speedtest-card">${stRows}</div></div>`;

  // Database
  const dbRows = [
    kv.DB_CONNECTION ? row('DB_CONNECTION', chip(kv.DB_CONNECTION, 'blue')) : '',
    kv.DB_HOST ? row('DB_HOST', chip(kv.DB_HOST)) : '',
    kv.DB_PORT ? row('DB_PORT', chip(kv.DB_PORT)) : '',
    kv.DB_DATABASE ? row('DB_DATABASE', chip(kv.DB_DATABASE)) : '',
    kv.DB_USERNAME ? row('DB_USERNAME', chip(kv.DB_USERNAME)) : '',
    'DB_PASSWORD' in kv ? row('DB_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="speedtest-sec"><h3>Database</h3><div class="speedtest-card">${dbRows}</div></div>`;

  // Auth
  const authRows = [
    kv.AUTH_USERNAME ? row('AUTH_USERNAME', chip(kv.AUTH_USERNAME)) : '',
    'AUTH_PASSWORD' in kv ? row('AUTH_PASSWORD', masked()) : '',
    kv.DISPLAY_TIMEZONE ? row('DISPLAY_TIMEZONE', chip(kv.DISPLAY_TIMEZONE, 'gray')) : '',
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="speedtest-sec"><h3>Auth</h3><div class="speedtest-card">${authRows}</div></div>`;

  // Notifications
  const notifRows = [
    kv.MAIL_MAILER ? row('MAIL_MAILER', chip(kv.MAIL_MAILER)) : '',
    kv.MAIL_HOST ? row('MAIL_HOST', chip(kv.MAIL_HOST)) : '',
    kv.MAIL_PORT ? row('MAIL_PORT', chip(kv.MAIL_PORT, 'blue')) : '',
    kv.MAIL_USERNAME ? row('MAIL_USERNAME', chip(kv.MAIL_USERNAME)) : '',
    kv.MAIL_PASSWORD ? row('MAIL_PASSWORD', masked()) : '',
    'TELEGRAM_BOT_TOKEN' in kv ? row('TELEGRAM_BOT_TOKEN', masked()) : '',
    kv.TELEGRAM_CHAT_ID ? row('TELEGRAM_CHAT_ID', chip(kv.TELEGRAM_CHAT_ID)) : '',
  ].filter(Boolean).join('');
  if (notifRows) body += `<div class="speedtest-sec"><h3>Notifications</h3><div class="speedtest-card">${notifRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Speedtest Tracker configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
