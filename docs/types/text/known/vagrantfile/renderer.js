const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vgf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-vgf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1563FF;color:#fff;vertical-align:middle;margin-right:8px}
.vgf-title{font-size:18px;font-weight:700;margin:0 0 4px}
.vgf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.vgf-sec{margin:12px 0}
.vgf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.vgf-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.vgf-kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 14px;font-size:13px}
.vgf-key{color:var(--fg-2,#888);font-size:12px;white-space:nowrap}
.vgf-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all}
.vgf-table{width:100%;border-collapse:collapse;font-size:13px}
.vgf-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.vgf-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px}
.vgf-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 2px 2px 0}
.vgf-type{font-weight:600;color:var(--fg,#24292f)}
`;

function strVal(line, key) {
  const m = line.match(new RegExp(key + '\\s*=\\s*["\']([^"\']*)["\']'));
  return m ? m[1] : null;
}

function parseVagrantfile(text) {
  const lines = text.split('\n');

  let box = null;
  let boxUrl = null;
  const networks = [];
  const portForwards = [];
  const syncedFolders = [];
  const provisioners = [];
  let memory = null;
  let cpus = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;

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

    // Forwarded port
    {
      const m = line.match(/config\.vm\.network\s*["']forwarded_port["'].*?guest:\s*(\d+).*?host:\s*(\d+)/);
      if (m) { portForwards.push({ guest: m[1], host: m[2] }); continue; }
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

    // Provisioners
    {
      const m = line.match(/config\.vm\.provision\s*["']([^"']*)["']/);
      if (m) { provisioners.push(m[1]); continue; }
    }

    // VirtualBox memory
    {
      const m = line.match(/(?:vb|v)\.memory\s*=\s*["']?(\d+)["']?/);
      if (m && !memory) { memory = m[1]; continue; }
    }

    // VirtualBox CPUs
    {
      const m = line.match(/(?:vb|v)\.cpus\s*=\s*(\d+)/);
      if (m && !cpus) { cpus = m[1]; continue; }
    }
  }

  return { box, boxUrl, networks, portForwards, syncedFolders, provisioners, memory, cpus };
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const { box, boxUrl, networks, portForwards, syncedFolders, provisioners, memory, cpus } = parseVagrantfile(text);

  const parts = [];
  if (box) parts.push(box);
  if (portForwards.length) parts.push(`${portForwards.length} port forward${portForwards.length !== 1 ? 's' : ''}`);
  if (provisioners.length) parts.push(`${provisioners.length} provisioner${provisioners.length !== 1 ? 's' : ''}`);
  const sub = parts.join(' · ') || 'Vagrant VM';

  // Box card
  const boxHtml = (box || boxUrl || memory || cpus) ? `<div class="vgf-sec"><h3>Base Box</h3><div class="vgf-card"><div class="vgf-kv">
    ${box ? `<span class="vgf-key">box</span><span class="vgf-val">${esc(box)}</span>` : ''}
    ${boxUrl ? `<span class="vgf-key">url</span><span class="vgf-val">${esc(boxUrl)}</span>` : ''}
    ${memory ? `<span class="vgf-key">memory</span><span class="vgf-val">${esc(memory)} MB</span>` : ''}
    ${cpus ? `<span class="vgf-key">cpus</span><span class="vgf-val">${esc(cpus)}</span>` : ''}
  </div></div></div>` : '';

  // Networks
  const networkHtml = networks.length ? `<div class="vgf-sec"><h3>Networks</h3>
    <table class="vgf-table">
      <thead><tr><th>Type</th><th>IP</th></tr></thead>
      <tbody>${networks.map((n) => `<tr><td><span class="vgf-type">${esc(n.type)}</span></td><td>${esc(n.ip)}</td></tr>`).join('')}</tbody>
    </table></div>` : '';

  // Port forwards
  const portHtml = portForwards.length ? `<div class="vgf-sec"><h3>Port Forwards</h3>
    <table class="vgf-table">
      <thead><tr><th>Host</th><th>Guest</th></tr></thead>
      <tbody>${portForwards.map((p) => `<tr><td>${esc(p.host)}</td><td>${esc(p.guest)}</td></tr>`).join('')}</tbody>
    </table></div>` : '';

  // Synced folders
  const foldersHtml = syncedFolders.length ? `<div class="vgf-sec"><h3>Shared Folders</h3>
    <table class="vgf-table">
      <thead><tr><th>Host path</th><th>Guest path</th></tr></thead>
      <tbody>${syncedFolders.map((f) => `<tr><td>${esc(f.host)}</td><td>${esc(f.guest)}</td></tr>`).join('')}</tbody>
    </table></div>` : '';

  // Provisioners
  const provHtml = provisioners.length ? `<div class="vgf-sec"><h3>Provisioners</h3>
    <div>${provisioners.map((p) => `<span class="vgf-pill">${esc(p)}</span>`).join('')}</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'vgf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="vgf-title"><span class="badge-vgf">Vagrant</span>Vagrantfile</div>
<div class="vgf-sub">${esc(sub)}</div>
${boxHtml}${networkHtml}${portHtml}${foldersHtml}${provHtml}`;
  return { parentNode: host };
}
