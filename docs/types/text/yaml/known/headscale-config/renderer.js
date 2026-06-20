import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hscale-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-hscale{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e1e2e;color:#fff;vertical-align:middle;margin-right:8px;}
.hscale-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hscale-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.hscale-sec{margin:14px 0;}
.hscale-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.hscale-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.hscale-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:4px 0;}
.hscale-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.hscale-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;word-break:break-all;}
.hscale-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.hscale-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.hscale-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.hscale-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.hscale-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.hscale-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
`;

function row(k, v) {
  if (v == null || v === '') return '';
  return `<span class="hscale-k">${esc(k)}</span><span class="hscale-v">${esc(String(v))}</span>`;
}

function maskedRow(k) {
  return `<span class="hscale-k">${esc(k)}</span><span class="hscale-masked">[configured]</span>`;
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="hscale-chip${cls ? ' hscale-chip-' + cls : ''}">${esc(String(val))}</span>`;
}

function boolChip(val) {
  if (val === true || val === 'true') return chip('enabled', 'green');
  if (val === false || val === 'false') return chip('disabled', 'gray');
  return chip(String(val), 'gray');
}

function section(title, innerHtml) {
  if (!innerHtml) return '';
  return `<div class="hscale-sec"><h3>${title}</h3><div class="hscale-card"><div class="hscale-kv">${innerHtml}</div></div></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  // Server
  const serverUrl = cfg.server_url || '';
  const listenAddr = cfg.listen_addr || '';
  const metricsAddr = cfg.metrics_listen_addr || '';
  const grpcAddr = cfg.grpc_listen_addr || '';

  // TLS
  const tlsHostname = cfg.tls_letsencrypt_hostname || '';
  const tlsListen = cfg.tls_letsencrypt_listen || '';
  const tlsCert = cfg.tls_cert_path || '';
  const tlsKey = cfg.tls_key_path || '';

  // Database
  const dbType = cfg.db_type || cfg.database?.type || '';
  const dbPath = cfg.db_path || cfg.database?.sqlite?.path || '';
  const dbHost = cfg.database?.postgres?.host || cfg.db_host || '';
  const dbPort = cfg.database?.postgres?.port || cfg.db_port || '';
  const dbUser = cfg.database?.postgres?.user || cfg.db_user || '';
  const dbName = cfg.database?.postgres?.name || cfg.db_name || '';

  // DNS
  const magicDns = cfg.dns_config?.magic_dns ?? cfg.dns?.magic_dns ?? null;
  const dnsBaseDomain = cfg.dns_config?.base_domain || cfg.dns?.base_domain || '';
  const nameservers = Array.isArray(cfg.dns_config?.nameservers)
    ? cfg.dns_config.nameservers
    : Array.isArray(cfg.dns?.nameservers) ? cfg.dns.nameservers : [];

  // IP Prefixes
  const ipPrefixes = Array.isArray(cfg.ip_prefixes) ? cfg.ip_prefixes : [];

  // DERP
  const derpEnabled = cfg.derp?.server?.enabled ?? null;
  const derpUrls = Array.isArray(cfg.derp?.urls) ? cfg.derp.urls : [];

  // OIDC
  const oidcIssuer = cfg.oidc?.issuer || '';
  const oidcClientId = cfg.oidc?.client_id || '';
  const oidcSecret = cfg.oidc?.client_secret;
  const oidcScope = Array.isArray(cfg.oidc?.scope) ? cfg.oidc.scope.join(', ') : (cfg.oidc?.scope || '');

  // Keys
  const privateKeyPath = cfg.private_key_path || '';
  const noiseKeyPath = cfg.noise?.private_key_path || '';

  // Log
  const logLevel = cfg.log?.level || cfg.log_level || '';

  // Summary
  const subParts = [
    serverUrl || null,
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

  // TLS section
  const tlsRows = [
    row('tls_letsencrypt_hostname', tlsHostname),
    row('tls_letsencrypt_listen', tlsListen),
    row('tls_cert_path', tlsCert),
    row('tls_key_path', tlsKey),
  ].filter(Boolean).join('');

  // Database section
  let dbRows = '';
  if (dbType) {
    dbRows += `<span class="hscale-k">db_type</span><span class="hscale-v">${chip(dbType, dbType === 'sqlite' || dbType === 'sqlite3' ? 'blue' : 'green')}</span>`;
  }
  if (dbPath) dbRows += row('db_path', dbPath);
  if (dbHost) {
    dbRows += row('db_host', dbHost);
    if (dbPort) dbRows += row('db_port', String(dbPort));
    if (dbUser) dbRows += row('db_user', dbUser);
    if (dbName) dbRows += row('db_name', dbName);
    // db password is always masked if postgres
    dbRows += maskedRow('db_password');
  }

  // DNS section
  let dnsRows = '';
  if (magicDns !== null) {
    dnsRows += `<span class="hscale-k">magic_dns</span><span class="hscale-v">${boolChip(magicDns)}</span>`;
  }
  if (dnsBaseDomain) dnsRows += row('base_domain', dnsBaseDomain);
  if (nameservers.length) {
    dnsRows += `<span class="hscale-k">nameservers</span><span class="hscale-v">${nameservers.slice(0, 4).map(esc).join(', ')}</span>`;
  }

  // IP Prefixes section
  const ipHtml = ipPrefixes.length
    ? `<div class="hscale-sec"><h3>IP Prefixes</h3><div style="display:flex;flex-wrap:wrap;gap:4px">${ipPrefixes.map((p) => `<span class="hscale-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  // DERP section
  let derpRows = '';
  if (derpEnabled !== null) {
    derpRows += `<span class="hscale-k">server.enabled</span><span class="hscale-v">${boolChip(derpEnabled)}</span>`;
  }
  if (derpUrls.length) {
    derpRows += `<span class="hscale-k">urls</span><span class="hscale-v">${derpUrls.slice(0, 3).map(esc).join(', ')}${derpUrls.length > 3 ? ` +${derpUrls.length - 3} more` : ''}</span>`;
  }

  // OIDC section
  let oidcRows = '';
  if (oidcIssuer) oidcRows += row('oidc.issuer', oidcIssuer);
  if (oidcClientId) oidcRows += row('oidc.client_id', oidcClientId);
  if (oidcSecret != null) oidcRows += maskedRow('oidc.client_secret');
  if (oidcScope) oidcRows += row('oidc.scope', oidcScope);

  // Security / Keys section — paths only, never content
  let secRows = '';
  if (privateKeyPath) secRows += row('private_key_path', privateKeyPath);
  if (noiseKeyPath) secRows += row('noise.private_key_path', noiseKeyPath);

  // Logging section
  const logRows = logLevel ? row('log.level', logLevel) : '';

  const host = document.createElement('div');
  host.className = 'hscale-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="hscale-title"><span class="badge-hscale">Headscale</span>VPN Control Plane Config</div>
<div class="hscale-sub">${esc(subParts)}</div>
${section('Server', serverRows)}
${section('TLS', tlsRows)}
${section('Database', dbRows)}
${section('DNS', dnsRows)}
${ipHtml}
${section('DERP', derpRows)}
${section('OIDC', oidcRows)}
${section('Security', secRows)}
${section('Logging', logRows)}`;

  return { parentNode: host };
}
