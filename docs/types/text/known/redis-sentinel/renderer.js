// Redis Sentinel sentinel.conf enhanced view.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rds-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-rds{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#DC382D;color:#fff;vertical-align:middle;margin-right:8px;}
.rds-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rds-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rds-sec{margin:14px 0;}
.rds-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.rds-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:0 0 8px 0;}
.rds-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.rds-kv-k{color:var(--fg-2,#888);min-width:180px;font-family:ui-monospace,monospace;}
.rds-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.rds-master-name{font:700 13px/1.4 ui-monospace,monospace;color:#DC382D;margin-bottom:4px;}
.rds-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff1f2;border:1px solid #fecdd3;color:#be123c;margin-left:4px;}
.rds-warn{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;margin-left:4px;}
.rds-masked{color:var(--fg-2,#888);font-family:ui-monospace,monospace;letter-spacing:.05em;}
.rds-pills{display:flex;flex-wrap:wrap;gap:6px;}
.rds-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

function parseSentinelConf(text) {
  const cfg = {};
  const monitors = {};
  const perMaster = {};
  const notificationScripts = {};
  const lines = (text || '').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;
    const directive = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (directive === 'sentinel') {
      const subCmd = (args[0] || '').toLowerCase();
      if (subCmd === 'monitor') {
        // sentinel monitor <name> <host> <port> <quorum>
        const [, name, host, port, quorum] = parts;
        if (name) monitors[name] = { host, port, quorum };
      } else if (['down-after-milliseconds', 'failover-timeout', 'parallel-syncs',
        'auth-pass', 'auth-user', 'requirepass',
        'notification-script', 'client-reconfig-script',
        'resolve-hostnames', 'announce-hostnames'].includes(subCmd)) {
        const name = args[1];
        if (name) {
          if (!perMaster[name]) perMaster[name] = {};
          perMaster[name][subCmd] = args.slice(2).join(' ');
          if (subCmd === 'notification-script') notificationScripts[name] = args.slice(2).join(' ');
        }
      }
    } else if (directive === 'port') {
      cfg.port = args[0];
    } else if (directive === 'bind') {
      cfg.bind = args.join(' ');
    } else if (directive === 'loglevel') {
      cfg.loglevel = args[0];
    } else if (directive === 'logfile') {
      cfg.logfile = args.join(' ').replace(/^"|"$/g, '');
    } else if (directive === 'requirepass') {
      cfg.requirepass = args.join(' ');
    } else if (directive === 'daemonize') {
      cfg.daemonize = args[0];
    } else if (directive === 'dir') {
      cfg.dir = args.join(' ');
    } else if (directive === 'protected-mode') {
      cfg['protected-mode'] = args[0];
    }
  }
  return { cfg, monitors, perMaster, notificationScripts };
}

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="rds-kv"><span class="rds-kv-k">${esc(label)}</span><span class="rds-kv-v">${esc(value)}</span></div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { cfg, monitors, perMaster, notificationScripts } = parseSentinelConf(text);

  const port = cfg.port || '';
  const bind = cfg.bind || '';
  const loglevel = cfg.loglevel || '';
  const logfile = cfg.logfile || '';
  const requirepass = cfg.requirepass || '';
  const daemonize = cfg.daemonize || '';
  const dir = cfg.dir || '';

  const masterNames = Object.keys(monitors);
  const subParts = [];
  if (port) subParts.push(`port ${port}`);
  if (masterNames.length) subParts.push(`${masterNames.length} master${masterNames.length !== 1 ? 's' : ''} monitored`);

  const generalHtml = (port || bind || loglevel || logfile || daemonize || dir) ? `
<div class="rds-sec"><h3>Sentinel Settings</h3><div class="rds-card">
${kv('port', port)}
${kv('bind', bind)}
${kv('daemonize', daemonize)}
${kv('loglevel', loglevel)}
${kv('logfile', logfile)}
${kv('dir', dir)}
${requirepass ? `<div class="rds-kv"><span class="rds-kv-k">requirepass</span><span class="rds-masked">••••••••</span><span class="rds-warn">sensitive</span></div>` : ''}
</div></div>` : '';

  const mastersHtml = masterNames.length ? `
<div class="rds-sec"><h3>Monitored Masters</h3>
${masterNames.map((name) => {
  const m = monitors[name] || {};
  const pm = perMaster[name] || {};
  const authPass = pm['auth-pass'];
  const downAfter = pm['down-after-milliseconds'] ? pm['down-after-milliseconds'] + ' ms' : '';
  const failoverTimeout = pm['failover-timeout'] ? pm['failover-timeout'] + ' ms' : '';
  const parallelSyncs = pm['parallel-syncs'] || '';
  const script = notificationScripts[name] || '';

  return `<div class="rds-card">
<div class="rds-master-name">${esc(name)}</div>
${kv('host', m.host || '')}
${kv('port', m.port || '')}
${kv('quorum', m.quorum || '')}
${kv('down-after-milliseconds', downAfter)}
${kv('failover-timeout', failoverTimeout)}
${kv('parallel-syncs', parallelSyncs)}
${authPass ? `<div class="rds-kv"><span class="rds-kv-k">auth-pass</span><span class="rds-masked">••••••••</span><span class="rds-warn">sensitive</span></div>` : ''}
${script ? `<div class="rds-kv"><span class="rds-kv-k">notification-script</span><span class="rds-kv-v">${esc(script)}</span></div>` : ''}
</div>`;
}).join('')}
</div>` : '';

  const host = document.createElement('div');
  host.className = 'rds-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-rds">Redis Sentinel</span>
  <span class="rds-title">Sentinel Configuration</span>
  ${port ? `<span class="rds-tag">:${esc(port)}</span>` : ''}
</div>
<div class="rds-sub">${esc(subParts.join(' · '))}</div>
${generalHtml}${mastersHtml}`;

  return { parentNode: host };
}
