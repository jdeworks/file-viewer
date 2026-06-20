import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.harbor-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-harbor{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0052CC;color:#fff;vertical-align:middle;margin-right:8px;}
.harbor-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.harbor-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.harbor-sec{margin:14px 0;}
.harbor-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.harbor-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.harbor-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:13px;}
.harbor-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;}
.harbor-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.harbor-masked{color:var(--fg-2,#888);font-style:italic;}
.harbor-pill{display:inline-block;font-size:12px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0;}
.harbor-pill-on{background:#d1fae5;border-color:#6ee7b7;color:#065f46;}
.harbor-pill-off{background:#fee2e2;border-color:#fca5a5;color:#7f1d1d;}
.harbor-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media(max-width:560px){.harbor-grid{grid-template-columns:1fr;}}
`;

const SECRET_RE = /password|secret|key|token/i;

function masked() {
  return `<span class="harbor-masked">[configured]</span>`;
}

function kv(label, value, isSecret = false) {
  if (value == null || value === '') return '';
  const secret = isSecret || SECRET_RE.test(label);
  const display = secret ? masked() : `<span class="harbor-kv-v">${esc(String(value))}</span>`;
  return `<div class="harbor-kv"><span class="harbor-kv-k">${esc(label)}</span>${display}</div>`;
}

function boolPill(label, value) {
  if (value == null) return '';
  const on = value === true || value === 'true' || value === 'on';
  const cls = on ? 'harbor-pill-on' : 'harbor-pill-off';
  const text = on ? 'enabled' : 'disabled';
  return `<div class="harbor-kv"><span class="harbor-kv-k">${esc(label)}</span><span class="harbor-pill ${cls}">${text}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  // ── Core settings ──
  const hostname = cfg.hostname || '';
  const httpPort = cfg.http?.port ?? cfg.port ?? '';
  const httpsPort = cfg.https?.port ?? '';

  const coreHtml = (hostname || httpPort || httpsPort) ? `
<div class="harbor-sec"><h3>Core Settings</h3><div class="harbor-card">
${kv('hostname', hostname)}
${httpPort !== '' ? kv('http port', httpPort) : ''}
${httpsPort !== '' ? kv('https port', httpsPort) : ''}
</div></div>` : '';

  // ── Database ──
  const db = cfg.database || cfg.db || {};
  const dbHtml = Object.keys(db).length ? `
<div class="harbor-sec"><h3>Database</h3><div class="harbor-card">
${kv('host', db.host || db.db_host)}
${kv('port', db.port || db.db_port)}
${kv('name', db.name || db.db_name || db.database)}
${kv('db_password', db.password || db.db_password, true)}
${kv('sslmode', db.sslmode)}
</div></div>` : '';

  // ── TLS ──
  const tlsCfg = cfg.https || cfg.tls || {};
  const tlsEnabled = cfg.https != null || cfg.tls?.enabled === true;
  const certPath = tlsCfg.certificate || tlsCfg.cert_path || tlsCfg.cert || '';
  const tlsHtml = tlsEnabled ? `
<div class="harbor-sec"><h3>TLS</h3><div class="harbor-card">
${boolPill('enabled', true)}
${certPath ? kv('cert_path', certPath) : ''}
</div></div>` : '';

  // ── Storage ──
  const storage = cfg.storage_service || cfg.storage || {};
  const storageType = (Object.keys(storage).find((k) => !['ca_bundle', 'redirect'].includes(k)) || '').toLowerCase();
  const storageDetail = storageType ? (storage[storageType] || {}) : {};
  const storageLoc = storageDetail.location || storageDetail.bucket || storageDetail.accountname || storageDetail.container || storageDetail.rootdirectory || '';
  const storageHtml = storageType ? `
<div class="harbor-sec"><h3>Storage</h3><div class="harbor-card">
${kv('type', storageType)}
${storageLoc ? kv('location / bucket', storageLoc) : ''}
</div></div>` : '';

  // ── Authentication ──
  const authMode = cfg.auth_mode || cfg.authentication?.mode || '';
  const ldap = cfg.ldap || {};
  const oidc = cfg.oidc || {};
  const authHtml = authMode ? `
<div class="harbor-sec"><h3>Authentication</h3><div class="harbor-card">
${kv('auth_mode', authMode)}
${authMode === 'ldap_auth' && ldap.url ? kv('ldap url', ldap.url) : ''}
${authMode === 'ldap_auth' && ldap.uid ? kv('ldap uid', ldap.uid) : ''}
${authMode === 'oidc_auth' && oidc.endpoint ? kv('oidc endpoint', oidc.endpoint) : ''}
${authMode === 'oidc_auth' && oidc.name ? kv('oidc name', oidc.name) : ''}
</div></div>` : '';

  // ── Redis ──
  const redis = cfg.redis || cfg.cache_layer || {};
  const redisHtml = (redis.host || redis.redis_host || redis.addr) ? `
<div class="harbor-sec"><h3>Redis</h3><div class="harbor-card">
${kv('host', redis.host || redis.redis_host || redis.addr)}
${kv('port', redis.port || redis.redis_port)}
${kv('db', redis.db != null ? redis.db : '')}
</div></div>` : '';

  // ── Security flags ──
  const selfReg = cfg.self_registration;
  const readOnly = cfg.read_only;
  const secHtml = (selfReg != null || readOnly != null) ? `
<div class="harbor-sec"><h3>Security Flags</h3><div class="harbor-card">
${selfReg != null ? boolPill('self_registration', selfReg) : ''}
${readOnly != null ? boolPill('read_only', readOnly) : ''}
</div></div>` : '';

  const sub = [
    hostname,
    authMode ? `auth: ${authMode}` : '',
    storageType ? `storage: ${storageType}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'harbor-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-harbor">Harbor</span>
  <span class="harbor-title">Harbor registry</span>
</div>
<div class="harbor-sub">${esc(sub)}</div>
${coreHtml}${dbHtml}${tlsHtml}${storageHtml}${authHtml}${redisHtml}${secHtml}`;
  return { parentNode: host };
}
