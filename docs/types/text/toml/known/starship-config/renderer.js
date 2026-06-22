import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.starship-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-starship{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#DD0B78;color:#fff;vertical-align:middle;margin-right:8px}
.starship-title{font-size:18px;font-weight:700;margin:0 0 4px}
.starship-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;white-space:pre-wrap;word-break:break-all}
.starship-sec{margin:14px 0}
.starship-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.starship-kv{display:flex;gap:8px;align-items:baseline;margin:4px 0}
.starship-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:160px;flex-shrink:0}
.starship-kv-v{font-size:13px;font-family:ui-monospace,monospace;word-break:break-all}
.starship-chip{display:inline-flex;align-items:center;font-size:12px;padding:2px 9px;border-radius:10px;font-family:ui-monospace,monospace;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa)}
.starship-chip-on{background:#dcfce7;border-color:#86efac;color:#166534}
.starship-chip-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b}
.starship-chip-pink{background:#fce7f3;border-color:#f9a8d4;color:#9d174d}
.starship-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.starship-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.starship-format{font-family:ui-monospace,monospace;font-size:12px;padding:6px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);word-break:break-all;white-space:pre-wrap;margin-top:4px}
`;

// EXCLUDE_KEYS that are not module names
const NON_MODULE_KEYS = new Set(['format', 'right_format', 'continuation_prompt', 'scan_timeout', 'command_timeout', 'add_newline', 'palette', 'palettes']);

export function render(intake) {
  // intake.parsed is never populated at detection time, so parse the TOML ourselves (with a fallback).
  let cfg = {};
  try {
    cfg = (intake.parsed && typeof intake.parsed === 'object') ? intake.parsed : (parseTOML(intake.text || '') || {});
  } catch { cfg = {}; }

  // Top-level modules: any top-level table key that is an object (not palette/palettes)
  const moduleNames = Object.keys(cfg).filter((k) => {
    if (NON_MODULE_KEYS.has(k)) return false;
    if (typeof cfg[k] === 'object' && cfg[k] !== null && !Array.isArray(cfg[k])) return true;
    return false;
  });

  // Format string (truncated to 120 chars)
  const formatStr = cfg.format ? String(cfg.format) : null;
  const formatDisplay = formatStr ? (formatStr.length > 120 ? formatStr.slice(0, 117) + '…' : formatStr) : null;

  // Character module symbols
  const charModule = cfg.character || null;
  const successSymbol = charModule ? (charModule.success_symbol || null) : null;
  const errorSymbol = charModule ? (charModule.error_symbol || null) : null;

  // Palette
  const paletteName = cfg.palette ? String(cfg.palette) : null;
  const paletteDefs = cfg.palettes || null;
  const paletteColorCount = (paletteName && paletteDefs && paletteDefs[paletteName])
    ? Object.keys(paletteDefs[paletteName]).length
    : null;

  // Timeout settings
  const commandTimeout = cfg.command_timeout != null ? String(cfg.command_timeout) : null;
  const scanTimeout = cfg.scan_timeout != null ? String(cfg.scan_timeout) : null;
  const addNewline = cfg.add_newline;

  // Build KV row helper
  function kvRow(label, valueHtml) {
    if (!valueHtml) return '';
    return `<div class="starship-kv"><span class="starship-kv-k">${esc(label)}</span><span class="starship-kv-v">${valueHtml}</span></div>`;
  }
  function chip(text, cls) { return `<span class="starship-chip ${cls}">${esc(text)}</span>`; }

  // Format section
  const formatHtml = formatDisplay
    ? `<div class="starship-sec"><h3>Format String</h3><div class="starship-format">${esc(formatDisplay)}</div></div>`
    : '';

  // Modules section
  const modulesHtml = moduleNames.length
    ? `<div class="starship-sec"><h3>Modules (${moduleNames.length})</h3><div class="starship-pills">${moduleNames.map((m) => `<span class="starship-pill">${esc(m)}</span>`).join('')}</div></div>`
    : '';

  // Prompt settings
  const promptRows = [
    addNewline != null ? kvRow('add_newline', addNewline === true || addNewline === 'true' ? chip('true', 'starship-chip-on') : chip('false', 'starship-chip-off')) : '',
    commandTimeout != null ? kvRow('command_timeout', `<span class="starship-kv-v">${esc(commandTimeout)} ms</span>`) : '',
    scanTimeout != null ? kvRow('scan_timeout', `<span class="starship-kv-v">${esc(scanTimeout)} ms</span>`) : '',
    paletteName != null ? kvRow('palette', chip(paletteName, 'starship-chip-pink') + (paletteColorCount != null ? ` <span class="starship-kv-v" style="font-size:11px;color:var(--fg-2,#888)">${paletteColorCount} colors</span>` : '')) : '',
  ].filter(Boolean).join('');
  const promptHtml = promptRows
    ? `<div class="starship-sec"><h3>Prompt Settings</h3>${promptRows}</div>`
    : '';

  // Character module
  const charRows = [
    successSymbol != null ? kvRow('success_symbol', `<span class="starship-format" style="padding:2px 8px;display:inline-block">${esc(successSymbol)}</span>`) : '',
    errorSymbol != null ? kvRow('error_symbol', `<span class="starship-format" style="padding:2px 8px;display:inline-block">${esc(errorSymbol)}</span>`) : '',
  ].filter(Boolean).join('');
  const charHtml = charRows
    ? `<div class="starship-sec"><h3>Character Module</h3>${charRows}</div>`
    : '';

  const sub = moduleNames.length
    ? `${moduleNames.length} module${moduleNames.length !== 1 ? 's' : ''} enabled${paletteName ? ' · palette: ' + paletteName : ''}`
    : 'Starship cross-shell prompt configuration';

  const host = document.createElement('div');
  host.className = 'starship-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="starship-title"><span class="badge-starship">Starship</span>starship.toml</div>
<div class="starship-sub">${esc(sub)}</div>
${formatHtml}${modulesHtml}${promptHtml}${charHtml}`;

  return { parentNode: host };
}
