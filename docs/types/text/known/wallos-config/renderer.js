const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wallos-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wallos-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2563eb;color:#fff;vertical-align:middle;margin-right:8px;}
.wallos-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wallos-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.wallos-sec{margin:12px 0;}
.wallos-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.wallos-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.wallos-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.wallos-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.wallos-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.wallos-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.wallos-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
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

function chip(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="wallos-chip">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function masked() {
  return '<span class="wallos-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="wallos-row"><span class="wallos-key">${esc(label)}</span><span class="wallos-val">${html}</span></div>`;
}

export function render(intake) {
  const kv = parseKV(intake.text || '');

  const host = document.createElement('div');
  host.className = 'wallos-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = kv['APP_URL'] || kv['APP_NAME'] || 'Wallos Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="wallos-badge">Wallos</span>
      <span class="wallos-title">${esc(title)}</span>
    </div>
    <p class="wallos-sub">Wallos subscription tracker configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // App section
  const appRows = [
    kv['APP_NAME'] ? row('APP_NAME', chip(kv['APP_NAME'])) : '',
    kv['APP_URL'] ? row('APP_URL', chip(kv['APP_URL'])) : '',
    kv['APP_ENV'] ? row('APP_ENV', chip(kv['APP_ENV'])) : '',
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="wallos-sec"><h3>App</h3><div class="wallos-card">${appRows}</div></div>`;

  // System section
  const sysRows = [
    kv['PUID'] ? row('PUID', chip(kv['PUID'])) : '',
    kv['PGID'] ? row('PGID', chip(kv['PGID'])) : '',
    kv['TZ'] ? row('TZ', chip(kv['TZ'])) : '',
  ].filter(Boolean).join('');
  if (sysRows) body += `<div class="wallos-sec"><h3>System</h3><div class="wallos-card">${sysRows}</div></div>`;

  // Database section
  const dbRows = [
    kv['DB_CONNECTION'] ? row('DB_CONNECTION', chip(kv['DB_CONNECTION'])) : '',
    kv['DB_HOST'] ? row('DB_HOST', chip(kv['DB_HOST'])) : '',
    kv['DB_PORT'] ? row('DB_PORT', chip(kv['DB_PORT'])) : '',
    kv['DB_DATABASE'] ? row('DB_DATABASE', chip(kv['DB_DATABASE'])) : '',
    kv['DB_USERNAME'] ? row('DB_USERNAME', chip(kv['DB_USERNAME'])) : '',
    kv['DB_PASSWORD'] != null ? row('DB_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="wallos-sec"><h3>Database</h3><div class="wallos-card">${dbRows}</div></div>`;

  // Currency section
  const currencyRows = [
    kv['CURRENCY'] ? row('CURRENCY', chip(kv['CURRENCY'])) : '',
    kv['CURRENCY_SYMBOL'] ? row('CURRENCY_SYMBOL', chip(kv['CURRENCY_SYMBOL'])) : '',
  ].filter(Boolean).join('');
  if (currencyRows) body += `<div class="wallos-sec"><h3>Currency</h3><div class="wallos-card">${currencyRows}</div></div>`;

  // Features section
  const featRows = [
    kv['SUBSCRIPTION_RENEW_DATE'] != null ? row('SUBSCRIPTION_RENEW_DATE', chip(kv['SUBSCRIPTION_RENEW_DATE'])) : '',
    kv['TRIAL_NOTIF_DAYS'] != null ? row('TRIAL_NOTIF_DAYS', chip(kv['TRIAL_NOTIF_DAYS'])) : '',
  ].filter(Boolean).join('');
  if (featRows) body += `<div class="wallos-sec"><h3>Features</h3><div class="wallos-card">${featRows}</div></div>`;

  // Mail section
  const mailRows = [
    kv['MAIL_MAILER'] ? row('MAIL_MAILER', chip(kv['MAIL_MAILER'])) : '',
    kv['MAIL_HOST'] ? row('MAIL_HOST', chip(kv['MAIL_HOST'])) : '',
    kv['MAIL_PORT'] ? row('MAIL_PORT', chip(kv['MAIL_PORT'])) : '',
    kv['MAIL_USERNAME'] ? row('MAIL_USERNAME', chip(kv['MAIL_USERNAME'])) : '',
    kv['MAIL_PASSWORD'] != null ? row('MAIL_PASSWORD', masked()) : '',
    kv['MAIL_FROM_ADDRESS'] ? row('MAIL_FROM_ADDRESS', chip(kv['MAIL_FROM_ADDRESS'])) : '',
    kv['MAIL_FROM_NAME'] ? row('MAIL_FROM_NAME', chip(kv['MAIL_FROM_NAME'])) : '',
  ].filter(Boolean).join('');
  if (mailRows) body += `<div class="wallos-sec"><h3>Mail</h3><div class="wallos-card">${mailRows}</div></div>`;

  // Timezone/Locale section
  const localeRows = [
    kv['LOCALE'] ? row('LOCALE', chip(kv['LOCALE'])) : '',
    kv['DATE_FORMAT'] ? row('DATE_FORMAT', chip(kv['DATE_FORMAT'])) : '',
  ].filter(Boolean).join('');
  if (localeRows) body += `<div class="wallos-sec"><h3>Timezone / Locale</h3><div class="wallos-card">${localeRows}</div></div>`;

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
