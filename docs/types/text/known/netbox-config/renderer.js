const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nbox-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.nbox-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px;}
.nbox-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.nbox-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.nbox-sec{margin:12px 0;}
.nbox-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.nbox-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.nbox-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.nbox-key{color:var(--fg-2,#888);font-size:12px;min-width:180px;flex-shrink:0;}
.nbox-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.nbox-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.nbox-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.nbox-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.nbox-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.nbox-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.nbox-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/**
 * Extract a top-level Python assignment value for KEY from the text.
 * Handles single-line and multi-line (list/dict) values.
 */
function extractValue(text, key) {
  const re = new RegExp(`^${key}\\s*=\\s*`, 'm');
  const m = text.match(re);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = text.slice(start);
  // Collect lines until we find a balanced structure or a plain value
  const firstChar = rest.trimStart()[0];
  if (firstChar === '{' || firstChar === '[' || firstChar === '(') {
    const open = firstChar;
    const close = firstChar === '{' ? '}' : firstChar === '[' ? ']' : ')';
    let depth = 0;
    let i = 0;
    while (i < rest.length) {
      if (rest[i] === open) depth++;
      else if (rest[i] === close) { depth--; if (depth === 0) return rest.slice(0, i + 1); }
      i++;
    }
    return rest;
  }
  // Plain value: take until newline (ignoring trailing comments)
  const nl = rest.indexOf('\n');
  const line = nl === -1 ? rest : rest.slice(0, nl);
  return line.replace(/#.*$/, '').trim();
}

/** Parse a Python list literal into string items */
function parsePyList(raw) {
  if (!raw) return [];
  // Strip outer brackets
  const inner = raw.trim().replace(/^\[|\]$/g, '').trim();
  if (!inner) return [];
  const items = [];
  let cur = '';
  let depth = 0;
  let inStr = false;
  let strChar = '';
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (!inStr && (c === "'" || c === '"')) { inStr = true; strChar = c; cur += c; continue; }
    if (inStr && c === strChar) { inStr = false; cur += c; continue; }
    if (!inStr && (c === '[' || c === '(' || c === '{')) { depth++; cur += c; continue; }
    if (!inStr && (c === ']' || c === ')' || c === '}')) { depth--; cur += c; continue; }
    if (!inStr && depth === 0 && c === ',') {
      const t = cur.trim().replace(/^['"]|['"]$/g, '');
      if (t) items.push(t);
      cur = '';
      continue;
    }
    cur += c;
  }
  const t = cur.trim().replace(/^['"]|['"]$/g, '');
  if (t) items.push(t);
  return items;
}

/** Parse a Python dict literal into key→value pairs (string values only) */
function parsePyDict(raw) {
  if (!raw) return {};
  const inner = raw.trim().replace(/^\{|\}$/g, '').trim();
  const out = {};
  // Match 'KEY': 'VALUE' or 'KEY': NUMBER
  const re = /['"](\w+)['"]\s*:\s*(?:'([^']*)'|"([^"]*)"|(\d+))/g;
  let mm;
  while ((mm = re.exec(inner)) !== null) {
    out[mm[1]] = mm[2] ?? mm[3] ?? mm[4];
  }
  return out;
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="nbox-chip${cls ? ' nbox-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="nbox-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="nbox-row"><span class="nbox-key">${esc(label)}</span><span class="nbox-val">${html}</span></div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'nbox-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';

  // Parse key values
  const allowedHostsRaw = extractValue(text, 'ALLOWED_HOSTS');
  const allowedHosts = parsePyList(allowedHostsRaw);

  const dbRaw = extractValue(text, 'DATABASE');
  const db = parsePyDict(dbRaw);

  const redisRaw = extractValue(text, 'REDIS');
  const redis = parsePyDict(redisRaw);
  // Redis might be nested; try to get the 'default' task or 'caching'
  const redisInner = (() => {
    if (!redisRaw) return {};
    // Try to extract the first nested dict
    const nested = redisRaw.match(/\{[^{}]*\}/);
    return nested ? parsePyDict(nested[0]) : parsePyDict(redisRaw);
  })();

  const secretKey = extractValue(text, 'SECRET_KEY');
  const debug = extractValue(text, 'DEBUG');
  const timeZone = extractValue(text, 'TIME_ZONE');
  const langCode = extractValue(text, 'LANGUAGE_CODE');
  const dateFormat = extractValue(text, 'DATE_FORMAT');

  const pluginsRaw = extractValue(text, 'PLUGINS');
  const plugins = parsePyList(pluginsRaw);

  const mediaRoot = extractValue(text, 'MEDIA_ROOT');
  const reportsRoot = extractValue(text, 'REPORTS_ROOT');

  // Clean string values (strip surrounding quotes)
  function clean(v) { return v ? v.replace(/^['"]|['"]$/g, '') : ''; }

  // Header
  const debugOn = debug && clean(debug).toLowerCase() === 'true';
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="nbox-badge">NetBox</span>
      <span class="nbox-title">NetBox Configuration</span>${debugOn ? ' <span class="nbox-chip nbox-chip-red">DEBUG ON</span>' : ''}
    </div>
    <div class="nbox-sub">NetBox DCIM/IPAM network documentation tool</div>
  `;
  host.appendChild(header);

  let body = '';

  // Allowed Hosts
  if (allowedHosts.length) {
    const hostsHtml = allowedHosts.map((h) => chip(h, 'blue')).join(' ');
    body += `<div class="nbox-sec"><h3>Allowed Hosts</h3><div class="nbox-card">${row('ALLOWED_HOSTS', hostsHtml)}</div></div>`;
  }

  // Database
  const dbRows = [
    db.HOST ? row('host', chip(db.HOST)) : '',
    db.PORT ? row('port', chip(db.PORT, 'blue')) : '',
    db.NAME ? row('name', chip(db.NAME)) : '',
    db.USER ? row('user', chip(db.USER)) : '',
    db.PASSWORD != null ? row('password', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="nbox-sec"><h3>Database</h3><div class="nbox-card">${dbRows}</div></div>`;

  // Redis
  const redisHost = redisInner.HOST || redis.HOST;
  const redisPort = redisInner.PORT || redis.PORT;
  const redisRows = [
    redisHost ? row('host', chip(redisHost)) : '',
    redisPort ? row('port', chip(redisPort, 'blue')) : '',
    text.includes('PASSWORD') && redisRaw && redisRaw.includes('PASSWORD') ? row('password', masked()) : '',
  ].filter(Boolean).join('');
  if (redisRows) body += `<div class="nbox-sec"><h3>Redis</h3><div class="nbox-card">${redisRows}</div></div>`;

  // Security
  const secRows = [
    secretKey ? row('SECRET_KEY', masked()) : '',
    debug != null ? row('DEBUG', debugOn ? chip('True', 'red') : chip('False', 'green')) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="nbox-sec"><h3>Security</h3><div class="nbox-card">${secRows}</div></div>`;

  // Localization
  const locRows = [
    timeZone ? row('TIME_ZONE', chip(clean(timeZone), 'blue')) : '',
    langCode ? row('LANGUAGE_CODE', chip(clean(langCode))) : '',
    dateFormat ? row('DATE_FORMAT', chip(clean(dateFormat))) : '',
  ].filter(Boolean).join('');
  if (locRows) body += `<div class="nbox-sec"><h3>Localization</h3><div class="nbox-card">${locRows}</div></div>`;

  // Plugins
  if (plugins.length) {
    const plugHtml = plugins.map((p) => chip(p, 'gray')).join(' ');
    body += `<div class="nbox-sec"><h3>Plugins</h3><div class="nbox-card">${row('PLUGINS', plugHtml)}</div></div>`;
  }

  // Paths
  const pathRows = [
    mediaRoot ? row('MEDIA_ROOT', chip(clean(mediaRoot))) : '',
    reportsRoot ? row('REPORTS_ROOT', chip(clean(reportsRoot))) : '',
  ].filter(Boolean).join('');
  if (pathRows) body += `<div class="nbox-sec"><h3>Paths</h3><div class="nbox-card">${pathRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No NetBox configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
