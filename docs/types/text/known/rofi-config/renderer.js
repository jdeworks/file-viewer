// Rofi .rasi config/theme renderer. Pure text parsing — no eval, no execution.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.roficfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.roficfg-header{display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap;}
.roficfg-badge{display:inline-block;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#4a1080;color:#fff;vertical-align:middle;}
.roficfg-title{font-size:18px;font-weight:700;margin:0;}
.roficfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.roficfg-section{margin-bottom:14px;border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;background:var(--bg-2,#f6f8fa);}
.roficfg-section-hd{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2,#888);margin:0 0 8px;}
.roficfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.roficfg-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.roficfg-table td:first-child{color:var(--fg-2,#888);width:38%;white-space:nowrap;font-family:ui-monospace,monospace;font-size:12px;}
.roficfg-table td:last-child{font-family:ui-monospace,monospace;font-size:12px;}
.roficfg-table tr:last-child td{border-bottom:none;}
.roficfg-chip{display:inline-block;font-size:11px;font-family:ui-monospace,monospace;background:#e8f4fb;color:#005f87;border:1px solid #b3d9f0;border-radius:4px;padding:1px 7px;margin:1px 2px;}
.roficfg-chip.bool-on{background:#d4edda;color:#155724;border-color:#c3e6cb;}
.roficfg-chip.bool-off{background:#f8d7da;color:#721c24;border-color:#f5c6cb;}
.roficfg-chip.selector{background:#f3e8ff;color:#6b21a8;border-color:#d8b4fe;}
.roficfg-swatch{display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid rgba(0,0,0,.2);vertical-align:middle;margin-right:4px;}
.roficfg-modes{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
`;

// Parse the flat key:value pairs from a block like `configuration { key: "val"; ... }`
function parseConfigBlock(text) {
  const m = text.match(/configuration\s*\{([^}]*)\}/s);
  if (!m) return null;
  const kv = {};
  for (const line of m[1].split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('//') || t.startsWith('/*')) continue;
    const eq = t.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*?);\s*$/);
    if (eq) kv[eq[1]] = eq[2].replace(/^"(.*)"$/, '$1').trim();
  }
  return kv;
}

// Parse the star-block `* { key: val; ... }` for theme global vars
function parseStarBlock(text) {
  const m = text.match(/\*\s*\{([^}]*)\}/s);
  if (!m) return null;
  const kv = {};
  for (const line of m[1].split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('//')) continue;
    const eq = t.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*?);\s*$/);
    if (eq) kv[eq[1]] = eq[2].trim();
  }
  return kv;
}

// Extract all top-level element selectors (word followed by {)
function parseSelectors(text) {
  const selectors = new Set();
  const knownSelectors = ['window', 'mainbox', 'inputbar', 'prompt', 'textbox-prompt-sep',
    'entry', 'case-indicator', 'listview', 'element', 'element-icon', 'element-text',
    'scrollbar', 'mode-switcher', 'button', 'message', 'textbox', 'sidebar'];
  for (const sel of knownSelectors) {
    if (new RegExp('\\b' + sel + '\\s*\\{').test(text)) selectors.add(sel);
  }
  return [...selectors];
}

// Extract hex colors from a block of text
function extractColors(blockText) {
  const colors = new Set();
  const re = /#[0-9a-fA-F]{3,8}\b/g;
  let m;
  while ((m = re.exec(blockText)) !== null) colors.add(m[0]);
  return [...colors].slice(0, 12);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'roficfg-doc';
  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const isConfig = /configuration\s*\{/.test(text) && text.includes('modi:');
  const isTheme = !isConfig && /\*\s*\{/.test(text) && text.includes('background-color:');

  let html = '';

  // Header
  const typeLabel = isConfig ? 'Configuration file' : isTheme ? 'Theme file' : 'Rofi config';
  html += '<div class="roficfg-header"><span class="roficfg-badge">Rofi</span><span class="roficfg-title">Rofi Config</span></div>';
  html += '<p class="roficfg-sub">' + esc(typeLabel) + '</p>';

  if (isConfig) {
    const cfg = parseConfigBlock(text) || {};

    // Modes section
    const modiRaw = cfg['modi'] || '';
    const modes = modiRaw ? modiRaw.split(',').map((m) => m.trim()).filter(Boolean) : [];
    if (modes.length) {
      html += '<section class="roficfg-section"><div class="roficfg-section-hd">Launch Modes</div>';
      html += '<div class="roficfg-modes">';
      for (const mode of modes) html += '<span class="roficfg-chip">' + esc(mode) + '</span>';
      html += '</div></section>';
    }

    // Settings table
    const settingRows = [];
    if (cfg['font']) settingRows.push(['font', esc(cfg['font'])]);
    if (cfg['theme']) settingRows.push(['theme', esc(cfg['theme'])]);
    if (cfg['terminal']) settingRows.push(['terminal', esc(cfg['terminal'])]);
    if (cfg['matching']) settingRows.push(['matching', '<span class="roficfg-chip">' + esc(cfg['matching']) + '</span>']);
    if (cfg['sorting-method']) settingRows.push(['sorting-method', '<span class="roficfg-chip">' + esc(cfg['sorting-method']) + '</span>']);
    if (cfg['width']) settingRows.push(['width', esc(cfg['width']) + '%']);
    if (cfg['lines']) settingRows.push(['lines', esc(cfg['lines'])]);
    if (cfg['show-icons'] != null) {
      const on = cfg['show-icons'] === 'true';
      settingRows.push(['show-icons', '<span class="roficfg-chip ' + (on ? 'bool-on' : 'bool-off') + '">' + (on ? 'enabled' : 'disabled') + '</span>']);
    }
    if (cfg['icon-theme']) settingRows.push(['icon-theme', esc(cfg['icon-theme'])]);
    if (cfg['drun-display-format']) settingRows.push(['drun-display-format', esc(cfg['drun-display-format'])]);
    if (cfg['sort']) {
      const on = cfg['sort'] === 'true';
      settingRows.push(['sort', '<span class="roficfg-chip ' + (on ? 'bool-on' : 'bool-off') + '">' + (on ? 'enabled' : 'disabled') + '</span>']);
    }

    if (settingRows.length) {
      html += '<section class="roficfg-section"><div class="roficfg-section-hd">Settings</div>';
      html += '<table class="roficfg-table">';
      for (const [k, v] of settingRows) html += '<tr><td>' + k + '</td><td>' + v + '</td></tr>';
      html += '</table></section>';
    }

    // Key bindings count
    const kbKeys = Object.keys(cfg).filter((k) => k.startsWith('kb-'));
    if (kbKeys.length) {
      html += '<section class="roficfg-section"><div class="roficfg-section-hd">Key Bindings</div>';
      html += '<p style="margin:0;font-size:13px">';
      html += '<span class="roficfg-chip">' + kbKeys.length + ' bindings</span> ';
      // Show a few non-empty ones
      const notable = kbKeys.filter((k) => cfg[k]).slice(0, 6);
      for (const k of notable) {
        if (cfg[k]) html += '<span class="roficfg-chip" title="' + esc(k) + '">' + esc(k.replace('kb-', '')) + ': ' + esc(cfg[k]) + '</span> ';
      }
      html += '</p></section>';
    }

  } else if (isTheme) {
    const star = parseStarBlock(text) || {};
    const selectors = parseSelectors(text);

    // Color palette from star block
    const starText = (text.match(/\*\s*\{([^}]*)\}/s) || ['', ''])[1];
    const colors = extractColors(starText);
    if (colors.length) {
      html += '<section class="roficfg-section"><div class="roficfg-section-hd">Color Palette</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">';
      for (const c of colors) {
        html += '<span title="' + esc(c) + '" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-family:ui-monospace,monospace;padding:2px 6px;border:1px solid var(--border,#e0e0e0);border-radius:4px;">';
        html += '<span class="roficfg-swatch" style="background:' + esc(c) + '"></span>' + esc(c);
        html += '</span>';
      }
      html += '</div></section>';
    }

    // Global theme vars
    const themeRows = [];
    const varKeys = ['background-color', 'foreground-color', 'text-color', 'font', 'border-color', 'separatorcolor', 'scrollbar'];
    for (const k of varKeys) {
      if (star[k] != null) {
        const val = star[k];
        const hexM = val.match(/#[0-9a-fA-F]{3,8}/);
        let display = esc(val);
        if (hexM) display = '<span class="roficfg-swatch" style="background:' + esc(hexM[0]) + '"></span>' + esc(val);
        themeRows.push([k, display]);
      }
    }
    if (themeRows.length) {
      html += '<section class="roficfg-section"><div class="roficfg-section-hd">Global Variables</div>';
      html += '<table class="roficfg-table">';
      for (const [k, v] of themeRows) html += '<tr><td>' + esc(k) + '</td><td>' + v + '</td></tr>';
      html += '</table></section>';
    }

    // Element selectors
    if (selectors.length) {
      html += '<section class="roficfg-section"><div class="roficfg-section-hd">Element Selectors <span style="font-size:12px;font-weight:400;color:var(--fg-2,#888)">(' + selectors.length + ')</span></div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">';
      for (const sel of selectors) html += '<span class="roficfg-chip selector">' + esc(sel) + '</span>';
      html += '</div></section>';
    }

  } else {
    html += '<p style="color:var(--fg-2,#888);font-size:13px">Rofi .rasi file detected.</p>';
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  host.appendChild(wrapper);
  return { parentNode: host };
}
