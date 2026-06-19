const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="rd-kv"><span class="rd-kv-k">${esc(label)}</span><span class="rd-kv-v">${esc(value)}</span></div>`;
}

function parseRedisConf(text) {
  const cfg = {};
  const saveRules = [];
  const lines = (text || '').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // strip inline comment
    const noComment = trimmed.replace(/\s+#.*$/, '');
    const [directive, ...rest] = noComment.split(/\s+/);
    if (!directive) continue;
    const key = directive.toLowerCase();
    const value = rest.join(' ');
    if (key === 'save') {
      saveRules.push(value);
    } else {
      cfg[key] = value;
    }
  }
  return { cfg, saveRules };
}

export function render(intake) {
  const { cfg, saveRules } = parseRedisConf(intake.text || '');

  const port = cfg['port'] || '';
  const bind = cfg['bind'] || '';
  const databases = cfg['databases'] || '';
  const loglevel = cfg['loglevel'] || '';
  const logfile = cfg['logfile'] || '';
  const timeout = cfg['timeout'] || '';
  const tcpBacklog = cfg['tcp-backlog'] || '';
  const unixsocket = cfg['unixsocket'] || '';

  // Memory
  const maxmemory = cfg['maxmemory'] || '';
  const maxmemoryPolicy = cfg['maxmemory-policy'] || '';

  // Security
  const requirepass = cfg['requirepass'] || '';
  const aclfile = cfg['aclfile'] || '';
  const rename = Object.entries(cfg).filter(([k]) => k.startsWith('rename-command')).map(([, v]) => v);

  // Persistence — RDB
  const rdbEnabled = saveRules.length > 0;
  const appendonly = cfg['appendonly'] || 'no';
  const aofEnabled = appendonly === 'yes';
  const aofRewrite = cfg['auto-aof-rewrite-percentage'] || '';
  const dbfilename = cfg['dbfilename'] || '';
  const dir = cfg['dir'] || '';

  // Replication
  const replicaof = cfg['replicaof'] || cfg['slaveof'] || '';
  const replicaReadOnly = cfg['replica-read-only'] || cfg['slave-read-only'] || '';

  // Network section
  const networkParts = [];
  if (bind) networkParts.push(bind);
  if (unixsocket) networkParts.push(`unix:${unixsocket}`);

  const networkHtml = (port || bind || timeout || unixsocket) ? `
<div class="rd-sec"><h3>Network</h3><div class="rd-card">
${kv('port', port)}
${kv('bind', bind)}
${unixsocket ? kv('unixsocket', unixsocket) : ''}
${timeout && timeout !== '0' ? kv('timeout', `${timeout}s`) : ''}
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

  const saveHtml = saveRules.length ? `<div class="rd-kv"><span class="rd-kv-k">save rules</span><span class="rd-pills">${saveRules.slice(0, 5).map((r) => `<span class="rd-pill">${esc(r)}</span>`).join('')}</span></div>` : '';
  const persistHtml = `<div class="rd-sec"><h3>Persistence</h3><div class="rd-card">
<div class="rd-kv"><span class="rd-kv-k">mode</span><span class="rd-pills">${persistParts.join('')}</span></div>
${saveHtml}
${dbfilename ? kv('dbfilename', dbfilename) : ''}
${dir ? kv('dir', dir) : ''}
${aofRewrite ? kv('aof-rewrite-pct', aofRewrite + '%') : ''}
</div></div>`;

  // Security
  const secParts = [];
  if (requirepass) secParts.push(`<div class="rd-kv"><span class="rd-kv-k">requirepass</span><span class="rd-kv-v rd-pill warn">••••••••</span></div>`);
  if (aclfile) secParts.push(kv('aclfile', aclfile));
  if (rename.length) secParts.push(`<div class="rd-kv"><span class="rd-kv-k">renamed cmds</span><span class="rd-pills">${rename.slice(0, 4).map((r) => `<span class="rd-pill warn">${esc(r.split(' ')[0])}</span>`).join('')}</span></div>`);

  const secHtml = secParts.length ? `<div class="rd-sec"><h3>Security</h3><div class="rd-card">${secParts.join('')}</div></div>` : '';

  // Replication
  const replHtml = replicaof ? `<div class="rd-sec"><h3>Replication</h3><div class="rd-card">
${kv('replicaof', replicaof)}
${kv('replica-read-only', replicaReadOnly)}
</div></div>` : '';

  // Sub-summary
  const subParts = [];
  if (port) subParts.push(`port ${port}`);
  if (databases) subParts.push(`${databases} db${Number(databases) !== 1 ? 's' : ''}`);
  if (maxmemory) subParts.push(`maxmemory ${maxmemory}`);
  if (requirepass) subParts.push('password set');
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  host.className = 'rd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-rd">Redis</span>
  <span class="rd-title">Server Configuration</span>
  ${port ? `<span class="rd-tag">:${esc(port)}</span>` : ''}
</div>
<div class="rd-sub">${esc(sub)}</div>
${networkHtml}${generalHtml}${memHtml}${persistHtml}${secHtml}${replHtml}`;
  return { parentNode: host };
}
