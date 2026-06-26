import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /password|secret|key|token|pass|auth|pwd/i;

const CSS = `
.pg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pg{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#336791;color:#fff;vertical-align:middle;margin-right:8px;}
.pg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pg-sec{margin:14px 0;}
.pg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.pg-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.pg-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.pg-kv-k{color:var(--fg-2,#888);min-width:210px;font-family:ui-monospace,monospace;}
.pg-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.pg-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px;}
.pg-mask-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:6px;letter-spacing:0;}
.pg-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.pg-link:hover{color:var(--accent,#2563eb);}
.pg-source-key{color:#336791;font-weight:700;}
.pg-source-comment{color:#6e7781;font-style:italic;}
.pg-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.pg-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
`;

/**
 * Parse postgresql.conf key = value format.
 * Values may be quoted ('value') or unquoted. Comments start with #.
 */
function parsePostgresConf(text) {
  const cfg = {};
  for (const [idx, rawLine] of (text || '').split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    // strip inline comments
    const noComment = line.replace(/\s+#.*$/, '');
    const m = /^(\w+)\s*=\s*(.*)$/.exec(noComment.trim());
    if (!m) continue;
    const key = m[1].toLowerCase();
    let value = m[2].trim();
    // strip surrounding quotes
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    cfg[key] = { value, line: idx + 1, rawKey: m[1] };
  }
  return cfg;
}

const HELP = {
  listen_addresses: 'Host addresses PostgreSQL binds to. "*" exposes the server on all interfaces.',
  port: 'TCP port used by PostgreSQL.',
  max_connections: 'Maximum concurrent client connections.',
  shared_buffers: 'Memory reserved for PostgreSQL shared buffer cache.',
  effective_cache_size: 'Planner estimate of filesystem plus database cache.',
  work_mem: 'Per-operation memory for sorts and hashes.',
  maintenance_work_mem: 'Memory for maintenance operations such as VACUUM and CREATE INDEX.',
  wal_level: 'Amount of WAL information retained for replication and recovery.',
  max_wal_senders: 'Maximum concurrent WAL sender processes for replication.',
  archive_mode: 'Enables WAL archiving when paired with archive_command.',
  archive_command: 'Shell command used to archive WAL segments.',
  ssl: 'Controls TLS support for client connections.',
  ssl_cert_file: 'Server certificate file used for TLS.',
  ssl_key_file: 'Server private-key file used for TLS.',
  log_destination: 'Where PostgreSQL writes logs.',
  log_directory: 'Directory for file-based logs.',
  log_min_messages: 'Minimum server message severity written to logs.',
  log_line_prefix: 'Prefix fields added to each log line.',
  timezone: 'Session timezone default.',
  log_timezone: 'Timezone used in log timestamps.',
  datestyle: 'Date/time display format.',
};

function helpFor(key) {
  return HELP[key] || 'Open this PostgreSQL setting in source.';
}

function lineButton(label, entry, key = label) {
  const line = entry?.line || 1;
  const title = `${helpFor(key)} Open line ${line} in source.`;
  return `<button class="pg-link" type="button" data-source-line="${line}" title="${esc(title)}">${esc(label)}</button>`;
}

function value(entry, key) {
  const raw = entry?.value;
  if (raw == null || raw === '') return '';
  const sensitive = SENSITIVE.test(key);
  const masked = sensitive ? { text: '[configured]', masked: true, reason: `masked because "${key}" is a PostgreSQL sensitive file or credential setting` } : maskedValue(key, raw);
  if (masked.masked) {
    return `<span class="pg-masked" title="${esc(masked.reason)}">[configured]</span><span class="pg-mask-reason">${esc(masked.reason)}</span>`;
  }
  return `<span class="pg-kv-v">${esc(String(raw))}</span>`;
}

function kv(label, key, entry) {
  if (!entry || entry.value == null || entry.value === '') return '';
  return `<div class="pg-kv"><span class="pg-kv-k">${lineButton(label, entry, key)}</span>${value(entry, key)}</div>`;
}

function get(cfg, key) {
  return cfg[key]?.value || '';
}

function collectIssues(cfg) {
  const issues = [];
  const listen = get(cfg, 'listen_addresses');
  if (listen === '*' || /0\.0\.0\.0|::/.test(listen)) {
    issues.push({
      severity: 'warning',
      label: 'public bind',
      line: cfg.listen_addresses?.line || 1,
      message: `listen_addresses is ${listen}; confirm pg_hba.conf and firewall rules restrict access.`,
    });
  } else if (listen) {
    issues.push({
      severity: 'info',
      label: 'bind scope',
      line: cfg.listen_addresses?.line || 1,
      message: `listen_addresses is ${listen}; verify it matches the intended network exposure.`,
    });
  }
  if (get(cfg, 'ssl') === 'on') {
    if (!cfg.ssl_cert_file || !cfg.ssl_key_file) {
      issues.push({
        severity: 'warning',
        label: 'ssl files',
        line: cfg.ssl?.line || 1,
        message: 'ssl is on but ssl_cert_file or ssl_key_file is missing.',
      });
    } else {
      issues.push({
        severity: 'info',
        label: 'ssl enabled',
        line: cfg.ssl?.line || 1,
        message: 'TLS is enabled; certificate and key paths are shown with key-like paths redacted.',
      });
    }
  }
  if (get(cfg, 'archive_mode') === 'on' && !cfg.archive_command) {
    issues.push({
      severity: 'warning',
      label: 'archive command',
      line: cfg.archive_mode?.line || 1,
      message: 'archive_mode is on but archive_command is not configured.',
    });
  }
  const maxConns = Number(get(cfg, 'max_connections'));
  if (Number.isFinite(maxConns) && maxConns > 300) {
    issues.push({
      severity: 'info',
      label: 'connections',
      line: cfg.max_connections?.line || 1,
      message: `max_connections is ${maxConns}; confirm memory sizing and pooling strategy.`,
    });
  }
  return issues;
}

function redactedSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*([A-Za-z_][\w]*)\s*=\s*)(.*)$/);
    if (!m || !SENSITIVE.test(m[2])) return line;
    return `${m[1]}'[configured]'`;
  }).join('\n');
}

