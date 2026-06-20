import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.harbor-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.harbor-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e3a5f;color:#fff;vertical-align:middle;margin-right:8px;}
.harbor-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.harbor-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.harbor-sec{margin:14px 0;}
.harbor-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.harbor-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.harbor-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:13px;}
.harbor-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;}
.harbor-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.harbor-masked{color:var(--fg-2,#888);font-style:italic;font-family:ui-monospace,monospace;font-size:12px;}
.harbor-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.harbor-chip-on{background:#d1fae5;border-color:#6ee7b7;color:#065f46;}
.harbor-chip-off{background:#fee2e2;border-color:#fca5a5;color:#7f1d1d;}
`;

function masked() {
  return `<span class="harbor-masked">[configured]</span>`;
}

function kv(label, value, isSecret) {
  if (value == null || value === '') return '';
  const display = isSecret ? masked() : `<span class="harbor-kv-v">${esc(String(value))}</span>`;
  return `<div class="harbor-kv"><span class="harbor-kv-k">${esc(label)}</span>${display}</div>`;
}

function boolChip(label, value) {
  if (value == null) return '';
  const on = value === true || value === 'true' || value === 'on';
  const cls = on ? 'harbor-chip-on' : 'harbor-chip-off';
  const text = on ? 'enabled' : 'disabled';
  return `<div class="harbor-kv"><span class="harbor-kv-k">${esc(label)}</span><span class="harbor-chip ${cls}">${text}</span></div>`;
}

function chip(label, value) {
  if (value == null || value === '') return '';
  return `<div class="harbor-kv"><span class="harbor-kv-k">${esc(label)}</span><span class="harbor-chip">${esc(String(value))}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const host = document.createElement('div');
  host.className = 'harbor-doc';

  const hostname = cfg.hostname || '';

  const sub = [
    hostname,
    cfg.auth_mode ? `auth: ${cfg.auth_mode}` : '',
  ].filter(Boolean).join(' · ');

  let body = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="harbor-badge">Harbor</span>
  <span class="harbor-title">Harbor Config</span>
</div>
<div class="harbor-sub">${esc(sub)}</div>`;

  // Server section
  const httpPort = cfg.http?.port ?? '';
  const httpsPort = cfg.https?.port ?? '';
  const certPath = cfg.https?.certificate || '';
  const keyPath = cfg.https?.private_key || '';
  const serverRows = [
    kv('hostname', hostname),
    httpPort !== '' ? kv('http.port', httpPort) : '',
    httpsPort !== '' ? kv('https.port', httpsPort) : '',
    certPath ? kv('https.certificate', certPath) : '',
    keyPath ? kv('https.private_key', keyPath) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="harbor-sec"><h3>Server</h3><div class="harbor-card">${serverRows}</div></div>`;

  // Admin section
  const adminRows = [
    cfg.harbor_admin_password != null ? kv('harbor_admin_password', cfg.harbor_admin_password, true) : '',
  ].filter(Boolean).join('');
  if (adminRows) body += `<div class="harbor-sec"><h3>Admin</h3><div class="harbor-card">${adminRows}</div></div>`;

  // Database section
  const db = cfg.database || {};
  const dbRows = [
    db.password != null ? kv('database.password', db.password, true) : '',
    db.max_idle_conns != null ? kv('database.max_idle_conns', db.max_idle_conns) : '',
    db.max_open_conns != null ? kv('database.max_open_conns', db.max_open_conns) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="harbor-sec"><h3>Database</h3><div class="harbor-card">${dbRows}</div></div>`;

  // Storage section
  const storage = cfg.storage_service || cfg.storage || {};
  const storageKeys = Object.keys(storage).filter((k) => !['ca_bundle', 'redirect'].includes(k));
  const storageType = storageKeys[0] || '';
  const storageDetail = storageType ? (storage[storageType] || {}) : {};
  const storageLoc = storageDetail.location || storageDetail.bucket || storageDetail.accountname || storageDetail.container || storageDetail.rootdirectory || '';
  const storageCredKeys = Object.keys(storageDetail).filter((k) => /key|secret|account|credential|password|token/i.test(k));
  const storageRows = [
    storageType ? chip('storage type', storageType) : '',
    storageLoc ? kv('location / bucket', storageLoc) : '',
    ...storageCredKeys.map((k) => kv(k, storageDetail[k], true)),
  ].filter(Boolean).join('');
  if (storageRows) body += `<div class="harbor-sec"><h3>Storage</h3><div class="harbor-card">${storageRows}</div></div>`;

  // Redis section
  const redis = cfg.redis || {};
  const redisRows = [
    redis.host ? kv('redis.host', redis.host) : '',
    redis.port != null ? kv('redis.port', redis.port) : '',
    redis.password != null ? kv('redis.password', redis.password, true) : '',
    redis.db_index != null ? kv('redis.db_index', redis.db_index) : (redis.db != null ? kv('redis.db', redis.db) : ''),
  ].filter(Boolean).join('');
  if (redisRows) body += `<div class="harbor-sec"><h3>Redis</h3><div class="harbor-card">${redisRows}</div></div>`;

  // Trivy section
  const trivy = cfg.trivy || {};
  const trivyRows = [
    trivy.ignore_unfixed != null ? boolChip('ignore_unfixed', trivy.ignore_unfixed) : '',
    trivy.skip_update != null ? boolChip('skip_update', trivy.skip_update) : '',
    trivy.offline_scan != null ? boolChip('offline_scan', trivy.offline_scan) : '',
  ].filter(Boolean).join('');
  if (trivyRows) body += `<div class="harbor-sec"><h3>Trivy</h3><div class="harbor-card">${trivyRows}</div></div>`;

  // Log section
  const log = cfg.log || {};
  const logLocal = log.local || {};
  const logRows = [
    log.level ? chip('log.level', log.level) : '',
    logLocal.rotate_count != null ? kv('log.local.rotate_count', logLocal.rotate_count) : '',
    logLocal.rotate_size != null ? kv('log.local.rotate_size', logLocal.rotate_size) : '',
  ].filter(Boolean).join('');
  if (logRows) body += `<div class="harbor-sec"><h3>Log</h3><div class="harbor-card">${logRows}</div></div>`;

  // Proxy section
  const extUrl = cfg.external_url || '';
  const proxy = cfg.proxy || {};
  const proxyRows = [
    extUrl ? kv('external_url', extUrl) : '',
    proxy.http_proxy ? kv('http_proxy', proxy.http_proxy) : '',
    proxy.https_proxy ? kv('https_proxy', proxy.https_proxy) : '',
    proxy.no_proxy ? kv('no_proxy', proxy.no_proxy) : '',
  ].filter(Boolean).join('');
  if (proxyRows) body += `<div class="harbor-sec"><h3>Proxy</h3><div class="harbor-card">${proxyRows}</div></div>`;

  host.innerHTML = body;
  return { parentNode: host };
}
