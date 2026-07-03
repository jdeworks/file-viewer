const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Strict allowlist for values interpolated into a `style="background:…"` attribute — an
// .Xresources color value is untrusted file content. esc() alone only stops attribute
// breakout; it does not stop CSS injection (extra `;`-separated declarations, `url(...)`
// triggering an off-origin fetch). Reject anything that isn't a plain hex/rgb/hsl/named color.
function safeCssColor(v) {
  const s = String(v == null ? '' : v).trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s;
  if (/^(?:rgb|hsl)a?\([0-9.%,\s]+\)$/i.test(s)) return s;
  if (/^[a-zA-Z]{3,20}$/.test(s)) return s; // named CSS color (e.g. "red", "steelblue")
  return null;
}

const CSS = `
.xrdb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.xrdb-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1c1c1c;color:#fff;vertical-align:middle;margin-right:8px;}
.xrdb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.xrdb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.xrdb-sec{margin:12px 0;}
.xrdb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.xrdb-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.xrdb-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.xrdb-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.xrdb-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.xrdb-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.xrdb-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.xrdb-key{color:var(--fg-2,#888);font-size:12px;min-width:180px;flex-shrink:0;}
.xrdb-val{font-family:ui-monospace,monospace;font-size:12px;}
.xrdb-app-group{margin-bottom:10px;}
.xrdb-app-name{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin-bottom:4px;}
.xrdb-swatch-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin-top:6px;}
.xrdb-swatch{width:100%;aspect-ratio:1;border-radius:4px;border:1px solid rgba(0,0,0,.15);position:relative;}
.xrdb-swatch-label{font-size:9px;text-align:center;color:var(--fg-2,#888);margin-top:2px;}
.xrdb-swatch-row{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;}
`;

