const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.newsboat-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.newsboat-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#004d40;color:#fff;vertical-align:middle;margin-right:8px;}
.newsboat-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.newsboat-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.newsboat-sec{margin:12px 0;}
.newsboat-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.newsboat-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.newsboat-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.newsboat-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.newsboat-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.newsboat-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.newsboat-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.newsboat-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.newsboat-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
`;

/** Parse newsboat config: key value pairs (no = sign) */
function parseNewsboatConf(text) {
  const settings = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // key value (value may be quoted or unquoted)
    const m = line.match(/^([\w-]+)\s+"([^"]*)"/) || line.match(/^([\w-]+)\s+(\S+)/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim();
    if (!(key in settings)) settings[key] = val;
  }
  return settings;
}

/** Count lines starting with a keyword */
function countLines(text, keyword) {
  return text.split('\n').filter((l) => l.trim().startsWith(keyword)).length;
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="newsboat-chip${cls ? ' newsboat-chip-' + cls : ''}">${esc(val)}</span>`;
}

function row(label, html) {
  if (!html) return '';
  return `<div class="newsboat-row"><span class="newsboat-key">${esc(label)}</span><span class="newsboat-val">${html}</span></div>`;
}

function yesNoChip(val) {
  if (!val) return '';
  return chip(val, val === 'yes' ? 'green' : 'gray');
}

/** Mask credentials in proxy URLs like user:pass@host */
function maskProxy(val) {
  if (!val) return '';
  return val.replace(/\/\/(.*):(.*)@/, '//***:***@');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'newsboat-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const s = parseNewsboatConf(text);
  const bindKeyCount = countLines(text, 'bind-key');
  const colorCount = countLines(text, 'color ');

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="newsboat-badge">newsboat</span>
      <span class="newsboat-title">newsboat Config</span>
    </div>
    <p class="newsboat-sub">newsboat RSS/Atom feed reader configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Refresh settings card
  const refreshRows = [
    s['auto-reload'] ? row('auto-reload', yesNoChip(s['auto-reload'])) : '',
    s['reload-time'] ? row('reload-time', chip(s['reload-time'] + ' min')) : '',
    s['refresh-on-startup'] ? row('refresh-on-startup', yesNoChip(s['refresh-on-startup'])) : '',
    s['reload-threads'] ? row('reload-threads', chip(s['reload-threads'])) : '',
    s['max-items'] ? row('max-items', chip(s['max-items'])) : '',
  ].filter(Boolean).join('');
  if (refreshRows) {
    body += `<div class="newsboat-sec"><h3>Refresh</h3><div class="newsboat-card">${refreshRows}</div></div>`;
  }

  // Display card
  const displayRows = [
    s['show-read-feeds'] ? row('show-read-feeds', yesNoChip(s['show-read-feeds'])) : '',
    s['show-read-articles'] ? row('show-read-articles', yesNoChip(s['show-read-articles'])) : '',
    s['articlelist-format'] ? row('articlelist-format', chip(s['articlelist-format'].slice(0, 60) + (s['articlelist-format'].length > 60 ? '…' : ''))) : '',
    s['feedlist-format'] ? row('feedlist-format', chip(s['feedlist-format'].slice(0, 60) + (s['feedlist-format'].length > 60 ? '…' : ''))) : '',
    s['datetime-format'] ? row('datetime-format', chip(s['datetime-format'])) : '',
    s['notify-program'] ? row('notify-program', chip(s['notify-program'])) : '',
  ].filter(Boolean).join('');
  if (displayRows) {
    body += `<div class="newsboat-sec"><h3>Display</h3><div class="newsboat-card">${displayRows}</div></div>`;
  }

  // Browser card
  if (s['browser']) {
    body += `<div class="newsboat-sec"><h3>Browser</h3><div class="newsboat-card">${row('browser', chip(s['browser']))}</div></div>`;
  }

  // Proxy card
  const proxyRows = [
    s['proxy'] ? row('proxy', chip(maskProxy(s['proxy']))) : '',
    s['proxy-type'] ? row('proxy-type', chip(s['proxy-type'], 'blue')) : '',
  ].filter(Boolean).join('');
  if (proxyRows) {
    body += `<div class="newsboat-sec"><h3>Proxy</h3><div class="newsboat-card">${proxyRows}</div></div>`;
  }

  // Key bindings summary
  if (bindKeyCount > 0) {
    body += `<div class="newsboat-sec"><h3>Key Bindings</h3><div class="newsboat-card">${row('bind-key entries', chip(String(bindKeyCount), 'blue'))}</div></div>`;
  }

  // Colors summary
  if (colorCount > 0) {
    body += `<div class="newsboat-sec"><h3>Colors</h3><div class="newsboat-card">${row('color entries', chip(String(colorCount), 'green'))}</div></div>`;
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
