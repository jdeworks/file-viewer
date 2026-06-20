import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /password|secret|token|auth|key/i;
const mask = (key, val) => (SENSITIVE.test(key) && val ? '[configured]' : val);

const CSS = `
.influxdb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.influxdb-doc .badge-influx{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#22ADF6;color:#fff;vertical-align:middle;margin-right:8px;}
.influxdb-doc .influx-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.influxdb-doc .influx-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.influxdb-doc .influx-sec{margin:14px 0;}
.influxdb-doc .influx-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.influxdb-doc .influx-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:4px 0;}
.influxdb-doc .influx-key{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;}
.influxdb-doc .influx-val{font:12px/1.4 ui-monospace,monospace;font-weight:600;word-break:break-all;}
.influxdb-doc .influx-badge{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:700;vertical-align:middle;}
.influxdb-doc .influx-on{background:#dcfce7;color:#166534;}
.influxdb-doc .influx-off{background:#fee2e2;color:#991b1b;}
.influxdb-doc .influx-neutral{background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);border:1px solid var(--border,#e0e0e0);}
`;

function kv(key, val) {
  if (val == null || val === '') return '';
  return `<span class="influx-key">${esc(key)}</span><span class="influx-val">${esc(val)}</span>`;
}

function kvBool(key, val) {
  if (val == null) return '';
  const cls = val ? 'influx-on' : 'influx-off';
  return `<span class="influx-key">${esc(key)}</span><span class="influx-badge ${cls}">${val ? 'enabled' : 'disabled'}</span>`;
}

export function render(intake) {
  let cfg = {};
  try {
    if (intake.parsed && typeof intake.parsed === 'object') {
      cfg = intake.parsed;
    } else {
      cfg = parseTOML(intake.text || '') || {};
    }
  } catch { cfg = {}; }

  const meta = cfg.meta || {};
  const data = cfg.data || {};
  const coordinator = cfg.coordinator || {};
  const retention = cfg.retention || {};
  const http = cfg.http || {};
  const logging = cfg.logging || {};
  const subscriber = cfg.subscriber || {};

  // [meta] section
  const metaLines = [
    meta.dir ? kv('dir', meta.dir) : '',
    meta.retention_autocreate != null ? kvBool('retention-autocreate', meta.retention_autocreate) : '',
    meta.logging_enabled != null ? kvBool('logging-enabled', meta.logging_enabled) : '',
  ].filter(Boolean);

  const metaHtml = metaLines.length
    ? `<div class="influx-sec"><h3>Meta</h3><div class="influx-grid">${metaLines.join('')}</div></div>`
    : '';

  // [data] section
  const dataLines = [
    data.dir ? kv('dir', data.dir) : '',
    (data['wal-dir'] || data.wal_dir) ? kv('wal-dir', data['wal-dir'] || data.wal_dir) : '',
    (data['query-log-enabled'] != null || data.query_log_enabled != null)
      ? kvBool('query-log-enabled', data['query-log-enabled'] ?? data.query_log_enabled)
      : '',
    (data['cache-max-memory-size'] || data.cache_max_memory_size)
      ? kv('cache-max-memory-size', String(data['cache-max-memory-size'] || data.cache_max_memory_size))
      : '',
  ].filter(Boolean);

  const dataHtml = dataLines.length
    ? `<div class="influx-sec"><h3>Data</h3><div class="influx-grid">${dataLines.join('')}</div></div>`
    : '';

  // [coordinator] section
  const coordLines = [
    (coordinator['query-timeout'] || coordinator.query_timeout)
      ? kv('query-timeout', coordinator['query-timeout'] || coordinator.query_timeout)
      : '',
    (coordinator['max-concurrent-queries'] || coordinator.max_concurrent_queries) != null
      ? kv('max-concurrent-queries', String(coordinator['max-concurrent-queries'] ?? coordinator.max_concurrent_queries))
      : '',
  ].filter(Boolean);

  const coordHtml = coordLines.length
    ? `<div class="influx-sec"><h3>Coordinator</h3><div class="influx-grid">${coordLines.join('')}</div></div>`
    : '';

  // [retention] section
  const retentionLines = [
    retention.enabled != null ? kvBool('enabled', retention.enabled) : '',
    (retention['check-interval'] || retention.check_interval)
      ? kv('check-interval', retention['check-interval'] || retention.check_interval)
      : '',
  ].filter(Boolean);

  const retentionHtml = retentionLines.length
    ? `<div class="influx-sec"><h3>Retention</h3><div class="influx-grid">${retentionLines.join('')}</div></div>`
    : '';

  // [http] section
  const httpLines = [
    http.enabled != null ? kvBool('enabled', http.enabled) : '',
    (http['bind-address'] || http.bind_address)
      ? kv('bind-address', http['bind-address'] || http.bind_address)
      : '',
    (http['auth-enabled'] != null || http.auth_enabled != null)
      ? kvBool('auth-enabled', http['auth-enabled'] ?? http.auth_enabled)
      : '',
    (http['https-enabled'] != null || http.https_enabled != null)
      ? kvBool('https-enabled', http['https-enabled'] ?? http.https_enabled)
      : '',
    http.password ? kv('password', mask('password', http.password)) : '',
  ].filter(Boolean);

  const httpHtml = httpLines.length
    ? `<div class="influx-sec"><h3>HTTP</h3><div class="influx-grid">${httpLines.join('')}</div></div>`
    : '';

  // [logging] section
  const loggingLines = [
    logging.level ? kv('level', logging.level) : '',
    logging.format ? kv('format', logging.format) : '',
  ].filter(Boolean);

  const loggingHtml = loggingLines.length
    ? `<div class="influx-sec"><h3>Logging</h3><div class="influx-grid">${loggingLines.join('')}</div></div>`
    : '';

  // [subscriber] section
  const subLines = [
    subscriber.enabled != null ? kvBool('enabled', subscriber.enabled) : '',
    (subscriber['http-timeout'] || subscriber.http_timeout)
      ? kv('http-timeout', subscriber['http-timeout'] || subscriber.http_timeout)
      : '',
  ].filter(Boolean);

  const subHtml = subLines.length
    ? `<div class="influx-sec"><h3>Subscriber</h3><div class="influx-grid">${subLines.join('')}</div></div>`
    : '';

  // subtitle
  const parts = [];
  if (http['bind-address'] || http.bind_address) parts.push(`http ${http['bind-address'] || http.bind_address}`);
  if (data.dir) parts.push(`data ${data.dir}`);

  const host = document.createElement('div');
  host.className = 'influxdb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="influx-title"><span class="badge-influx">InfluxDB</span>influxdb.conf</div>
<div class="influx-sub">${esc(parts.join(' · ') || 'InfluxDB v1.x configuration')}</div>
${metaHtml}
${dataHtml}
${coordHtml}
${retentionHtml}
${httpHtml}
${loggingHtml}
${subHtml}`;

  return { parentNode: host };
}