function highlightPgLine(line) {
  const escaped = esc(line);
  if (/^\s*#/.test(line)) return `<span class="pg-source-comment">${escaped}</span>`;
  return escaped.replace(/^(\s*\w+)/, '<span class="pg-source-key">$1</span>');
}

export function render(intake) {
  const cfg = parsePostgresConf(intake.text || '');

  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'pg-doc';

  // Connections
  const listenAddresses = get(cfg, 'listen_addresses');
  const port = get(cfg, 'port');
  const maxConns = get(cfg, 'max_connections');
  const connHtml = (listenAddresses || port || maxConns) ? `
<div class="pg-sec"><h3>Connections</h3><div class="pg-card">
${kv('listen_addresses', 'listen_addresses', cfg.listen_addresses)}
${kv('port', 'port', cfg.port)}
${kv('max_connections', 'max_connections', cfg.max_connections)}
</div></div>` : '';

  // Memory
  const sharedBuffers = get(cfg, 'shared_buffers');
  const effectiveCacheSize = get(cfg, 'effective_cache_size');
  const workMem = get(cfg, 'work_mem');
  const maintenanceWorkMem = get(cfg, 'maintenance_work_mem');
  const memHtml = (sharedBuffers || effectiveCacheSize || workMem || maintenanceWorkMem) ? `
<div class="pg-sec"><h3>Memory</h3><div class="pg-card">
${kv('shared_buffers', 'shared_buffers', cfg.shared_buffers)}
${kv('effective_cache_size', 'effective_cache_size', cfg.effective_cache_size)}
${kv('work_mem', 'work_mem', cfg.work_mem)}
${kv('maintenance_work_mem', 'maintenance_work_mem', cfg.maintenance_work_mem)}
</div></div>` : '';

  // WAL / Replication
  const walLevel = get(cfg, 'wal_level');
  const maxWalSenders = get(cfg, 'max_wal_senders');
  const archiveMode = get(cfg, 'archive_mode');
  const archiveCommand = get(cfg, 'archive_command');
  const walHtml = (walLevel || maxWalSenders || archiveMode) ? `
<div class="pg-sec"><h3>WAL &amp; Replication</h3><div class="pg-card">
${kv('wal_level', 'wal_level', cfg.wal_level)}
${kv('max_wal_senders', 'max_wal_senders', cfg.max_wal_senders)}
${kv('archive_mode', 'archive_mode', cfg.archive_mode)}
${archiveCommand ? kv('archive_command', 'archive_command', cfg.archive_command) : ''}
</div></div>` : '';

  // SSL
  const ssl = get(cfg, 'ssl');
  const sslCert = get(cfg, 'ssl_cert_file');
  const sslKey = get(cfg, 'ssl_key_file');
  const sslHtml = ssl === 'on' ? `
<div class="pg-sec"><h3>SSL</h3><div class="pg-card">
${kv('ssl', 'ssl', cfg.ssl)}
${kv('ssl_cert_file', 'ssl_cert_file', cfg.ssl_cert_file)}
${kv('ssl_key_file', 'ssl_key_file', cfg.ssl_key_file)}
</div></div>` : '';

  // Logging
  const logDest = get(cfg, 'log_destination');
  const logDir = get(cfg, 'log_directory');
  const logLinePrefix = get(cfg, 'log_line_prefix');
  const logMinMsg = get(cfg, 'log_min_messages');
  const logHtml = (logDest || logDir || logLinePrefix || logMinMsg) ? `
<div class="pg-sec"><h3>Logging</h3><div class="pg-card">
${kv('log_destination', 'log_destination', cfg.log_destination)}
${kv('log_directory', 'log_directory', cfg.log_directory)}
${kv('log_min_messages', 'log_min_messages', cfg.log_min_messages)}
${kv('log_line_prefix', 'log_line_prefix', cfg.log_line_prefix)}
</div></div>` : '';

  // Locale
  const timezone = get(cfg, 'timezone');
  const logTimezone = get(cfg, 'log_timezone');
  const datestyle = get(cfg, 'datestyle');
  const localeHtml = (timezone || datestyle) ? `
<div class="pg-sec"><h3>Locale &amp; Time</h3><div class="pg-card">
${kv('timezone', 'timezone', cfg.timezone)}
${kv('log_timezone', 'log_timezone', cfg.log_timezone)}
${kv('datestyle', 'datestyle', cfg.datestyle)}
</div></div>` : '';

  // Summary
  const subParts = [];
  if (listenAddresses) subParts.push(`listen ${listenAddresses}`);
  if (port) subParts.push(`port ${port}`);
  if (maxConns) subParts.push(`max_connections ${maxConns}`);
  if (walLevel) subParts.push(`wal ${walLevel}`);

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-pg">PostgreSQL</span>
  <span class="pg-title">Server Configuration</span>
</div>
<div class="pg-sub">${esc(subParts.join(' · '))}</div>
${connHtml}${memHtml}${walHtml}${sslHtml}${logHtml}${localeHtml}`;
  const review = issueList(collectIssues(cfg), { title: 'PostgreSQL Review' });
  if (review) host.insertBefore(review, host.querySelector('.pg-sec'));
  host.appendChild(sourcePreview(redactedSource(intake.text || ''), { title: 'Redacted source', collapsed: true, idPrefix: 'pg-line', highlighter: highlightPgLine }));
  wireSourceLinks(host, { idPrefix: 'pg-line' });

  return { parentNode: host };
}
