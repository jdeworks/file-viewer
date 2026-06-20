const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lxccfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.lxccfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#E55E00;color:#fff;vertical-align:middle;margin-right:8px;}
.lxccfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.lxccfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.lxccfg-section{margin-bottom:14px;}
.lxccfg-section-hd{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2,#888);margin-bottom:6px;}
.lxccfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:12px 16px;margin-bottom:8px;}
.lxccfg-table{width:100%;border-collapse:collapse;font-size:12px;}
.lxccfg-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;}
.lxccfg-table td:first-child{color:var(--fg-2,#888);width:30%;white-space:nowrap;}
.lxccfg-table tr:last-child td{border-bottom:none;}
.lxccfg-chip{display:inline-block;font-size:11px;font-family:ui-monospace,monospace;background:#fce8d8;color:#7a2d00;border:1px solid #f5b08a;border-radius:4px;padding:1px 7px;margin:1px 3px;}
.lxccfg-list{margin:0;padding:0 0 0 18px;font-size:12px;font-family:ui-monospace,monospace;color:var(--fg,#24292f);}
.lxccfg-list li{padding:1px 0;}
.lxccfg-more{font-size:11px;color:var(--fg-2,#888);font-style:italic;}
`;

function parseKV(text) {
  const result = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (!result[key]) result[key] = [];
    result[key].push(val);
  }
  return result;
}

function get(kv, key) {
  return (kv[key] || [])[0] || null;
}

function getAll(kv, key) {
  return kv[key] || [];
}

function parseNetworks(kv) {
  // Collect all lxc.net.N.* keys
  const ifaces = {};
  for (const key of Object.keys(kv)) {
    const m = key.match(/^lxc\.net\.(\d+)\.(.+)$/);
    if (!m) continue;
    const idx = m[1];
    const prop = m[2];
    if (!ifaces[idx]) ifaces[idx] = { idx };
    ifaces[idx][prop] = (kv[key] || [])[0] || '';
  }
  return Object.values(ifaces).sort((a, b) => Number(a.idx) - Number(b.idx));
}

function humanBytes(val) {
  if (!val) return val;
  const n = parseInt(val, 10);
  if (isNaN(n)) return val;
  if (n >= 1073741824) return (n / 1073741824).toFixed(1) + ' GB';
  if (n >= 1048576) return (n / 1048576).toFixed(0) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(0) + ' KB';
  return n + ' B';
}

export function render(intake) {
  const text = intake.text || '';
  const kv = parseKV(text);

  const hostname = get(kv, 'lxc.uts.name') || get(kv, 'lxc.utsname');
  const arch = get(kv, 'lxc.arch');
  const rootfs = get(kv, 'lxc.rootfs.path') || get(kv, 'lxc.rootfs');

  const networks = parseNetworks(kv);

  const memMax = get(kv, 'lxc.cgroup2.memory.max') || get(kv, 'lxc.cgroup.memory.limit_in_bytes');
  const cpuShares = get(kv, 'lxc.cgroup.cpu.shares');
  const cpuMax = get(kv, 'lxc.cgroup2.cpu.max');

  const mounts = getAll(kv, 'lxc.mount.entry');
  const mountAuto = get(kv, 'lxc.mount.auto');

  const capsDropped = get(kv, 'lxc.cap.drop');
  const seccomp = get(kv, 'lxc.seccomp.profile');
  const apparmor = get(kv, 'lxc.apparmor.profile');

  const idmaps = getAll(kv, 'lxc.idmap');

  // Container info card
  const infoRows = [];
  if (hostname) infoRows.push(`<tr><td>hostname</td><td>${esc(hostname)}</td></tr>`);
  if (arch) infoRows.push(`<tr><td>arch</td><td>${esc(arch)}</td></tr>`);
  if (rootfs) infoRows.push(`<tr><td>rootfs</td><td>${esc(rootfs)}</td></tr>`);
  const infoHtml = infoRows.length ? `<div class="lxccfg-section">
  <div class="lxccfg-section-hd">Container</div>
  <div class="lxccfg-card">
    <table class="lxccfg-table"><tbody>${infoRows.join('')}</tbody></table>
  </div>
</div>` : '';

  // Network interfaces
  let networkHtml = '';
  if (networks.length) {
    const rows = networks.map((iface) => {
      const ip = iface['ipv4.address'] || iface['ipv6.address'] || '';
      return `<tr>
        <td>${esc(iface.idx)}</td>
        <td>${esc(iface.type || '')}</td>
        <td>${esc(iface.link || '')}</td>
        <td>${esc(iface.name || '')}</td>
        <td>${esc(ip)}</td>
      </tr>`;
    }).join('');
    networkHtml = `<div class="lxccfg-section">
  <div class="lxccfg-section-hd">Network Interfaces (${networks.length})</div>
  <div class="lxccfg-card">
    <table class="lxccfg-table">
      <thead><tr style="font-size:11px;color:var(--fg-2,#888);">
        <td>#</td><td>Type</td><td>Link/Bridge</td><td>Name</td><td>IP</td>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>`;
  }

  // Resource limits
  const resRows = [];
  if (memMax) resRows.push(`<tr><td>memory.max</td><td>${esc(humanBytes(memMax))} <span style="color:var(--fg-2,#888);font-size:11px;">(${esc(memMax)})</span></td></tr>`);
  if (cpuShares) resRows.push(`<tr><td>cpu.shares</td><td>${esc(cpuShares)}</td></tr>`);
  if (cpuMax) resRows.push(`<tr><td>cpu.max</td><td>${esc(cpuMax)}</td></tr>`);
  const resHtml = resRows.length ? `<div class="lxccfg-section">
  <div class="lxccfg-section-hd">Resource Limits</div>
  <div class="lxccfg-card">
    <table class="lxccfg-table"><tbody>${resRows.join('')}</tbody></table>
  </div>
</div>` : '';

  // Mounts
  let mountsHtml = '';
  if (mounts.length || mountAuto) {
    const shown = mounts.slice(0, 5);
    const extra = mounts.length > 5 ? mounts.length - 5 : 0;
    const items = shown.map((m) => `<li>${esc(m)}</li>`).join('');
    const moreNote = extra ? `<li class="lxccfg-more">…and ${extra} more</li>` : '';
    const autoNote = mountAuto ? `<div style="margin-bottom:6px;font-size:12px;"><strong>auto:</strong> <span style="font-family:ui-monospace,monospace">${esc(mountAuto)}</span></div>` : '';
    mountsHtml = `<div class="lxccfg-section">
  <div class="lxccfg-section-hd">Mounts</div>
  <div class="lxccfg-card">
    ${autoNote}
    <ul class="lxccfg-list">${items}${moreNote}</ul>
  </div>
</div>`;
  }

  // Security
  let secHtml = '';
  const secParts = [];
  if (capsDropped) {
    const caps = capsDropped.split(/\s+/).filter(Boolean);
    const chips = caps.map((c) => `<span class="lxccfg-chip">${esc(c)}</span>`).join('');
    secParts.push(`<div style="margin-bottom:6px;"><span style="font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;">Dropped capabilities</span><br>${chips}</div>`);
  }
  if (seccomp) secParts.push(`<div style="font-size:12px;"><strong>seccomp:</strong> <span style="font-family:ui-monospace,monospace">${esc(seccomp)}</span></div>`);
  if (apparmor) secParts.push(`<div style="font-size:12px;"><strong>apparmor:</strong> <span style="font-family:ui-monospace,monospace">${esc(apparmor)}</span></div>`);
  if (idmaps.length) secParts.push(`<div style="font-size:12px;"><strong>idmap:</strong> ${idmaps.length} mapping${idmaps.length !== 1 ? 's' : ''} (user namespace)</div>`);
  if (secParts.length) {
    secHtml = `<div class="lxccfg-section">
  <div class="lxccfg-section-hd">Security</div>
  <div class="lxccfg-card">${secParts.join('')}</div>
</div>`;
  }

  const sub = [
    hostname ? `container: ${hostname}` : null,
    arch || null,
    networks.length ? `${networks.length} network interface${networks.length !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'lxccfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="lxccfg-title"><span class="lxccfg-badge">LXC</span>LXC Container Configuration</div>
<div class="lxccfg-sub">${esc(sub)}</div>
${infoHtml}
${networkHtml}
${resHtml}
${mountsHtml}
${secHtml}
`;

  return { parentNode: host };
}
