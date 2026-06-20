import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.netplan-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.netplan-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#E95420;color:#fff;vertical-align:middle;margin-right:8px;}
.netplan-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.netplan-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.netplan-sec{margin:14px 0;}
.netplan-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.netplan-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.netplan-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;}
.netplan-chip-yes{background:#dcfce7;border-color:#86efac;color:#15803d;}
.netplan-chip-no{background:#fee2e2;border-color:#fca5a5;color:#b91c1c;}
.netplan-chip-nm{background:#dbeafe;border-color:#93c5fd;color:#1d4ed8;}
.netplan-chip-nd{background:#e0e7ff;border-color:#a5b4fc;color:#4338ca;}
.netplan-iface{font-family:ui-monospace,monospace;font-weight:600;font-size:13px;}
.netplan-table{width:100%;border-collapse:collapse;font-size:13px;}
.netplan-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.netplan-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.netplan-mono{font-family:ui-monospace,monospace;font-size:12px;}
.netplan-muted{color:var(--fg-2,#888);font-size:12px;}
.netplan-ssid{font-weight:600;}
`;

function chipBool(val, label) {
  if (val === true || val === 'true' || val === 'yes') {
    return `<span class="netplan-chip netplan-chip-yes">${esc(label)}: yes</span>`;
  }
  if (val === false || val === 'false' || val === 'no') {
    return `<span class="netplan-chip netplan-chip-no">${esc(label)}: no</span>`;
  }
  return '';
}

function addressList(addrs) {
  if (!addrs) return '';
  const list = Array.isArray(addrs) ? addrs : [addrs];
  return list.map((a) => `<span class="netplan-chip netplan-mono">${esc(typeof a === 'object' ? JSON.stringify(a) : a)}</span>`).join('');
}

function renderEthernets(ethernets) {
  if (!ethernets || typeof ethernets !== 'object') return '';
  const ifaces = Object.entries(ethernets);
  if (!ifaces.length) return '';
  const rows = ifaces.map(([name, cfg]) => {
    cfg = cfg || {};
    const dhcp = [chipBool(cfg.dhcp4, 'DHCP4'), chipBool(cfg.dhcp6, 'DHCP6')].filter(Boolean).join('');
    const addrs = addressList(cfg.addresses);
    const gw = cfg.gateway4 ? `<span class="netplan-mono">${esc(cfg.gateway4)}</span>` :
      cfg.gateway6 ? `<span class="netplan-mono">${esc(cfg.gateway6)}</span>` : '';
    const mtu = cfg.mtu ? `<span class="netplan-chip netplan-mono">MTU ${esc(cfg.mtu)}</span>` : '';
    const matchInfo = cfg.match ? Object.entries(cfg.match).map(([k, v]) => `<span class="netplan-chip netplan-mono">${esc(k)}:${esc(v)}</span>`).join('') : '';
    const ns = cfg.nameservers && cfg.nameservers.addresses ? addressList(cfg.nameservers.addresses) : '';
    return `<tr>
      <td><span class="netplan-iface">${esc(name)}</span></td>
      <td>${dhcp || '<span class="netplan-muted">—</span>'}</td>
      <td>${addrs || '<span class="netplan-muted">—</span>'}</td>
      <td>${gw || '<span class="netplan-muted">—</span>'}</td>
      <td>${mtu}${matchInfo}${ns}</td>
    </tr>`;
  }).join('');
  return `<div class="netplan-sec">
    <h3>Ethernets</h3>
    <table class="netplan-table">
      <thead><tr><th>Interface</th><th>DHCP</th><th>Addresses</th><th>Gateway</th><th>Extra</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderWifis(wifis) {
  if (!wifis || typeof wifis !== 'object') return '';
  const ifaces = Object.entries(wifis);
  if (!ifaces.length) return '';
  const rows = ifaces.map(([name, cfg]) => {
    cfg = cfg || {};
    const aps = cfg['access-points'] || {};
    const apEntries = Object.entries(aps);
    const ssids = apEntries.length
      ? apEntries.map(([ssid, apcfg]) => {
          const hasPw = apcfg && (apcfg.password || apcfg.auth);
          return `<span class="netplan-ssid">${esc(ssid)}</span>${hasPw ? ' <span class="netplan-muted">[password configured]</span>' : ''}`;
        }).join(', ')
      : '<span class="netplan-muted">—</span>';
    const dhcp = [chipBool(cfg.dhcp4, 'DHCP4'), chipBool(cfg.dhcp6, 'DHCP6')].filter(Boolean).join('');
    const addrs = addressList(cfg.addresses);
    return `<tr>
      <td><span class="netplan-iface">${esc(name)}</span></td>
      <td>${ssids}</td>
      <td>${dhcp || '<span class="netplan-muted">—</span>'}</td>
      <td>${addrs || '<span class="netplan-muted">—</span>'}</td>
    </tr>`;
  }).join('');
  return `<div class="netplan-sec">
    <h3>WiFis</h3>
    <table class="netplan-table">
      <thead><tr><th>Interface</th><th>SSIDs</th><th>DHCP</th><th>Addresses</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderBonds(bonds) {
  if (!bonds || typeof bonds !== 'object') return '';
  const ifaces = Object.entries(bonds);
  if (!ifaces.length) return '';
  const items = ifaces.map(([name, cfg]) => {
    cfg = cfg || {};
    const mode = cfg.parameters && cfg.parameters.mode ? `<span class="netplan-chip netplan-mono">${esc(cfg.parameters.mode)}</span>` : '';
    const members = (cfg.interfaces || []).map((m) => `<span class="netplan-chip netplan-mono">${esc(m)}</span>`).join('');
    return `<div class="netplan-card"><span class="netplan-iface">${esc(name)}</span> ${mode} ${members || '<span class="netplan-muted">no members</span>'}</div>`;
  }).join('');
  return `<div class="netplan-sec"><h3>Bonds</h3>${items}</div>`;
}

function renderBridges(bridges) {
  if (!bridges || typeof bridges !== 'object') return '';
  const ifaces = Object.entries(bridges);
  if (!ifaces.length) return '';
  const items = ifaces.map(([name, cfg]) => {
    cfg = cfg || {};
    const members = (cfg.interfaces || []).map((m) => `<span class="netplan-chip netplan-mono">${esc(m)}</span>`).join('');
    return `<div class="netplan-card"><span class="netplan-iface">${esc(name)}</span> ${members || '<span class="netplan-muted">no members</span>'}</div>`;
  }).join('');
  return `<div class="netplan-sec"><h3>Bridges</h3>${items}</div>`;
}

function renderVlans(vlans) {
  if (!vlans || typeof vlans !== 'object') return '';
  const ifaces = Object.entries(vlans);
  if (!ifaces.length) return '';
  const rows = ifaces.map(([name, cfg]) => {
    cfg = cfg || {};
    return `<tr>
      <td><span class="netplan-iface">${esc(name)}</span></td>
      <td>${cfg.id != null ? `<span class="netplan-chip netplan-mono">${esc(cfg.id)}</span>` : '<span class="netplan-muted">—</span>'}</td>
      <td>${cfg.link ? `<span class="netplan-chip netplan-mono">${esc(cfg.link)}</span>` : '<span class="netplan-muted">—</span>'}</td>
    </tr>`;
  }).join('');
  return `<div class="netplan-sec">
    <h3>VLANs</h3>
    <table class="netplan-table">
      <thead><tr><th>Interface</th><th>ID</th><th>Link</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderRoutes(routes) {
  if (!routes || !routes.length) return '';
  const rows = routes.map((r) => `<tr>
    <td class="netplan-mono">${esc(r.to || '')}</td>
    <td class="netplan-mono">${esc(r.via || '')}</td>
    <td class="netplan-mono">${r.metric != null ? esc(r.metric) : '<span class="netplan-muted">—</span>'}</td>
  </tr>`).join('');
  return `<div class="netplan-sec">
    <h3>Routes</h3>
    <table class="netplan-table">
      <thead><tr><th>To</th><th>Via</th><th>Metric</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const net = cfg.network || {};
  const version = net.version;
  const renderer = net.renderer;

  const rendererChip = renderer
    ? renderer === 'NetworkManager'
      ? `<span class="netplan-chip netplan-chip-nm">NetworkManager</span>`
      : `<span class="netplan-chip netplan-chip-nd">networkd</span>`
    : '';

  const parts = [];
  if (net.ethernets) parts.push(`${Object.keys(net.ethernets).length} ethernet${Object.keys(net.ethernets).length !== 1 ? 's' : ''}`);
  if (net.wifis) parts.push(`${Object.keys(net.wifis).length} wifi${Object.keys(net.wifis).length !== 1 ? 's' : ''}`);
  if (net.bonds) parts.push(`${Object.keys(net.bonds).length} bond${Object.keys(net.bonds).length !== 1 ? 's' : ''}`);
  if (net.bridges) parts.push(`${Object.keys(net.bridges).length} bridge${Object.keys(net.bridges).length !== 1 ? 's' : ''}`);
  if (net.vlans) parts.push(`${Object.keys(net.vlans).length} vlan${Object.keys(net.vlans).length !== 1 ? 's' : ''}`);
  const summary = parts.join(' · ') || 'Netplan network configuration';

  const metaRow = [
    version != null ? `<span class="netplan-muted">version:</span> <span class="netplan-mono">${esc(version)}</span>` : '',
    rendererChip ? `<span class="netplan-muted">renderer:</span> ${rendererChip}` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');

  const host = document.createElement('div');
  host.className = 'netplan-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="netplan-title"><span class="netplan-badge">Netplan</span>Netplan Network Config</div>
<div class="netplan-sub">${metaRow ? metaRow + ' &nbsp;·&nbsp; ' : ''}${esc(summary)}</div>
${renderEthernets(net.ethernets)}
${renderWifis(net.wifis)}
${renderBonds(net.bonds)}
${renderBridges(net.bridges)}
${renderVlans(net.vlans)}
${renderRoutes(net.routes)}`;

  return { parentNode: host };
}
