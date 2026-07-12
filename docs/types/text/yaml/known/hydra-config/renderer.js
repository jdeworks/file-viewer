// Enhanced Hydra config viewer.
// Shows defaults list as pills, config groups, _target_ class, and override flags.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { describeCollectionCap } from '../../../../../core/collection-cap.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hyd-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-hyd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#E57524;color:#fff;vertical-align:middle;margin-right:8px}
.hyd-title{font-size:18px;font-weight:700;margin:0 0 4px}
.hyd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.hyd-sec{margin:14px 0}
.hyd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.hyd-card{background:var(--bg,#fff);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:8px 0}
.hyd-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.hyd-pill{font-size:12px;padding:3px 10px;border-radius:12px;background:#fdf0e6;border:1px solid #f5a96a;color:#c45800;font-family:ui-monospace,monospace}
.hyd-pill.self{background:#fff3e0;border-color:#ffb74d;color:#e65100;font-weight:700}
.hyd-pill.override{background:#fce4ec;border-color:#ef9a9a;color:#b71c1c}
.hyd-target{font:13px/1.5 ui-monospace,monospace;padding:6px 10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;word-break:break-all}
.hyd-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.hyd-row:last-child{border-bottom:none}
.hyd-key{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;font-size:12px}
.hyd-val{font-family:ui-monospace,monospace;word-break:break-all}
.hyd-cfg-items{list-style:none;margin:0;padding:0}
.hyd-cfg-item{display:flex;gap:8px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.hyd-cfg-item:last-child{border-bottom:none}
.hyd-cfg-key{font-family:ui-monospace,monospace;color:var(--fg-2,#888);min-width:160px;flex-shrink:0}
.hyd-cfg-val{font-family:ui-monospace,monospace;word-break:break-all}
`;

function defaultPillLabel(item) {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const keys = Object.keys(item);
    if (!keys.length) return '';
    const k = keys[0];
    const v = item[k];
    return v === null ? `~${k}` : `${k}: ${v}`;
  }
  return String(item);
}

function isOverride(item) {
  if (typeof item === 'string') return item.startsWith('override ');
  return false;
}

function isSelf(item) {
  if (typeof item === 'string') return item === '_self_';
  return false;
}

function flattenConfig(obj, prefix = '', results = [], depth = 0) {
  if (depth > 4 || !obj || typeof obj !== 'object' || Array.isArray(obj)) return results;
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'defaults' || k === '_target_') continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flattenConfig(v, key, results, depth + 1);
    } else {
      results.push([key, v]);
    }
  }
  return results;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const filename = (intake.filename || intake.name || 'config.yaml').split('/').pop();
  const defaults = Array.isArray(cfg.defaults) ? cfg.defaults : [];
  const target = cfg._target_;

  // Defaults pills
  const defaultsHtml = defaults.length ? `<div class="hyd-sec"><h3>Defaults List (${defaults.length})</h3>
    <div class="hyd-card"><div class="hyd-pills">${defaults.map((item) => {
    const label = defaultPillLabel(item);
    const cls = isSelf(item) ? 'self' : isOverride(item) ? 'override' : '';
    return label ? `<span class="hyd-pill ${cls}">${esc(label)}</span>` : '';
  }).filter(Boolean).join('')}</div></div></div>` : '';

  // Target class
  const targetHtml = target ? `<div class="hyd-sec"><h3>Target Class</h3>
    <div class="hyd-card"><div class="hyd-target">${esc(target)}</div></div></div>` : '';

  // Config values (flatten non-hydra keys)
  const allConfigEntries = flattenConfig(cfg);
  const configEntries = allConfigEntries.slice(0, 30);
  const configCap = describeCollectionCap(allConfigEntries, configEntries);
  const configHtml = configEntries.length ? `<div class="hyd-sec"><h3>Config Values (${configCap.label})</h3>
    <div class="hyd-card"><ul class="hyd-cfg-items">${configEntries.map(([k, v]) =>
    `<li class="hyd-cfg-item"><span class="hyd-cfg-key">${esc(k)}</span><span class="hyd-cfg-val">${esc(v && typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''))}</span></li>`
  ).join('')}</ul></div></div>` : '';

  const subtitle = [
    defaults.length ? `${defaults.length} defaults` : '',
    target ? 'instantiable' : '',
    allConfigEntries.length ? `${allConfigEntries.length} values` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'hyd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="hyd-title"><span class="badge-hyd">Hydra</span>${esc(filename)}</div>
<div class="hyd-sub">Hydra configuration${subtitle ? ' — ' + esc(subtitle) : ''}</div>
${defaultsHtml}
${targetHtml}
${configHtml}`;
  return { parentNode: host };
}
