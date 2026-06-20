const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dnsmasq-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dnsmasq-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a8a6e;color:#fff;vertical-align:middle;margin-right:8px;}
.dnsmasq-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dnsmasq-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.dnsmasq-sec{margin:14px 0;}
.dnsmasq-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.dnsmasq-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.dnsmasq-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.dnsmasq-kv-k{color:var(--fg-2,#888);min-width:130px;flex-shrink:0;}
.dnsmasq-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.dnsmasq-table{width:100%;border-collapse:collapse;font-size:13px;}
.dnsmasq-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.dnsmasq-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.dnsmasq-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.dnsmasq-flag{display:inline-block;font-size:11px;padding:2px 8px;border-radius:10px;background:#f0fdf4;border:1px solid #86efac;color:#166534;margin-left:4px;}
`;

function parseDnsmasq(text) {
  const data = {
    interfaces: [],
    listenAddresses: [],
    bindInterfaces: false,
    domain: null,
    localDomains: [],
    addresses: [],
    servers: [],
    dhcpRanges: [],
    dhcpOptions: [],
    dhcpHosts: [],
    cacheSize: null,
    dnssec: false,
    dnsForwardMax: null,
    bogusPriv: false,
    nohosts: false,
    expandHosts: false,
    filterWin2k: false,
    logQueries: false,
    logDhcp: false,
    confDir: null,
    noResolv: false,
    strictOrder: false,
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    // Remove inline comments (only after values, not inside them)
    const stripped = line.replace(/\s+#.*$/, '').trim();
    if (!stripped) continue;

    const eqIdx = stripped.indexOf('=');
    if (eqIdx === -1) {
      // Boolean directive (no value)
      const key = stripped;
      if (key === 'bind-interfaces') data.bindInterfaces = true;
      else if (key === 'dnssec') data.dnssec = true;
      else if (key === 'bogus-priv') data.bogusPriv = true;
      else if (key === 'no-hosts') data.nohosts = true;
      else if (key === 'expand-hosts') data.expandHosts = true;
      else if (key === 'filterwin2k') data.filterWin2k = true;
      else if (key === 'log-queries') data.logQueries = true;
      else if (key === 'log-dhcp') data.logDhcp = true;
      else if (key === 'no-resolv') data.noResolv = true;
      else if (key === 'strict-order') data.strictOrder = true;
      continue;
    }

    const key = stripped.slice(0, eqIdx).trim();
    const value = stripped.slice(eqIdx + 1).trim();

    switch (key) {
      case 'interface':
        data.interfaces.push(value);
        break;
      case 'listen-address':
        data.listenAddresses.push(value);
        break;
      case 'domain':
        if (!data.domain) data.domain = value;
        break;
      case 'local':
        data.localDomains.push(value);
        break;
      case 'address':
        data.addresses.push(value);
        break;
      case 'server':
        data.servers.push(value);
        break;
      case 'dhcp-range':
        data.dhcpRanges.push(value);
        break;
      case 'dhcp-option':
        data.dhcpOptions.push(value);
        break;
      case 'dhcp-host':
        data.dhcpHosts.push(value);
        break;
      case 'cache-size':
        data.cacheSize = value;
        break;
      case 'dns-forward-max':
        data.dnsForwardMax = value;
        break;
      case 'conf-dir':
        data.confDir = value;
        break;
    }
  }

  return data;
}

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="dnsmasq-kv"><span class="dnsmasq-kv-k">${esc(label)}</span><span class="dnsmasq-kv-v">${esc(value)}</span></div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'dnsmasq-doc';

  const text = intake.text || '';
  const data = parseDnsmasq(text);

  // Summary
  const summaryParts = [];
  if (data.addresses.length) summaryParts.push(`${data.addresses.length} DNS override${data.addresses.length !== 1 ? 's' : ''}`);
  if (data.dhcpRanges.length) summaryParts.push(`${data.dhcpRanges.length} DHCP range${data.dhcpRanges.length !== 1 ? 's' : ''}`);
  if (data.servers.length) summaryParts.push(`${data.servers.length} upstream server${data.servers.length !== 1 ? 's' : ''}`);
  if (data.dhcpHosts.length) summaryParts.push(`${data.dhcpHosts.length} static assignment${data.dhcpHosts.length !== 1 ? 's' : ''}`);

  // Interface section
  const ifaceItems = [];
  if (data.interfaces.length) ifaceItems.push(kv('interface', data.interfaces.join(', ')));
  if (data.listenAddresses.length) ifaceItems.push(kv('listen-address', data.listenAddresses.join(', ')));
  if (data.bindInterfaces) ifaceItems.push(`<div class="dnsmasq-kv"><span class="dnsmasq-kv-k">bind-interfaces</span><span class="dnsmasq-flag">enabled</span></div>`);
  const ifaceHtml = ifaceItems.length ? `<div class="dnsmasq-sec">
  <h3>Interface</h3>
  <div class="dnsmasq-card">${ifaceItems.join('')}</div>
</div>` : '';

  // DNS section
  const dnsItems = [];
  if (data.domain) dnsItems.push(kv('domain', data.domain));
  if (data.localDomains.length) {
    data.localDomains.forEach((l) => dnsItems.push(kv('local', l)));
  }
  if (data.servers.length) {
    dnsItems.push(`<div class="dnsmasq-kv"><span class="dnsmasq-kv-k">upstream servers</span><span>${data.servers.map((s) => `<span class="dnsmasq-chip">${esc(s)}</span>`).join('')}</span></div>`);
  }
  if (data.cacheSize != null) dnsItems.push(kv('cache-size', data.cacheSize));
  if (data.dnsForwardMax) dnsItems.push(kv('dns-forward-max', data.dnsForwardMax));
  if (data.dnssec) dnsItems.push(`<div class="dnsmasq-kv"><span class="dnsmasq-kv-k">dnssec</span><span class="dnsmasq-flag">enabled</span></div>`);
  if (data.noResolv) dnsItems.push(`<div class="dnsmasq-kv"><span class="dnsmasq-kv-k">no-resolv</span><span class="dnsmasq-flag">enabled</span></div>`);
  if (data.strictOrder) dnsItems.push(`<div class="dnsmasq-kv"><span class="dnsmasq-kv-k">strict-order</span><span class="dnsmasq-flag">enabled</span></div>`);
  if (data.bogusPriv) dnsItems.push(`<div class="dnsmasq-kv"><span class="dnsmasq-kv-k">bogus-priv</span><span class="dnsmasq-flag">enabled</span></div>`);

  const dnsHtml = dnsItems.length ? `<div class="dnsmasq-sec">
  <h3>DNS</h3>
  <div class="dnsmasq-card">${dnsItems.join('')}</div>
</div>` : '';

  // DNS address overrides
  const addrHtml = data.addresses.length ? `<div class="dnsmasq-sec">
  <h3>DNS Overrides (${data.addresses.length})</h3>
  <table class="dnsmasq-table">
    <thead><tr><th>Pattern</th><th>Address</th></tr></thead>
    <tbody>${data.addresses.map((a) => {
    const parts = a.split('/');
    const pattern = parts[1] || parts[0];
    const addr = parts[2] || '';
    return `<tr><td>${esc(pattern)}</td><td>${esc(addr) || '<span style="color:var(--fg-2,#888);">block</span>'}</td></tr>`;
  }).join('')}</tbody>
  </table>
</div>` : '';

  // DHCP section
  const dhcpItems = [];
  if (data.dhcpRanges.length) {
    data.dhcpRanges.forEach((r) => dhcpItems.push(kv('dhcp-range', r)));
  }
  if (data.dhcpOptions.length) {
    data.dhcpOptions.forEach((o) => dhcpItems.push(kv('dhcp-option', o)));
  }
  if (data.dhcpHosts.length) {
    dhcpItems.push(kv('dhcp-host (static)', `${data.dhcpHosts.length} assignment${data.dhcpHosts.length !== 1 ? 's' : ''}`));
  }

  const dhcpHtml = dhcpItems.length ? `<div class="dnsmasq-sec">
  <h3>DHCP</h3>
  <div class="dnsmasq-card">${dhcpItems.join('')}</div>
</div>` : '';

  // Flags section
  const flagItems = [];
  if (data.expandHosts) flagItems.push('expand-hosts');
  if (data.filterWin2k) flagItems.push('filterwin2k');
  if (data.logQueries) flagItems.push('log-queries');
  if (data.logDhcp) flagItems.push('log-dhcp');
  if (data.nohosts) flagItems.push('no-hosts');
  const flagsHtml = flagItems.length ? `<div class="dnsmasq-sec">
  <h3>Flags</h3>
  <div>${flagItems.map((f) => `<span class="dnsmasq-flag">${esc(f)}</span>`).join(' ')}</div>
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="dnsmasq-badge">dnsmasq</span>
  <span class="dnsmasq-title">dnsmasq</span>
</div>
<div class="dnsmasq-sub">${esc(summaryParts.join(' · ') || 'dnsmasq configuration')}</div>
${ifaceHtml}
${dnsHtml}
${addrHtml}
${dhcpHtml}
${flagsHtml}`;

  return { parentNode: host };
}
