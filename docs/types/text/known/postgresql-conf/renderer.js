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
.pg-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.pg-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
`;

/**
 * Parse postgresql.conf key = value format.
 * Values may be quoted ('value') or unquoted. Comments start with #.
 */
function parsePostgresConf(text) {
  const cfg = {};
  for (const rawLine of (text || '').split('\n')) {
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
    cfg[key] = value;
  }
  return cfg;
}

function kv(label, rawKey, value) {
  if (value == null || value === '') return '';
  const isMasked = SENSITIVE.test(rawKey);
  const display = isMasked
    ? `<span class="pg-masked">••••••••</span>`
    : `<span class="pg-kv-v">${esc(String(value))}</span>`;
  return `<div class="pg-kv"><span class="pg-kv-k">${esc(label)}</span>${display}</div>`;
}

export function render(intake) {
  const cfg = parsePostgresConf(intake.text || '');

  const host = document.createElement('div');
  host.className = 'pg-doc';

  // Connections
  const listenAddresses = cfg['listen_addresses'];
  const port = cfg['port'];
  const maxConns = cfg['max_connections'];
  const connHtml = (listenAddresses || port || maxConns) ? `
<div class="pg-sec"><h3>Connections</h3><div class="pg-card">
${kv('listen_addresses', 'listen_addresses', listenAddresses)}
${kv('port', 'port', port)}
${kv('max_connections', 'max_connections', maxConns)}
</div></div>` : '';

  // Memory
  const sharedBuffers = cfg['shared_buffers'];
  const effectiveCacheSize = cfg['effective_cache_size'];
  const workMem = cfg['work_mem'];
  const maintenanceWorkMem = cfg['maintenance_work_mem'];
  const memHtml = (sharedBuffers || effectiveCacheSize || workMem || maintenanceWorkMem) ? `
<div class="pg-sec"><h3>Memory</h3><div class="pg-card">
${kv('shared_buffers', 'shared_buffers', sharedBuffers)}
${kv('effective_cache_size', 'effective_cache_size', effectiveCacheSize)}
${kv('work_mem', 'work_mem', workMem)}
${kv('maintenance_work_mem', 'maintenance_work_mem', maintenanceWorkMem)}
</div></div>` : '';

  // WAL / Replication
  const walLevel = cfg['wal_level'];
  const maxWalSenders = cfg['max_wal_senders'];
  const archiveMode = cfg['archive_mode'];
  const archiveCommand = cfg['archive_command'];
  const walHtml = (walLevel || maxWalSenders || archiveMode) ? `
<div class="pg-sec"><h3>WAL &amp; Replication</h3><div class="pg-card">
${kv('wal_level', 'wal_level', walLevel)}
${kv('max_wal_senders', 'max_wal_senders', maxWalSenders)}
${kv('archive_mode', 'archive_mode', archiveMode)}
${archiveCommand ? kv('archive_command', 'archive_command', archiveCommand) : ''}
</div></div>` : '';

  // SSL
  const ssl = cfg['ssl'];
  const sslCert = cfg['ssl_cert_file'];
  const sslKey = cfg['ssl_key_file'];
  const sslHtml = ssl === 'on' ? `
<div class="pg-sec"><h3>SSL</h3><div class="pg-card">
${kv('ssl', 'ssl', ssl)}
${kv('ssl_cert_file', 'ssl_cert_file', sslCert)}
${kv('ssl_key_file', 'ssl_key_file', sslKey)}
</div></div>` : '';

  // Logging
  const logDest = cfg['log_destination'];
  const logDir = cfg['log_directory'];
  const logLinePrefix = cfg['log_line_prefix'];
  const logMinMsg = cfg['log_min_messages'];
  const logHtml = (logDest || logDir || logLinePrefix || logMinMsg) ? `
<div class="pg-sec"><h3>Logging</h3><div class="pg-card">
${kv('log_destination', 'log_destination', logDest)}
${kv('log_directory', 'log_directory', logDir)}
${kv('log_min_messages', 'log_min_messages', logMinMsg)}
${kv('log_line_prefix', 'log_line_prefix', logLinePrefix)}
</div></div>` : '';

  // Locale
  const timezone = cfg['timezone'];
  const logTimezone = cfg['log_timezone'];
  const datestyle = cfg['datestyle'];
  const localeHtml = (timezone || datestyle) ? `
<div class="pg-sec"><h3>Locale &amp; Time</h3><div class="pg-card">
${kv('timezone', 'timezone', timezone)}
${kv('log_timezone', 'log_timezone', logTimezone)}
${kv('datestyle', 'datestyle', datestyle)}
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

  return { parentNode: host };
}
