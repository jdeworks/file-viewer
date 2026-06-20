import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<span class="oc-k">${esc(label)}</span><span class="oc-v">${esc(String(value))}</span>`;
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || [])[0] || {}; } catch { /* ignore */ }

  const clusterId = doc.cluster_id || doc.clusterId || '';

  // Prometheus URL — extract host only
  const prometheusObj = doc.prometheus || {};
  const externalObj = prometheusObj.external || {};
  const promUrl = externalObj.url || prometheusObj.url || '';
  let promHost = '';
  try {
    if (promUrl) promHost = new URL(promUrl).host;
  } catch { promHost = promUrl; }

  // Exporter settings
  const exporterObj = (doc.opencost || {}).exporter || {};
  const idleOverhead = exporterObj.default_idle_node_overhead_pct != null
    ? exporterObj.default_idle_node_overhead_pct
    : null;

  // Storage
  const storageObj = doc.storage || {};
  const storageType = storageObj.config?.type || storageObj.type || null;

  // UI
  const uiObj = doc.ui || {};
  const uiEnabled = uiObj.enabled != null ? uiObj.enabled : null;

  const kvEntries = [
    clusterId ? kv('cluster_id', clusterId) : '',
    promHost ? kv('prometheus host', promHost) : '',
    idleOverhead != null ? kv('idle node overhead', idleOverhead + '%') : '',
    storageType ? kv('storage type', storageType) : '',
    uiEnabled != null ? kv('ui.enabled', String(uiEnabled)) : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'oc-doc';
  host.innerHTML = `<style>
.oc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-oc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#059669;color:#fff;vertical-align:middle;margin-right:8px;}
.oc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.oc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.oc-kv{display:grid;grid-template-columns:max-content 1fr;gap:5px 16px;font-size:13px;margin:10px 0;}
.oc-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.oc-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
</style>
<div class="oc-title"><span class="badge-oc">OpenCost</span>OpenCost config</div>
<div class="oc-sub">${clusterId ? esc(clusterId) : 'OpenCost Kubernetes cost monitoring configuration'}</div>
${kvEntries.length ? `<div class="oc-kv">${kvEntries.join('')}</div>` : '<div style="color:var(--fg-2,#888);font-size:13px;">No settings detected.</div>'}`;

  return { parentNode: host };
}
