// Zathura PDF/document viewer zathurarc renderer.
// Parses `set key value`, `map key cmd`, and `plugin-load`/`plugin-directory` lines.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.zathura-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.zathura-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1c1c1c;color:#fff;vertical-align:middle;margin-right:8px}
.zathura-title{font-size:18px;font-weight:700;margin:0 0 4px}
.zathura-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.zathura-sec{margin:14px 0}
.zathura-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.zathura-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.zathura-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.zathura-chip-green{background:#dcfce7;border-color:#86efac;color:#15803d}
.zathura-chip-blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.zathura-chip-cyan{background:#ecfeff;border-color:#a5f3fc;color:#0e7490}
.zathura-chip-gray{background:#f3f4f6;border-color:#d1d5db;color:#4b5563}
.zathura-table{width:100%;border-collapse:collapse;font-size:13px}
.zathura-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.zathura-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:middle}
.zathura-key{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.zathura-val{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666)}
.zathura-swatch{display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:middle;margin-right:5px;border:1px solid #aaa}
`;

function stripQuotes(s) {
  if (!s) return s;
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseZathura(text) {
  const lines = text.split('\n');
  const settings = {};
  let mapCount = 0;
  const plugins = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // set <key> <value>
    const setMatch = line.match(/^set\s+(\S+)\s+(.+)$/);
    if (setMatch) {
      settings[setMatch[1].toLowerCase()] = stripQuotes(setMatch[2].trim());
      continue;
    }

    // map
    if (/^map\s+/.test(line)) {
      mapCount++;
      continue;
    }

    // plugin
    const pluginMatch = line.match(/^plugin-(?:load|directory)\s+(.+)$/);
    if (pluginMatch) {
      plugins.push(stripQuotes(pluginMatch[1].trim()));
    }
  }

  return { settings, mapCount, plugins };
}

function swatchRow(key, val, label, p) {
  if (!val) return '';
  const isColor = /^#[0-9a-fA-F]{3,8}$/.test(val) || /^(?:rgb|hsl)a?\(/.test(val);
  const swatchHtml = isColor
    ? `<span class="${p}-swatch" style="background:${esc(val)}"></span>`
    : '';
  return `<tr><td class="${p}-key">${esc(label || key)}</td><td>${swatchHtml}<span class="${p}-val">${esc(val)}</span></td></tr>`;
}

function valRow(key, val, label, p) {
  if (val == null) return '';
  return `<tr><td class="${p}-key">${esc(label || key)}</td><td><span class="${p}-val">${esc(val)}</span></td></tr>`;
}

function boolChip(val, label, p) {
  if (val == null) return '';
  const isTrue = val === 'true';
  const cls = isTrue ? `${p}-chip-green` : `${p}-chip-gray`;
  return `<span class="${p}-chip ${cls}">${esc(label)}: ${esc(val)}</span>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { settings: s, mapCount, plugins } = parseZathura(text);

  const p = 'zathura';
  const parts = [];

  // Display card
  const displayRows = [
    swatchRow('default-bg', s['default-bg'], 'default-bg', p),
    swatchRow('default-fg', s['default-fg'], 'default-fg', p),
    swatchRow('recolor-lightcolor', s['recolor'] === 'true' ? s['recolor-lightcolor'] : null, 'recolor-lightcolor', p),
    swatchRow('recolor-darkcolor', s['recolor'] === 'true' ? s['recolor-darkcolor'] : null, 'recolor-darkcolor', p),
    valRow('scroll-step', s['scroll-step'], 'scroll-step', p),
    valRow('zoom-step', s['zoom-step'], 'zoom-step', p),
    valRow('zoom-min', s['zoom-min'] != null && s['zoom-max'] != null ? `${s['zoom-min']}% – ${s['zoom-max']}%` : s['zoom-min'], 'zoom range', p),
  ].filter(Boolean).join('');

  const displayChips = [
    boolChip(s['recolor'], 'recolor', p),
    boolChip(s['recolor-keephue'], 'recolor-keephue', p),
    (() => {
      const v = s['adjust-open'];
      if (!v) return '';
      const cls = v === 'best-fit' ? `${p}-chip-blue` : v === 'width' ? `${p}-chip-green` : `${p}-chip-gray`;
      return `<span class="${p}-chip ${cls}">adjust-open: ${esc(v)}</span>`;
    })(),
  ].filter(Boolean).join('');

  if (displayRows || displayChips) {
    let inner = '';
    if (displayRows) inner += `<table class="${p}-table"><tbody>${displayRows}</tbody></table>`;
    if (displayChips) inner += `<div class="${p}-chips" style="margin-top:${displayRows ? '8px' : '4px'}">${displayChips}</div>`;
    parts.push(`<div class="${p}-sec"><h3>Display</h3>${inner}</div>`);
  }

  // UI card
  const uiRows = [
    valRow('statusbar-h-padding', s['statusbar-h-padding'] != null && s['statusbar-v-padding'] != null
      ? `h:${s['statusbar-h-padding']} v:${s['statusbar-v-padding']}` : s['statusbar-h-padding'], 'statusbar padding', p),
    swatchRow('inputbar-bg', s['inputbar-bg'], 'inputbar-bg', p),
    swatchRow('inputbar-fg', s['inputbar-fg'], 'inputbar-fg', p),
    swatchRow('notification-error-bg', s['notification-error-bg'], 'error-bg', p),
    swatchRow('notification-warning-bg', s['notification-warning-bg'], 'warning-bg', p),
  ].filter(Boolean).join('');

  const uiChips = [
    boolChip(s['statusbar-basename'], 'statusbar-basename', p),
    (() => {
      const v = s['selection-clipboard'];
      if (!v) return '';
      const cls = v === 'clipboard' ? `${p}-chip-green` : v === 'primary' ? `${p}-chip-blue` : `${p}-chip-gray`;
      return `<span class="${p}-chip ${cls}">selection-clipboard: ${esc(v)}</span>`;
    })(),
    boolChip(s['synctex'], 'synctex', p),
  ].filter(Boolean).join('');

  if (uiRows || uiChips) {
    let inner = '';
    if (uiRows) inner += `<table class="${p}-table"><tbody>${uiRows}</tbody></table>`;
    if (uiChips) inner += `<div class="${p}-chips" style="margin-top:${uiRows ? '8px' : '4px'}">${uiChips}</div>`;
    parts.push(`<div class="${p}-sec"><h3>UI</h3>${inner}</div>`);
  }

  // Plugins
  if (plugins.length) {
    const chips = plugins.map((pl) => `<span class="${p}-chip">${esc(pl)}</span>`).join('');
    parts.push(`<div class="${p}-sec"><h3>Plugins (${plugins.length})</h3><div class="${p}-chips">${chips}</div></div>`);
  }

  // Key bindings summary
  if (mapCount) {
    parts.push(`<div class="${p}-sec"><h3>Key Bindings</h3><div class="${p}-chips"><span class="${p}-chip ${p}-chip-gray">${mapCount} mapping${mapCount !== 1 ? 's' : ''}</span></div></div>`);
  }

  const recolorNote = s['recolor'] === 'true' ? 'recolor on' : null;
  const sub = [
    recolorNote,
    s['adjust-open'] ? `adjust-open: ${s['adjust-open']}` : null,
    mapCount ? `${mapCount} mappings` : null,
  ].filter(Boolean).join(' · ') || 'Zathura configuration';

  const host = document.createElement('div');
  host.className = `${p}-doc`;
  host.innerHTML = `<style>${CSS}</style>
<div class="${p}-title"><span class="${p}-badge">Zathura</span>Zathura Config</div>
<div class="${p}-sub">${esc(sub)}</div>
${parts.join('')}`;

  return { parentNode: host };
}
