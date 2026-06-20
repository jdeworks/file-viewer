const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vagrantfile-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.vagrantfile-doc .badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1563FF;color:#fff;vertical-align:middle;margin-right:8px}
.vagrantfile-doc .vf-title{font-size:18px;font-weight:700;margin:0 0 4px}
.vagrantfile-doc .vf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.vagrantfile-doc .vf-sec{margin:12px 0}
.vagrantfile-doc .vf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.vagrantfile-doc .vf-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.vagrantfile-doc .vf-kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 14px;font-size:13px}
.vagrantfile-doc .vf-key{color:var(--fg-2,#888);font-size:12px;white-space:nowrap}
.vagrantfile-doc .vf-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all}
.vagrantfile-doc .vf-table{width:100%;border-collapse:collapse;font-size:13px}
.vagrantfile-doc .vf-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.vagrantfile-doc .vf-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px}
.vagrantfile-doc .vf-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 2px 2px 0}
.vagrantfile-doc .vf-type{font-weight:600;color:var(--fg,#24292f)}
`;

function parseVagrantfile(text) {
  const lines = text.split('\n');

  let apiVersion = null;
  let box = null;
  let boxUrl = null;
  let hostname = null;
  const networks = [];
  const portForwards = [];
  const syncedFolders = [];
  const provisioners = [];
  let memory = null;
  let cpus = null;
  let provider = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;

    // API version
    if (!apiVersion) {
      const m = line.match(/Vagrant\.configure\s*\(\s*["'](\d+)["']\s*\)/);
      if (m) { apiVersion = m[1]; continue; }
    }

    // Box
    if (!box) {
      const m = line.match(/config\.vm\.box\s*=\s*["']([^"']*)["']/);
      if (m) { box = m[1]; continue; }
    }

    // Box URL
    if (!boxUrl) {
      const m = line.match(/config\.vm\.box_url\s*=\s*["']([^"']*)["']/);
      if (m) { boxUrl = m[1]; continue; }
    }

    // Hostname
    if (!hostname) {
      const m = line.match(/config\.vm\.hostname\s*=\s*["']([^"']*)["']/);
      if (m) { hostname = m[1]; continue; }
    }

    // Forwarded port
    {
      const m = line.match(/config\.vm\.network\s*["']forwarded_port["'].*?guest:\s*(\d+).*?host:\s*(\d+)/);
      if (m) { portForwards.push({ guest: m[1], host: m[2] }); continue; }
      // also host: before guest: order
      const m2 = line.match(/config\.vm\.network\s*["']forwarded_port["'].*?host:\s*(\d+).*?guest:\s*(\d+)/);
      if (m2) { portForwards.push({ guest: m2[2], host: m2[1] }); continue; }
    }

    // Private/public network with IP
    {
      const m = line.match(/config\.vm\.network\s*["'](private_network|public_network)["'].*?ip:\s*["']([^"']*)["']/);
      if (m) { networks.push({ type: m[1].replace('_', ' '), ip: m[2] }); continue; }
    }
    // Network without IP (DHCP)
    {
      const m = line.match(/config\.vm\.network\s*["'](private_network|public_network)["']/);
      if (m && !line.includes('forwarded_port')) { networks.push({ type: m[1].replace('_', ' '), ip: 'DHCP' }); continue; }
    }

    // Synced folder
    {
      const m = line.match(/config\.vm\.synced_folder\s*["']([^"']*)["']\s*,\s*["']([^"']*)["']/);
      if (m) { syncedFolders.push({ host: m[1], guest: m[2] }); continue; }
    }

    // Provider
    if (!provider) {
      const m = line.match(/config\.vm\.provider\s*["'](virtualbox|vmware_fusion|vmware_workstation|hyperv|libvirt)["']/);
      if (m) { provider = m[1]; }
    }

    // Provisioners
    {
      const m = line.match(/config\.vm\.provision\s*["']([^"']*)["']/);
      if (m) {
        const type = m[1];
        // look for path:
        const pathM = line.match(/path:\s*["']([^"']*)["']/);
        provisioners.push({ type, path: pathM ? pathM[1] : null });
        continue;
      }
    }

    // Provider memory
    {
      const m = line.match(/(?:vb|v|vm)\.memory\s*=\s*["']?(\d+)["']?/);
      if (m && !memory) { memory = m[1]; continue; }
    }

    // Provider CPUs
    {
      const m = line.match(/(?:vb|v|vm)\.cpus\s*=\s*(\d+)/);
      if (m && !cpus) { cpus = m[1]; continue; }
    }
  }

  return { apiVersion, box, boxUrl, hostname, networks, portForwards, syncedFolders, provisioners, memory, cpus, provider };
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const { apiVersion, box, boxUrl, hostname, networks, portForwards, syncedFolders, provisioners, memory, cpus, provider } = parseVagrantfile(text);

  const parts = [];
  if (box) parts.push(box);
  if (portForwards.length) parts.push(`${portForwards.length} port forward${portForwards.length !== 1 ? 's' : ''}`);
  if (provisioners.length) parts.push(`${provisioners.length} provisioner${provisioners.length !== 1 ? 's' : ''}`);
  const sub = parts.join(' · ') || 'Vagrant VM';

  // Box / provider card
  const boxHtml = (box || boxUrl || hostname || memory || cpus || apiVersion) ? `<div class="vf-sec"><h3>Base Box</h3><div class="vf-card"><div class="vf-kv">
    ${apiVersion ? `<span class="vf-key">api version</span><span class="vf-val">${esc(apiVersion)}</span>` : ''}
    ${box ? `<span class="vf-key">box</span><span class="vf-val">${esc(box)}</span>` : ''}
    ${boxUrl ? `<span class="vf-key">url</span><span class="vf-val">${esc(boxUrl)}</span>` : ''}
    ${hostname ? `<span class="vf-key">hostname</span><span class="vf-val">${esc(hostname)}</span>` : ''}
    ${provider ? `<span class="vf-key">provider</span><span class="vf-val">${esc(provider)}</span>` : ''}
    ${memory ? `<span class="vf-key">memory</span><span class="vf-val">${esc(memory)} MB</span>` : ''}
    ${cpus ? `<span class="vf-key">cpus</span><span class="vf-val">${esc(cpus)}</span>` : ''}
  </div></div></div>` : '';

  // Networks
  const networkHtml = networks.length ? `<div class="vf-sec"><h3>Networks</h3>
    <table class="vf-table">
      <thead><tr><th>Type</th><th>IP</th></tr></thead>
      <tbody>${networks.map((n) => `<tr><td><span class="vf-type">${esc(n.type)}</span></td><td>${esc(n.ip)}</td></tr>`).join('')}</tbody>
    </table></div>` : '';

  // Port forwards
  const portHtml = portForwards.length ? `<div class="vf-sec"><h3>Port Forwards</h3>
    <table class="vf-table">
      <thead><tr><th>Host</th><th>Guest</th></tr></thead>
      <tbody>${portForwards.map((p) => `<tr><td>${esc(p.host)}</td><td>${esc(p.guest)}</td></tr>`).join('')}</tbody>
    </table></div>` : '';

  // Synced folders
  const foldersHtml = syncedFolders.length ? `<div class="vf-sec"><h3>Shared Folders</h3>
    <table class="vf-table">
      <thead><tr><th>Host path</th><th>Guest path</th></tr></thead>
      <tbody>${syncedFolders.map((f) => `<tr><td>${esc(f.host)}</td><td>${esc(f.guest)}</td></tr>`).join('')}</tbody>
    </table></div>` : '';

  // Provisioners
  const provHtml = provisioners.length ? `<div class="vf-sec"><h3>Provisioners</h3>
    <div>${provisioners.map((p) => `<span class="vf-pill">${esc(p.type)}${p.path ? ` <span style="opacity:.7">${esc(p.path)}</span>` : ''}</span>`).join('')}</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'vagrantfile-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="vf-title"><span class="badge">Vagrant</span>Vagrantfile</div>
<div class="vf-sub">${esc(sub)}</div>
${boxHtml}${networkHtml}${portHtml}${foldersHtml}${provHtml}`;
  return { parentNode: host };
}
