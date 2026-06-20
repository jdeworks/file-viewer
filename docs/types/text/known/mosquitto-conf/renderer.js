const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mosquitto-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-mosquitto{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c92929;color:#fff;vertical-align:middle;margin-right:8px}
.mosquitto-title{font-size:18px;font-weight:700;margin:0 0 4px}
.mosquitto-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.mosquitto-sec{margin:14px 0}
.mosquitto-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.mosquitto-kv{display:flex;gap:8px;align-items:baseline;margin:4px 0}
.mosquitto-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:160px;flex-shrink:0}
.mosquitto-kv-v{font-size:13px;font-family:ui-monospace,monospace;word-break:break-all}
.mosquitto-chip{display:inline-flex;align-items:center;font-size:12px;padding:2px 9px;border-radius:10px;font-family:ui-monospace,monospace;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa)}
.mosquitto-chip-on{background:#dcfce7;border-color:#86efac;color:#166534}
.mosquitto-chip-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b}
.mosquitto-chip-warn{background:#fef3c7;border-color:#fcd34d;color:#92400e;font-weight:700}
.mosquitto-chip-blue{background:#dbeafe;border-color:#93c5fd;color:#1e40af}
.mosquitto-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#666)}
.mosquitto-table{width:100%;border-collapse:collapse;font-size:13px}
.mosquitto-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.mosquitto-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px}
.mosquitto-warn-row{background:#fef3c7}
`;

/**
 * Parse mosquitto.conf — space-delimited key value, ignoring # comments.
 * Returns a map of key -> array of values (multi-valued keys like listener).
 */
function parseKV(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) {
      // bare key (e.g. boolean true implied)
      const key = trimmed;
      if (!result[key]) result[key] = [];
      result[key].push('');
      continue;
    }
    const key = trimmed.slice(0, spaceIdx);
    const val = trimmed.slice(spaceIdx + 1).trim();
    if (!result[key]) result[key] = [];
    result[key].push(val);
  }
  return result;
}

/**
 * Parse listeners from the text. mosquitto.conf uses blocks:
 *   listener <port> [interface]
 *   protocol <mqtt|websockets>
 * We parse them as sequential blocks.
 */
function parseListeners(text) {
  const listeners = [];
  let current = null;
  for (const rawLine of (text || '').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const spIdx = line.indexOf(' ');
    const key = spIdx === -1 ? line : line.slice(0, spIdx);
    const val = spIdx === -1 ? '' : line.slice(spIdx + 1).trim();
    if (key === 'listener') {
      if (current) listeners.push(current);
      const parts = val.split(/\s+/);
      current = { port: parts[0] || '', iface: parts[1] || '', protocol: 'mqtt', tls: false };
    } else if (current) {
      if (key === 'protocol') current.protocol = val;
      if (key === 'cafile' || key === 'capath' || key === 'certfile' || key === 'keyfile') current.tls = true;
    }
  }
  if (current) listeners.push(current);
  return listeners;
}

export function render(intake) {
  const text = intake.text || '';
  const kv = parseKV(text);
  const listeners = parseListeners(text);

  function first(key) { return kv[key] ? kv[key][0] : null; }
  function all(key) { return kv[key] || []; }

  const allowAnon = first('allow_anonymous');
  const passwordFile = first('password_file');
  const aclFile = first('acl_file');
  const persistence = first('persistence');
  const persistenceLocation = first('persistence_location');
  const maxConnections = first('max_connections');
  const retainAvailable = first('retain_available');
  const logDests = all('log_dest');
  const logTypes = all('log_type');
  const cafile = first('cafile') || first('capath');
  const certfile = first('certfile');
  const keyfile = first('keyfile');
  const tlsVersion = first('tls_version');
  const requireCert = first('require_certificate');

  function kvRow(label, valueHtml) {
    if (!valueHtml) return '';
    return `<div class="mosquitto-kv"><span class="mosquitto-kv-k">${esc(label)}</span><span class="mosquitto-kv-v">${valueHtml}</span></div>`;
  }
  function chip(text, cls) { return `<span class="mosquitto-chip ${cls}">${esc(text)}</span>`; }
  function pathChip(val) {
    if (!val) return '';
    return `<span class="mosquitto-chip mosquitto-chip-gray">${esc(val)}</span>`;
  }

  // Listeners table
  let listenersHtml = '';
  if (listeners.length) {
    const rows = listeners.map((l) => {
      const tlsBadge = l.tls ? `<span class="mosquitto-chip mosquitto-chip-on" style="font-size:10px;padding:1px 6px">TLS</span>` : '';
      const protoBadge = l.protocol === 'websockets'
        ? chip('websockets', 'mosquitto-chip-blue')
        : chip('mqtt', 'mosquitto-chip-gray');
      return `<tr><td>${esc(l.port)}</td><td>${protoBadge}</td><td>${esc(l.iface || '0.0.0.0')}</td><td>${tlsBadge}</td></tr>`;
    }).join('');
    listenersHtml = `<div class="mosquitto-sec"><h3>Listeners</h3>
<table class="mosquitto-table">
<thead><tr><th>Port</th><th>Protocol</th><th>Interface</th><th>TLS</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>`;
  }

  // Security section
  const anonDisplay = allowAnon != null
    ? (allowAnon === 'true' ? chip('OPEN — allow_anonymous true', 'mosquitto-chip-warn') : chip('false', 'mosquitto-chip-on'))
    : null;
  const secRows = [
    allowAnon != null ? kvRow('allow_anonymous', anonDisplay) : '',
    passwordFile != null ? kvRow('password_file', pathChip(passwordFile)) : '',
    aclFile != null ? kvRow('acl_file', pathChip(aclFile)) : '',
  ].filter(Boolean).join('');
  const secHtml = secRows
    ? `<div class="mosquitto-sec"><h3>Security</h3>${secRows}</div>`
    : '';

  // TLS section
  const tlsRows = [
    cafile != null ? kvRow('cafile / capath', pathChip(cafile)) : '',
    certfile != null ? kvRow('certfile', pathChip(certfile)) : '',
    keyfile != null ? kvRow('keyfile', pathChip(keyfile)) : '',
    tlsVersion != null ? kvRow('tls_version', chip(tlsVersion, 'mosquitto-chip-blue')) : '',
    requireCert != null ? kvRow('require_certificate', requireCert === 'true' ? chip('true', 'mosquitto-chip-on') : chip('false', 'mosquitto-chip-off')) : '',
  ].filter(Boolean).join('');
  const tlsHtml = tlsRows
    ? `<div class="mosquitto-sec"><h3>TLS</h3>${tlsRows}</div>`
    : '';

  // Persistence section
  const persistRows = [
    persistence != null ? kvRow('persistence', persistence === 'true' ? chip('true', 'mosquitto-chip-on') : chip('false', 'mosquitto-chip-off')) : '',
    persistenceLocation != null ? kvRow('persistence_location', pathChip(persistenceLocation)) : '',
  ].filter(Boolean).join('');
  const persistHtml = persistRows
    ? `<div class="mosquitto-sec"><h3>Persistence</h3>${persistRows}</div>`
    : '';

  // Logging section
  const logRows = [
    logDests.length ? kvRow('log_dest', logDests.map((d) => chip(d, 'mosquitto-chip-gray')).join(' ')) : '',
    logTypes.length ? kvRow('log_type', logTypes.map((t) => chip(t, 'mosquitto-chip-gray')).join(' ')) : '',
  ].filter(Boolean).join('');
  const logHtml = logRows
    ? `<div class="mosquitto-sec"><h3>Logging</h3>${logRows}</div>`
    : '';

  // Misc section
  const miscRows = [
    maxConnections != null ? kvRow('max_connections', `<span class="mosquitto-kv-v">${esc(maxConnections)}</span>`) : '',
    retainAvailable != null ? kvRow('retain_available', retainAvailable === 'true' ? chip('true', 'mosquitto-chip-on') : chip('false', 'mosquitto-chip-off')) : '',
  ].filter(Boolean).join('');
  const miscHtml = miscRows
    ? `<div class="mosquitto-sec"><h3>Broker</h3>${miscRows}</div>`
    : '';

  const portSummary = listeners.map((l) => `${l.protocol}:${l.port}`).join(', ');
  const sub = portSummary ? `Listeners: ${portSummary}` : 'Eclipse Mosquitto MQTT broker configuration';

  const host = document.createElement('div');
  host.className = 'mosquitto-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mosquitto-title"><span class="badge-mosquitto">Mosquitto</span>mosquitto.conf</div>
<div class="mosquitto-sub">${esc(sub)}</div>
${listenersHtml}${secHtml}${tlsHtml}${persistHtml}${logHtml}${miscHtml}`;

  return { parentNode: host };
}
