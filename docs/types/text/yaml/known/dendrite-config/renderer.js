import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dendrite-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dendrite-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#fff;vertical-align:middle;margin-right:8px;}
.dendrite-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;display:inline;}
.dendrite-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.dendrite-sec{margin:14px 0;}
.dendrite-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.dendrite-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.dendrite-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;flex-wrap:wrap;}
.dendrite-kv-k{color:var(--fg-2,#888);min-width:200px;flex-shrink:0;font-size:12px;}
.dendrite-kv-v{font-family:ui-monospace,monospace;word-break:break-all;font-size:12px;}
.dendrite-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;font-size:12px;}
.dendrite-chip{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.dendrite-chip-green{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.dendrite-chip-red{background:#ffebee;border-color:#ef9a9a;color:#b71c1c;}
.dendrite-chip-blue{background:#e3f2fd;border-color:#90caf9;color:#0d47a1;}
`;

function kv(label, valueHtml) {
  if (!valueHtml) return '';
  return `<div class="dendrite-kv"><span class="dendrite-kv-k">${esc(label)}</span><span class="dendrite-kv-v">${valueHtml}</span></div>`;
}

function kvText(label, value) {
  if (value == null || value === '') return '';
  return kv(label, esc(String(value)));
}

function kvMasked(label, exists) {
  if (!exists) return '';
  return `<div class="dendrite-kv"><span class="dendrite-kv-k">${esc(label)}</span><span class="dendrite-masked">[configured]</span></div>`;
}

function chip(label, cls) {
  return `<span class="dendrite-chip${cls ? ' dendrite-chip-' + cls : ''}">${esc(label)}</span>`;
}

function boolChip(val) {
  const v = String(val ?? '').toLowerCase();
  if (v === 'true' || v === '1') return chip('enabled', 'green');
  if (v === 'false' || v === '0') return chip('disabled', 'red');
  return chip(String(val));
}

function maskDsn(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function formatBytes(n) {
  const num = Number(n);
  if (!num || isNaN(num)) return String(n);
  return (num / 1024 / 1024).toFixed(1) + ' MB';
}

function getDeep(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const global = cfg.global || {};
  const serverName = global.server_name || '';
  const privateKey = global.private_key || '';
  const trustedIdServers = Array.isArray(global.trusted_third_party_id_servers) ? global.trusted_third_party_id_servers : [];
  const kafkaAddresses = Array.isArray(getDeep(global, 'kafka.addresses')) ? getDeep(global, 'kafka.addresses') : [];

  const globalDb = global.database_options || global.database || null;
  const clientApi = cfg.client_api || {};
  const mediaApi = cfg.media_api || {};
  const federationSender = cfg.federation_sender || {};
  const federationApi = cfg.federation_api || cfg.federation || {};
  const metricsSection = global.metrics || {};
  const loggingArr = Array.isArray(global.logging) ? global.logging : [];
  const logging0 = loggingArr[0] || {};

  // Sub-title
  const subParts = [
    serverName ? `server: ${serverName}` : null,
    globalDb ? 'global DB' : 'per-component DBs',
  ].filter(Boolean).join(' · ');

  // Global section
  const globalRows = [
    kvText('server_name', serverName),
    privateKey ? kv('private_key', `<span class="dendrite-kv-v">${esc(privateKey)}</span>`) : '',
    trustedIdServers.length ? kv('trusted_id_servers', trustedIdServers.map((s) => chip(s, 'blue')).join(' ')) : '',
    kafkaAddresses.length ? kv('kafka.addresses', kafkaAddresses.map((a) => chip(a)).join(' ')) : '',
  ].filter(Boolean).join('');
  const globalHtml = globalRows
    ? `<div class="dendrite-sec"><h3>Global</h3><div class="dendrite-card">${globalRows}</div></div>`
    : '';

  // Database section — global or per-component
  let dbHtml = '';
  if (globalDb) {
    const connStr = globalDb.connection_string || globalDb.conn_string || null;
    const maxOpen = globalDb.max_open_conns != null ? globalDb.max_open_conns : null;
    const maxIdle = globalDb.max_idle_conns != null ? globalDb.max_idle_conns : null;
    const maskedConn = connStr ? maskDsn(connStr) : null;
    const dbRows = [
      maskedConn ? kv('connection_string', `<span class="dendrite-kv-v">${esc(maskedConn)}</span>`) : '',
      maxOpen != null ? kvText('max_open_conns', maxOpen) : '',
      maxIdle != null ? kvText('max_idle_conns', maxIdle) : '',
    ].filter(Boolean).join('');
    if (dbRows) dbHtml = `<div class="dendrite-sec"><h3>Database (global)</h3><div class="dendrite-card">${dbRows}</div></div>`;
  } else {
    // Per-component — show components that have a database key
    const components = ['appservice_api', 'client_api', 'federation_api', 'federation_sender',
      'key_server', 'media_api', 'mscs', 'room_server', 'signing_key_server',
      'sync_api', 'user_api'];
    const rows = [];
    for (const comp of components) {
      const compCfg = cfg[comp];
      if (!compCfg) continue;
      const db = compCfg.database || compCfg.database_options;
      if (!db) continue;
      const connStr = db.connection_string || db.conn_string || '';
      const masked = connStr ? maskDsn(connStr) : '';
      if (masked) rows.push(kv(comp, `<span class="dendrite-kv-v">${esc(masked)}</span>`));
    }
    if (rows.length) dbHtml = `<div class="dendrite-sec"><h3>Database (per-component)</h3><div class="dendrite-card">${rows.join('')}</div></div>`;
  }

  // Client API section
  const regDisabled = clientApi.registration_disabled;
  const guestsDisabled = clientApi.guests_disabled;
  const regSecret = clientApi.registration_shared_secret;
  const clientRows = [
    regDisabled != null ? kv('registration_disabled', boolChip(regDisabled)) : '',
    guestsDisabled != null ? kv('guests_disabled', boolChip(guestsDisabled)) : '',
    regSecret != null ? kvMasked('registration_shared_secret', true) : '',
  ].filter(Boolean).join('');
  const clientHtml = clientRows
    ? `<div class="dendrite-sec"><h3>Client API</h3><div class="dendrite-card">${clientRows}</div></div>`
    : '';

  // Media API section
  const maxFileSize = mediaApi.max_file_size_bytes;
  const dynamicThumbs = mediaApi.dynamic_thumbnails;
  const basePath = mediaApi.base_path || mediaApi.base_uri || null;
  const mediaRows = [
    maxFileSize != null ? kvText('max_file_size_bytes', formatBytes(maxFileSize)) : '',
    dynamicThumbs != null ? kv('dynamic_thumbnails', boolChip(dynamicThumbs)) : '',
    basePath ? kvText('base_path', basePath) : '',
  ].filter(Boolean).join('');
  const mediaHtml = mediaRows
    ? `<div class="dendrite-sec"><h3>Media API</h3><div class="dendrite-card">${mediaRows}</div></div>`
    : '';

  // Federation section
  const sendMaxRetriesSender = federationSender.send_max_retries;
  const sendMaxRetriesApi = federationApi.send_max_retries;
  const fedRows = [
    sendMaxRetriesSender != null ? kvText('federation_sender.send_max_retries', sendMaxRetriesSender) : '',
    sendMaxRetriesApi != null ? kvText('federation_api.send_max_retries', sendMaxRetriesApi) : '',
  ].filter(Boolean).join('');
  const fedHtml = fedRows
    ? `<div class="dendrite-sec"><h3>Federation</h3><div class="dendrite-card">${fedRows}</div></div>`
    : '';

  // Metrics section
  const metricsEnabled = metricsSection.enabled;
  const metricsUser = getDeep(metricsSection, 'basic_auth.username');
  const hasMetricsPass = getDeep(metricsSection, 'basic_auth.password') != null;
  const metricsRows = [
    metricsEnabled != null ? kv('enabled', boolChip(metricsEnabled)) : '',
    metricsUser != null ? kvText('basic_auth.username', metricsUser) : '',
    hasMetricsPass ? kvMasked('basic_auth.password', true) : '',
  ].filter(Boolean).join('');
  const metricsHtml = metricsRows
    ? `<div class="dendrite-sec"><h3>Metrics</h3><div class="dendrite-card">${metricsRows}</div></div>`
    : '';

  // Logging section
  const logType = logging0.type || null;
  const logLevel = logging0.level || null;
  const logRows = [
    logType ? kv('type', chip(logType, 'blue')) : '',
    logLevel ? kv('level', chip(logLevel)) : '',
  ].filter(Boolean).join('');
  const logHtml = logRows
    ? `<div class="dendrite-sec"><h3>Logging</h3><div class="dendrite-card">${logRows}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'dendrite-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;">
  <span class="dendrite-badge">Dendrite</span>
  <span class="dendrite-title">${esc(serverName || 'dendrite.yaml')}</span>
</div>
<div class="dendrite-sub">${esc(subParts)}</div>
${globalHtml}${dbHtml}${clientHtml}${mediaHtml}${fedHtml}${metricsHtml}${logHtml}`;
  return { parentNode: host };
}
