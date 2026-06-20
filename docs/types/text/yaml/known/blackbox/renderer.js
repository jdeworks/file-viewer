import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const PROBER_COLORS = {
  http:  { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' },
  tcp:   { bg: '#dcfce7', border: '#86efac', text: '#166534' },
  dns:   { bg: '#ede9fe', border: '#c4b5fd', text: '#6d28d9' },
  icmp:  { bg: '#fff7ed', border: '#fdba74', text: '#c2410c' },
  grpc:  { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d' },
};

const CSS = `
.blackbox-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.bb-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e6522c;color:#fff;vertical-align:middle;margin-right:8px;}
.bb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.bb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.bb-sec{margin:14px 0;}
.bb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.bb-table{width:100%;border-collapse:collapse;font-size:13px;}
.bb-table th{text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);}
.bb-table td{padding:8px 10px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.bb-table tr:last-child td{border-bottom:none;}
.bb-chip{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;border:1px solid;}
.bb-kv{font-size:12px;color:var(--fg-2,#888);}
.bb-kv span{color:var(--fg,#24292f);font-family:ui-monospace,monospace;}
.bb-mono{font-family:ui-monospace,monospace;}
.bb-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;margin-left:4px;}
`;

function proberChip(prober) {
  const c = PROBER_COLORS[prober] || { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' };
  return `<span class="bb-chip" style="background:${c.bg};border-color:${c.border};color:${c.text}">${esc(prober)}</span>`;
}

function renderModuleDetails(name, mod) {
  const prober = mod.prober || 'unknown';
  const timeout = mod.timeout || '';
  const probeCfg = mod[prober] || {};
  const details = [];

  if (prober === 'http') {
    if (probeCfg.method) details.push(`<span class="bb-kv">method: <span>${esc(probeCfg.method)}</span></span>`);
    const vsc = probeCfg.valid_status_codes;
    if (vsc && Array.isArray(vsc) && vsc.length) {
      details.push(`<span class="bb-kv">valid_status_codes: <span>${esc(vsc.join(', '))}</span></span>`);
    }
    if (probeCfg.tls_config) details.push(`<span class="bb-kv">tls_config: <span>configured</span></span>`);
    if (probeCfg.basic_auth) details.push(`<span class="bb-kv">basic_auth: <span>[configured]</span></span>`);
    if (probeCfg.bearer_token || probeCfg.bearer_token_file) details.push(`<span class="bb-kv">bearer_token: <span>[configured]</span></span>`);
    if (probeCfg.fail_if_ssl) details.push(`<span class="bb-kv">fail_if_ssl: <span>true</span></span>`);
    if (probeCfg.fail_if_not_ssl) details.push(`<span class="bb-kv">fail_if_not_ssl: <span>true</span></span>`);
  } else if (prober === 'tcp') {
    if (probeCfg.query_response) details.push(`<span class="bb-kv">query_response: <span>${esc(String(probeCfg.query_response.length))} step(s)</span></span>`);
    if (probeCfg.tls) details.push(`<span class="bb-kv">tls: <span>true</span></span>`);
    if (probeCfg.tls_config) details.push(`<span class="bb-kv">tls_config: <span>configured</span></span>`);
  } else if (prober === 'dns') {
    if (probeCfg.query_type) details.push(`<span class="bb-kv">query_type: <span>${esc(probeCfg.query_type)}</span></span>`);
    if (probeCfg.query_name) details.push(`<span class="bb-kv">query_name: <span>${esc(probeCfg.query_name)}</span></span>`);
    if (probeCfg.transport_protocol) details.push(`<span class="bb-kv">transport: <span>${esc(probeCfg.transport_protocol)}</span></span>`);
  } else if (prober === 'icmp') {
    if (probeCfg.preferred_ip_protocol) details.push(`<span class="bb-kv">preferred_ip_protocol: <span>${esc(probeCfg.preferred_ip_protocol)}</span></span>`);
    if (probeCfg.payload_size) details.push(`<span class="bb-kv">payload_size: <span>${esc(String(probeCfg.payload_size))}</span></span>`);
  } else if (prober === 'grpc') {
    if (probeCfg.service) details.push(`<span class="bb-kv">service: <span>${esc(probeCfg.service)}</span></span>`);
    if (probeCfg.tls) details.push(`<span class="bb-kv">tls: <span>true</span></span>`);
  }

  return { prober, timeout, detailsHtml: details.join('<br>') };
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const modules = cfg.modules || {};
  const moduleNames = Object.keys(modules);
  const count = moduleNames.length;

  const proberCount = {};
  for (const name of moduleNames) {
    const p = (modules[name] && modules[name].prober) || 'unknown';
    proberCount[p] = (proberCount[p] || 0) + 1;
  }
  const proberSummary = Object.entries(proberCount)
    .map(([p, n]) => `${proberChip(p)} ×${n}`)
    .join(' ');

  const tableRows = moduleNames.map((name) => {
    const mod = modules[name] || {};
    const { prober, timeout, detailsHtml } = renderModuleDetails(name, mod);
    return `<tr>
<td class="bb-mono" style="font-weight:600">${esc(name)}</td>
<td>${proberChip(prober)}</td>
<td class="bb-mono">${esc(timeout)}</td>
<td>${detailsHtml}</td>
</tr>`;
  }).join('');

  const modulesHtml = count ? `
<div class="bb-sec">
<h3>Modules (${count})</h3>
<table class="bb-table">
<thead><tr><th>Name</th><th>Prober</th><th>Timeout</th><th>Settings</th></tr></thead>
<tbody>${tableRows}</tbody>
</table>
</div>` : '<div class="bb-sec" style="color:var(--fg-2,#888);font-size:13px">No modules defined.</div>';

  const host = document.createElement('div');
  host.className = 'blackbox-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="bb-badge">Prometheus</span>
  <span class="bb-title">Blackbox Exporter</span>
  ${count ? `<span class="bb-tag">${count} module${count !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="bb-sub">${proberSummary}</div>
${modulesHtml}`;
  return { parentNode: host };
}
