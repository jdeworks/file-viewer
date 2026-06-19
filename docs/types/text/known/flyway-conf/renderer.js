const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fly-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-fly{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc0000;color:#fff;vertical-align:middle;margin-right:8px}
.fly-title{font-size:18px;font-weight:700;margin:0 0 4px}
.fly-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.fly-sec{margin:12px 0}
.fly-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.fly-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.fly-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.fly-row:last-child{border-bottom:none}
.fly-key{color:var(--fg-2,#888);min-width:120px;flex-shrink:0;font-size:12px}
.fly-val{font-family:ui-monospace,monospace;word-break:break-all}
.fly-val.masked{color:var(--fg-2,#aaa)}
.fly-locs{list-style:none;margin:0;padding:0}
.fly-loc{padding:3px 0;font:12px/1.4 ui-monospace,monospace;border-bottom:1px solid var(--border,#f0f0f0)}
.fly-loc:last-child{border-bottom:none}
.fly-warn{background:#ffebee;border:1px solid #ef9a9a;border-radius:6px;padding:8px 12px;font-size:12px;color:#b71c1c;margin-top:10px}
.fly-info{background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:8px 12px;font-size:12px;color:#5d4037;margin-top:8px}
`;

function parseProps(text) {
  const props = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith(';')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (!props.has(key)) props.set(key, val);
  }
  return props;
}

function maskUrl(url) {
  if (!url) return url;
  // Mask password in jdbc:xxx://user:password@host/db or postgresql://user:pass@host
  return url.replace(/:\/\/([^:@/?]+):([^@/?]+)@/, '://$1:***@');
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = intake.name || 'flyway.conf';

  const props = parseProps(text);

  // Normalize key prefix: flyway.url or url
  function get(shortKey) {
    return props.get(`flyway.${shortKey}`) ?? props.get(shortKey) ?? null;
  }

  const rawUrl = get('url');
  const maskedUrl = maskUrl(rawUrl);
  const urlHasPassword = rawUrl && /:\/\/[^:@/?]+:[^@/?]+@/.test(rawUrl);

  const user = get('user');
  const schemas = get('schemas');
  const rawLocations = get('locations');
  const locations = rawLocations
    ? rawLocations.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const baselineVersion = get('baselineVersion');
  const baselineOnMigrate = get('baselineOnMigrate');
  const cleanDisabled = get('cleanDisabled');
  const cleanDisabledBool = cleanDisabled === null
    ? null
    : cleanDisabled.toLowerCase() !== 'false';

  const table = get('table');
  const encoding = get('encoding');
  const outOfOrder = get('outOfOrder');
  const validateOnMigrate = get('validateOnMigrate');

  const mainRows = [
    rawUrl ? `<div class="fly-row"><span class="fly-key">url</span><span class="fly-val ${urlHasPassword ? 'masked' : ''}">${esc(maskedUrl)}</span></div>` : '',
    user ? `<div class="fly-row"><span class="fly-key">user</span><span class="fly-val">${esc(user)}</span></div>` : '',
    schemas ? `<div class="fly-row"><span class="fly-key">schemas</span><span class="fly-val">${esc(schemas)}</span></div>` : '',
    table ? `<div class="fly-row"><span class="fly-key">table</span><span class="fly-val">${esc(table)}</span></div>` : '',
    encoding ? `<div class="fly-row"><span class="fly-key">encoding</span><span class="fly-val">${esc(encoding)}</span></div>` : '',
    baselineVersion ? `<div class="fly-row"><span class="fly-key">baselineVersion</span><span class="fly-val">${esc(baselineVersion)}</span></div>` : '',
    baselineOnMigrate ? `<div class="fly-row"><span class="fly-key">baselineOnMigrate</span><span class="fly-val">${esc(baselineOnMigrate)}</span></div>` : '',
    outOfOrder ? `<div class="fly-row"><span class="fly-key">outOfOrder</span><span class="fly-val">${esc(outOfOrder)}</span></div>` : '',
    validateOnMigrate ? `<div class="fly-row"><span class="fly-key">validateOnMigrate</span><span class="fly-val">${esc(validateOnMigrate)}</span></div>` : '',
  ].filter(Boolean).join('');

  const locsHtml = locations.length
    ? `<div class="fly-sec"><h3>Migration locations (${locations.length})</h3><div class="fly-card"><ul class="fly-locs">${locations.map((l) => `<li class="fly-loc">${esc(l)}</li>`).join('')}</ul></div></div>`
    : '';

  const cleanWarn = cleanDisabledBool === false
    ? '<div class="fly-warn">cleanDisabled=false — <strong>flyway clean</strong> is enabled and will erase the database. Dangerous in production!</div>'
    : '';

  const passwordNote = urlHasPassword
    ? '<div class="fly-info">JDBC URL contains credentials — password masked for display.</div>'
    : '';

  const host = document.createElement('div');
  host.className = 'fly-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="fly-title"><span class="badge-fly">Flyway</span>${esc(name)}</div>
<div class="fly-sub">Database migration configuration</div>
${mainRows ? `<div class="fly-sec"><h3>Settings</h3><div class="fly-card">${mainRows}</div></div>` : ''}
${locsHtml}
${cleanWarn}${passwordNote}`;
  return { parentNode: host };
}
