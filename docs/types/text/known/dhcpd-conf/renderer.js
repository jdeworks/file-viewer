const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dhcpd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dhcpd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0369A1;color:#fff;vertical-align:middle;margin-right:8px;}
.dhcpd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dhcpd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.dhcpd-sec{margin:12px 0;}
.dhcpd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.dhcpd-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.dhcpd-card-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px;font-weight:600;}
.dhcpd-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.dhcpd-kv-key{color:var(--fg-2,#888);min-width:130px;flex-shrink:0;}
.dhcpd-kv-val{font-family:ui-monospace,monospace;}
.dhcpd-table{width:100%;border-collapse:collapse;font-size:13px;}
.dhcpd-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.dhcpd-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
`;

function getTopLevelDirective(text, key) {
  // Match directive at top level (not inside a block)
  const re = new RegExp(`^\\s*${key}\\s+([^;{]+);`, 'm');
  const m = re.exec(text);
  return m ? m[1].trim() : null;
}

function extractSubnets(text) {
  const subnets = [];
  // Strip comments first
  const stripped = text.replace(/#[^\n]*/g, '').replace(/\/\/[^\n]*/g, '');
  const re = /subnet\s+([\d.]+)\s+netmask\s+([\d.]+)\s*\{/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const subnet = m[1];
    const netmask = m[2];
    // Extract block body
    let depth = 0;
    let start = -1;
    for (let i = m.index + m[0].length - 1; i < stripped.length; i++) {
      if (stripped[i] === '{') { if (depth === 0) start = i + 1; depth++; }
      else if (stripped[i] === '}') {
        depth--;
        if (depth === 0) {
          const body = stripped.slice(start, i);
          const rangeM = /range\s+([\d.]+)\s+([\d.]+)/.exec(body);
          const routersM = /option\s+routers\s+([^;]+)/.exec(body);
          const dnsM = /option\s+domain-name-servers\s+([^;]+)/.exec(body);
          const bcastM = /option\s+broadcast-address\s+([\d.]+)/.exec(body);
          subnets.push({
            subnet,
            netmask,
            rangeStart: rangeM ? rangeM[1] : null,
            rangeEnd: rangeM ? rangeM[2] : null,
            routers: routersM ? routersM[1].trim() : null,
            dns: dnsM ? dnsM[1].trim() : null,
            broadcast: bcastM ? bcastM[1] : null,
          });
          break;
        }
      }
    }
  }
  return subnets;
}

function extractHosts(text) {
  const hosts = [];
  const stripped = text.replace(/#[^\n]*/g, '').replace(/\/\/[^\n]*/g, '');
  const re = /host\s+(\S+)\s*\{/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const name = m[1];
    let depth = 0;
    let start = -1;
    for (let i = m.index + m[0].length - 1; i < stripped.length; i++) {
      if (stripped[i] === '{') { if (depth === 0) start = i + 1; depth++; }
      else if (stripped[i] === '}') {
        depth--;
        if (depth === 0) {
          const body = stripped.slice(start, i);
          const macM = /hardware\s+ethernet\s+([0-9a-fA-F:]+)/.exec(body);
          const ipM = /fixed-address\s+([\d.]+)/.exec(body);
          hosts.push({ name, mac: macM ? macM[1] : null, ip: ipM ? ipM[1] : null });
          break;
        }
      }
    }
  }
  return hosts;
}

function parseDhcpd(text) {
  const stripped = text.replace(/#[^\n]*/g, '').replace(/\/\/[^\n]*/g, '');

  // Global settings (top-level only — before any block)
  // We approximate by scanning lines that are not inside a block
  const globalLines = [];
  let depth = 0;
  for (const line of stripped.split('\n')) {
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    if (depth === 0) globalLines.push(line);
    depth += opens - closes;
    if (depth < 0) depth = 0;
  }
  const globalText = globalLines.join('\n');

  const global = {
    defaultLeaseTime: getTopLevelDirective(globalText, 'default-lease-time'),
    maxLeaseTime: getTopLevelDirective(globalText, 'max-lease-time'),
    ddnsUpdateStyle: getTopLevelDirective(globalText, 'ddns-update-style'),
    authoritative: /^\s*authoritative\s*;/m.test(globalText),
    domainName: getTopLevelDirective(globalText, 'option domain-name'),
    domainNameServers: getTopLevelDirective(globalText, 'option domain-name-servers'),
  };

  const subnets = extractSubnets(text);
  const hosts = extractHosts(text);

  return { global, subnets, hosts };
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'dhcpd-doc';

  const text = intake.text || '';
  const { global, subnets, hosts } = parseDhcpd(text);

  const summaryParts = [`${subnets.length} subnet${subnets.length !== 1 ? 's' : ''}`];
  if (hosts.length) summaryParts.push(`${hosts.length} host reservation${hosts.length !== 1 ? 's' : ''}`);

  // Global settings card
  const globalKvs = [
    ['default-lease-time', global.defaultLeaseTime ? `${global.defaultLeaseTime}s` : null],
    ['max-lease-time', global.maxLeaseTime ? `${global.maxLeaseTime}s` : null],
    ['ddns-update-style', global.ddnsUpdateStyle],
    ['authoritative', global.authoritative ? 'yes' : null],
    ['domain-name', global.domainName ? global.domainName.replace(/"/g, '') : null],
    ['domain-name-servers', global.domainNameServers],
  ].filter(([, v]) => v != null);

  const globalHtml = globalKvs.length ? `<div class="dhcpd-sec">
  <h3>Global Settings</h3>
  <div class="dhcpd-card">
    ${globalKvs.map(([k, v]) => `<div class="dhcpd-kv"><span class="dhcpd-kv-key">${esc(k)}</span><span class="dhcpd-kv-val">${esc(v)}</span></div>`).join('')}
  </div>
</div>` : '';

  // Subnets table
  const subnetRowsHtml = subnets.map((s) => {
    const range = (s.rangeStart && s.rangeEnd) ? `${esc(s.rangeStart)} – ${esc(s.rangeEnd)}` : '<span style="color:var(--fg-2,#888);">—</span>';
    return `<tr>
  <td>${esc(s.subnet)}/${esc(s.netmask)}</td>
  <td>${range}</td>
  <td>${s.routers ? esc(s.routers) : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
  <td>${s.dns ? esc(s.dns) : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
</tr>`;
  }).join('');

  const subnetsHtml = subnets.length ? `<div class="dhcpd-sec">
  <h3>Subnets</h3>
  <table class="dhcpd-table">
    <thead><tr><th>Subnet / Mask</th><th>Range</th><th>Gateway</th><th>DNS</th></tr></thead>
    <tbody>${subnetRowsHtml}</tbody>
  </table>
</div>` : '';

  // Host reservations table
  const hostRowsHtml = hosts.map((h) => `<tr>
  <td>${esc(h.name)}</td>
  <td>${h.mac ? esc(h.mac) : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
  <td>${h.ip ? esc(h.ip) : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
</tr>`).join('');

  const hostsHtml = hosts.length ? `<div class="dhcpd-sec">
  <h3>Host Reservations</h3>
  <table class="dhcpd-table">
    <thead><tr><th>Hostname</th><th>MAC</th><th>IP</th></tr></thead>
    <tbody>${hostRowsHtml}</tbody>
  </table>
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="dhcpd-title"><span class="dhcpd-badge">DHCP</span>ISC DHCP Server configuration</div>
<div class="dhcpd-sub">${esc(summaryParts.join(' · '))}</div>
${globalHtml}
${subnetsHtml}
${hostsHtml}`;

  return { parentNode: host };
}
