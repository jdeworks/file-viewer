// Elasticsearch elasticsearch.yml enhanced view.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.es-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-es{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FEC514;color:#1a1200;vertical-align:middle;margin-right:8px;}
.es-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.es-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.es-sec{margin:14px 0;}
.es-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.es-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.es-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.es-kv-k{color:var(--fg-2,#888);min-width:220px;font-family:ui-monospace,monospace;}
.es-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.es-pills{display:flex;flex-wrap:wrap;gap:6px;}
.es-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.es-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.es-pill.off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.es-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.es-pill.node{background:#fef9c3;border-color:#fde047;color:#713f12;}
.es-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;margin-left:4px;}
.es-masked{color:var(--fg-2,#888);font-family:ui-monospace,monospace;letter-spacing:.05em;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="es-kv"><span class="es-kv-k">${esc(label)}</span><span class="es-kv-v">${esc(String(value))}</span></div>`;
}

function asList(v) {
  if (Array.isArray(v)) return v.map(String);
  if (v != null) return [String(v)];
  return [];
}

// Walk a flat-key YAML doc to also support dotted keys like "cluster.name"
function flatGet(doc, ...keys) {
  for (const key of keys) {
    if (doc[key] != null) return doc[key];
    // Try nested: "cluster.name" => doc.cluster?.name
    const parts = key.split('.');
    let cur = doc;
    let found = true;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && cur[p] != null) { cur = cur[p]; } else { found = false; break; }
    }
    if (found && cur !== doc) return cur;
  }
  return undefined;
}

const SECRET_PATTERN = /password|keystore|truststore|keypass|ssl.*key/i;

export async function render(intake) {
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || [])[0] || {}; } catch { /* ignore */ }

  // Support both nested objects and dotted flat keys
  const clusterName = flatGet(doc, 'cluster.name', 'cluster') && typeof flatGet(doc, 'cluster.name', 'cluster') === 'string'
    ? flatGet(doc, 'cluster.name', 'cluster')
    : (doc.cluster && typeof doc.cluster === 'object' ? doc.cluster.name : null) || '';
  const nodeName = (doc.node && typeof doc.node === 'object' ? doc.node.name : null)
    || flatGet(doc, 'node.name') || '';
  const nodeRoles = doc.node && Array.isArray(doc.node.roles) ? doc.node.roles : asList(flatGet(doc, 'node.roles'));

  const networkHost = (doc.network && doc.network.host) || flatGet(doc, 'network.host') || '';
  const httpPort = (doc.http && doc.http.port) || flatGet(doc, 'http.port') || '';
  const transportPort = (doc.transport && doc.transport.port) || flatGet(doc, 'transport.port') || '';

  const discoverySeeds = asList(
    (doc.discovery && doc.discovery.seed_hosts) || flatGet(doc, 'discovery.seed_hosts') || []
  );
  const clusterInitialMasterNodes = asList(
    (doc.cluster && doc.cluster.initial_master_nodes) || flatGet(doc, 'cluster.initial_master_nodes') || []
  );

  // Indices settings
  const indicesSection = doc.indices || {};
  const indicesMemoryBreaker = (indicesSection.memory && indicesSection.memory.index_buffer_size)
    || flatGet(doc, 'indices.memory.index_buffer_size') || '';
  const indicesRecoveryMaxMb = (indicesSection.recovery && indicesSection.recovery.max_bytes_per_sec)
    || flatGet(doc, 'indices.recovery.max_bytes_per_sec') || '';

  // X-Pack security
  const xpackSection = doc.xpack || {};
  const securitySection = (xpackSection.security) || {};
  const xpackSecurityEnabled = securitySection.enabled != null
    ? securitySection.enabled
    : flatGet(doc, 'xpack.security.enabled');
  const xpackSecurityEnabledStr = xpackSecurityEnabled != null ? String(xpackSecurityEnabled) : '';
  const xpackSecurityHttpSsl = (securitySection.http && securitySection.http.ssl && securitySection.http.ssl.enabled) != null
    ? securitySection.http?.ssl?.enabled
    : flatGet(doc, 'xpack.security.http.ssl.enabled');
  const xpackHttpSslStr = xpackSecurityHttpSsl != null ? String(xpackSecurityHttpSsl) : '';

  // Mask any password/keystore values from xpack — check all keys in xpack section
  const maskedXpackKeys = [];
  function walkForSecrets(obj, prefix = '') {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (SECRET_PATTERN.test(k)) {
        maskedXpackKeys.push(fullKey);
      } else {
        walkForSecrets(v, fullKey);
      }
    }
  }
  walkForSecrets(xpackSection, 'xpack.security');

  const subParts = [];
  if (clusterName) subParts.push(clusterName);
  if (nodeName) subParts.push(nodeName);
  if (networkHost) subParts.push(networkHost);
  if (httpPort) subParts.push(`:${httpPort}`);

  const identityHtml = (clusterName || nodeName) ? `
<div class="es-sec"><h3>Cluster &amp; Node</h3><div class="es-card">
${kv('cluster.name', clusterName)}
${kv('node.name', nodeName)}
${nodeRoles.length ? `<div class="es-kv"><span class="es-kv-k">node.roles</span><div class="es-pills">${nodeRoles.map((r) => `<span class="es-pill node">${esc(r)}</span>`).join('')}</div></div>` : ''}
</div></div>` : '';

  const networkHtml = (networkHost || httpPort || transportPort) ? `
<div class="es-sec"><h3>Network</h3><div class="es-card">
${kv('network.host', networkHost)}
${kv('http.port', httpPort)}
${kv('transport.port', transportPort)}
</div></div>` : '';

  const discoveryHtml = (discoverySeeds.length || clusterInitialMasterNodes.length) ? `
<div class="es-sec"><h3>Discovery</h3><div class="es-card">
${discoverySeeds.length ? `<div class="es-kv"><span class="es-kv-k">discovery.seed_hosts</span><div class="es-pills">${discoverySeeds.map((s) => `<span class="es-pill">${esc(s)}</span>`).join('')}</div></div>` : ''}
${clusterInitialMasterNodes.length ? `<div class="es-kv"><span class="es-kv-k">cluster.initial_master_nodes</span><div class="es-pills">${clusterInitialMasterNodes.map((n) => `<span class="es-pill">${esc(n)}</span>`).join('')}</div></div>` : ''}
</div></div>` : '';

  const indicesHtml = (indicesMemoryBreaker || indicesRecoveryMaxMb) ? `
<div class="es-sec"><h3>Indices</h3><div class="es-card">
${kv('indices.memory.index_buffer_size', indicesMemoryBreaker)}
${kv('indices.recovery.max_bytes_per_sec', indicesRecoveryMaxMb)}
</div></div>` : '';

  const secEnabled = xpackSecurityEnabledStr === 'true';
  const secDisabled = xpackSecurityEnabledStr === 'false';
  const securityHtml = (xpackSecurityEnabledStr !== '' || xpackHttpSslStr !== '' || maskedXpackKeys.length) ? `
<div class="es-sec"><h3>X-Pack Security</h3><div class="es-card">
${xpackSecurityEnabledStr !== '' ? `<div class="es-kv"><span class="es-kv-k">xpack.security.enabled</span><span class="es-pill ${secEnabled ? 'on' : secDisabled ? 'off' : ''}">${esc(xpackSecurityEnabledStr)}</span></div>` : ''}
${xpackHttpSslStr !== '' ? `<div class="es-kv"><span class="es-kv-k">xpack.security.http.ssl.enabled</span><span class="es-kv-v">${esc(xpackHttpSslStr)}</span></div>` : ''}
${maskedXpackKeys.length ? `<div class="es-kv"><span class="es-kv-k">sensitive keys</span><span class="es-pills">${maskedXpackKeys.map((k) => `<span class="es-pill warn">${esc(k)} <span class="es-masked">= ••••••••</span></span>`).join('')}</span></div>` : ''}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'es-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-es">Elasticsearch</span>
  <span class="es-title">${esc(clusterName || 'Node Configuration')}</span>
  ${httpPort ? `<span class="es-tag">:${esc(httpPort)}</span>` : ''}
</div>
<div class="es-sub">${esc(subParts.join(' · '))}</div>
${identityHtml}${networkHtml}${discoveryHtml}${indicesHtml}${securityHtml}`;

  return { parentNode: host };
}
