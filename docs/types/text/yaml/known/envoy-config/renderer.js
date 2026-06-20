import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ev-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ev-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a56db;color:#fff;vertical-align:middle;margin-right:8px;}
.ev-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ev-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ev-sec{margin:14px 0;}
.ev-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.ev-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.ev-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.ev-kv-k{color:var(--fg-2,#888);min-width:120px;}
.ev-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.ev-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;}
.ev-table th{text-align:left;padding:5px 8px;border-bottom:2px solid var(--border,#e0e0e0);font-weight:600;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;}
.ev-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;vertical-align:top;}
.ev-table tr:last-child td{border-bottom:none;}
.ev-flow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;font-size:12px;font-family:ui-monospace,monospace;}
.ev-flow-node{padding:4px 12px;border-radius:6px;background:var(--bg,#fff);border:1px solid var(--border,#e0e0e0);}
.ev-flow-arrow{color:var(--fg-2,#888);}
.ev-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;margin-left:4px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="ev-kv"><span class="ev-kv-k">${esc(label)}</span><span class="ev-kv-v">${esc(value)}</span></div>`;
}

function socketAddr(obj) {
  if (!obj) return '';
  const addr = obj.socket_address || obj;
  const host = addr.address || addr.addr || '';
  const port = addr.port_value || addr.port || '';
  return port ? `${host}:${port}` : host;
}

function endpointList(cluster) {
  const eps = [];
  const la = cluster.load_assignment;
  if (!la) return '';
  for (const locality of (la.endpoints || [])) {
    for (const lb of (locality.lb_endpoints || [])) {
      const addr = lb.endpoint?.address;
      if (addr) eps.push(socketAddr(addr));
    }
  }
  return eps.join(', ') || '';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const node = cfg.node || {};
  const admin = cfg.admin || {};
  const adminPort = admin.address ? socketAddr(admin.address) : '';

  const sr = cfg.static_resources || {};
  const listeners = Array.isArray(sr.listeners) ? sr.listeners : [];
  const clusters = Array.isArray(sr.clusters) ? sr.clusters : [];

  const subParts = [
    node.id ? `node: ${node.id}` : '',
    node.cluster ? `cluster: ${node.cluster}` : '',
    listeners.length ? `${listeners.length} listener${listeners.length !== 1 ? 's' : ''}` : '',
    clusters.length ? `${clusters.length} cluster${clusters.length !== 1 ? 's' : ''}` : '',
    adminPort ? `admin ${adminPort}` : '',
  ].filter(Boolean);

  const nodeSection = (node.id || node.cluster) ? `
<div class="ev-sec"><h3>Node</h3>
<div class="ev-card">
${kv('id', node.id)}
${kv('cluster', node.cluster)}
</div></div>` : '';

  const adminSection = adminPort ? `
<div class="ev-sec"><h3>Admin</h3>
<div class="ev-card">
${kv('address', adminPort)}
</div></div>` : '';

  const listenersSection = listeners.length ? `
<div class="ev-sec"><h3>Listeners (${listeners.length})</h3>
<table class="ev-table">
<thead><tr><th>Name</th><th>Address : Port</th><th>Filter chains</th></tr></thead>
<tbody>
${listeners.map((l) => {
    const addr = l.address ? socketAddr(l.address) : '';
    const chains = Array.isArray(l.filter_chains) ? l.filter_chains.length : 0;
    return `<tr><td>${esc(l.name || '—')}</td><td>${esc(addr)}</td><td>${chains}</td></tr>`;
  }).join('')}
</tbody>
</table>
</div>` : '';

  const clustersSection = clusters.length ? `
<div class="ev-sec"><h3>Clusters (${clusters.length})</h3>
<table class="ev-table">
<thead><tr><th>Name</th><th>Type</th><th>Endpoints</th></tr></thead>
<tbody>
${clusters.map((c) => {
    const eps = endpointList(c);
    return `<tr><td>${esc(c.name || '—')}</td><td>${esc(c.type || '—')}</td><td>${esc(eps || '—')}</td></tr>`;
  }).join('')}
</tbody>
</table>
</div>` : '';

  const flowSection = (listeners.length && clusters.length) ? `
<div class="ev-sec"><h3>Architecture Overview</h3>
<div class="ev-flow">
  <span class="ev-flow-node">Downstream client</span>
  <span class="ev-flow-arrow">→</span>
  <span class="ev-flow-node">Listener</span>
  <span class="ev-flow-arrow">→</span>
  <span class="ev-flow-node">Filter chain</span>
  <span class="ev-flow-arrow">→</span>
  <span class="ev-flow-node">Route</span>
  <span class="ev-flow-arrow">→</span>
  <span class="ev-flow-node">Cluster</span>
  <span class="ev-flow-arrow">→</span>
  <span class="ev-flow-node">Upstream endpoint</span>
</div>
</div>` : '';

  const host = document.createElement('div');
  host.className = 'ev-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="ev-badge">Envoy</span>
  <span class="ev-title">Proxy Configuration</span>
  ${node.cluster ? `<span class="ev-tag">${esc(node.cluster)}</span>` : ''}
</div>
<div class="ev-sub">${esc(subParts.join(' · '))}</div>
${nodeSection}${adminSection}${listenersSection}${clustersSection}${flowSection}`;
  return { parentNode: host };
}
