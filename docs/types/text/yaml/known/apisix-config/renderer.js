import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function maskUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return url;
  }
}

const CSS = `
.ax-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ax-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e83227;color:#fff;vertical-align:middle;margin-right:8px;}
.ax-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ax-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ax-sec{margin:14px 0;}
.ax-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.ax-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.ax-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.ax-kv-k{color:var(--fg-2,#888);min-width:140px;}
.ax-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.ax-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.ax-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.ax-pill.plugin{background:#fff1f0;border-color:#ffa39e;color:#cf1322;}
.ax-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff1f0;border:1px solid #ffa39e;color:#cf1322;margin-left:4px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="ax-kv"><span class="ax-kv-k">${esc(label)}</span><span class="ax-kv-v">${esc(value)}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  // Deployment
  const mode = cfg.deployment?.mode || '';
  const adminListen = cfg.deployment?.admin?.admin_listen;
  const adminIp = adminListen?.ip || '';
  const adminPort = adminListen?.port || '';

  // apisix node listen
  const apisix = cfg.apisix || {};
  const nodeListen = apisix.node_listen;
  const nodeListenStr = nodeListen != null ? String(nodeListen) : '';

  // Plugins
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];

  // etcd
  const etcd = cfg.etcd || {};
  const etcdHosts = Array.isArray(etcd.host) ? etcd.host : (etcd.host ? [etcd.host] : []);
  const etcdPrefix = etcd.prefix || '';
  const etcdTimeout = etcd.timeout != null ? String(etcd.timeout) : '';

  // plugin_attr.prometheus
  const prometheus = cfg.plugin_attr?.prometheus || {};
  const promPort = prometheus.export_addr?.port || '';
  const promUri = prometheus.export_uri || '';

  const subParts = [
    mode ? `mode: ${mode}` : '',
    nodeListenStr ? `proxy :${nodeListenStr}` : '',
    adminPort ? `admin :${adminPort}` : '',
    plugins.length ? `${plugins.length} plugins` : '',
  ].filter(Boolean);

  const deploySection = (mode || adminIp || adminPort) ? `
<div class="ax-sec"><h3>Deployment</h3>
<div class="ax-card">
${kv('mode', mode)}
${adminIp || adminPort ? kv('admin listen', `${adminIp}:${adminPort}`) : ''}
${kv('https admin', String(cfg.deployment?.admin?.https_admin ?? ''))}
</div></div>` : '';

  const apisixSection = nodeListenStr ? `
<div class="ax-sec"><h3>APISIX</h3>
<div class="ax-card">
${kv('node_listen (proxy)', nodeListenStr)}
${kv('enable_ipv6', String(apisix.enable_ipv6 ?? ''))}
${kv('enable_http2', String(apisix.enable_http2 ?? ''))}
${apisix.router?.http ? kv('router.http', apisix.router.http) : ''}
${apisix.router?.ssl ? kv('router.ssl', apisix.router.ssl) : ''}
</div></div>` : '';

  const pluginsSection = plugins.length ? `
<div class="ax-sec"><h3>Plugins (${plugins.length})</h3>
<div class="ax-pills">${plugins.map((p) => `<span class="ax-pill plugin">${esc(p)}</span>`).join('')}</div>
</div>` : '';

  const etcdSection = etcdHosts.length || etcdPrefix ? `
<div class="ax-sec"><h3>etcd</h3>
<div class="ax-card">
${etcdHosts.map((h) => kv('host', maskUrl(h))).join('')}
${kv('prefix', etcdPrefix)}
${etcdTimeout ? kv('timeout', etcdTimeout + 's') : ''}
</div></div>` : '';

  const prometheusSection = (promPort || promUri) ? `
<div class="ax-sec"><h3>Prometheus export</h3>
<div class="ax-card">
${promUri ? kv('uri', promUri) : ''}
${promPort ? kv('port', String(promPort)) : ''}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'ax-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="ax-badge">APISIX</span>
  <span class="ax-title">API Gateway Configuration</span>
  ${mode ? `<span class="ax-tag">${esc(mode)}</span>` : ''}
</div>
<div class="ax-sub">${esc(subParts.join(' · '))}</div>
${deploySection}${apisixSection}${pluginsSection}${etcdSection}${prometheusSection}`;
  return { parentNode: host };
}
