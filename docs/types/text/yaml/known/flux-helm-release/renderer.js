import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function row(label, value) {
  if (!value) return '';
  return `<tr><td class="fxcd-label">${esc(label)}</td><td class="fxcd-val">${esc(value)}</td></tr>`;
}

const KIND_COLOR = { HelmRelease: '#0055cc', HelmRepository: '#0a7abf', Kustomization: '#0d904f', HelmChart: '#5a67d8' };

export async function render(intake) {
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || [])[0] || {}; } catch { /* ignore parse errors */ }

  const kind = doc.kind || 'HelmRelease';
  const apiVersion = doc.apiVersion || '';
  const meta = doc.metadata || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const spec = doc.spec || {};

  const interval = spec.interval || '';
  const suspend = spec.suspend;
  const color = KIND_COLOR[kind] || KIND_COLOR.HelmRelease;

  // HelmRelease chart details
  const chartSpec = spec.chart?.spec || {};
  const chartName = chartSpec.chart || '';
  const chartVersion = chartSpec.version || '';
  const sourceRef = chartSpec.sourceRef || spec.sourceRef || {};
  const sourceRefName = sourceRef.name || '';
  const sourceRefKind = sourceRef.kind || '';
  const sourceRefNamespace = sourceRef.namespace || '';

  // HelmRepository URL
  const repoUrl = spec.url || '';
  const repoType = spec.type || '';

  // Kustomization
  const kPath = spec.path || '';
  const kPrune = spec.prune;
  const kForce = spec.force;
  const kSourceRef = spec.sourceRef || {};

  // Values summary
  const values = spec.values;
  const valuesCount = values && typeof values === 'object' ? Object.keys(values).length : 0;
  const valueKeys = values && typeof values === 'object' ? Object.keys(values).slice(0, 8) : [];

  const host = document.createElement('div');
  host.className = 'fxcd-doc';
  host.innerHTML = `<style>
.fxcd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;}
.badge-fxcd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0055cc;color:#fff;margin-right:8px;vertical-align:middle;}
.fxcd-kind-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;color:#fff;margin-right:6px;vertical-align:middle;}
.fxcd-title{font-size:19px;font-weight:700;margin:0 0 4px;}
.fxcd-meta{font-size:12px;color:var(--fg-2,#888);margin:2px 0 12px;}
.fxcd-sec{margin:14px 0;}
.fxcd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.fxcd-table{width:100%;border-collapse:collapse;font-size:13px;}
.fxcd-label{color:var(--fg-2,#888);font-size:12px;padding:4px 16px 4px 0;white-space:nowrap;vertical-align:top;min-width:120px;}
.fxcd-val{font:13px ui-monospace,monospace;padding:4px 0;word-break:break-all;}
.fxcd-table tr{border-bottom:1px solid var(--border,#e0e0e0);}
.fxcd-table tr:last-child{border-bottom:none;}
.fxcd-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.fxcd-pill{padding:3px 10px;border-radius:10px;font-size:12px;}
.fxcd-pill-on{background:#d4edda;color:#155724;border:1px solid #c3e6cb;font-weight:600;}
.fxcd-pill-off{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;font-weight:600;}
.fxcd-pill-neutral{background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);color:var(--fg,#333);}
.fxcd-values{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
.fxcd-val-key{font:12px ui-monospace,monospace;background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);padding:1px 7px;border-radius:4px;}
.fxcd-val-more{font-size:12px;color:var(--fg-2,#888);padding:2px 4px;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
  <span class="badge-fxcd">Flux CD</span>
  <span class="fxcd-kind-badge" style="background:${color}">${esc(kind)}</span>
  ${name ? `<span class="fxcd-title">${esc(name)}</span>` : ''}
</div>
${(namespace || apiVersion) ? `<div class="fxcd-meta">${namespace ? `namespace: ${esc(namespace)}` : ''}${namespace && apiVersion ? ' · ' : ''}${apiVersion ? `apiVersion: ${esc(apiVersion)}` : ''}</div>` : ''}
${interval || suspend != null ? `<div class="fxcd-pills">
  ${interval ? `<span class="fxcd-pill fxcd-pill-neutral">interval: ${esc(interval)}</span>` : ''}
  ${suspend != null ? `<span class="fxcd-pill ${suspend ? 'fxcd-pill-off' : 'fxcd-pill-on'}">${suspend ? 'suspended' : 'active'}</span>` : ''}
</div>` : ''}
${(kind === 'HelmRelease' && (chartName || sourceRefName)) ? `<div class="fxcd-sec"><h3>Chart</h3><table class="fxcd-table">
${row('Chart name', chartName)}
${row('Version', chartVersion || 'latest')}
${row('Source', sourceRefName + (sourceRefKind ? ' (' + sourceRefKind + ')' : '') + (sourceRefNamespace ? ' / ' + sourceRefNamespace : ''))}
</table></div>` : ''}
${(kind === 'HelmRepository' && repoUrl) ? `<div class="fxcd-sec"><h3>Repository</h3><table class="fxcd-table">
${row('URL', repoUrl)}
${row('Type', repoType)}
</table></div>` : ''}
${(kind === 'Kustomization') ? `<div class="fxcd-sec"><h3>Kustomization</h3><table class="fxcd-table">
${row('Path', kPath)}
${kSourceRef.name ? row('Source', kSourceRef.name + (kSourceRef.kind ? ' (' + kSourceRef.kind + ')' : '')) : ''}
</table>
<div class="fxcd-pills" style="margin-top:8px;">
  ${kPrune != null ? `<span class="fxcd-pill ${kPrune ? 'fxcd-pill-on' : 'fxcd-pill-off'}">prune: ${kPrune ? 'yes' : 'no'}</span>` : ''}
  ${kForce != null ? `<span class="fxcd-pill ${kForce ? 'fxcd-pill-on' : 'fxcd-pill-off'}">force: ${kForce ? 'yes' : 'no'}</span>` : ''}
</div></div>` : ''}
${valuesCount > 0 ? `<div class="fxcd-sec"><h3>Values (${valuesCount} key${valuesCount !== 1 ? 's' : ''})</h3><div class="fxcd-values">${valueKeys.map(k => `<span class="fxcd-val-key">${esc(k)}</span>`).join('')}${valuesCount > 8 ? `<span class="fxcd-val-more">+${valuesCount - 8} more</span>` : ''}</div></div>` : ''}`;

  return { parentNode: host };
}
