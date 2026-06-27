import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /pass|password|secret|token|key/i;

const CSS = `
.rd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-rd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc2c2c;color:#fff;vertical-align:middle;margin-right:8px;}
.rd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rd-sec{margin:14px 0;}
.rd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.rd-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.rd-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.rd-kv-k{color:var(--fg-2,#888);min-width:160px;font-family:ui-monospace,monospace;}
.rd-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.rd-pills{display:flex;flex-wrap:wrap;gap:6px;}
.rd-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.rd-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.rd-pill.off{background:#f3f4f6;border-color:#d1d5db;color:#6b7280;}
.rd-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.rd-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff1f2;border:1px solid #fecdd3;color:#be123c;margin-left:4px;}
.rd-mask-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:6px;letter-spacing:0;}
.rd-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.rd-link:hover{color:var(--accent,#2563eb);}
.rd-source-key{color:#cc2c2c;font-weight:700;}
.rd-source-comment{color:#6e7781;font-style:italic;}
`;

const HELP = {
  bind: 'Network interfaces Redis listens on. Public binds need firewalling and ACL review.',
  'protected-mode': 'Safety mode that rejects remote access unless Redis is explicitly configured for it.',
  port: 'TCP port used by Redis clients.',
  'tcp-backlog': 'Kernel listen backlog requested for client connections.',
  timeout: 'Idle client timeout in seconds; 0 disables idle disconnects.',
  databases: 'Number of logical Redis databases.',
  loglevel: 'Minimum Redis log verbosity.',
  maxmemory: 'Memory cap used before Redis applies the configured eviction policy.',
  'maxmemory-policy': 'Eviction behavior when maxmemory is reached.',
  save: 'RDB snapshot rule in seconds and changed keys.',
  appendonly: 'Append-only file persistence mode.',
  appendfsync: 'AOF fsync durability/latency policy.',
  requirepass: 'Legacy password gate; Redis ACLs are preferred for multi-user access.',
  aclfile: 'External ACL user definition file.',
  'rename-command': 'Renames or disables dangerous administrative commands.',
  replicaof: 'Configures this Redis node as a replica of another instance.',
  'replica-read-only': 'Keeps replica writes disabled for normal clients.',
};

function helpFor(key) {
  return HELP[key] || 'Open this Redis directive in source.';
}

function lineButton(label, entry, key = label) {
  const line = entry?.line || 1;
  const title = `${helpFor(key)} Open line ${line} in source.`;
  return `<button class="rd-link" type="button" data-source-line="${line}" title="${esc(title)}">${esc(label)}</button>`;
}

function value(entry, key) {
  const raw = entry?.value;
  if (raw == null || raw === '') return '';
  const sensitive = SENSITIVE.test(key);
  const masked = sensitive ? { text: '[configured]', masked: true, reason: `masked because "${key}" is a Redis sensitive setting` } : maskedValue(key, raw);
  if (masked.masked) {
    return `<span class="rd-kv-v rd-pill warn" title="${esc(masked.reason)}">[configured]</span><span class="rd-mask-reason">${esc(masked.reason)}</span>`;
  }
  return `<span class="rd-kv-v">${esc(raw)}</span>`;
}

function kv(label, entry, key = label) {
  if (!entry || entry.value == null || entry.value === '') return '';
  return `<div class="rd-kv"><span class="rd-kv-k">${lineButton(label, entry, key)}</span>${value(entry, key)}</div>`;
}

function plainValue(entry) {
  return entry?.value || '';
}

