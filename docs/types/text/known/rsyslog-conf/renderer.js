const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rsyslog-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rsyslog-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1A3A6B;color:#fff;vertical-align:middle;margin-right:8px;}
.rsyslog-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rsyslog-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rsyslog-sec{margin:12px 0;}
.rsyslog-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.rsyslog-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.rsyslog-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.rsyslog-table{width:100%;border-collapse:collapse;font-size:13px;}
.rsyslog-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.rsyslog-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.rsyslog-sel{color:var(--fg,#24292f);font-weight:600;}
.rsyslog-dest{color:var(--fg-2,#666);}
.rsyslog-remote-badge{display:inline-block;font-size:10px;padding:1px 5px;border-radius:4px;margin-left:5px;font-weight:700;}
.rsyslog-tcp{background:#dbeafe;color:#1d4ed8;}
.rsyslog-udp{background:#dcfce7;color:#15803d;}
`;

function parseRsyslog(text) {
  const lines = text.split('\n');

  const modules = [];
  const inputs = [];
  const routes = [];
  const remotes = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // $ModLoad imuxsock  — legacy syntax
    const modLoadMatch = /^\$ModLoad\s+(\S+)/i.exec(line);
    if (modLoadMatch) {
      const mod = modLoadMatch[1].trim();
      if (!modules.includes(mod)) modules.push(mod);
      continue;
    }

    // module(load="imtcp") — RainerScript syntax
    const moduleRsMatch = /^module\s*\(\s*load\s*=\s*["']([^"']+)["']/i.exec(line);
    if (moduleRsMatch) {
      const mod = moduleRsMatch[1].trim();
      if (!modules.includes(mod)) modules.push(mod);
      continue;
    }

    // input(type="imtcp" port="514") — RainerScript input
    const inputRsMatch = /^input\s*\(\s*type\s*=\s*["']([^"']+)["']([^)]*)\)/i.exec(line);
    if (inputRsMatch) {
      const type = inputRsMatch[1].trim();
      const rest = inputRsMatch[2];
      const portMatch = /port\s*=\s*["']?(\d+)["']?/i.exec(rest);
      const port = portMatch ? portMatch[1] : null;
      inputs.push({ type, port });
      continue;
    }

    // $InputTCPServerRun 514 / $UDPServerRun 514 — legacy input lines
    const legacyInputMatch = /^\$(UDPServerRun|InputTCPServerRun|Input\w+Run)\s+(\d+)/i.exec(line);
    if (legacyInputMatch) {
      const directive = legacyInputMatch[1].toLowerCase();
      const port = legacyInputMatch[2];
      const type = directive.includes('tcp') ? 'imtcp' : directive.includes('udp') ? 'imudp' : directive;
      inputs.push({ type, port });
      continue;
    }

    // Remote forwarding: @@host:port (TCP) or @host:port (UDP)
    const remoteMatch = /^[^#]*?(@@?)([\w.\-]+)(?::(\d+))?/.exec(line);
    if (remoteMatch && !line.startsWith(':') && !line.startsWith('$')) {
      const proto = remoteMatch[1] === '@@' ? 'TCP' : 'UDP';
      const host = remoteMatch[2];
      const port = remoteMatch[3] || '514';
      // Extract selector from line if present
      const selMatch = /^(\S+)\s+@@?/.exec(line);
      const selector = selMatch ? selMatch[1] : '*.*';
      remotes.push({ proto, host, port, selector });
      continue;
    }

    // Facility.severity -> file path
    // e.g. auth,authpriv.*   /var/log/auth.log
    //       *.*;auth,authpriv.none   /var/log/syslog
    //       *.emerg   :omusrmsg:*
    const routeMatch = /^(\S+)\s+([-\/:][\S]+)/.exec(line);
    if (routeMatch) {
      const selector = routeMatch[1];
      let dest = routeMatch[2];
      // Strip leading dash (async write indicator)
      if (dest.startsWith('-')) dest = dest.slice(1);
      routes.push({ selector, dest });
      continue;
    }
  }

  return { modules, inputs, routes, remotes };
}

export function render(intake) {
  const text = intake.text || '';
  const { modules, inputs, routes, remotes } = parseRsyslog(text);

  const host = document.createElement('div');
  host.className = 'rsyslog-doc';

  // Summary
  const parts = [];
  if (modules.length) parts.push(`${modules.length} module${modules.length !== 1 ? 's' : ''}`);
  if (inputs.length) parts.push(`${inputs.length} input${inputs.length !== 1 ? 's' : ''}`);
  if (routes.length) parts.push(`${routes.length} route${routes.length !== 1 ? 's' : ''}`);
  if (remotes.length) parts.push(`${remotes.length} remote${remotes.length !== 1 ? 's' : ''}`);
  const summary = parts.join(' · ') || 'rsyslog configuration';

  // Modules card
  const modulesHtml = modules.length ? `<div class="rsyslog-sec">
  <h3>Modules</h3>
  <div class="rsyslog-card">
    ${modules.map((m) => `<span class="rsyslog-chip">${esc(m)}</span>`).join('')}
  </div>
</div>` : '';

  // Inputs card
  const inputsHtml = inputs.length ? `<div class="rsyslog-sec">
  <h3>Inputs</h3>
  <div class="rsyslog-card">
    <table class="rsyslog-table">
      <thead><tr><th>Type</th><th>Port</th></tr></thead>
      <tbody>
        ${inputs.map((inp) => `<tr>
          <td><span class="rsyslog-chip">${esc(inp.type)}</span></td>
          <td>${inp.port ? esc(inp.port) : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>` : '';

  // Log routing table
  const routesHtml = routes.length ? `<div class="rsyslog-sec">
  <h3>Log Routing</h3>
  <table class="rsyslog-table">
    <thead><tr><th>Selector</th><th>Destination</th></tr></thead>
    <tbody>
      ${routes.map((r) => `<tr>
        <td><span class="rsyslog-sel">${esc(r.selector)}</span></td>
        <td><span class="rsyslog-dest">${esc(r.dest)}</span></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : '';

  // Remote forwarding
  const remotesHtml = remotes.length ? `<div class="rsyslog-sec">
  <h3>Remote Forwarding</h3>
  <table class="rsyslog-table">
    <thead><tr><th>Selector</th><th>Host</th><th>Port</th><th>Protocol</th></tr></thead>
    <tbody>
      ${remotes.map((r) => `<tr>
        <td><span class="rsyslog-sel">${esc(r.selector)}</span></td>
        <td>${esc(r.host)}</td>
        <td>${esc(r.port)}</td>
        <td><span class="rsyslog-remote-badge ${r.proto === 'TCP' ? 'rsyslog-tcp' : 'rsyslog-udp'}">${esc(r.proto)}</span></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="rsyslog-title"><span class="rsyslog-badge">rsyslog</span>rsyslog Config</div>
<div class="rsyslog-sub">${esc(summary)}</div>
${modulesHtml}
${inputsHtml}
${routesHtml}
${remotesHtml}`;

  return { parentNode: host };
}
