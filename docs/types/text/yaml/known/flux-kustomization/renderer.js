import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function boolPill(label, value) {
  if (value == null) return '';
  const cls = value ? 'fkust-pill-on' : 'fkust-pill-off';
  return `<span class="fkust-pill ${cls}">${esc(label)}: ${value ? 'yes' : 'no'}</span>`;
}

export async function render(intake) {
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || [])[0] || {}; } catch { /* ignore parse errors */ }

  const meta = doc.metadata || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const apiVersion = doc.apiVersion || '';
  const spec = doc.spec || {};

  const interval = spec.interval || '';
  const path = spec.path || '';
  const prune = spec.prune;
  const force = spec.force;
  const wait = spec.wait;

  const sourceRef = spec.sourceRef || {};
  const srcKind = sourceRef.kind || '';
  const srcName = sourceRef.name || '';
  const srcNamespace = sourceRef.namespace || '';

  const healthChecks = Array.isArray(spec.healthChecks) ? spec.healthChecks : [];
  const dependsOn = Array.isArray(spec.dependsOn) ? spec.dependsOn : [];

  const host = document.createElement('div');
  host.className = 'fkust-doc';
  host.innerHTML = `<style>
.fkust-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;}
.fkust-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5468FF;color:#fff;margin-right:8px;vertical-align:middle;}
.fkust-title{font-size:19px;font-weight:700;margin:0;vertical-align:middle;}
.fkust-meta{font-size:12px;color:var(--fg-2,#888);margin:4px 0 12px;}
.fkust-sec{margin:14px 0;}
.fkust-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.fkust-table{width:100%;border-collapse:collapse;font-size:13px;}
.fkust-label{color:var(--fg-2,#888);font-size:12px;padding:4px 16px 4px 0;white-space:nowrap;vertical-align:top;min-width:130px;}
.fkust-val{font:13px ui-monospace,monospace;padding:4px 0;word-break:break-all;}
.fkust-table tr{border-bottom:1px solid var(--border,#e0e0e0);}
.fkust-table tr:last-child{border-bottom:none;}
.fkust-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}
.fkust-pill{padding:3px 10px;border-radius:10px;font-size:12px;font-weight:600;}
.fkust-pill-on{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.fkust-pill-off{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.fkust-pill-neutral{background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);color:var(--fg,#333);}
.fkust-list{list-style:none;padding:0;margin:4px 0 0;display:flex;flex-direction:column;gap:4px;}
.fkust-list-item{font:12px ui-monospace,monospace;background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);padding:3px 8px;border-radius:4px;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="fkust-badge">Flux Kustomization</span>
  ${name ? `<span class="fkust-title">${esc(name)}</span>` : ''}
</div>
${(namespace || apiVersion) ? `<div class="fkust-meta">${namespace ? `namespace: ${esc(namespace)}` : ''}${namespace && apiVersion ? ' · ' : ''}${apiVersion ? `apiVersion: ${esc(apiVersion)}` : ''}</div>` : ''}

${interval ? `<div class="fkust-pills"><span class="fkust-pill fkust-pill-neutral">interval: ${esc(interval)}</span></div>` : ''}

${(srcName || srcKind || path) ? `<div class="fkust-sec"><h3>Source &amp; Path</h3><table class="fkust-table">
${srcKind || srcName ? `<tr><td class="fkust-label">sourceRef</td><td class="fkust-val">${esc(srcKind)}${srcName ? ` / ${esc(srcName)}` : ''}${srcNamespace ? ` (${esc(srcNamespace)})` : ''}</td></tr>` : ''}
${path ? `<tr><td class="fkust-label">path</td><td class="fkust-val">${esc(path)}</td></tr>` : ''}
</table></div>` : ''}

${(prune != null || force != null || wait != null) ? `<div class="fkust-sec"><h3>Sync Settings</h3><div class="fkust-pills">
  ${boolPill('prune', prune)}
  ${boolPill('force', force)}
  ${boolPill('wait', wait)}
</div></div>` : ''}

${healthChecks.length > 0 ? `<div class="fkust-sec"><h3>Health Checks (${healthChecks.length})</h3><ul class="fkust-list">${healthChecks.map(hc => {
  const kind = hc.kind || '';
  const hcName = hc.name || '';
  const hcNs = hc.namespace || '';
  return `<li class="fkust-list-item">${esc(kind)}${hcName ? ` / ${esc(hcName)}` : ''}${hcNs ? ` · ${esc(hcNs)}` : ''}</li>`;
}).join('')}</ul></div>` : ''}

${dependsOn.length > 0 ? `<div class="fkust-sec"><h3>Depends On (${dependsOn.length})</h3><ul class="fkust-list">${dependsOn.map(dep => {
  const depName = dep.name || '';
  const depNs = dep.namespace || '';
  return `<li class="fkust-list-item">${esc(depName)}${depNs ? ` · ${esc(depNs)}` : ''}</li>`;
}).join('')}</ul></div>` : ''}`;

  return { parentNode: host };
}
