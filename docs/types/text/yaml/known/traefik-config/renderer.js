import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-tf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px;}
.tf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.tf-sec{margin:14px 0;}
.tf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.tf-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.tf-card-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.tf-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.tf-kv-k{color:var(--fg-2,#888);min-width:140px;}
.tf-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.tf-pills{display:flex;flex-wrap:wrap;gap:6px;}
.tf-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.tf-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.tf-pill.off{background:#f3f4f6;border-color:#d1d5db;color:#6b7280;}
.tf-pill.acme{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.tf-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;margin-left:4px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="tf-kv"><span class="tf-kv-k">${esc(label)}</span><span class="tf-kv-v">${esc(value)}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  // Entrypoints
  const entrypoints = cfg.entryPoints || cfg.entrypoints || {};
  const epEntries = Object.entries(entrypoints);

  const epHtml = epEntries.length ? `
<div class="tf-sec"><h3>Entrypoints (${epEntries.length})</h3>
${epEntries.map(([name, ep]) => {
    const addr = ep?.address || '';
    const http2https = ep?.http?.redirections?.entryPoint?.to === 'websecure' || ep?.http?.redirections?.entryPoint?.to === 'https';
    return `<div class="tf-card">
<div class="tf-card-name">${esc(name)}</div>
${kv('address', addr)}
${http2https ? '<div class="tf-kv"><span class="tf-kv-k">redirect</span><span class="tf-pill on">HTTP → HTTPS</span></div>' : ''}
</div>`;
  }).join('')}
</div>` : '';

  // Providers
  const providers = cfg.providers || {};
  const providerNames = Object.keys(providers).filter((k) => providers[k] != null && providers[k] !== false);

  const providerCards = providerNames.map((name) => {
    const p = providers[name];
    if (!p || typeof p !== 'object') return `<div class="tf-card"><div class="tf-card-name">${esc(name)}</div></div>`;
    let details = '';
    if (name === 'docker') {
      details += kv('endpoint', p.endpoint || 'unix:///var/run/docker.sock');
      if (p.network) details += kv('network', p.network);
      if (p.exposedByDefault != null) details += kv('exposedByDefault', String(p.exposedByDefault));
    } else if (name === 'kubernetes' || name === 'kubernetesCRD' || name === 'kubernetesIngress') {
      if (p.namespaces) details += kv('namespaces', Array.isArray(p.namespaces) ? p.namespaces.join(', ') : p.namespaces);
      if (p.ingressClass) details += kv('ingressClass', p.ingressClass);
    } else if (name === 'file') {
      if (p.directory) details += kv('directory', p.directory);
      if (p.filename) details += kv('filename', p.filename);
      if (p.watch != null) details += kv('watch', String(p.watch));
    }
    return `<div class="tf-card"><div class="tf-card-name">${esc(name)}</div>${details}</div>`;
  });

  const providersHtml = providerNames.length ? `
<div class="tf-sec"><h3>Providers (${providerNames.length})</h3>
${providerCards.join('')}
</div>` : '';

  // Certificate resolvers (ACME)
  const certResolvers = cfg.certificatesResolvers || cfg.certificateResolvers || {};
  const resolverEntries = Object.entries(certResolvers);

  const certHtml = resolverEntries.length ? `
<div class="tf-sec"><h3>Certificate Resolvers (${resolverEntries.length})</h3>
${resolverEntries.map(([name, r]) => {
    const acme = r?.acme || {};
    const email = acme.email || '';
    const storage = acme.storage || '';
    const caServer = acme.caServer || '';
    const challengeType = acme.httpChallenge ? 'HTTP-01' : acme.tlsChallenge ? 'TLS-ALPN-01' : acme.dnsChallenge ? `DNS (${acme.dnsChallenge.provider || ''})` : '';
    return `<div class="tf-card">
<div class="tf-card-name">${esc(name)} <span class="tf-pill acme">ACME</span></div>
${kv('email', email)}
${kv('storage', storage)}
${challengeType ? kv('challenge', challengeType) : ''}
${caServer ? kv('caServer', caServer) : ''}
</div>`;
  }).join('')}
</div>` : '';

  // Logging and API
  const accessLog = cfg.accessLog;
  const apiCfg = cfg.api || {};
  const logCfg = cfg.log || {};
  const logLevel = logCfg.level || '';
  const dashboard = apiCfg.dashboard;
  const apiInsecure = apiCfg.insecure;

  const miscItems = [];
  if (logLevel) miscItems.push(kv('log level', logLevel));
  if (accessLog != null) miscItems.push(`<div class="tf-kv"><span class="tf-kv-k">access log</span><span class="tf-pill ${accessLog ? 'on' : 'off'}">${accessLog ? 'enabled' : 'disabled'}</span></div>`);
  if (dashboard != null) miscItems.push(`<div class="tf-kv"><span class="tf-kv-k">dashboard</span><span class="tf-pill ${dashboard ? 'on' : 'off'}">${dashboard ? 'enabled' : 'disabled'}</span></div>`);
  if (apiInsecure) miscItems.push('<div class="tf-kv"><span class="tf-kv-k">api.insecure</span><span class="tf-pill" style="background:#fff7ed;border-color:#fed7aa;color:#c2410c;">true — dashboard exposed!</span></div>');

  const miscHtml = miscItems.length ? `<div class="tf-sec"><h3>Logging &amp; API</h3><div class="tf-card">${miscItems.join('')}</div></div>` : '';

  // Summary
  const httpEp = epEntries.find(([n]) => n === 'web' || n === 'http');
  const httpsEp = epEntries.find(([n]) => n === 'websecure' || n === 'https');
  const httpPort = httpEp ? (httpEp[1]?.address || '').replace(/^[^:]*:/, '') : '';
  const httpsPort = httpsEp ? (httpsEp[1]?.address || '').replace(/^[^:]*:/, '') : '';

  const subParts = [
    httpPort ? `:${httpPort}` : '',
    httpsPort ? `:${httpsPort} (TLS)` : '',
    providerNames.length ? `providers: ${providerNames.join(', ')}` : '',
    resolverEntries.length ? `${resolverEntries.length} cert resolver${resolverEntries.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  host.className = 'tf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-tf">Traefik</span>
  <span class="tf-title">Proxy Configuration</span>
  ${providerNames.map((p) => `<span class="tf-tag">${esc(p)}</span>`).join('')}
</div>
<div class="tf-sub">${esc(sub)}</div>
${epHtml}${providersHtml}${certHtml}${miscHtml}`;
  return { parentNode: host };
}
