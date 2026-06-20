const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.picomcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.picomcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2d2d2d;color:#fff;vertical-align:middle;margin-right:8px;}
.picomcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.picomcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.picomcfg-sec{margin:12px 0;}
.picomcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.picomcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.picomcfg-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.picomcfg-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.picomcfg-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.picomcfg-chip-purple{background:#f3e5f5;border-color:#9c27b0;color:#4a148c;}
.picomcfg-chip-yellow{background:#fff9c4;border-color:#f9a825;color:#e65100;}
.picomcfg-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.picomcfg-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.picomcfg-key{color:var(--fg-2,#888);font-size:12px;min-width:190px;flex-shrink:0;}
.picomcfg-val{font-family:ui-monospace,monospace;font-size:12px;}
`;

/** Parse libconfig-like key = value; pairs (picom format) */
function parsePicomConf(text) {
  const settings = {};
  const lines = text.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';') || line.startsWith('//')) continue;
    // key = value; (value may be quoted string, number, or boolean)
    const m = line.match(/^([\w-]+)\s*=\s*(.+?)\s*;?\s*(?:#.*)?$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim().replace(/^"(.*)"$/, '$1');
    if (!(key in settings)) settings[key] = val;
  }
  return settings;
}

/** Count items in a bracket list like [ "a", "b", "c" ] */
function countListItems(text, key) {
  const re = new RegExp(`${key}\\s*=\\s*\\[([^\\]]*(?:\\[[^\\]]*\\][^\\]]*)*)]`, 's');
  const m = re.exec(text);
  if (!m) return 0;
  // count comma-separated quoted strings
  return (m[1].match(/"[^"]*"/g) || []).length;
}

function chip(val, cls = '') {
  if (!val && val !== 0) return '';
  return `<span class="picomcfg-chip${cls ? ' picomcfg-chip-' + cls : ''}">${esc(val)}</span>`;
}

function row(label, html) {
  if (!html) return '';
  return `<div class="picomcfg-row"><span class="picomcfg-key">${esc(label)}</span><span class="picomcfg-val">${html}</span></div>`;
}

function backendChip(b) {
  if (!b) return '';
  const cls = b === 'glx' ? 'green' : b === 'xrender' ? 'blue' : b === 'egl' ? 'purple' : '';
  return chip(b, cls);
}

function boolChip(val, trueLabel, falseLabel, trueCls = 'green', falseCls = 'gray') {
  if (!val) return '';
  const isTrue = val === 'true';
  return chip(isTrue ? (trueLabel || 'enabled') : (falseLabel || 'disabled'), isTrue ? trueCls : falseCls);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'picomcfg-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const s = parsePicomConf(text);

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="picomcfg-badge">picom</span>
      <span class="picomcfg-title">picom Compositor</span>
    </div>
    <p class="picomcfg-sub">X11 compositor configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Backend + vsync
  const backendHtml = backendChip(s['backend']);
  const vsyncHtml = s['vsync'] ? boolChip(s['vsync'], 'vsync on', 'vsync off') : '';
  if (backendHtml || vsyncHtml) {
    body += `<div class="picomcfg-sec">`;
    body += `<div class="picomcfg-card">`;
    body += `<div class="picomcfg-card-label" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px;">Renderer</div>`;
    if (backendHtml) body += row('backend', backendHtml);
    if (vsyncHtml) body += row('vsync', vsyncHtml);
    if (s['use-damage']) body += row('use-damage', boolChip(s['use-damage'], 'damage tracking on', 'damage tracking off'));
    body += `</div></div>`;
  }

  // Shadows card
  const shadowEnabled = s['shadow'];
  const shadowRows = [
    s['shadow'] ? row('shadow', boolChip(s['shadow'], 'enabled', 'disabled', 'yellow', 'gray')) : '',
    s['shadow-radius'] ? row('shadow-radius', chip(s['shadow-radius'])) : '',
    s['shadow-offset-x'] ? row('shadow-offset-x', chip(s['shadow-offset-x'])) : '',
    s['shadow-offset-y'] ? row('shadow-offset-y', chip(s['shadow-offset-y'])) : '',
    s['shadow-opacity'] ? row('shadow-opacity', chip(s['shadow-opacity'])) : '',
  ].filter(Boolean).join('');
  const shadowExcludeCount = countListItems(text, 'shadow-exclude');
  const shadowExcludeHtml = shadowExcludeCount > 0 ? row('shadow-exclude', chip(shadowExcludeCount + ' rules')) : '';

  if (shadowRows || shadowExcludeHtml) {
    body += `<div class="picomcfg-sec">`;
    body += `<h3 class="picomcfg-sec h3" style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;">Shadows</h3>`;
    body += `<div class="picomcfg-card">${shadowRows}${shadowExcludeHtml}</div>`;
    body += `</div>`;
  }

  // Blur card (only if blur settings present)
  const hasBlur = s['blur-method'] || s['blur-strength'] || s['blur-size'] || s['blur-kern'] || s['blur-background'];
  if (hasBlur) {
    const blurMethodCls = s['blur-method'] === 'dual_kawase' ? 'purple' : s['blur-method'] === 'gaussian' ? 'blue' : '';
    const blurRows = [
      s['blur-method'] ? row('blur-method', chip(s['blur-method'], blurMethodCls)) : '',
      s['blur-strength'] ? row('blur-strength', chip(s['blur-strength'])) : '',
      s['blur-size'] ? row('blur-size', chip(s['blur-size'])) : '',
      s['blur-kern'] ? row('blur-kern', chip(s['blur-kern'])) : '',
      s['blur-background'] ? row('blur-background', boolChip(s['blur-background'], 'enabled', 'disabled')) : '',
    ].filter(Boolean).join('');
    body += `<div class="picomcfg-sec">`;
    body += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;">Blur</h3>`;
    body += `<div class="picomcfg-card">${blurRows}</div>`;
    body += `</div>`;
  }

  // Corners
  if (s['corner-radius'] && s['corner-radius'] !== '0') {
    body += `<div class="picomcfg-sec">`;
    body += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;">Corners</h3>`;
    body += `<div class="picomcfg-card">`;
    body += row('corner-radius', chip(s['corner-radius'] + 'px'));
    body += `</div></div>`;
  }

  // Opacity card
  const opacityRuleCount = countListItems(text, 'opacity-rule');
  const opacityRows = [
    s['active-opacity'] ? row('active-opacity', chip(Math.round(parseFloat(s['active-opacity']) * 100) + '%')) : '',
    s['inactive-opacity'] ? row('inactive-opacity', chip(Math.round(parseFloat(s['inactive-opacity']) * 100) + '%')) : '',
    s['frame-opacity'] ? row('frame-opacity', chip(Math.round(parseFloat(s['frame-opacity']) * 100) + '%')) : '',
    opacityRuleCount > 0 ? row('opacity-rule', chip(opacityRuleCount + ' rules')) : '',
  ].filter(Boolean).join('');
  if (opacityRows) {
    body += `<div class="picomcfg-sec">`;
    body += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;">Opacity</h3>`;
    body += `<div class="picomcfg-card">${opacityRows}</div>`;
    body += `</div>`;
  }

  // Fading card
  const fadingRows = [
    s['fading'] ? row('fading', boolChip(s['fading'], 'enabled', 'disabled', 'green', 'gray')) : '',
    s['fade-in-step'] ? row('fade-in-step', chip(s['fade-in-step'])) : '',
    s['fade-out-step'] ? row('fade-out-step', chip(s['fade-out-step'])) : '',
    s['fade-delta'] ? row('fade-delta', chip(s['fade-delta'] + ' ms')) : '',
  ].filter(Boolean).join('');
  if (fadingRows) {
    body += `<div class="picomcfg-sec">`;
    body += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;">Fading</h3>`;
    body += `<div class="picomcfg-card">${fadingRows}</div>`;
    body += `</div>`;
  }

  // Animations (detect any animation/transition keys)
  const animKeys = Object.keys(s).filter((k) => k.startsWith('animations') || k.startsWith('transition-') || k.startsWith('animation-'));
  if (animKeys.length > 0) {
    body += `<div class="picomcfg-sec">`;
    body += `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;">Animations</h3>`;
    body += `<div class="picomcfg-card">`;
    for (const k of animKeys) body += row(k, chip(s[k]));
    body += `</div></div>`;
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
