const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.unboundcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.unboundcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#005EB8;color:#fff;vertical-align:middle;margin-right:8px;}
.unboundcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.unboundcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.unboundcfg-sec{margin:12px 0;}
.unboundcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.unboundcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.unboundcfg-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.unboundcfg-kv-key{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;}
.unboundcfg-kv-val{font-family:ui-monospace,monospace;}
.unboundcfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.unboundcfg-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.unboundcfg-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.unboundcfg-table tr:last-child td{border-bottom:none;}
.unboundcfg-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;font-weight:600;margin:1px 2px;}
.unboundcfg-chip-allow{background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;}
.unboundcfg-chip-refuse{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;}
.unboundcfg-chip-deny{background:#fef3c7;color:#92400e;border:1px solid #fcd34d;}
.unboundcfg-chip-ok{background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;}
.unboundcfg-flag-on{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;font-weight:600;}
.unboundcfg-flag-off{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);border:1px solid var(--border,#e0e0e0);font-weight:600;}
.unboundcfg-dot{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#ede9fe;color:#5b21b6;border:1px solid #c4b5fd;font-weight:600;margin-left:4px;}
.unboundcfg-addr-list{list-style:none;margin:4px 0 0;padding:0;}
.unboundcfg-addr-list li{font-family:ui-monospace,monospace;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.unboundcfg-addr-list li:last-child{border-bottom:none;}
.unboundcfg-empty{color:var(--fg-2,#888);font-size:13px;}
`;

/**
 * Parse an unbound.conf file into sections.
 * Returns { server, forwardZones, stubZones, remoteControl, authZones }.
 */
function parseUnboundConf(text) {
  // Strip comments
  const lines = text.split('\n').map(l => {
    const ci = l.indexOf('#');
    return ci >= 0 ? l.slice(0, ci) : l;
  });

  const sections = {}; // sectionName -> [{key, value}]
  const sectionZones = { forward: [], stub: [], auth: [] }; // multi-section arrays

  let currentSection = null;
  let currentZoneType = null; // 'forward' | 'stub' | 'auth'
  let currentZone = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Section header: word followed by colon at start of line (no leading whitespace)
    const headerM = /^(\w[\w-]*):\s*$/.exec(raw);
    if (headerM) {
      const name = headerM[1];
      // Flush current zone
      if (currentZone) {
        sectionZones[currentZoneType].push(currentZone);
        currentZone = null;
        currentZoneType = null;
      }
      if (name === 'forward-zone') {
        currentZoneType = 'forward';
        currentZone = { name: '', addrs: [] };
      } else if (name === 'stub-zone') {
        currentZoneType = 'stub';
        currentZone = { name: '', addrs: [] };
      } else if (name === 'auth-zone') {
        currentZoneType = 'auth';
        currentZone = { name: '', masters: [] };
      } else {
        currentSection = name;
        if (!sections[name]) sections[name] = [];
      }
      continue;
    }

    // Key: value line
    const kvM = /^\s+([\w-]+):\s*(.*)$/.exec(raw);
    if (!kvM) continue;
    const key = kvM[1];
    const value = kvM[2].trim();

    if (currentZone) {
      if (key === 'name') currentZone.name = value.replace(/^["']|["']$/g, '');
      else if (key === 'forward-addr') currentZone.addrs.push(value);
      else if (key === 'stub-addr') currentZone.addrs.push(value);
      else if (key === 'master') currentZone.masters.push(value);
    } else if (currentSection) {
      sections[currentSection].push({ key, value });
    }
  }
  // Flush last zone
  if (currentZone && currentZoneType) {
    sectionZones[currentZoneType].push(currentZone);
  }

  // Parse server section into structured form
  const serverKvs = sections['server'] || [];
  function getAll(k) { return serverKvs.filter(e => e.key === k).map(e => e.value); }
  function getFirst(k) { const a = getAll(k); return a.length ? a[0] : null; }

  const server = {
    interfaces: getAll('interface'),
    port: getFirst('port'),
    verbosity: getFirst('verbosity'),
    numThreads: getFirst('num-threads'),
    msgCacheSize: getFirst('msg-cache-size') || getFirst('rrset-cache-size'),
    accessControls: getAll('access-control').map(v => {
      const parts = v.trim().split(/\s+/);
      return { net: parts[0] || v, action: parts[1] || '' };
    }),
    doIp4: getFirst('do-ip4'),
    doIp6: getFirst('do-ip6'),
    doUdp: getFirst('do-udp'),
    doTcp: getFirst('do-tcp'),
    rootHints: getFirst('root-hints'),
    trustAnchorFile: getFirst('trust-anchor-file') || getFirst('auto-trust-anchor-file'),
    valPermissive: getFirst('val-permissive-mode'),
    tlsCertBundle: getFirst('tls-cert-bundle'),
    hideVersion: getFirst('hide-version'),
    hideIdentity: getFirst('hide-identity'),
  };

  // Remote control section
  const rcKvs = sections['remote-control'] || [];
  function getRcFirst(k) { const e = rcKvs.find(e => e.key === k); return e ? e.value : null; }
  const remoteControl = {
    enabled: getRcFirst('control-enable'),
    interfaces: rcKvs.filter(e => e.key === 'control-interface').map(e => e.value),
    port: getRcFirst('control-port'),
    useCert: getRcFirst('control-use-cert'),
  };

  return { server, forwardZones: sectionZones.forward, stubZones: sectionZones.stub, authZones: sectionZones.auth, remoteControl };
}

function flagChip(val, trueLabel, falseLabel) {
  if (val === 'yes') return `<span class="unboundcfg-flag-on">${esc(trueLabel || 'yes')}</span>`;
  if (val === 'no') return `<span class="unboundcfg-flag-off">${esc(falseLabel || 'no')}</span>`;
  return '';
}

function accessControlChip(action) {
  const a = (action || '').toLowerCase();
  if (a === 'allow') return `<span class="unboundcfg-chip unboundcfg-chip-allow">allow</span>`;
  if (a === 'refuse') return `<span class="unboundcfg-chip unboundcfg-chip-refuse">refuse</span>`;
  if (a === 'deny') return `<span class="unboundcfg-chip unboundcfg-chip-deny">deny</span>`;
  if (a === 'allow_snoop') return `<span class="unboundcfg-chip unboundcfg-chip-ok">allow_snoop</span>`;
  return `<span class="unboundcfg-chip unboundcfg-chip-ok">${esc(action)}</span>`;
}

function formatForwardAddr(addr) {
  // DoT: addr@853#hostname
  const dotM = /^([^@]+)@(\d+)(?:#(.+))?$/.exec(addr);
  if (dotM) {
    const port = dotM[2];
    const hostname = dotM[3] || '';
    const isDot = port === '853';
    return `${esc(dotM[1])}${isDot ? `<span class="unboundcfg-dot">DoT@853${hostname ? ' ' + esc(hostname) : ''}</span>` : `<span class="unboundcfg-chip unboundcfg-chip-ok">@${esc(port)}</span>`}`;
  }
  return esc(addr);
}

export function render(intake) {
  const text = intake.text || '';
  const { server, forwardZones, stubZones, authZones, remoteControl } = parseUnboundConf(text);

  const host = document.createElement('div');
  host.className = 'unboundcfg-doc';

  // Summary line
  const summaryParts = [];
  if (server.interfaces.length) summaryParts.push(`${server.interfaces.length} interface${server.interfaces.length !== 1 ? 's' : ''}`);
  if (forwardZones.length) summaryParts.push(`${forwardZones.length} forward zone${forwardZones.length !== 1 ? 's' : ''}`);
  if (stubZones.length) summaryParts.push(`${stubZones.length} stub zone${stubZones.length !== 1 ? 's' : ''}`);
  if (server.trustAnchorFile) summaryParts.push('DNSSEC');
  if (server.tlsCertBundle) summaryParts.push('TLS/DoH');

  // Server section
  const serverKvRows = [
    server.port ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">port</span><span class="unboundcfg-kv-val">${esc(server.port)}</span></div>` : '',
    server.verbosity != null ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">verbosity</span><span class="unboundcfg-kv-val">${esc(server.verbosity)}</span></div>` : '',
    server.numThreads ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">num-threads</span><span class="unboundcfg-kv-val">${esc(server.numThreads)}</span></div>` : '',
    server.msgCacheSize ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">cache-size</span><span class="unboundcfg-kv-val">${esc(server.msgCacheSize)}</span></div>` : '',
    server.doIp4 != null ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">do-ip4</span><span class="unboundcfg-kv-val">${flagChip(server.doIp4)}</span></div>` : '',
    server.doIp6 != null ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">do-ip6</span><span class="unboundcfg-kv-val">${flagChip(server.doIp6)}</span></div>` : '',
    server.doUdp != null ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">do-udp</span><span class="unboundcfg-kv-val">${flagChip(server.doUdp)}</span></div>` : '',
    server.doTcp != null ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">do-tcp</span><span class="unboundcfg-kv-val">${flagChip(server.doTcp)}</span></div>` : '',
    server.hideVersion ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">hide-version</span><span class="unboundcfg-kv-val">${flagChip(server.hideVersion)}</span></div>` : '',
    server.hideIdentity ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">hide-identity</span><span class="unboundcfg-kv-val">${flagChip(server.hideIdentity)}</span></div>` : '',
    server.rootHints ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">root-hints</span><span class="unboundcfg-kv-val">${esc(server.rootHints)}</span></div>` : '',
    server.tlsCertBundle ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">tls-cert-bundle</span><span class="unboundcfg-kv-val">${esc(server.tlsCertBundle)}</span></div>` : '',
  ].filter(Boolean).join('');

  const interfacesHtml = server.interfaces.length ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">interfaces</span><span class="unboundcfg-kv-val">${server.interfaces.map(esc).join(', ')}</span></div>` : '';

  const serverHtml = (interfacesHtml || serverKvRows) ? `<div class="unboundcfg-sec">
  <h3>Server</h3>
  <div class="unboundcfg-card">
    ${interfacesHtml}
    ${serverKvRows}
  </div>
</div>` : '';

  // Access control section
  const acHtml = server.accessControls.length ? `<div class="unboundcfg-sec">
  <h3>Access Control</h3>
  <div class="unboundcfg-card">
    <table class="unboundcfg-table">
      <thead><tr><th>Network</th><th>Action</th></tr></thead>
      <tbody>
        ${server.accessControls.map(ac => `<tr><td>${esc(ac.net)}</td><td>${accessControlChip(ac.action)}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>` : '';

  // DNSSEC section
  const dnssecHtml = (server.trustAnchorFile || server.valPermissive != null) ? `<div class="unboundcfg-sec">
  <h3>DNSSEC</h3>
  <div class="unboundcfg-card">
    ${server.trustAnchorFile ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">trust-anchor-file</span><span class="unboundcfg-kv-val">${esc(server.trustAnchorFile)}</span></div>` : ''}
    ${server.valPermissive != null ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">val-permissive-mode</span><span class="unboundcfg-kv-val">${flagChip(server.valPermissive, 'permissive', 'strict')}</span></div>` : ''}
  </div>
</div>` : '';

  // Forward zones section
  const forwardHtml = forwardZones.length ? `<div class="unboundcfg-sec">
  <h3>Forward Zones</h3>
  <table class="unboundcfg-table">
    <thead><tr><th>Zone</th><th>Forward addresses</th></tr></thead>
    <tbody>
      ${forwardZones.map(z => `<tr>
        <td>${esc(z.name || '.')}</td>
        <td>${z.addrs.map(a => `<div>${formatForwardAddr(a)}</div>`).join('') || '<span style="color:var(--fg-2,#888)">—</span>'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : '';

  // Stub zones section
  const stubHtml = stubZones.length ? `<div class="unboundcfg-sec">
  <h3>Stub Zones</h3>
  <table class="unboundcfg-table">
    <thead><tr><th>Zone</th><th>Stub addresses</th></tr></thead>
    <tbody>
      ${stubZones.map(z => `<tr>
        <td>${esc(z.name)}</td>
        <td>${z.addrs.map(esc).join(', ') || '<span style="color:var(--fg-2,#888)">—</span>'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : '';

  // Remote control section
  const rcEnabled = remoteControl.enabled === 'yes';
  const rcHtml = (remoteControl.enabled != null) ? `<div class="unboundcfg-sec">
  <h3>Remote Control</h3>
  <div class="unboundcfg-card">
    <div class="unboundcfg-kv"><span class="unboundcfg-kv-key">control-enable</span><span class="unboundcfg-kv-val">${flagChip(remoteControl.enabled, 'enabled', 'disabled')}</span></div>
    ${remoteControl.interfaces.length ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">control-interface</span><span class="unboundcfg-kv-val">${remoteControl.interfaces.map(esc).join(', ')}</span></div>` : ''}
    ${remoteControl.port ? `<div class="unboundcfg-kv"><span class="unboundcfg-kv-key">control-port</span><span class="unboundcfg-kv-val">${esc(remoteControl.port)}</span></div>` : ''}
  </div>
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="unboundcfg-title"><span class="unboundcfg-badge">Unbound</span>Unbound DNS resolver</div>
<div class="unboundcfg-sub">${summaryParts.length ? summaryParts.join(' · ') : 'Unbound DNS resolver configuration'}</div>
${serverHtml}
${acHtml}
${dnssecHtml}
${forwardHtml}
${stubHtml}
${rcHtml}`;

  return { parentNode: host };
}
