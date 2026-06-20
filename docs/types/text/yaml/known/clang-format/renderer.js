import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.clangformat-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.clangformat-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0066CC;color:#fff;vertical-align:middle;margin-right:8px;}
.clangformat-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.clangformat-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.clangformat-style-chip{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;background:#dbeafe;color:#1d4ed8;margin:0 4px 4px 0;border:1px solid #93c5fd;}
.clangformat-sec{margin:12px 0;}
.clangformat-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.clangformat-kv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px;margin:4px 0;}
.clangformat-kv-item{display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.clangformat-kv-item.clangformat-hi{background:#eff6ff;border-color:#93c5fd;}
.clangformat-kv-key{color:var(--fg-2,#888);font-family:ui-monospace,monospace;}
.clangformat-kv-val{font-family:ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);}
.clangformat-hi .clangformat-kv-key{color:#1d4ed8;}
`;

const KEY_SETTINGS = ['BasedOnStyle', 'IndentWidth', 'TabWidth', 'UseTab', 'ColumnLimit', 'Language',
  'AllowShortFunctionsOnASingleLine', 'AllowShortIfStatementsOnASingleLine', 'BreakBeforeBraces',
  'SortIncludes', 'IncludeBlocks', 'PointerAlignment', 'ReferenceAlignment', 'SpaceBeforeParens'];

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const filename = (intake.name || intake.filename || '').split('/').pop() || '.clang-format';

  const basedOn = cfg.BasedOnStyle ? esc(cfg.BasedOnStyle) : null;
  const styleChip = basedOn
    ? `<span class="clangformat-style-chip">${basedOn}</span>`
    : '';

  const keyEntries = KEY_SETTINGS.filter((k) => cfg[k] != null).map((k) => ({ key: k, val: cfg[k] }));
  const otherEntries = Object.entries(cfg)
    .filter(([k]) => !KEY_SETTINGS.includes(k))
    .map(([key, val]) => ({ key, val }));

  const makeKv = (entries, highlight) => entries.map(({ key, val }) => {
    const cls = highlight ? 'clangformat-kv-item clangformat-hi' : 'clangformat-kv-item';
    return `<div class="${cls}"><span class="clangformat-kv-key">${esc(key)}</span><span class="clangformat-kv-val">${esc(String(val))}</span></div>`;
  }).join('');

  const styleHtml = keyEntries.length
    ? `<div class="clangformat-sec"><h3>Style Settings</h3><div class="clangformat-kv-grid">${makeKv(keyEntries, true)}</div></div>`
    : '';

  const allHtml = otherEntries.length
    ? `<div class="clangformat-sec"><h3>Other Settings</h3><div class="clangformat-kv-grid">${makeKv(otherEntries, false)}</div></div>`
    : '';

  const sub = [
    basedOn ? `Based on ${basedOn}` : '',
    cfg.ColumnLimit != null ? `column limit: ${esc(cfg.ColumnLimit)}` : '',
    cfg.IndentWidth != null ? `indent: ${esc(cfg.IndentWidth)}` : '',
  ].filter(Boolean).join(' · ') || 'clang-format style config';

  const host = document.createElement('div');
  host.className = 'clangformat-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="clangformat-title"><span class="clangformat-badge">clang-format</span>${esc(filename)}</div>
<div class="clangformat-sub">${sub}</div>
${styleChip ? `<div style="margin:0 0 8px">${styleChip}</div>` : ''}
${styleHtml}
${allHtml}`;

  return { parentNode: host };
}
