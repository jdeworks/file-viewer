import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function isSensitiveKey(k) {
  return /secret|password|token|key|api|private/i.test(String(k));
}

const CSS = `
.influxdb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-influxdb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px}
.influxdb-title{font-size:18px;font-weight:700;margin:0 0 4px}
.influxdb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.influxdb-sec{margin:14px 0}
.influxdb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.influxdb-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.influxdb-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.influxdb-kv-k{color:var(--fg-2,#888);min-width:220px;flex-shrink:0}
.influxdb-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.influxdb-chip{display:inline-flex;align-items:center;font-size:11px;padding:3px 9px;border-radius:12px;font-family:ui-monospace,monospace;font-weight:600;margin:2px 4px 2px 0}
.influxdb-chip.on{background:#dcfce7;border:1px solid #86efac;color:#166534}
.influxdb-chip.off{background:#fef2f2;border:1px solid #fca5a5;color:#991b1b}
.influxdb-chip.info{background:#eff6ff;border:1px solid #93c5fd;color:#1e40af}
.influxdb-redact{font-size:11px;color:var(--fg-2,#888);font-style:italic}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="influxdb-kv"><span class="influxdb-kv-k">${esc(label)}</span><span class="influxdb-kv-v">${esc(String(value))}</span></div>`;
}

function chip(val, cls) {
  return `<span class="influxdb-chip ${esc(cls)}">${esc(String(val))}</span>`;
}

function boolChip(val, label) {
  const enabled = val === true || val === 'true';
  return chip(label, enabled ? 'on' : 'off');
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  // Server section
  const bindAddr = cfg['http-bind-address'] || '';
  const tlsCert = cfg['tls-cert'] || '';
  const tlsKey = cfg['tls-key'] || '';
  const serverRows = [
    kv('http-bind-address', bindAddr),
    tlsCert ? kv('tls-cert', tlsCert) : '',
    tlsKey ? kv('tls-key', tlsKey) : '',
  ].filter(Boolean).join('');
  const serverHtml = serverRows ? `<div class="influxdb-sec"><h3>Server</h3><div class="influxdb-card">${serverRows}</div></div>` : '';

  // Storage section
  const boltPath = cfg['bolt-path'] || '';
  const enginePath = cfg['engine-path'] || '';
  const storageRows = [
    kv('bolt-path', boltPath),
    kv('engine-path', enginePath),
  ].filter(Boolean).join('');
  const storageHtml = storageRows ? `<div class="influxdb-sec"><h3>Storage</h3><div class="influxdb-card">${storageRows}</div></div>` : '';

  // Performance section
  const queryConcurrency = cfg['query-concurrency'];
  const queryQueueSize = cfg['query-queue-size'];
  const cacheMaxMem = cfg['storage-cache-max-memory-size'];
  const writeTimeout = cfg['storage-write-timeout'];
  const perfRows = [
    queryConcurrency != null ? kv('query-concurrency', queryConcurrency) : '',
    queryQueueSize != null ? kv('query-queue-size', queryQueueSize) : '',
    cacheMaxMem != null ? kv('storage-cache-max-memory-size', cacheMaxMem) : '',
    writeTimeout != null ? kv('storage-write-timeout', writeTimeout) : '',
  ].filter(Boolean).join('');
  const perfHtml = perfRows ? `<div class="influxdb-sec"><h3>Performance</h3><div class="influxdb-card">${perfRows}</div></div>` : '';

  // Auth / feature flags section
  const reportingDisabled = cfg['reporting-disabled'];
  const metricsDisabled = cfg['metrics-disabled'];
  const uiDisabled = cfg['ui-disabled'];
  const authChips = [
    reportingDisabled != null ? boolChip(reportingDisabled, 'reporting-disabled') : '',
    metricsDisabled != null ? boolChip(metricsDisabled, 'metrics-disabled') : '',
    uiDisabled != null ? boolChip(uiDisabled, 'ui-disabled') : '',
  ].filter(Boolean).join('');
  const authHtml = authChips ? `<div class="influxdb-sec"><h3>Auth / Features</h3><div class="influxdb-card"><div class="influxdb-kv" style="flex-wrap:wrap">${authChips}</div></div></div>` : '';

  // Log section
  const logLevel = cfg['log-level'] || '';
  const tracingType = cfg['tracing-type'] || '';
  const logChips = [
    logLevel ? chip(logLevel, 'info') : '',
    tracingType ? chip(`tracing: ${tracingType}`, 'info') : '',
  ].filter(Boolean).join('');
  const logRows = [
    logLevel ? `<div class="influxdb-kv"><span class="influxdb-kv-k">log-level</span><span>${chip(logLevel, 'info')}</span></div>` : '',
    tracingType ? `<div class="influxdb-kv"><span class="influxdb-kv-k">tracing-type</span><span>${chip(tracingType, 'info')}</span></div>` : '',
  ].filter(Boolean).join('');
  const logHtml = logRows ? `<div class="influxdb-sec"><h3>Log</h3><div class="influxdb-card">${logRows}</div></div>` : '';

  // HTTP timeouts section
  const idleTimeout = cfg['http-idle-timeout'];
  const readHeaderTimeout = cfg['http-read-header-timeout'];
  const readTimeout = cfg['http-read-timeout'];
  const writeTimeoutHttp = cfg['http-write-timeout'];
  const httpRows = [
    idleTimeout != null ? kv('http-idle-timeout', idleTimeout) : '',
    readHeaderTimeout != null ? kv('http-read-header-timeout', readHeaderTimeout) : '',
    readTimeout != null ? kv('http-read-timeout', readTimeout) : '',
    writeTimeoutHttp != null ? kv('http-write-timeout', writeTimeoutHttp) : '',
  ].filter(Boolean).join('');
  const httpHtml = httpRows ? `<div class="influxdb-sec"><h3>HTTP</h3><div class="influxdb-card">${httpRows}</div></div>` : '';

  // Summary
  const subParts = [];
  if (bindAddr) subParts.push(bindAddr);
  if (logLevel) subParts.push(`log: ${logLevel}`);
  if (boltPath) subParts.push(`bolt: ${boltPath}`);

  const host = document.createElement('div');
  host.className = 'influxdb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px">
  <span class="badge-influxdb">InfluxDB</span>
  <span class="influxdb-title">InfluxDB 2.x Config</span>
</div>
<div class="influxdb-sub">${esc(subParts.join(' · '))}</div>
${serverHtml}${storageHtml}${perfHtml}${authHtml}${logHtml}${httpHtml}`;
  return { parentNode: host };
}
