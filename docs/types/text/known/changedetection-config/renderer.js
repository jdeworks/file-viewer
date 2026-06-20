const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.chgdet-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.chgdet-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f97316;color:#fff;vertical-align:middle;margin-right:8px;}
.chgdet-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.chgdet-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.chgdet-sec{margin:12px 0;}
.chgdet-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.chgdet-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.chgdet-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.chgdet-key{color:var(--fg-2,#888);font-size:12px;min-width:240px;flex-shrink:0;}
.chgdet-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.chgdet-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.chgdet-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.chgdet-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.chgdet-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.chgdet-chip-orange{background:#fff3e0;border-color:#f97316;color:#7c2d12;}
.chgdet-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.chgdet-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/** Parse KEY=VALUE .env text, skip # comments and blank lines, handle export prefix */
function parseKV(text) {
  const out = {};
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const bare = line.startsWith('export ') ? line.slice(7) : line;
    const eq = bare.indexOf('=');
    if (eq < 1) continue;
    const key = bare.slice(0, eq).trim();
    let val = bare.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

/** Mask user:pass@ credentials in a URL */
function maskUrl(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@\s]*):([^@\s]*)@/, '$1:[configured]@');
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="chgdet-chip${cls ? ' chgdet-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="chgdet-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="chgdet-row"><span class="chgdet-key">${esc(label)}</span><span class="chgdet-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  return chip(v, 'gray');
}

function logLevelChip(v) {
  if (!v) return '';
  const upper = v.trim().toUpperCase();
  const colorMap = { DEBUG: 'blue', INFO: 'green', WARNING: 'orange', ERROR: 'red' };
  return chip(upper, colorMap[upper] || 'gray');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'chgdet-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const kv = parseKV(intake.text || '');

  // Header
  const baseUrl = kv.BASE_URL || '';
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="chgdet-badge">changedetection.io</span>
      <span class="chgdet-title">${esc(baseUrl || 'changedetection.io Config')}</span>
    </div>
    <div class="chgdet-sub">Web page change monitoring configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // App
  const appRows = [
    kv.BASE_URL ? row('BASE_URL', chip(kv.BASE_URL, 'blue')) : '',
    kv.PORT ? row('PORT', chip(kv.PORT, 'blue')) : '',
    kv.WEBDRIVER_URL ? row('WEBDRIVER_URL', chip(kv.WEBDRIVER_URL)) : '',
    kv.PLAYWRIGHT_DRIVER_URL ? row('PLAYWRIGHT_DRIVER_URL', chip(kv.PLAYWRIGHT_DRIVER_URL)) : '',
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="chgdet-sec"><h3>App</h3><div class="chgdet-card">${appRows}</div></div>`;

  // Behavior
  const behaviorRows = [
    kv.HIDE_REFERER != null ? row('HIDE_REFERER', boolChip(kv.HIDE_REFERER, 'hidden', 'green', 'shown', 'gray')) : '',
    kv.FETCH_WORKERS ? row('FETCH_WORKERS', chip(kv.FETCH_WORKERS, 'blue')) : '',
    kv.MINIMUM_SECONDS_RECHECK_TIME ? row('MINIMUM_SECONDS_RECHECK_TIME', chip(kv.MINIMUM_SECONDS_RECHECK_TIME + 's', 'gray')) : '',
    kv.MAX_WATCH_SECONDS_RECHECK_TIME ? row('MAX_WATCH_SECONDS_RECHECK_TIME', chip(kv.MAX_WATCH_SECONDS_RECHECK_TIME + 's', 'gray')) : '',
  ].filter(Boolean).join('');
  if (behaviorRows) body += `<div class="chgdet-sec"><h3>Behavior</h3><div class="chgdet-card">${behaviorRows}</div></div>`;

  // Notifications
  const notifRows = [
    kv.NOTIFICATION_TITLE ? row('NOTIFICATION_TITLE', chip(kv.NOTIFICATION_TITLE)) : '',
  ].filter(Boolean).join('');
  if (notifRows) body += `<div class="chgdet-sec"><h3>Notifications</h3><div class="chgdet-card">${notifRows}</div></div>`;

  // Proxy
  const proxyRows = [
    kv.HTTP_PROXY ? row('HTTP_PROXY', chip(maskUrl(kv.HTTP_PROXY))) : '',
    kv.HTTPS_PROXY ? row('HTTPS_PROXY', chip(maskUrl(kv.HTTPS_PROXY))) : '',
  ].filter(Boolean).join('');
  if (proxyRows) body += `<div class="chgdet-sec"><h3>Proxy</h3><div class="chgdet-card">${proxyRows}</div></div>`;

  // Auth
  const authRows = [
    kv.SALTED_PASS != null && kv.SALTED_PASS !== '' ? row('SALTED_PASS', masked()) : '',
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="chgdet-sec"><h3>Auth</h3><div class="chgdet-card">${authRows}</div></div>`;

  // Logging
  const logRows = [
    kv.LOGGER_LEVEL ? row('LOGGER_LEVEL', logLevelChip(kv.LOGGER_LEVEL)) : '',
  ].filter(Boolean).join('');
  if (logRows) body += `<div class="chgdet-sec"><h3>Logging</h3><div class="chgdet-card">${logRows}</div></div>`;

  // Browser
  const browserRows = [
    kv.SCREENSHOT_WIDTH ? row('SCREENSHOT_WIDTH', chip(kv.SCREENSHOT_WIDTH + 'px', 'gray')) : '',
    kv.SCREENSHOT_QUALITY ? row('SCREENSHOT_QUALITY', chip(kv.SCREENSHOT_QUALITY, 'gray')) : '',
    kv.BROWSER_STEPS_SCREENSHOT_QUALITY ? row('BROWSER_STEPS_SCREENSHOT_QUALITY', chip(kv.BROWSER_STEPS_SCREENSHOT_QUALITY, 'gray')) : '',
  ].filter(Boolean).join('');
  if (browserRows) body += `<div class="chgdet-sec"><h3>Browser</h3><div class="chgdet-card">${browserRows}</div></div>`;

  // Cache
  if (kv.REDIS_URL) {
    const displayUrl = maskUrl(kv.REDIS_URL);
    body += `<div class="chgdet-sec"><h3>Cache</h3><div class="chgdet-card">${row('REDIS_URL', chip(displayUrl))}</div></div>`;
  }

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No changedetection.io configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
