import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function row(label, value) {
  if (value == null || value === '') return '';
  return `<tr><td class="clcfg-label">${esc(label)}</td><td class="clcfg-val">${esc(value)}</td></tr>`;
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const text = intake.text || '';
  let docs = [];
  try { docs = jsYaml.loadAll(text) || []; } catch { /* ignore parse errors */ }
  docs = docs.filter(Boolean);

  const host = document.createElement('div');
  host.className = 'clcfg-doc';

  const docsHtml = docs.map((doc) => {
    const kind = doc.kind || 'Resource';
    const meta = doc.metadata || {};
    const name = meta.name || '';
    const namespace = meta.namespace || '';
    const spec = doc.spec || {};
    const annotations = meta.annotations || {};

    let fieldsHtml = '';

    if (kind === 'StorageClass') {
      const provisioner = doc.provisioner || spec.provisioner || '';
      const reclaimPolicy = doc.reclaimPolicy || spec.reclaimPolicy || '';
      const volumeBindingMode = doc.volumeBindingMode || spec.volumeBindingMode || '';
      const allowVolumeExpansion = doc.allowVolumeExpansion != null ? String(doc.allowVolumeExpansion) : (spec.allowVolumeExpansion != null ? String(spec.allowVolumeExpansion) : '');
      const params = doc.parameters || spec.parameters || {};
      const paramEntries = Object.entries(params).slice(0, 5);
      fieldsHtml = `<table class="clcfg-table">
${row('Provisioner', provisioner)}
${row('Reclaim policy', reclaimPolicy)}
${row('Volume binding mode', volumeBindingMode)}
${row('Allow expansion', allowVolumeExpansion)}
${paramEntries.map(([k, v]) => row(k, v)).join('')}
</table>`;
    } else if (kind === 'PriorityClass') {
      const value = doc.value != null ? String(doc.value) : '';
      const globalDefault = doc.globalDefault != null ? String(doc.globalDefault) : '';
      const preemptionPolicy = doc.preemptionPolicy || '';
      const description = doc.description || '';
      fieldsHtml = `<table class="clcfg-table">
${row('Value', value)}
${row('Global default', globalDefault)}
${row('Preemption policy', preemptionPolicy)}
${description ? row('Description', description) : ''}
</table>`;
    } else {
      // Generic cluster resource
      const apiVersion = doc.apiVersion || '';
      fieldsHtml = `<table class="clcfg-table">
${row('API version', apiVersion)}
${namespace ? row('Namespace', namespace) : ''}
</table>`;
    }

    return `<div class="clcfg-resource">
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
  <span class="badge-k8s">Kubernetes</span>
  <span class="clcfg-kind-badge">${esc(kind)}</span>
  ${name ? `<span class="clcfg-name">${esc(name)}</span>` : ''}
</div>
${namespace ? `<div class="clcfg-meta">namespace: ${esc(namespace)}</div>` : ''}
${fieldsHtml}
</div>`;
  }).join('<hr class="clcfg-sep">');

  host.innerHTML = `<style>
.clcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-k8s{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#326ce5;color:#fff;margin-right:6px;vertical-align:middle;}
.clcfg-kind-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a5fa8;color:#fff;margin-right:6px;vertical-align:middle;}
.clcfg-name{font-size:18px;font-weight:700;}
.clcfg-meta{font-size:12px;color:var(--fg-2,#888);margin:2px 0 10px;}
.clcfg-resource{margin:0 0 12px;}
.clcfg-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;}
.clcfg-label{color:var(--fg-2,#888);font-size:12px;padding:4px 16px 4px 0;white-space:nowrap;vertical-align:top;min-width:140px;}
.clcfg-val{font:13px ui-monospace,monospace;padding:4px 0;word-break:break-all;}
.clcfg-table tr{border-bottom:1px solid var(--border,#e0e0e0);}
.clcfg-table tr:last-child{border-bottom:none;}
.clcfg-sep{border:none;border-top:1px solid var(--border,#e0e0e0);margin:16px 0;}
</style>
${docsHtml || '<div style="color:var(--fg-2,#888);font-size:13px;">No cluster configuration documents found.</div>'}`;

  return { parentNode: host };
}
