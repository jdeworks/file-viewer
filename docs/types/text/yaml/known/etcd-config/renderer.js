const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.etcd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-etcd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#419eda;color:#fff;vertical-align:middle;margin-right:8px;}
.etcd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.etcd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.etcd-sec{margin:12px 0;}
.etcd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.etcd-kv{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0;}
.etcd-kv-item{display:flex;gap:6px;align-items:baseline;font-size:12px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.etcd-kv-item span:first-child{color:var(--fg-2,#888);}
.etcd-kv-item span:last-child{font-family:ui-monospace,monospace;font-weight:600;}
.etcd-pill{display:inline-block;font-size:12px;padding:2px 8px;border-radius:10px;background:#ebf8ff;border:1px solid #90cdf4;color:#2b6cb0;margin:2px;font-family:ui-monospace,monospace;}
`;

import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const filename = (intake.name || intake.filename || '').split('/').pop() || 'etcd.yaml';

  const name = cfg.name || '';
  const dataDir = cfg['data-dir'] || '';
  const advertiseClientUrls = cfg['advertise-client-urls'] || '';
  const listenClientUrls = cfg['listen-client-urls'] || '';
  const listenPeerUrls = cfg['listen-peer-urls'] || '';
  const initialCluster = cfg['initial-cluster'] || '';
  const initialClusterState = cfg['initial-cluster-state'] || '';
  const clusterToken = cfg['initial-cluster-token'] || '';

  const kvHtml = (label, val) => val
    ? `<div class="etcd-kv-item"><span>${esc(label)}</span><span>${esc(String(val))}</span></div>`
    : '';

  const peers = initialCluster ? initialCluster.split(',').map(s => s.trim()) : [];

  const host = document.createElement('div');
  host.className = 'etcd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="etcd-title"><span class="badge-etcd">etcd</span>${esc(filename)}</div>
<div class="etcd-sub">etcd distributed key-value store${name ? ` — ${esc(name)}` : ''}</div>
<div class="etcd-sec">
  <h3>Member Settings</h3>
  <div class="etcd-kv">
    ${kvHtml('Name', name)}
    ${kvHtml('Data Dir', dataDir)}
    ${kvHtml('Cluster State', initialClusterState)}
    ${kvHtml('Cluster Token', clusterToken)}
    ${kvHtml('Client URLs', advertiseClientUrls)}
    ${kvHtml('Listen Clients', listenClientUrls)}
    ${kvHtml('Peer URLs', listenPeerUrls)}
  </div>
</div>
${peers.length > 1 ? `<div class="etcd-sec"><h3>Cluster (${peers.length} members)</h3>${peers.map(p => `<span class="etcd-pill">${esc(p)}</span>`).join('')}</div>` : ''}`;

  return { parentNode: host };
}
