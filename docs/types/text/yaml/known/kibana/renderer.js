// Kibana kibana.yml enhanced view.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kibana-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-kibana{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F04E98;color:#fff;vertical-align:middle;margin-right:8px;}
.kibana-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.kibana-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.kibana-sec{margin:14px 0;}
.kibana-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.kibana-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.kibana-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.kibana-kv-k{color:var(--fg-2,#888);min-width:240px;font-family:ui-monospace,monospace;}
.kibana-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.kibana-pills{display:flex;flex-wrap:wrap;gap:6px;}
.kibana-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.kibana-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.kibana-pill.off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.kibana-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.kibana-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fdf2f8;border:1px solid #f9a8d4;color:#9d174d;margin-left:4px;}
.kibana-masked{color:var(--fg-2,#888);font-family:ui-monospace,monospace;letter-spacing:.05em;}
`;

const SECRET_PATTERN = /password|secret|key|token/i;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="kibana-kv"><span class="kibana-kv-k">${esc(label)}</span><span class="kibana-kv-v">${esc(String(value))}</span></div>`;
}

function kvMasked(label, value) {
  if (value == null || value === '') return '';
  return `<div class="kibana-kv"><span class="kibana-kv-k">${esc(label)}</span><span class="kibana-masked">[configured]</span></div>`;
}

function asList(v) {
  if (Array.isArray(v)) return v.map(String);
  if (v != null) return [String(v)];
  return [];
}

// Walk nested object to resolve dotted-key paths like "server.host"
function deepGet(doc, key) {
  if (doc == null) return undefined;
  if (Object.prototype.hasOwnProperty.call(doc, key)) return doc[key];
  const parts = key.split('.');
  let cur = doc;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) { cur = cur[p]; } else { return undefined; }
  }
  return cur;
}

function isSensitiveKey(k) {
  return SECRET_PATTERN.test(k);
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  // Server section
  const serverHost = deepGet(cfg, 'server.host') ?? deepGet(cfg, 'server')?.host ?? '';
  const serverPort = deepGet(cfg, 'server.port') ?? deepGet(cfg, 'server')?.port ?? '';
  const serverName = deepGet(cfg, 'server.name') ?? deepGet(cfg, 'server')?.name ?? '';
  const serverPublicBaseUrl = deepGet(cfg, 'server.publicBaseUrl') ?? deepGet(cfg, 'server')?.publicBaseUrl ?? '';

  // Elasticsearch section
  const esSection = deepGet(cfg, 'elasticsearch') || {};
  const esHosts = asList(deepGet(cfg, 'elasticsearch.hosts') ?? esSection.hosts ?? []);
  const esUsername = deepGet(cfg, 'elasticsearch.username') ?? esSection.username ?? '';
  const esPassword = deepGet(cfg, 'elasticsearch.password') ?? esSection.password ?? '';
  const esSslVerify = deepGet(cfg, 'elasticsearch.ssl.verificationMode') ?? esSection.ssl?.verificationMode ?? '';

  // X-Pack Security
  const xpackSection = deepGet(cfg, 'xpack') || {};
  const secSection = xpackSection.security || {};
  const secEnabled = deepGet(cfg, 'xpack.security.enabled') ?? secSection.enabled;
  const secEncKey = deepGet(cfg, 'xpack.security.encryptionKey') ?? secSection.encryptionKey ?? '';
  const secIdleTimeout = deepGet(cfg, 'xpack.security.session.idleTimeout') ?? secSection.session?.idleTimeout ?? '';

  // Saved objects
  const savedObjKey = deepGet(cfg, 'xpack.encryptedSavedObjects.encryptionKey') ?? xpackSection.encryptedSavedObjects?.encryptionKey ?? '';

  // Reporting
  const reportingKey = deepGet(cfg, 'xpack.reporting.encryptionKey') ?? xpackSection.reporting?.encryptionKey ?? '';

  // Logging
  const loggingSection = deepGet(cfg, 'logging') || {};
  const loggingRootLevel = deepGet(cfg, 'logging.root.level') ?? loggingSection.root?.level ?? '';
  const loggingAppenders = loggingSection.appenders || {};
  const appenderTypes = Object.values(loggingAppenders)
    .map((a) => (a && a.type) ? a.type : null)
    .filter(Boolean);

  // Fleet
  const fleetEnabled = deepGet(cfg, 'xpack.fleet.enabled') ?? xpackSection.fleet?.enabled;

  // Build subtitle
  const subParts = [];
  if (serverHost) subParts.push(serverHost);
  if (serverPort) subParts.push(`:${serverPort}`);
  if (serverName) subParts.push(serverName);

  // Server section HTML
  const serverHtml = (serverHost || serverPort || serverName || serverPublicBaseUrl) ? `
<div class="kibana-sec"><h3>Server</h3><div class="kibana-card">
${kv('server.host', serverHost)}
${kv('server.port', serverPort)}
${kv('server.name', serverName)}
${kv('server.publicBaseUrl', serverPublicBaseUrl)}
</div></div>` : '';

  // Elasticsearch section HTML
  const esHtml = (esHosts.length || esUsername || esPassword || esSslVerify) ? `
<div class="kibana-sec"><h3>Elasticsearch</h3><div class="kibana-card">
${esHosts.length ? `<div class="kibana-kv"><span class="kibana-kv-k">elasticsearch.hosts</span><div class="kibana-pills">${esHosts.map((h) => `<span class="kibana-pill">${esc(h)}</span>`).join('')}</div></div>` : ''}
${esUsername ? `<div class="kibana-kv"><span class="kibana-kv-k">elasticsearch.username</span><span class="kibana-kv-v">${esc(esUsername)}</span></div>` : ''}
${esPassword ? kvMasked('elasticsearch.password', esPassword) : ''}
${kv('elasticsearch.ssl.verificationMode', esSslVerify)}
</div></div>` : '';

  // Security section HTML
  const secEnabledStr = secEnabled != null ? String(secEnabled) : '';
  const secEnabledOn = secEnabledStr === 'true';
  const secEnabledOff = secEnabledStr === 'false';
  const secHtml = (secEnabledStr || secEncKey || secIdleTimeout || savedObjKey || reportingKey) ? `
<div class="kibana-sec"><h3>Security</h3><div class="kibana-card">
${secEnabledStr ? `<div class="kibana-kv"><span class="kibana-kv-k">xpack.security.enabled</span><span class="kibana-pill ${secEnabledOn ? 'on' : secEnabledOff ? 'off' : ''}">${esc(secEnabledStr)}</span></div>` : ''}
${secEncKey ? kvMasked('xpack.security.encryptionKey', secEncKey) : ''}
${kv('xpack.security.session.idleTimeout', secIdleTimeout)}
${savedObjKey ? kvMasked('xpack.encryptedSavedObjects.encryptionKey', savedObjKey) : ''}
${reportingKey ? kvMasked('xpack.reporting.encryptionKey', reportingKey) : ''}
</div></div>` : '';

  // Logging section HTML
  const loggingHtml = (loggingRootLevel || appenderTypes.length) ? `
<div class="kibana-sec"><h3>Logging</h3><div class="kibana-card">
${kv('logging.root.level', loggingRootLevel)}
${appenderTypes.length ? `<div class="kibana-kv"><span class="kibana-kv-k">logging.appenders types</span><div class="kibana-pills">${appenderTypes.map((t) => `<span class="kibana-pill">${esc(t)}</span>`).join('')}</div></div>` : ''}
</div></div>` : '';

  // Fleet section HTML
  const fleetEnabledStr = fleetEnabled != null ? String(fleetEnabled) : '';
  const fleetHtml = fleetEnabledStr ? `
<div class="kibana-sec"><h3>Fleet</h3><div class="kibana-card">
<div class="kibana-kv"><span class="kibana-kv-k">xpack.fleet.enabled</span><span class="kibana-pill ${fleetEnabledStr === 'true' ? 'on' : 'off'}">${esc(fleetEnabledStr)}</span></div>
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'kibana-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-kibana">Kibana</span>
  <span class="kibana-title">${esc(serverName || 'Kibana Configuration')}</span>
  ${serverPort ? `<span class="kibana-tag">:${esc(String(serverPort))}</span>` : ''}
</div>
<div class="kibana-sub">${esc(subParts.join(' · '))}</div>
${serverHtml}${esHtml}${secHtml}${loggingHtml}${fleetHtml}`;

  return { parentNode: host };
}
