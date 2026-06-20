import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STYLE = `<style>
.ic-wrap{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;display:flex;flex-direction:column;gap:14px;}
.ic-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.ic-card-hd{padding:10px 14px;background:var(--bg-2,#f5f5f5);border-bottom:1px solid var(--border,#e0e0e0);display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
.ic-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#466BB0;color:#fff;}
.ic-kind{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2d9bf0;color:#fff;}
.ic-title{font-size:16px;font-weight:700;}
.ic-meta{font-size:12px;color:var(--fg-2,#888);}
.ic-body{padding:12px 14px;display:flex;flex-direction:column;gap:10px;}
.ic-sec h4{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;font-weight:600;}
.ic-tbl{width:100%;border-collapse:collapse;font-size:13px;}
.ic-tbl th{text-align:left;font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.03em;padding:4px 12px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.ic-tbl td{padding:5px 12px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-size:13px;}
.ic-tbl tr:last-child td{border-bottom:none;}
.ic-lbl{color:var(--fg-2,#888);font-size:12px;padding:4px 12px 4px 0;white-space:nowrap;min-width:110px;vertical-align:top;}
.ic-val{font:13px ui-monospace,monospace;padding:4px 0;word-break:break-all;}
.ic-pill{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);color:var(--fg,#333);margin:1px;}
.ic-chips{display:flex;flex-wrap:wrap;gap:4px;}
</style>`;

function kvRow(label, value) {
  if (!value) return '';
  return `<tr><td class="ic-lbl">${esc(label)}</td><td class="ic-val">${esc(value)}</td></tr>`;
}

function kvTable(rows) {
  const rendered = rows.map(([k, v]) => kvRow(k, v)).filter(Boolean).join('');
  if (!rendered) return '';
  return `<table class="ic-tbl">${rendered}</table>`;
}

