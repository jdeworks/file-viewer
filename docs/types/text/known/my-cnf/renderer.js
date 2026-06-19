const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /password|secret|key|token|pass|auth|pwd/i;

const CSS = `
.my-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-my{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00758f;color:#fff;vertical-align:middle;margin-right:8px;}
.my-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.my-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.my-sec{margin:14px 0;}
.my-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.my-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.my-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.my-kv-k{color:var(--fg-2,#888);min-width:200px;font-family:ui-monospace,monospace;}
.my-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.my-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px;}
`;

/**
 * Parse INI-style my.cnf into sections.
 * Returns { sectionName: { key: value, ... }, ... }
 */
function parseMyCnf(text) {
  const sections = {};
  let current = '__global__';
  for (const rawLine of (text || '').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sectionMatch = /^\[([^\]]+)\]/.exec(line);
    if (sectionMatch) {
      current = sectionMatch[1].toLowerCase();
      if (!sections[current]) sections[current] = {};
      continue;
    }
    // key = value or key (bare flag)
    const kvMatch = /^([^=\s]+)\s*=\s*(.*)$/.exec(line);
    if (kvMatch) {
      const key = kvMatch[1].toLowerCase().trim();
      const value = kvMatch[2].trim();
      if (!sections[current]) sections[current] = {};
      sections[current][key] = value;
    }
  }
  return sections;
}

function kv(label, rawKey, value) {
  if (value == null || value === '') return '';
  const isMasked = SENSITIVE.test(rawKey);
  const display = isMasked
    ? `<span class="my-masked">••••••••</span>`
    : `<span class="my-kv-v">${esc(String(value))}</span>`;
  return `<div class="my-kv"><span class="my-kv-k">${esc(label)}</span>${display}</div>`;
}

export function render(intake) {
  const sections = parseMyCnf(intake.text || '');
  const mysqld = sections['mysqld'] || {};
  const client = sections['client'] || {};
  const mysqldump = sections['mysqldump'] || {};

  const host = document.createElement('div');
  host.className = 'my-doc';

  // [mysqld]
  const port = mysqld['port'];
  const bindAddr = mysqld['bind-address'];
  const maxConns = mysqld['max_connections'] || mysqld['max-connections'];
  const bufPool = mysqld['innodb_buffer_pool_size'] || mysqld['innodb-buffer-pool-size'];
  const charset = mysqld['character-set-server'] || mysqld['character_set_server'];
  const logError = mysqld['log_error'] || mysqld['log-error'];
  const pidFile = mysqld['pid-file'] || mysqld['pid_file'];
  const password = mysqld['password'];
  const authSocket = mysqld['auth_socket'] || mysqld['auth-socket'];

  const mysqldHtml = `<div class="my-sec"><h3>[mysqld]</h3><div class="my-card">
${kv('port', 'port', port)}
${kv('bind-address', 'bind-address', bindAddr)}
${kv('max_connections', 'max_connections', maxConns)}
${kv('innodb_buffer_pool_size', 'innodb_buffer_pool_size', bufPool)}
${kv('character-set-server', 'character-set-server', charset)}
${kv('log_error', 'log_error', logError)}
${kv('pid-file', 'pid-file', pidFile)}
${password != null ? kv('password', 'password', password) : ''}
${authSocket != null ? kv('auth_socket', 'auth_socket', authSocket) : ''}
</div></div>`;

  // [client]
  const clientPort = client['port'];
  const clientCharset = client['default-character-set'] || client['default_character_set'];
  const clientHtml = (clientPort || clientCharset) ? `<div class="my-sec"><h3>[client]</h3><div class="my-card">
${kv('port', 'port', clientPort)}
${kv('default-character-set', 'default-character-set', clientCharset)}
</div></div>` : '';

  // [mysqldump]
  const maxPacket = mysqldump['max_allowed_packet'] || mysqldump['max-allowed-packet'];
  const dumpHtml = maxPacket ? `<div class="my-sec"><h3>[mysqldump]</h3><div class="my-card">
${kv('max_allowed_packet', 'max_allowed_packet', maxPacket)}
</div></div>` : '';

  // Summary
  const subParts = [];
  if (port) subParts.push(`port ${port}`);
  if (bindAddr) subParts.push(`bind ${bindAddr}`);
  if (maxConns) subParts.push(`max_connections ${maxConns}`);
  if (charset) subParts.push(`charset ${charset}`);

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-my">MySQL</span>
  <span class="my-title">Server Configuration</span>
</div>
<div class="my-sub">${esc(subParts.join(' · '))}</div>
${mysqldHtml}${clientHtml}${dumpHtml}`;

  return { parentNode: host };
}
