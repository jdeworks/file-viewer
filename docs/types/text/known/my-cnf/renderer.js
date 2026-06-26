import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /password|secret|key|token|pass|pwd|authentication_string/i;

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
.my-mask-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:6px;letter-spacing:0;}
.my-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.my-link:hover{color:var(--accent,#2563eb);}
.my-source-section{color:#00758f;font-weight:700;}
.my-source-key{color:#d18800;font-weight:700;}
.my-source-comment{color:#6e7781;font-style:italic;}
`;

/**
 * Parse INI-style my.cnf into sections.
 * Returns { sectionName: { key: { value, line, rawKey, bare }, ... }, ... }
 */
function parseMyCnf(text) {
  const sections = {};
  let current = '__global__';
  for (const [idx, rawLine] of (text || '').split(/\r?\n/).entries()) {
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
      sections[current][key] = { value, line: idx + 1, rawKey: kvMatch[1], section: current };
      continue;
    }
    const bareMatch = /^([A-Za-z_][\w-]*)$/.exec(line);
    if (bareMatch) {
      const key = bareMatch[1].toLowerCase();
      if (!sections[current]) sections[current] = {};
      sections[current][key] = { value: 'enabled', line: idx + 1, rawKey: bareMatch[1], section: current, bare: true };
    }
  }
  return sections;
}

const HELP = {
  port: 'TCP port used by MySQL clients.',
  'bind-address': 'Network address mysqld listens on. 0.0.0.0 or * exposes it on all interfaces.',
  max_connections: 'Maximum concurrent client connections.',
  innodb_buffer_pool_size: 'Memory reserved for InnoDB page and index cache.',
  'character-set-server': 'Default server character set for new schemas and tables.',
  log_error: 'Path where server errors are written.',
  'pid-file': 'Path containing the mysqld process id.',
  password: 'Credential-like value; hidden in summaries and redacted source.',
  auth_socket: 'Socket authentication plugin setting.',
  socket: 'Unix socket path used for local client/server connections.',
  'default-character-set': 'Default client character set.',
  max_allowed_packet: 'Largest packet size accepted by client tooling.',
  slow_query_log: 'Records queries exceeding long_query_time.',
  long_query_time: 'Threshold, in seconds, for slow query logging.',
};

function canonical(key) {
  return String(key || '').replace(/_/g, '-').toLowerCase();
}

function helpFor(key) {
  return HELP[key] || HELP[canonical(key)] || 'Open this MySQL setting in source.';
}

function lineButton(label, entry, key = label) {
  const line = entry?.line || 1;
  const title = `${helpFor(key)} Open line ${line} in source.`;
  return `<button class="my-link" type="button" data-source-line="${line}" title="${esc(title)}">${esc(label)}</button>`;
}

function value(entry, key) {
  const raw = entry?.value;
  if (raw == null || raw === '') return '';
  const sensitive = SENSITIVE.test(key);
  const masked = sensitive ? { text: '[configured]', masked: true, reason: `masked because "${key}" is a MySQL sensitive file or credential setting` } : maskedValue(key, raw);
  if (masked.masked) {
    return `<span class="my-masked" title="${esc(masked.reason)}">[configured]</span><span class="my-mask-reason">${esc(masked.reason)}</span>`;
  }
  return `<span class="my-kv-v">${esc(String(raw))}</span>`;
}

function kv(label, rawKey, entry) {
  if (!entry || entry.value == null || entry.value === '') return '';
  return `<div class="my-kv"><span class="my-kv-k">${lineButton(label, entry, rawKey)}</span>${value(entry, rawKey)}</div>`;
}

function getAny(section, keys) {
  for (const key of keys) {
    if (section[key]) return section[key];
  }
  return null;
}

function entryValue(entry) {
  return entry?.value || '';
}

function truthyMysql(value) {
  return /^(1|on|true|yes|enabled)$/i.test(String(value || ''));
}

function collectIssues(mysqld, client, mysqldump) {
  const issues = [];
  const bindAddr = getAny(mysqld, ['bind-address', 'bind_address']);
  const bind = entryValue(bindAddr);
  if (bind === '*' || bind === '0.0.0.0' || bind === '::') {
    issues.push({
      severity: 'warning',
      label: 'public bind',
      line: bindAddr?.line || 1,
      message: `bind-address is ${bind}; confirm firewall rules and MySQL user host grants restrict access.`,
    });
  } else if (bind) {
    issues.push({
      severity: 'info',
      label: 'bind scope',
      line: bindAddr?.line || 1,
      message: `bind-address is ${bind}; verify this matches the intended exposure.`,
    });
  }
  const maxConnections = getAny(mysqld, ['max_connections', 'max-connections']);
  const max = Number(entryValue(maxConnections));
  if (Number.isFinite(max) && max > 300) {
    issues.push({
      severity: 'info',
      label: 'connections',
      line: maxConnections.line,
      message: `max_connections is ${max}; confirm memory sizing and pooling strategy.`,
    });
  }
  const slowLog = getAny(mysqld, ['slow_query_log', 'slow-query-log']);
  if (truthyMysql(entryValue(slowLog))) {
    const threshold = getAny(mysqld, ['long_query_time', 'long-query-time']);
    issues.push({
      severity: 'info',
      label: 'slow log',
      line: slowLog.line,
      message: `slow_query_log is enabled${threshold ? ` with long_query_time ${threshold.value}s` : ''}.`,
    });
  }
  const charset = getAny(mysqld, ['character-set-server', 'character_set_server']);
  if (charset && !/^utf8mb4$/i.test(charset.value)) {
    issues.push({
      severity: 'warning',
      label: 'charset',
      line: charset.line,
      message: `character-set-server is ${charset.value}; utf8mb4 is usually expected for full Unicode coverage.`,
    });
  }
  const clientCharset = getAny(client, ['default-character-set', 'default_character_set']);
  if (charset && clientCharset && charset.value !== clientCharset.value) {
    issues.push({
      severity: 'info',
      label: 'charset mismatch',
      line: clientCharset.line,
      message: `client default-character-set (${clientCharset.value}) differs from server (${charset.value}).`,
    });
  }
  const packet = getAny(mysqldump, ['max_allowed_packet', 'max-allowed-packet']);
  if (packet) {
    issues.push({
      severity: 'info',
      label: 'dump packet',
      line: packet.line,
      message: `mysqldump max_allowed_packet is ${packet.value}; large rows or blobs may need this tuned.`,
    });
  }
  return issues;
}

function redactedSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*([A-Za-z_][\w-]*)\s*=\s*)(.*)$/);
    if (!m || !SENSITIVE.test(m[2])) return line;
    return `${m[1]}[configured]`;
  }).join('\n');
}

function highlightMyLine(line) {
  const escaped = esc(line);
  if (/^\s*[#;]/.test(line)) return `<span class="my-source-comment">${escaped}</span>`;
  if (/^\s*\[[^\]]+\]/.test(line)) return escaped.replace(/^(\s*\[[^\]]+\])/, '<span class="my-source-section">$1</span>');
  return escaped.replace(/^(\s*[A-Za-z_][\w-]*)/, '<span class="my-source-key">$1</span>');
}

export function render(intake) {
  const sections = parseMyCnf(intake.text || '');
  const mysqld = sections['mysqld'] || {};
  const client = sections['client'] || {};
  const mysqldump = sections['mysqldump'] || {};

  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'my-doc';

  // [mysqld]
  const port = mysqld['port'];
  const bindAddr = getAny(mysqld, ['bind-address', 'bind_address']);
  const maxConns = getAny(mysqld, ['max_connections', 'max-connections']);
  const bufPool = getAny(mysqld, ['innodb_buffer_pool_size', 'innodb-buffer-pool-size']);
  const charset = getAny(mysqld, ['character-set-server', 'character_set_server']);
  const logError = getAny(mysqld, ['log_error', 'log-error']);
  const pidFile = getAny(mysqld, ['pid-file', 'pid_file']);
  const slowQueryLog = getAny(mysqld, ['slow_query_log', 'slow-query-log']);
  const longQueryTime = getAny(mysqld, ['long_query_time', 'long-query-time']);
  const password = mysqld['password'];
  const authSocket = getAny(mysqld, ['auth_socket', 'auth-socket']);

  const mysqldHtml = `<div class="my-sec"><h3>[mysqld]</h3><div class="my-card">
${kv('port', 'port', port)}
${kv('bind-address', 'bind-address', bindAddr)}
${kv('max_connections', 'max_connections', maxConns)}
${kv('innodb_buffer_pool_size', 'innodb_buffer_pool_size', bufPool)}
${kv('slow_query_log', 'slow_query_log', slowQueryLog)}
${kv('long_query_time', 'long_query_time', longQueryTime)}
${kv('character-set-server', 'character-set-server', charset)}
${kv('log_error', 'log_error', logError)}
${kv('pid-file', 'pid-file', pidFile)}
${password != null ? kv('password', 'password', password) : ''}
${authSocket != null ? kv('auth_socket', 'auth_socket', authSocket) : ''}
</div></div>`;

  // [client]
  const clientPort = client['port'];
  const clientSocket = client['socket'];
  const clientCharset = getAny(client, ['default-character-set', 'default_character_set']);
  const clientHtml = (clientPort || clientCharset) ? `<div class="my-sec"><h3>[client]</h3><div class="my-card">
${kv('port', 'port', clientPort)}
${kv('socket', 'socket', clientSocket)}
${kv('default-character-set', 'default-character-set', clientCharset)}
</div></div>` : '';

  // [mysqldump]
  const quick = mysqldump['quick'];
  const quoteNames = mysqldump['quote-names'];
  const maxPacket = getAny(mysqldump, ['max_allowed_packet', 'max-allowed-packet']);
  const dumpHtml = maxPacket ? `<div class="my-sec"><h3>[mysqldump]</h3><div class="my-card">
${kv('quick', 'quick', quick)}
${kv('quote-names', 'quote-names', quoteNames)}
${kv('max_allowed_packet', 'max_allowed_packet', maxPacket)}
</div></div>` : '';

  // Summary
  const subParts = [];
  if (port) subParts.push(`port ${port.value}`);
  if (bindAddr) subParts.push(`bind ${bindAddr.value}`);
  if (maxConns) subParts.push(`max_connections ${maxConns.value}`);
  if (charset) subParts.push(`charset ${charset.value}`);

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-my">MySQL</span>
  <span class="my-title">Server Configuration</span>
</div>
<div class="my-sub">${esc(subParts.join(' · '))}</div>
${mysqldHtml}${clientHtml}${dumpHtml}`;
  const review = issueList(collectIssues(mysqld, client, mysqldump), { title: 'MySQL Review' });
  if (review) host.insertBefore(review, host.querySelector('.my-sec'));
  host.appendChild(sourcePreview(redactedSource(intake.text || ''), { title: 'Redacted source', collapsed: true, idPrefix: 'my-line', highlighter: highlightMyLine }));
  wireSourceLinks(host, { idPrefix: 'my-line' });

  return { parentNode: host };
}