function renderVirtualService(spec) {
  const hosts = (spec.hosts || []).join(', ');
  const gateways = (spec.gateways || []).join(', ');
  const httpRoutes = spec.http || [];

  let routesHtml = '';
  if (httpRoutes.length) {
    const rows = httpRoutes.map((route) => {
      const matchDesc = (route.match || []).map((m) => {
        const parts = [];
        if (m.uri) parts.push('uri: ' + JSON.stringify(m.uri));
        if (m.headers) parts.push('headers: ' + Object.keys(m.headers).join(','));
        return parts.join(', ') || '(default)';
      }).join(' | ') || '(default)';

      const destDesc = (route.route || []).map((r) => {
        const d = r.destination || {};
        let s = esc(d.host || '');
        if (d.subset) s += ` <span class="ic-pill">${esc(d.subset)}</span>`;
        if (r.weight != null) s += ` <span style="color:var(--fg-2,#888);font-size:11px">${r.weight}%</span>`;
        return s;
      }).join('<br>');

      return `<tr><td class="ic-val" style="color:var(--fg-2,#777);font-size:11px;padding:5px 12px 5px 0;border-bottom:1px solid var(--border,#e0e0e0)">${esc(matchDesc)}</td><td style="padding:5px 0;border-bottom:1px solid var(--border,#e0e0e0)">${destDesc}</td></tr>`;
    }).join('');
    routesHtml = `<div class="ic-sec"><h4>HTTP Routes (${httpRoutes.length})</h4><table class="ic-tbl"><thead><tr><th>Match</th><th>Destination</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  return kvTable([['Hosts', hosts], ['Gateways', gateways]]) + routesHtml;
}

function renderDestinationRule(spec) {
  const subsets = spec.subsets || [];
  const tp = spec.trafficPolicy || {};
  const tpParts = [];
  if (tp.loadBalancer) tpParts.push('lb: ' + (tp.loadBalancer.simple || JSON.stringify(tp.loadBalancer)));
  if (tp.connectionPool?.tcp) tpParts.push('tcp.maxConn: ' + tp.connectionPool.tcp.maxConnections);

  let subsetsHtml = '';
  if (subsets.length) {
    const rows = subsets.map((s) => {
      const labels = Object.entries(s.labels || {}).map(([k, v]) => `${k}=${v}`).join(', ');
      return `<tr><td class="ic-val" style="padding:5px 12px 5px 0;border-bottom:1px solid var(--border,#e0e0e0)">${esc(s.name)}</td><td style="padding:5px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:12px;color:var(--fg-2,#888)">${esc(labels)}</td></tr>`;
    }).join('');
    subsetsHtml = `<div class="ic-sec"><h4>Subsets (${subsets.length})</h4><table class="ic-tbl"><thead><tr><th>Name</th><th>Labels</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  return kvTable([['Host', spec.host || ''], ['Traffic policy', tpParts.join(', ') || '']]) + subsetsHtml;
}

function renderGateway(spec) {
  const selector = Object.entries(spec.selector || {}).map(([k, v]) => `${k}=${v}`).join(', ');
  const servers = spec.servers || [];
  let serversHtml = '';
  if (servers.length) {
    const rows = servers.map((s) => {
      const port = s.port || {};
      const hosts = (s.hosts || []).join(', ');
      return `<tr><td class="ic-val" style="padding:5px 12px 5px 0;border-bottom:1px solid var(--border,#e0e0e0)">${esc(port.number || '')}/${esc(port.protocol || '')}</td><td style="padding:5px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:12px">${esc(hosts)}</td></tr>`;
    }).join('');
    serversHtml = `<div class="ic-sec"><h4>Servers (${servers.length})</h4><table class="ic-tbl"><thead><tr><th>Port/Protocol</th><th>Hosts</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  return kvTable([['Selector', selector]]) + serversHtml;
}

function renderPeerAuth(spec) {
  const selector = Object.entries((spec.selector || {}).matchLabels || {}).map(([k, v]) => `${k}=${v}`).join(', ');
  const mode = (spec.mtls || {}).mode || 'UNSET';
  return kvTable([['Selector', selector || '(mesh-wide)'], ['mTLS mode', mode]]);
}

function renderAuthzPolicy(spec) {
  const action = spec.action || 'ALLOW';
  const rules = (spec.rules || []).length;
  const selector = Object.entries((spec.selector || {}).matchLabels || {}).map(([k, v]) => `${k}=${v}`).join(', ');
  return kvTable([['Action', action], ['Selector', selector || '(mesh-wide)'], ['Rules', String(rules)]]);
}

function renderGeneric(spec) {
  const keys = Object.keys(spec).slice(0, 5);
  const rows = keys.map((k) => {
    const v = spec[k];
    const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return [k, str.length > 100 ? str.slice(0, 98) + '…' : str];
  });
  return kvTable(rows);
}

function renderDoc(doc) {
  if (!doc || typeof doc !== 'object') return '';
  const kind = doc.kind || 'Unknown';
  const meta = doc.metadata || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const apiVersion = doc.apiVersion || '';
  const spec = doc.spec || {};

  let bodyHtml = '';
  switch (kind) {
    case 'VirtualService': bodyHtml = renderVirtualService(spec); break;
    case 'DestinationRule': bodyHtml = renderDestinationRule(spec); break;
    case 'Gateway': bodyHtml = renderGateway(spec); break;
    case 'PeerAuthentication': bodyHtml = renderPeerAuth(spec); break;
    case 'AuthorizationPolicy': bodyHtml = renderAuthzPolicy(spec); break;
    default: bodyHtml = renderGeneric(spec);
  }

  const meta2 = [namespace ? `namespace: ${esc(namespace)}` : '', apiVersion ? `apiVersion: ${esc(apiVersion)}` : ''].filter(Boolean).join(' · ');

  return `<div class="ic-card">
  <div class="ic-card-hd">
    <span class="ic-badge">Istio</span>
    <span class="ic-kind">${esc(kind)}</span>
    ${name ? `<span class="ic-title">${esc(name)}</span>` : ''}
  </div>
  ${meta2 ? `<div class="ic-body"><div class="ic-meta">${meta2}</div>${bodyHtml}</div>` : `<div class="ic-body">${bodyHtml}</div>`}
</div>`;
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const text = intake.text || '';
  const docs = [];
  try {
    jsYaml.loadAll(text, (d) => { if (d) docs.push(d); }, { json: true });
  } catch {
    try { const d = jsYaml.load(text); if (d) docs.push(d); } catch { /* ignore */ }
  }

  const host = document.createElement('div');
  host.innerHTML = STYLE + `<div class="ic-wrap">${docs.length ? docs.map(renderDoc).join('') : '<div style="color:var(--fg-2,#888);font-size:13px">No Istio resources found.</div>'}</div>`;
  return { parentNode: host };
}
