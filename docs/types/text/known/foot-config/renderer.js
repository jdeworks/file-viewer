// foot Wayland terminal emulator configuration renderer.
// Parses INI-style sections: [main]/[foot], [colors], [scrollback], [mouse],
// [key-bindings], [url]. Pure text parsing.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parseFootIni(text) {
  const lines = text.split(/\r?\n/);
  const data = {
    // [main] / [foot]
    font: null,
    dpiAware: null,
    windowSize: null,
    pad: null,
    notify: null,
    wordConstituents: null,
    shell: null,
    // [colors]
    alpha: null,
    foreground: null,
    background: null,
    // [scrollback]
    scrollbackLines: null,
    // [mouse]
    hideWhenTyping: null,
    // [key-bindings]
    keyBindingCount: 0,
    // [url]
    urlLaunch: null,
  };

  let section = '';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    // Section header
    const secMatch = line.match(/^\[([^\]]+)\]$/);
    if (secMatch) {
      section = secMatch[1].toLowerCase().replace(/-/g, '_');
      continue;
    }

    // key=value
    const kvMatch = line.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (!kvMatch) continue;
    const key = kvMatch[1].trim().toLowerCase();
    const val = kvMatch[2].trim();

    if (section === 'main' || section === 'foot') {
      switch (key) {
        case 'font': data.font = val; break;
        case 'dpi-aware': data.dpiAware = val; break;
        case 'initial-window-size-pixels': data.windowSize = val; break;
        case 'pad': data.pad = val; break;
        case 'notify': data.notify = val; break;
        case 'word-constituents': data.wordConstituents = val; break;
        case 'shell': data.shell = val; break;
      }
    } else if (section === 'colors') {
      switch (key) {
        case 'alpha': data.alpha = val; break;
        case 'foreground': data.foreground = val; break;
        case 'background': data.background = val; break;
      }
    } else if (section === 'scrollback') {
      if (key === 'lines') data.scrollbackLines = val;
    } else if (section === 'mouse') {
      if (key === 'hide-when-typing') data.hideWhenTyping = val;
    } else if (section === 'key_bindings') {
      // Count non-none bindings
      if (val && val.toLowerCase() !== 'none') data.keyBindingCount++;
    } else if (section === 'url') {
      if (key === 'launch') data.urlLaunch = val;
    }
  }

  return data;
}

function colorSwatch(hex) {
  if (!hex) return '';
  const normalized = hex.startsWith('#') ? hex : '#' + hex;
  return `<span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:${esc(normalized)};vertical-align:middle;border:1px solid #555;margin-left:6px"></span>`;
}

function fmtScrollback(n) {
  const num = parseInt(n, 10);
  if (isNaN(num)) return esc(n);
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return String(num);
}

