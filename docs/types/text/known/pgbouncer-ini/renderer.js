const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /password|secret|key|token|pass|auth|pwd/i;

const CSS = `
.pb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#008080;color:#fff;vertical-align:middle;margin-right:8px;}
.pb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pb-sec{margin:14px 0;}
.pb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.pb-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.pb-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.pb-kv-k{color:var(--fg-2,#888);min-width:200px;font-family:ui-monospace,monospace;}
.pb-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.pb-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px;}
.pb-db-entry{padding:5px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:12px;}
.pb-db-entry:last-child{border-bottom:none;}
.pb-db-name{font-family:ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);}
.pb-db-conn{font-family:ui-monospace,monospace;color:var(--fg-2,#888);margin-top:2px;word-break:break-all;}
.pb-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

/**
 * Parse INI-style pgbouncer.ini.
 * Returns { sectionName: { key: value } | { __entries: [{name, value}] } }
 */
function parsePgBouncerIni(text) {
  const sections = {};
  let current = null;
  for (const rawLine of (text || '').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;
    const sectionMatch = /^\[([^\]]+)\]/.exec(line);
    if (sectionMatch) {
      current = sectionMatch[1].toLowerCase();
      if (!sections[current]) sections[current] = {};
      continue;
    }
    if (!current) continue;
    const kvMatch = /^([^=\s]+)\s*=\s*(.*)$/.exec(line);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim().replace(/\s+;.*$/, ''); // strip inline ;comments
      sections[current][key.toLowerCase()] = { rawKey: key, value };
    }
  }
  return sections;
}

/**
 * Mask password= values inside a pgbouncer connection string.
 * e.g. "host=127.0.0.1 port=5432 password=secret" -> "host=127.0.0.1 port=5432 password=••••••••"
 */
function maskConnString(conn) {
  return conn.replace(/(password\s*=\s*)(\S+)/gi, '$1••••••••');
}

function kv(label, rawKey, value) {
  if (value == null || value === '') return '';
  const isMasked = SENSITIVE.test(rawKey);
  const display = isMasked
    ? `<span class="pb-masked">••••••••</span>`
    : `<span class="pb-kv-v">${esc(String(value))}</span>`;
  return `<div class="pb-kv"><span class="pb-kv-k">${esc(label)}</span>${display}</div>`;
}

function get(section, key) {
  const entry = section[key];
  return entry ? entry.value : undefined;
}

export function render(intake) {
  const sections = parsePgBouncerIni(intake.text || '');

  const host = document.createElement('div');
  host.className = 'pb-doc';

  // [databases] — each key is a logical DB alias, value is connection string
  const dbSection = sections['databases'] || {};
  const dbEntries = Object.entries(dbSection).map(([name, entry]) => ({
    name,
    conn: maskConnString(entry.value),
  }));

  const dbHtml = dbEntries.length ? `<div class="pb-sec"><h3>Databases (${dbEntries.length})</h3><div class="pb-card">
${dbEntries.map(({ name, conn }) => `<div class="pb-db-entry">
  <div class="pb-db-name">${esc(name)}</div>
  <div class="pb-db-conn">${esc(conn)}</div>
</div>`).join('')}
</div></div>` : '';

  // [pgbouncer]
  const pb = sections['pgbouncer'] || {};
  const listenAddr = get(pb, 'listen_addr');
  const listenPort = get(pb, 'listen_port');
  const poolMode = get(pb, 'pool_mode');
  const maxClientConn = get(pb, 'max_client_conn');
  const defaultPoolSize = get(pb, 'default_pool_size');
  const minPoolSize = get(pb, 'min_pool_size');
  const reservePoolSize = get(pb, 'reserve_pool_size');
  const authType = get(pb, 'auth_type');
  const authFile = get(pb, 'auth_file');
  const adminUsers = get(pb, 'admin_users');
  const serverIdleTimeout = get(pb, 'server_idle_timeout');
  const clientIdleTimeout = get(pb, 'client_idle_timeout');

  const pbHtml = `<div class="pb-sec"><h3>[pgbouncer]</h3><div class="pb-card">
${kv('listen_addr', 'listen_addr', listenAddr)}
${kv('listen_port', 'listen_port', listenPort)}
${kv('pool_mode', 'pool_mode', poolMode)}
${kv('max_client_conn', 'max_client_conn', maxClientConn)}
${kv('default_pool_size', 'default_pool_size', defaultPoolSize)}
${kv('min_pool_size', 'min_pool_size', minPoolSize)}
${kv('reserve_pool_size', 'reserve_pool_size', reservePoolSize)}
${kv('auth_type', 'auth_type', authType)}
${kv('auth_file', 'auth_file', authFile)}
${kv('admin_users', 'admin_users', adminUsers)}
${serverIdleTimeout ? kv('server_idle_timeout', 'server_idle_timeout', serverIdleTimeout) : ''}
${clientIdleTimeout ? kv('client_idle_timeout', 'client_idle_timeout', clientIdleTimeout) : ''}
</div></div>`;

  // Summary
  const subParts = [];
  if (listenAddr && listenPort) subParts.push(`${listenAddr}:${listenPort}`);
  else if (listenPort) subParts.push(`port ${listenPort}`);
  if (poolMode) subParts.push(`mode: ${poolMode}`);
  if (maxClientConn) subParts.push(`max_client_conn ${maxClientConn}`);
  if (dbEntries.length) subParts.push(`${dbEntries.length} database${dbEntries.length !== 1 ? 's' : ''}`);

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-pb">PgBouncer</span>
  <span class="pb-title">Connection Pooler Config</span>
</div>
<div class="pb-sub">${esc(subParts.join(' · '))}</div>
${dbHtml}${pbHtml}`;

  return { parentNode: host };
}