/** Parse Xresources text into structured data */
function parseXresources(text) {
  const lines = text.split('\n');
  const kvs = {}; // resource.key -> value
  const defines = {}; // macro -> value
  const includes = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('!')) continue;
    if (line.startsWith('#include')) {
      const m = line.match(/#include\s+"?([^"]+)"?/);
      if (m) includes.push(m[1]);
      continue;
    }
    if (line.startsWith('#define')) {
      const m = line.match(/#define\s+(\S+)\s+(.*)/);
      if (m) defines[m[1]] = m[2].trim();
      continue;
    }
    // Resource line: App.key: value or *.key: value
    const m = line.match(/^([*A-Za-z][^\s:]*)\s*:\s*(.*)/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim();
      if (!(key in kvs)) kvs[key] = val;
    }
  }
  return { kvs, defines, includes };
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="xrdb-chip${cls ? ' xrdb-chip-' + cls : ''}">${esc(val)}</span>`;
}

function row(label, html) {
  if (!html) return '';
  return `<div class="xrdb-row"><span class="xrdb-key">${esc(label)}</span><span class="xrdb-val">${html}</span></div>`;
}

function boolChip(val, onLabel, offLabel, onCls = 'green', offCls = 'gray') {
  if (!val) return '';
  const on = /^(true|yes|1|on)$/i.test(val);
  return chip(on ? (onLabel || 'enabled') : (offLabel || 'disabled'), on ? onCls : offCls);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'xrdb-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const { kvs, defines, includes } = parseXresources(text);

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="xrdb-badge">Xresources</span>
      <span class="xrdb-title">.Xresources</span>
    </div>
    <p class="xrdb-sub">X11 resource database</p>
  `;
  host.appendChild(header);

  let body = '';

  // Preprocessor: includes + defines
  const hasPreproc = includes.length > 0 || Object.keys(defines).length > 0;
  if (hasPreproc) {
    body += `<div class="xrdb-sec"><h3>Preprocessor</h3><div class="xrdb-card">`;
    if (includes.length > 0) {
      body += row('#include files', includes.map((f) => chip(f)).join(' '));
    }
    if (Object.keys(defines).length > 0) {
      body += row('#define macros', chip(Object.keys(defines).length + ' macros'));
    }
    body += `</div></div>`;
  }

  // Xft / DPI card
  const xftKeys = ['Xft.dpi', 'Xft.antialias', 'Xft.rgba', 'Xft.hinting', 'Xft.hintstyle'];
  const xftRows = xftKeys
    .map((k) => {
      const v = kvs[k];
      if (!v) return '';
      if (k === 'Xft.dpi') return row(k, chip(v + ' dpi', 'blue'));
      if (k === 'Xft.antialias' || k === 'Xft.hinting') return row(k, boolChip(v));
      return row(k, chip(v));
    })
    .filter(Boolean)
    .join('');
  if (xftRows) {
    body += `<div class="xrdb-sec"><h3>Xft / DPI</h3><div class="xrdb-card">${xftRows}</div></div>`;
  }

  // Group by application prefix
  const appMap = new Map(); // prefix -> [{ key, val }]
  for (const [fullKey, val] of Object.entries(kvs)) {
    if (fullKey.startsWith('Xft.') || fullKey.startsWith('*.color') || fullKey === '*.foreground' || fullKey === '*.background' || fullKey === '*.cursorColor') continue;
    const dot = fullKey.indexOf('.');
    if (dot < 1) continue;
    const prefix = fullKey.slice(0, dot);
    if (prefix === '*') continue;
    if (!appMap.has(prefix)) appMap.set(prefix, []);
    appMap.get(prefix).push({ key: fullKey.slice(dot + 1), val });
  }

  if (appMap.size > 0) {
    body += `<div class="xrdb-sec"><h3>Application Settings</h3>`;
    for (const [prefix, entries] of appMap) {
      body += `<div class="xrdb-card xrdb-app-group">`;
      body += `<div class="xrdb-app-name">${esc(prefix)}</div>`;
      const isTerminal = /^(URxvt|XTerm|rxvt)$/i.test(prefix);
      if (isTerminal) {
        const termKeys = ['font', 'scrollback', 'saveLines', 'internalBorder', 'borderless', 'geometry', 'scrollBar'];
        for (const tk of termKeys) {
          const e = entries.find((x) => x.key === tk);
          if (e) body += row(tk, chip(e.val));
        }
      } else {
        for (const { key, val } of entries) {
          body += row(key, chip(val));
        }
      }
      body += `</div>`;
    }
    body += `</div>`;
  }

  // Color palette
  const colors = [];
  for (let i = 0; i <= 15; i++) {
    const c = kvs[`*.color${i}`];
    if (c) colors[i] = c;
  }
  const fg = kvs['*.foreground'];
  const bg = kvs['*.background'];
  const filledColors = colors.filter(Boolean).length;

  if (filledColors >= 8 || fg || bg) {
    body += `<div class="xrdb-sec"><h3>Color Palette</h3><div class="xrdb-card">`;
    if (fg || bg) {
      body += `<div style="display:flex;gap:12px;margin-bottom:8px;font-size:12px;">`;
      if (bg) { const bgc = safeCssColor(bg); body += `<span>${chip('background')} <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${bgc || 'transparent'};border:1px solid rgba(0,0,0,.2);vertical-align:middle;"></span> <span style="font-family:ui-monospace,monospace">${esc(bg)}</span></span>`; }
      if (fg) { const fgc = safeCssColor(fg); body += `<span>${chip('foreground')} <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${fgc || 'transparent'};border:1px solid rgba(0,0,0,.2);vertical-align:middle;"></span> <span style="font-family:ui-monospace,monospace">${esc(fg)}</span></span>`; }
      body += `</div>`;
    }
    if (filledColors >= 8) {
      body += `<div class="xrdb-swatch-grid">`;
      for (let i = 0; i <= 15; i++) {
        const c = colors[i];
        body += `<div>`;
        body += `<div class="xrdb-swatch" style="background:${c ? (safeCssColor(c) || 'transparent') : 'transparent'}" title="color${i}: ${esc(c || 'unset')}"></div>`;
        body += `<div class="xrdb-swatch-label">${i}</div>`;
        body += `</div>`;
      }
      body += `</div>`;
    }
    body += `</div></div>`;
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