const CSS = `
.footcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.footcfg-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
.footcfg-title{font-size:18px;font-weight:700;margin:0;}
.footcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2d6a4f;color:#fff;vertical-align:middle;}
.footcfg-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px;}
.footcfg-tag{font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#666);}
.footcfg-card{margin:10px 0;background:var(--bg-2,#f9fafb);border:1px solid var(--border,#e8eaed);border-radius:8px;overflow:hidden;}
.footcfg-card-head{padding:7px 14px;background:var(--bg-3,#f1f3f5);border-bottom:1px solid var(--border,#e8eaed);font-size:12px;font-weight:600;color:var(--fg,#24292f);}
.footcfg-list{list-style:none;margin:0;padding:0;}
.footcfg-item{display:flex;align-items:center;gap:8px;padding:5px 14px;border-bottom:1px solid var(--border,#f0f0f0);font-size:13px;}
.footcfg-item:last-child{border-bottom:none;}
.footcfg-key{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#666);min-width:160px;flex-shrink:0;}
.footcfg-val{font:12px/1.6 ui-monospace,monospace;font-weight:600;word-break:break-all;}
.footcfg-chip{display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;}
.footcfg-chip-green{background:#d1fae5;border:1px solid #6ee7b7;color:#065f46;}
.footcfg-chip-yellow{background:#fef3c7;border:1px solid #fcd34d;color:#92400e;}
`;

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'footcfg-doc';
  const text = intake.text || '';
  const d = parseFootIni(text);

  const badge = '<span class="footcfg-badge">foot</span>';

  const tags = [
    d.font ? `<span class="footcfg-tag">${esc(d.font.split(':')[0])}</span>` : '',
    d.alpha ? `<span class="footcfg-tag">opacity ${Math.round(parseFloat(d.alpha) * 100)}%</span>` : '',
    d.keyBindingCount ? `<span class="footcfg-tag">${d.keyBindingCount} keybinding${d.keyBindingCount !== 1 ? 's' : ''}</span>` : '',
    d.scrollbackLines ? `<span class="footcfg-tag">${fmtScrollback(d.scrollbackLines)} lines scrollback</span>` : '',
  ].filter(Boolean).join('');

  let html = `<style>${CSS}</style>
<div class="footcfg-head">
  <h1 class="footcfg-title">${badge} foot terminal config</h1>
</div>
<div class="footcfg-meta">${tags}</div>`;

  // [main] / [foot] card
  const mainRows = [];
  if (d.font) {
    const [fontName, ...rest] = d.font.split(':');
    const chipText = esc(fontName) + (rest.length ? ' <span style="color:var(--fg-2,#888);font-weight:400">' + esc(rest.join(':')) + '</span>' : '');
    mainRows.push(`<li class="footcfg-item"><span class="footcfg-key">font</span><span class="footcfg-val">${chipText}</span></li>`);
  }
  if (d.dpiAware) mainRows.push(`<li class="footcfg-item"><span class="footcfg-key">dpi-aware</span><span class="footcfg-val">${esc(d.dpiAware)}</span></li>`);
  if (d.windowSize) mainRows.push(`<li class="footcfg-item"><span class="footcfg-key">initial-window-size-pixels</span><span class="footcfg-val">${esc(d.windowSize)}</span></li>`);
  if (d.pad) mainRows.push(`<li class="footcfg-item"><span class="footcfg-key">pad</span><span class="footcfg-val">${esc(d.pad)}</span></li>`);
  if (d.shell) mainRows.push(`<li class="footcfg-item"><span class="footcfg-key">shell</span><span class="footcfg-val">${esc(d.shell)}</span></li>`);
  if (d.wordConstituents) mainRows.push(`<li class="footcfg-item"><span class="footcfg-key">word-constituents</span><span class="footcfg-val">${esc(d.wordConstituents)}</span></li>`);

  if (mainRows.length) {
    html += `<div class="footcfg-card"><div class="footcfg-card-head">[main]</div><ul class="footcfg-list">${mainRows.join('')}</ul></div>`;
  }

  // [colors] card
  const colorRows = [];
  if (d.alpha != null) {
    const pct = Math.round(parseFloat(d.alpha) * 100);
    const chipClass = pct >= 90 ? 'footcfg-chip-green' : 'footcfg-chip-yellow';
    colorRows.push(`<li class="footcfg-item"><span class="footcfg-key">alpha</span><span class="footcfg-chip ${chipClass}">${pct}% opacity</span></li>`);
  }
  if (d.foreground) {
    colorRows.push(`<li class="footcfg-item"><span class="footcfg-key">foreground</span>${colorSwatch(d.foreground)}<span class="footcfg-val">#${esc(d.foreground)}</span></li>`);
  }
  if (d.background) {
    colorRows.push(`<li class="footcfg-item"><span class="footcfg-key">background</span>${colorSwatch(d.background)}<span class="footcfg-val">#${esc(d.background)}</span></li>`);
  }

  if (colorRows.length) {
    html += `<div class="footcfg-card"><div class="footcfg-card-head">[colors]</div><ul class="footcfg-list">${colorRows.join('')}</ul></div>`;
  }

  // [scrollback] card
  if (d.scrollbackLines) {
    const n = parseInt(d.scrollbackLines, 10);
    const formatted = isNaN(n) ? esc(d.scrollbackLines) : n.toLocaleString();
    html += `<div class="footcfg-card"><div class="footcfg-card-head">[scrollback]</div><ul class="footcfg-list">
<li class="footcfg-item"><span class="footcfg-key">lines</span><span class="footcfg-val">${formatted}</span></li>
</ul></div>`;
  }

  // [mouse] card
  if (d.hideWhenTyping) {
    html += `<div class="footcfg-card"><div class="footcfg-card-head">[mouse]</div><ul class="footcfg-list">
<li class="footcfg-item"><span class="footcfg-key">hide-when-typing</span><span class="footcfg-val">${esc(d.hideWhenTyping)}</span></li>
</ul></div>`;
  }

  // [key-bindings] card
  if (d.keyBindingCount) {
    html += `<div class="footcfg-card"><div class="footcfg-card-head">[key-bindings]</div><ul class="footcfg-list">
<li class="footcfg-item"><span class="footcfg-key">custom bindings</span><span class="footcfg-val">${d.keyBindingCount}</span></li>
</ul></div>`;
  }

  // [url] card
  if (d.urlLaunch) {
    html += `<div class="footcfg-card"><div class="footcfg-card-head">[url]</div><ul class="footcfg-list">
<li class="footcfg-item"><span class="footcfg-key">launch</span><span class="footcfg-val">${esc(d.urlLaunch)}</span></li>
</ul></div>`;
  }

  if (!mainRows.length && !colorRows.length && !d.scrollbackLines && !d.keyBindingCount) {
    html += '<p style="padding:16px;color:var(--fg-2,#888);font-size:13px">No foot config sections detected.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
