import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STYLE = `<style>
.lk-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;display:flex;flex-direction:column;gap:14px;}
.lk-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.lk-card-hd{padding:10px 14px;background:var(--bg-2,#f5f5f5);border-bottom:1px solid var(--border,#e0e0e0);display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
.badge-lk{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7C6AF5;color:#fff;}
.lk-kind{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#9b8df7;color:#fff;}
.lk-title{font-size:16px;font-weight:700;}
.lk-meta{font-size:12px;color:var(--fg-2,#888);margin-bottom:8px;}
.lk-body{padding:12px 14px;}
.lk-sec{margin:8px 0;}
.lk-sec h4{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;font-weight:600;}
.lk-tbl{width:100%;border-collapse:collapse;font-size:13px;}
.lk-tbl td{padding:4px 12px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.lk-tbl tr:last-child td{border-bottom:none;}
.lk-label{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;min-width:130px;}
.lk-val{font:13px ui-monospace,monospace;word-break:break-all;}
.lk-pill{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);color:var(--fg,#333);margin:1px;}
.lk-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;}
</style>`;

function kvRow(label, value) {
  if (!value) return '';
  return `<tr><td class="lk-label">${esc(label)}</td><td class="lk-val">${esc(value)}</td></tr>`;
}

function kvTable(rows) {
  const rendered = rows.map(([k, v]) => kvRow(k, v)).filter(Boolean).join('');
  return rendered ? `<table class="lk-tbl">${rendered}</table>` : '';
}

function renderServer(spec) {
  const sel = Object.entries((spec.podSelector || {}).matchLabels || {}).map(([k, v]) => `${k}=${v}`).join(', ');
  const port = spec.port || {};
  const portStr = [port.number, port.protocol].filter(Boolean).join('/');
  return kvTable([
    ['Pod selector', sel],
    ['Port', portStr],
    ['Proxy protocol', spec.proxyProtocol || ''],
  ]);
}

function renderServerAuth(spec) {
  const serverName = (spec.server || {}).name || '';
  const authRefs = (spec.requiredAuthenticationRefs || []).map((r) => `${r.name} (${r.kind})`).join(', ');
  const networks = ((spec.client || {}).networks || []).map((n) => n.cidr).join(', ');
  return kvTable([
    ['Server', serverName],
    ['Auth refs', authRefs],
    ['Client networks', networks],
  ]);
}

function renderMeshTLS(spec) {
  const identities = (spec.identities || []).join(', ');
  const refs = (spec.identityRefs || []).map((r) => `${r.kind}/${r.name}${r.namespace ? ' ('+r.namespace+')' : ''}`).join(', ');
  return kvTable([
    ['Identities', identities],
    ['Identity refs', refs],
  ]);
}

function renderNetworkAuth(spec) {
  const networks = (spec.networks || []).map((n) => n.cidr).join(', ');
  return kvTable([['Networks', networks]]);
}

function renderRoute(spec) {
  const parents = (spec.parentRefs || []).map((r) => r.name || '').join(', ');
  const rules = (spec.rules || []).length;
  return kvTable([['Parent refs', parents], ['Rules', String(rules)]]);
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
    case 'Server': bodyHtml = renderServer(spec); break;
    case 'ServerAuthorization': bodyHtml = renderServerAuth(spec); break;
    case 'MeshTLSAuthentication': bodyHtml = renderMeshTLS(spec); break;
    case 'NetworkAuthentication': bodyHtml = renderNetworkAuth(spec); break;
    case 'HTTPRoute':
    case 'TCPRoute':
    case 'GRPCRoute': bodyHtml = renderRoute(spec); break;
    default: bodyHtml = renderGeneric(spec);
  }

  const metaStr = [namespace ? `namespace: ${esc(namespace)}` : '', apiVersion ? `apiVersion: ${esc(apiVersion)}` : ''].filter(Boolean).join(' · ');

  return `<div class="lk-card">
  <div class="lk-card-hd">
    <span class="badge-lk">Linkerd</span>
    <span class="lk-kind">${esc(kind)}</span>
    ${name ? `<span class="lk-title">${esc(name)}</span>` : ''}
  </div>
  <div class="lk-body">
    ${metaStr ? `<div class="lk-meta">${metaStr}</div>` : ''}
    ${bodyHtml}
  </div>
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
  host.className = 'lk-doc';
  host.innerHTML = STYLE + (docs.length ? docs.map(renderDoc).join('') : '<div style="color:var(--fg-2,#888);font-size:13px">No Linkerd resources found.</div>');
  return { parentNode: host };
}
