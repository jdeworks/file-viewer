import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.helixcfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-helix{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6a0dad;color:#fff;vertical-align:middle;margin-right:8px}
.helixcfg-title{font-size:18px;font-weight:700;margin:0 0 4px}
.helixcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.helixcfg-sec{margin:14px 0}
.helixcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px}
.helixcfg-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0}
.helixcfg-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:160px;flex-shrink:0}
.helixcfg-kv-v{font-size:13px;font-family:ui-monospace,monospace;word-break:break-all}
.helixcfg-chip{display:inline-flex;align-items:center;font-size:12px;padding:2px 9px;border-radius:10px;font-family:ui-monospace,monospace;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa)}
.helixcfg-chip-on{background:#dcfce7;border-color:#86efac;color:#166534}
.helixcfg-chip-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b}
.helixcfg-chip-blue{background:#dbeafe;border-color:#93c5fd;color:#1e40af}
.helixcfg-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#666)}
.helixcfg-chip-purple{background:#ede9fe;border-color:#c4b5fd;color:#5b21b6}
.helixcfg-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.helixcfg-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.helixcfg-table{width:100%;border-collapse:collapse;font-size:13px}
.helixcfg-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.helixcfg-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px}
`;

function boolChip(val) {
  if (val === true || val === 'true') return '<span class="helixcfg-chip helixcfg-chip-on">yes</span>';
  if (val === false || val === 'false') return '<span class="helixcfg-chip helixcfg-chip-off">no</span>';
  return '';
}

function textChip(val, cls = '') {
  return `<span class="helixcfg-chip ${cls}">${esc(val)}</span>`;
}

function cursorGlyph(shape) {
  if (!shape) return '';
  const s = String(shape).toLowerCase();
  const glyph = s === 'block' ? '█' : s === 'bar' ? '|' : s === 'underline' ? '_' : s;
  return `<span class="helixcfg-chip helixcfg-chip-purple">${esc(glyph)} ${esc(s)}</span>`;
}

function kvRow(label, valueHtml) {
  if (!valueHtml) return '';
  return `<div class="helixcfg-kv"><span class="helixcfg-kv-k">${esc(label)}</span><span class="helixcfg-kv-v">${valueHtml}</span></div>`;
}

function countKeys(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return 0;
  let count = 0;
  for (const v of Object.values(obj)) {
    if (typeof v === 'string') count++;
    else if (typeof v === 'object' && v !== null) count += countKeys(v);
  }
  return count;
}

export function render(intake) {
  let cfg = {};
  try {
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
    cfg = parseTOML(text) || {};
  } catch { cfg = {}; }

  const theme = cfg.theme || null;
  const editor = (cfg.editor && typeof cfg.editor === 'object') ? cfg.editor : {};
  const cursorShape = (editor['cursor-shape'] && typeof editor['cursor-shape'] === 'object') ? editor['cursor-shape'] : {};
  const filePicker = (editor['file-picker'] && typeof editor['file-picker'] === 'object') ? editor['file-picker'] : {};
  const statusline = (editor['statusline'] && typeof editor['statusline'] === 'object') ? editor['statusline'] : {};
  const lsp = (editor['lsp'] && typeof editor['lsp'] === 'object') ? editor['lsp'] : {};
  const keysNormal = (cfg.keys && cfg.keys.normal) ? cfg.keys.normal : null;
  const keysInsert = (cfg.keys && cfg.keys.insert) ? cfg.keys.insert : null;
  const keysSelect = (cfg.keys && cfg.keys.select) ? cfg.keys.select : null;

  // Build sub parts description
  const parts = [];
  if (theme) parts.push(`theme: ${theme}`);
  if (editor['line-number']) parts.push(`line-number: ${editor['line-number']}`);

  // Editor section
  const editorRows = [
    theme != null ? kvRow('theme', textChip(theme, 'helixcfg-chip-purple')) : '',
    editor['line-number'] != null ? kvRow('line-number', editor['line-number'] === 'relative' ? textChip('relative', 'helixcfg-chip-blue') : textChip(editor['line-number'], 'helixcfg-chip-gray')) : '',
    editor.mouse != null ? kvRow('mouse', boolChip(editor.mouse)) : '',
    editor['middle-click-paste'] != null ? kvRow('middle-click-paste', boolChip(editor['middle-click-paste'])) : '',
    editor.scrolloff != null ? kvRow('scrolloff', `<span class="helixcfg-kv-v">${esc(editor.scrolloff)}</span>`) : '',
    editor.shell != null ? kvRow('shell', `<span class="helixcfg-kv-v">${esc(Array.isArray(editor.shell) ? editor.shell.join(' ') : editor.shell)}</span>`) : '',
    editor['completion-trigger-len'] != null ? kvRow('completion-trigger-len', `<span class="helixcfg-kv-v">${esc(editor['completion-trigger-len'])}</span>`) : '',
    editor['auto-pairs'] != null ? kvRow('auto-pairs', boolChip(editor['auto-pairs'])) : '',
    editor['auto-save'] != null ? kvRow('auto-save', boolChip(editor['auto-save'])) : '',
    editor['idle-timeout'] != null ? kvRow('idle-timeout', `<span class="helixcfg-kv-v">${esc(editor['idle-timeout'])} ms</span>`) : '',
    editor['color-modes'] != null ? kvRow('color-modes', boolChip(editor['color-modes'])) : '',
  ].filter(Boolean).join('');

  const editorHtml = editorRows ? `<div class="helixcfg-sec"><h3>Editor</h3>${editorRows}</div>` : '';

  // Cursor shape
  const cursorRows = [
    cursorShape.normal != null ? kvRow('normal', cursorGlyph(cursorShape.normal)) : '',
    cursorShape.insert != null ? kvRow('insert', cursorGlyph(cursorShape.insert)) : '',
    cursorShape.select != null ? kvRow('select', cursorGlyph(cursorShape.select)) : '',
  ].filter(Boolean).join('');
  const cursorHtml = cursorRows ? `<div class="helixcfg-sec"><h3>Cursor Shape</h3>${cursorRows}</div>` : '';

  // File picker
  const fpRows = [
    filePicker.hidden != null ? kvRow('show hidden files', boolChip(filePicker.hidden === false ? true : (filePicker.hidden === true ? false : !filePicker.hidden))) : '',
    filePicker['git-ignore'] != null ? kvRow('git-ignore', boolChip(filePicker['git-ignore'])) : '',
    filePicker['git-global'] != null ? kvRow('git-global', boolChip(filePicker['git-global'])) : '',
  ].filter(Boolean).join('');
  const fpHtml = fpRows ? `<div class="helixcfg-sec"><h3>File Picker</h3>${fpRows}</div>` : '';

  // Statusline
  function chipList(arr) {
    if (!Array.isArray(arr) || !arr.length) return '';
    return `<div class="helixcfg-pills">${arr.map((v) => `<span class="helixcfg-pill">${esc(v)}</span>`).join('')}</div>`;
  }
  const slRows = [
    statusline.left != null ? `<div class="helixcfg-kv"><span class="helixcfg-kv-k">left</span><span class="helixcfg-kv-v">${chipList(statusline.left)}</span></div>` : '',
    statusline.center != null ? `<div class="helixcfg-kv"><span class="helixcfg-kv-k">center</span><span class="helixcfg-kv-v">${Array.isArray(statusline.center) && statusline.center.length ? chipList(statusline.center) : '<span class="helixcfg-chip helixcfg-chip-gray">empty</span>'}</span></div>` : '',
    statusline.right != null ? `<div class="helixcfg-kv"><span class="helixcfg-kv-k">right</span><span class="helixcfg-kv-v">${chipList(statusline.right)}</span></div>` : '',
    statusline.mode != null ? kvRow('mode labels', [statusline.mode.normal, statusline.mode.insert, statusline.mode.select].filter(Boolean).map((m) => textChip(m, 'helixcfg-chip-gray')).join(' ')) : '',
  ].filter(Boolean).join('');
  const slHtml = slRows ? `<div class="helixcfg-sec"><h3>Statusline</h3>${slRows}</div>` : '';

  // LSP
  const lspRows = [
    lsp['display-messages'] != null ? kvRow('display-messages', boolChip(lsp['display-messages'])) : '',
    lsp['auto-signature-help'] != null ? kvRow('auto-signature-help', boolChip(lsp['auto-signature-help'])) : '',
    lsp['display-inlay-hints'] != null ? kvRow('display-inlay-hints', boolChip(lsp['display-inlay-hints'])) : '',
  ].filter(Boolean).join('');
  const lspHtml = lspRows ? `<div class="helixcfg-sec"><h3>LSP</h3>${lspRows}</div>` : '';

  // Key mappings
  const keyRows = [
    keysNormal ? `<tr><td>normal</td><td>${countKeys(keysNormal)} mapping${countKeys(keysNormal) !== 1 ? 's' : ''}</td></tr>` : '',
    keysInsert ? `<tr><td>insert</td><td>${countKeys(keysInsert)} mapping${countKeys(keysInsert) !== 1 ? 's' : ''}</td></tr>` : '',
    keysSelect ? `<tr><td>select</td><td>${countKeys(keysSelect)} mapping${countKeys(keysSelect) !== 1 ? 's' : ''}</td></tr>` : '',
  ].filter(Boolean).join('');
  const keysHtml = keyRows
    ? `<div class="helixcfg-sec"><h3>Key Mappings</h3><table class="helixcfg-table"><thead><tr><th>Mode</th><th>Custom bindings</th></tr></thead><tbody>${keyRows}</tbody></table></div>`
    : '';

  const sub = parts.length ? parts.join(' · ') : 'Helix modal text editor configuration';

  const host = document.createElement('div');
  host.className = 'helixcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="helixcfg-title"><span class="badge-helix">Helix</span>Helix Config</div>
<div class="helixcfg-sub">${esc(sub)}</div>
${editorHtml}${cursorHtml}${fpHtml}${slHtml}${lspHtml}${keysHtml}`;

  return { parentNode: host };
}
