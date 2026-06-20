import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.clf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-clf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#262D3A;color:#fff;vertical-align:middle;margin-right:8px;}
.clf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.clf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.clf-sec{margin:12px 0;}
.clf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.clf-kv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px;margin:4px 0;}
.clf-kv-item{display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.clf-kv-key{color:var(--fg-2,#888);font-family:ui-monospace,monospace;}
.clf-kv-val{font-family:ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);}
.clf-highlight{background:#eff6ff;border-color:#93c5fd;}
.clf-highlight .clf-kv-key{color:#1d4ed8;}
`;

const KEY_SETTINGS = ['BasedOnStyle', 'IndentWidth', 'TabWidth', 'UseTab', 'ColumnLimit', 'Language'];

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const filename = (intake.filename || '').split('/').pop() || '.clang-format';

  const keyEntries = KEY_SETTINGS.filter((k) => cfg[k] != null).map((k) => ({ key: k, val: cfg[k] }));
  const otherEntries = Object.entries(cfg)
    .filter(([k]) => !KEY_SETTINGS.includes(k))
    .map(([key, val]) => ({ key, val }));

  const makeKv = (entries, highlight) => entries.map(({ key, val }) => {
    const cls = highlight ? 'clf-kv-item clf-highlight' : 'clf-kv-item';
    return `<div class="${cls}"><span class="clf-kv-key">${esc(key)}</span><span class="clf-kv-val">${esc(String(val))}</span></div>`;
  }).join('');

  const styleHtml = keyEntries.length
    ? `<div class="clf-sec"><h3>Style Settings</h3><div class="clf-kv-grid">${makeKv(keyEntries, true)}</div></div>`
    : '';

  const allHtml = otherEntries.length
    ? `<div class="clf-sec"><h3>All Settings</h3><div class="clf-kv-grid">${makeKv(otherEntries, false)}</div></div>`
    : '';

  const basedOn = cfg.BasedOnStyle ? esc(cfg.BasedOnStyle) : null;
  const sub = [
    basedOn ? `Based on ${basedOn}` : '',
    cfg.ColumnLimit != null ? `column limit: ${esc(cfg.ColumnLimit)}` : '',
    cfg.IndentWidth != null ? `indent: ${esc(cfg.IndentWidth)}` : '',
  ].filter(Boolean).join(' · ') || 'clang-format style config';

  const host = document.createElement('div');
  host.className = 'clf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="clf-title"><span class="badge-clf">clang-format</span>${esc(filename)}</div>
<div class="clf-sub">${sub}</div>
${styleHtml}
${allHtml}`;

  return { parentNode: host };
}
