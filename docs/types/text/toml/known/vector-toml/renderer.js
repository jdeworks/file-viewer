import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vec-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-vec{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a6be0;color:#fff;vertical-align:middle;margin-right:8px}
.vec-title{font-size:18px;font-weight:700;margin:0 0 4px}
.vec-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.vec-sec{margin:14px 0}
.vec-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.vec-table{width:100%;border-collapse:collapse;font-size:13px}
.vec-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.vec-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.vec-id{font-family:ui-monospace,monospace;font-size:12px;font-weight:600}
.vec-type{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#666)}
.vec-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#e0e7ff;border:1px solid #a5b4fc;color:#3730a3;margin-left:4px}
.vec-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px}
.vec-kv-k{color:var(--fg-2,#888);min-width:130px}
.vec-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
`;

function sectionTable(title, obj, tag) {
  if (!obj || typeof obj !== 'object') return '';
  const entries = Object.entries(obj);
  if (!entries.length) return '';
  const rows = entries.map(([id, cfg]) => {
    const type = (cfg && cfg.type) || '—';
    return `<tr><td><span class="vec-id">${esc(id)}</span></td><td><span class="vec-type">${esc(type)}</span></td></tr>`;
  }).join('');
  return `<div class="vec-sec"><h3>${esc(title)} (${entries.length})</h3>
<table class="vec-table"><thead><tr><th>ID</th><th>Type</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function render(intake) {
  const text = intake.text || '';
  let cfg = {};
  try { cfg = parseTOML(text); } catch { cfg = {}; }

  const sources = cfg.sources || {};
  const transforms = cfg.transforms || {};
  const sinks = cfg.sinks || {};
  const dataDir = cfg.data_dir || null;

  const sourcesHtml = sectionTable('Sources', sources);
  const transformsHtml = sectionTable('Transforms', transforms);
  const sinksHtml = sectionTable('Sinks', sinks);

  const meta = cfg.api || {};
  const apiEnabled = meta.enabled != null ? String(meta.enabled) : null;
  const apiAddress = meta.address || null;

  const metaHtml = (dataDir || apiEnabled || apiAddress) ? `<div class="vec-sec"><h3>Settings</h3>
${dataDir ? `<div class="vec-kv"><span class="vec-kv-k">data_dir</span><span class="vec-kv-v">${esc(dataDir)}</span></div>` : ''}
${apiEnabled ? `<div class="vec-kv"><span class="vec-kv-k">api.enabled</span><span class="vec-kv-v">${esc(apiEnabled)}</span></div>` : ''}
${apiAddress ? `<div class="vec-kv"><span class="vec-kv-k">api.address</span><span class="vec-kv-v">${esc(apiAddress)}</span></div>` : ''}
</div>` : '';

  const nSources = Object.keys(sources).length;
  const nTransforms = Object.keys(transforms).length;
  const nSinks = Object.keys(sinks).length;
  const subParts = [
    nSources ? `${nSources} source${nSources !== 1 ? 's' : ''}` : '',
    nTransforms ? `${nTransforms} transform${nTransforms !== 1 ? 's' : ''}` : '',
    nSinks ? `${nSinks} sink${nSinks !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'vec-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-vec">Vector</span>
  <span class="vec-title">Pipeline Configuration</span>
  ${nSources ? `<span class="vec-tag">${nSources} source${nSources !== 1 ? 's' : ''}</span>` : ''}
  ${nSinks ? `<span class="vec-tag">${nSinks} sink${nSinks !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="vec-sub">${esc(subParts.join(' · '))}</div>
${metaHtml}${sourcesHtml}${transformsHtml}${sinksHtml}`;
  return { parentNode: host };
}