function parseRedisConf(text) {
  const cfg = {};
  const saveRules = [];
  const renameCommands = [];
  const lines = (text || '').split(/\r?\n/);
  for (const [idx, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // strip inline comment
    const noComment = trimmed.replace(/\s+#.*$/, '');
    const [directive, ...rest] = noComment.split(/\s+/);
    if (!directive) continue;
    const key = directive.toLowerCase();
    const value = rest.join(' ');
    const entry = { key, value, line: idx + 1 };
    if (key === 'save') {
      saveRules.push(entry);
    } else if (key === 'rename-command') {
      renameCommands.push(entry);
    } else {
      cfg[key] = entry;
    }
  }
  return { cfg, saveRules, renameCommands };
}

function collectIssues(cfg, saveRules, renameCommands) {
  const issues = [];
  const bind = plainValue(cfg.bind);
  if (/(^|\s)(0\.0\.0\.0|\*|::)(\s|$)/.test(bind)) {
    issues.push({
      severity: 'warning',
      label: 'public bind',
      line: cfg.bind?.line || 1,
      message: `bind is ${bind}; confirm firewall rules, protected-mode, and ACLs before exposing Redis.`,
    });
  } else if (bind) {
    issues.push({
      severity: 'info',
      label: 'bind scope',
      line: cfg.bind?.line || 1,
      message: `bind is ${bind}; verify it matches intended client networks.`,
    });
  }
  if (plainValue(cfg['protected-mode']) === 'no') {
    issues.push({
      severity: 'warning',
      label: 'protected mode',
      line: cfg['protected-mode']?.line || 1,
      message: 'protected-mode is disabled; Redis must be protected by bind, ACLs, and network controls.',
    });
  }
  if (cfg.requirepass) {
    issues.push({
      severity: 'info',
      label: 'password set',
      line: cfg.requirepass.line,
      message: 'requirepass is configured and redacted; consider ACL users for scoped access.',
    });
  }
  if (saveRules.length && plainValue(cfg.appendonly) === 'yes') {
    issues.push({
      severity: 'info',
      label: 'dual persistence',
      line: cfg.appendonly.line,
      message: 'Both RDB snapshots and AOF are enabled; confirm storage and restore expectations.',
    });
  }
  if (renameCommands.length) {
    issues.push({
      severity: 'info',
      label: 'renamed commands',
      line: renameCommands[0].line,
      message: `${renameCommands.length} administrative command rename rule${renameCommands.length === 1 ? '' : 's'} configured.`,
    });
  }
  const maxclients = Number(plainValue(cfg.maxclients));
  if (Number.isFinite(maxclients) && maxclients > 5000) {
    issues.push({
      severity: 'info',
      label: 'client limit',
      line: cfg.maxclients.line,
      message: `maxclients is ${maxclients}; verify file descriptor limits and connection pooling.`,
    });
  }
  return issues;
}

function redactedSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*([A-Za-z][\w-]*)\s+)(.*)$/);
    if (!m || !SENSITIVE.test(m[2])) return line;
    return `${m[1]}[configured]`;
  }).join('\n');
}

