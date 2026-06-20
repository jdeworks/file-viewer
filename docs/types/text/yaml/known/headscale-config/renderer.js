import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hscale-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-hscale{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5c6bc0;color:#fff;vertical-align:middle;margin-right:8px;}
.hscale-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hscale-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.hscale-sec{margin:14px 0;}
.hscale-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.hscale-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.hscale-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:4px 0;}
.hscale-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.hscale-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;word-break:break-all;}
.hscale-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px;}
.hscale-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
`;

function row(k, v) {
  if (v == null || v === '') return '';
  return `<span class="hscale-k">${esc(k)}</span><span class="hscale-v">${esc(String(v))}</span>`;
}

function pathOnly(p) {
  // Show path but NOT file contents — safe display
  if (p == null || p === '') return '';
  return `<span class="hscale-k">${esc('private_key_path')}</span><span class="hscale-v">${esc(String(p))}</span>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const serverUrl = cfg.server_url || '';
  const listenAddr = cfg.listen_addr || '';
  const metricsAddr = cfg.metrics_listen_addr || '';
  const grpcAddr = cfg.grpc_listen_addr || '';
  const privateKeyPath = cfg.private_key_path || '';
  const noiseKeyPath = cfg.noise?.private_key_path || '';
  const ipPrefixes = Array.isArray(cfg.ip_prefixes) ? cfg.ip_prefixes : [];
  const dbType = cfg.db_type || (cfg.database?.type) || '';
  const dbPath = cfg.db_path || (cfg.database?.sqlite?.path) || '';
  const logLevel = cfg.log?.level || cfg.log_level || '';
  const dnsBaseDomain = cfg.dns_config?.base_domain || cfg.dns?.base_domain || '';
  const nameservers = Array.isArray(cfg.dns_config?.nameservers)
    ? cfg.dns_config.nameservers
    : Array.isArray(cfg.dns?.nameservers)
    ? cfg.dns.nameservers
    : [];
  const derpEnabled = cfg.derp?.server?.enabled ?? null;
  const derpUrls = Array.isArray(cfg.derp?.urls) ? cfg.derp.urls : [];

  // Summary
  const subParts = [
    serverUrl ? serverUrl : null,
    dbType ? `db: ${dbType}` : null,
    ipPrefixes.length ? `${ipPrefixes.length} IP prefix${ipPrefixes.length !== 1 ? 'es' : ''}` : null,
    logLevel ? `log: ${logLevel}` : null,
  ].filter(Boolean).join(' · ');

  // Server section
  const serverRows = [
    row('server_url', serverUrl),
    row('listen_addr', listenAddr),
    row('grpc_listen_addr', grpcAddr),
    row('metrics_listen_addr', metricsAddr),
  ].filter(Boolean).join('');
  const serverHtml = serverRows ? `<div class="hscale-sec"><h3>Server</h3><div class="hscale-card"><div class="hscale-kv">${serverRows}</div></div></div>` : '';

  // Database section
  const dbRows = [
    row('db_type', dbType),
    row('db_path', dbPath),
  ].filter(Boolean).join('');
  const dbHtml = dbRows ? `<div class="hscale-sec"><h3>Database</h3><div class="hscale-card"><div class="hscale-kv">${dbRows}</div></div></div>` : '';

  // DERP section
  let derpContent = '';
  if (derpEnabled !== null) derpContent += `<span class="hscale-k">server.enabled</span><span class="hscale-v">${esc(String(derpEnabled))}</span>`;
  if (derpUrls.length) derpContent += `<span class="hscale-k">urls</span><span class="hscale-v">${derpUrls.slice(0, 3).map(esc).join(', ')}${derpUrls.length > 3 ? ` +${derpUrls.length - 3} more` : ''}</span>`;
  const derpHtml = derpContent ? `<div class="hscale-sec"><h3>DERP</h3><div class="hscale-card"><div class="hscale-kv">${derpContent}</div></div></div>` : '';

  // DNS section
  let dnsContent = '';
  if (dnsBaseDomain) dnsContent += `<span class="hscale-k">base_domain</span><span class="hscale-v">${esc(dnsBaseDomain)}</span>`;
  if (nameservers.length) dnsContent += `<span class="hscale-k">nameservers</span><span class="hscale-v">${nameservers.slice(0, 4).map(esc).join(', ')}</span>`;
  const dnsHtml = dnsContent ? `<div class="hscale-sec"><h3>DNS</h3><div class="hscale-card"><div class="hscale-kv">${dnsContent}</div></div></div>` : '';

  // IP prefixes section
  const ipHtml = ipPrefixes.length ? `<div class="hscale-sec"><h3>IP Prefixes</h3><div style="display:flex;flex-wrap:wrap;gap:4px">${ipPrefixes.map((p) => `<span class="hscale-pill">${esc(p)}</span>`).join('')}</div></div>` : '';

  // Security section — show paths only, never contents
  let secContent = '';
  if (privateKeyPath) secContent += pathOnly(privateKeyPath);
  if (noiseKeyPath) secContent += `<span class="hscale-k">noise.private_key_path</span><span class="hscale-v">${esc(noiseKeyPath)}</span>`;
  const secHtml = secContent ? `<div class="hscale-sec"><h3>Security</h3><div class="hscale-card"><div class="hscale-kv">${secContent}</div></div></div>` : '';

  // Logging section
  const logHtml = logLevel ? `<div class="hscale-sec"><h3>Logging</h3><div class="hscale-card"><div class="hscale-kv"><span class="hscale-k">log.level</span><span class="hscale-v">${esc(logLevel)}</span></div></div></div>` : '';

  const host = document.createElement('div');
  host.className = 'hscale-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="hscale-title"><span class="badge-hscale">Headscale</span>VPN Control Plane Config</div>
<div class="hscale-sub">${esc(subParts)}</div>
${serverHtml}${dbHtml}${derpHtml}${dnsHtml}${ipHtml}${secHtml}${logHtml}`;

  return { parentNode: host };
}