function highlightRedisLine(line) {
  const escaped = esc(line);
  if (/^\s*#/.test(line)) return `<span class="rd-source-comment">${escaped}</span>`;
  return escaped.replace(/^(\s*[A-Za-z][\w-]*)/, '<span class="rd-source-key">$1</span>');
}

export function render(intake) {
  const { cfg, saveRules, renameCommands } = parseRedisConf(intake.text || '');

  const port = cfg.port;
  const bind = cfg.bind;
  const databases = cfg.databases;
  const loglevel = cfg.loglevel;
  const logfile = cfg.logfile;
  const timeout = cfg.timeout;
  const tcpBacklog = cfg['tcp-backlog'];
  const unixsocket = cfg.unixsocket;

  // Memory
  const maxmemory = cfg.maxmemory;
  const maxmemoryPolicy = cfg['maxmemory-policy'];

  // Security
  const requirepass = cfg.requirepass;
  const aclfile = cfg.aclfile;

  // Persistence — RDB
  const rdbEnabled = saveRules.length > 0;
  const appendonly = cfg.appendonly;
  const aofEnabled = plainValue(appendonly) === 'yes';
  const aofRewrite = cfg['auto-aof-rewrite-percentage'];
  const dbfilename = cfg.dbfilename;
  const dir = cfg.dir;

  // Replication
  const replicaof = cfg.replicaof || cfg.slaveof;
  const replicaReadOnly = cfg['replica-read-only'] || cfg['slave-read-only'];

  // Network section
  const networkParts = [];
  if (bind) networkParts.push(bind.value);
  if (unixsocket) networkParts.push(`unix:${unixsocket.value}`);

  const networkHtml = (port || bind || timeout || unixsocket) ? `
<div class="rd-sec"><h3>Network</h3><div class="rd-card">
${kv('port', port)}
${kv('bind', bind)}
${unixsocket ? kv('unixsocket', unixsocket) : ''}
${timeout && timeout.value !== '0' ? kv('timeout', timeout) : ''}
${tcpBacklog ? kv('tcp-backlog', tcpBacklog) : ''}
</div></div>` : '';

  // General
  const generalHtml = (databases || loglevel || logfile) ? `
<div class="rd-sec"><h3>General</h3><div class="rd-card">
${kv('databases', databases)}
${kv('loglevel', loglevel)}
${logfile ? kv('logfile', logfile) : ''}
</div></div>` : '';

  // Memory
  const memHtml = (maxmemory || maxmemoryPolicy) ? `
<div class="rd-sec"><h3>Memory</h3><div class="rd-card">
${kv('maxmemory', maxmemory)}
${kv('maxmemory-policy', maxmemoryPolicy)}
</div></div>` : '';

  // Persistence
  const persistParts = [];
  if (rdbEnabled) persistParts.push(`<span class="rd-pill on">RDB snapshots</span>`);
  else persistParts.push(`<span class="rd-pill off">RDB disabled</span>`);
  if (aofEnabled) persistParts.push(`<span class="rd-pill on">AOF enabled</span>`);
  else persistParts.push(`<span class="rd-pill off">AOF disabled</span>`);

  const saveHtml = saveRules.length ? `<div class="rd-kv"><span class="rd-kv-k">${lineButton('save rules', saveRules[0], 'save')}</span><span class="rd-pills">${saveRules.slice(0, 5).map((r) => `<button class="rd-pill rd-link" type="button" data-source-line="${r.line}" title="${esc(helpFor('save'))}">${esc(r.value)}</button>`).join('')}</span></div>` : '';
  const persistHtml = `<div class="rd-sec"><h3>Persistence</h3><div class="rd-card">
<div class="rd-kv"><span class="rd-kv-k">mode</span><span class="rd-pills">${persistParts.join('')}</span></div>
${saveHtml}
${dbfilename ? kv('dbfilename', dbfilename) : ''}
${dir ? kv('dir', dir) : ''}
${aofRewrite ? kv('aof-rewrite-pct', aofRewrite, 'auto-aof-rewrite-percentage') : ''}
</div></div>`;

  // Security
  const secParts = [];
  if (requirepass) secParts.push(kv('requirepass', requirepass));
  if (aclfile) secParts.push(kv('aclfile', aclfile));
  if (renameCommands.length) secParts.push(`<div class="rd-kv"><span class="rd-kv-k">${lineButton('renamed cmds', renameCommands[0], 'rename-command')}</span><span class="rd-pills">${renameCommands.slice(0, 4).map((r) => `<button class="rd-pill rd-link warn" type="button" data-source-line="${r.line}" title="${esc(helpFor('rename-command'))}">${esc(r.value.split(' ')[0])}</button>`).join('')}</span></div>`);

  const secHtml = secParts.length ? `<div class="rd-sec"><h3>Security</h3><div class="rd-card">${secParts.join('')}</div></div>` : '';

  // Replication
  const replHtml = replicaof ? `<div class="rd-sec"><h3>Replication</h3><div class="rd-card">
${kv('replicaof', replicaof)}
${kv('replica-read-only', replicaReadOnly)}
</div></div>` : '';

  // Sub-summary
  const subParts = [];
  if (port) subParts.push(`port ${port.value}`);
  if (databases) subParts.push(`${databases.value} db${Number(databases.value) !== 1 ? 's' : ''}`);
  if (maxmemory) subParts.push(`maxmemory ${maxmemory.value}`);
  if (requirepass) subParts.push('password set');
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'rd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-rd">Redis</span>
  <span class="rd-title">Server Configuration</span>
  ${port ? `<span class="rd-tag">:${esc(port.value)}</span>` : ''}
</div>
<div class="rd-sub">${esc(sub)}</div>
${networkHtml}${generalHtml}${memHtml}${persistHtml}${secHtml}${replHtml}`;
  const review = issueList(collectIssues(cfg, saveRules, renameCommands), { title: 'Redis Review' });
  if (review) host.insertBefore(review, host.querySelector('.rd-sec'));
  host.appendChild(sourcePreview(redactedSource(intake.text || ''), { title: 'Redacted source', collapsed: true, idPrefix: 'rd-line', highlighter: highlightRedisLine }));
  wireSourceLinks(host, { idPrefix: 'rd-line' });
  return { parentNode: host };
}
