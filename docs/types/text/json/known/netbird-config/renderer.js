const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.netbird-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-netbird{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7f52ff;color:#fff;vertical-align:middle;margin-right:8px}
.netbird-title{font-size:18px;font-weight:700;margin:0 0 4px}
.netbird-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.netbird-sec{margin:14px 0}
.netbird-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.netbird-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.netbird-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.netbird-kv-k{color:var(--fg-2,#888);min-width:160px;flex-shrink:0}
.netbird-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.netbird-mask{font-family:ui-monospace,monospace;color:var(--fg-2,#888);font-style:italic}
.netbird-bool-yes{color:#1a7f37;font-weight:600}
.netbird-bool-no{color:var(--fg-2,#888)}
.netbird-pills{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}
.netbird-pill{display:inline-block;font-size:11px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f0f0ff);border:1px solid #c8b8ff;font-family:ui-monospace,monospace;color:#5a3fbf}
`;

function kv(label, value, isMasked) {
  if (value == null || value === '') return '';
  const valHtml = isMasked
    ? `<span class="netbird-mask">[configured]</span>`
    : `<span class="netbird-kv-v">${esc(value)}</span>`;
  return `<div class="netbird-kv"><span class="netbird-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

function boolRow(label, value) {
  if (value == null) return '';
  const cls = value ? 'netbird-bool-yes' : 'netbird-bool-no';
  const text = value ? 'enabled' : 'disabled';
  return `<div class="netbird-kv"><span class="netbird-kv-k">${esc(label)}</span><span class="${cls}">${text}</span></div>`;
}

function truncateKey(key) {
  if (!key || typeof key !== 'string') return '';
  if (key.length <= 8) return key;
  return `${key.slice(0, 8)}…`;
}

export function render(intake) {
  let cfg = {};
  try {
    cfg = JSON.parse(intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '{}'));
  } catch {
    cfg = {};
  }

  const managementUrl = cfg.ManagementURL || cfg.management_url || cfg.managementUrl || '';
  const signalUrl = cfg.SignalURL || cfg.signal_url || cfg.signalUrl || '';
  const wgIface = cfg.WgIface || cfg.wg_iface || cfg.wgIface || '';
  const privateKey = cfg.PrivateKey || cfg.private_key || cfg.privateKey || '';
  const publicKey = cfg.PublicKey || cfg.public_key || cfg.publicKey || '';
  const preSharedKey = cfg.PreSharedKey || cfg.pre_shared_key || cfg.presharedKey || '';
  const ipAddress = cfg.IPAddress || cfg.ip_address || cfg.ipAddress || '';
  const sshEnabled = cfg.SSHKey !== undefined ? true : (cfg.ssh_server_enabled ?? cfg.SSHEnabled ?? cfg.sshEnabled ?? null);
  const rosenpass = cfg.RosenpassEnabled ?? cfg.rosenpass_enabled ?? cfg.rosenpass ?? null;
  const disableAutoConnect = cfg.DisableAutoConnect ?? cfg.disable_auto_connect ?? null;

  // TURN / STUN servers
  const turns = Array.isArray(cfg.TURNs || cfg.Turns || cfg.turns) ? (cfg.TURNs || cfg.Turns || cfg.turns) : [];
  const stuns = Array.isArray(cfg.STUNs || cfg.Stuns || cfg.stuns) ? (cfg.STUNs || cfg.Stuns || cfg.stuns) : [];

  // Iface blacklist
  const blacklist = Array.isArray(cfg.IfaceBlacklist || cfg.iface_blacklist || cfg.ifaceBlacklist)
    ? (cfg.IfaceBlacklist || cfg.iface_blacklist || cfg.ifaceBlacklist)
    : [];

  const subParts = [
    managementUrl ? new URL(managementUrl).hostname : '',
    wgIface || '',
    ipAddress || '',
  ].filter(Boolean);

  const connectRows = [
    kv('Management URL', managementUrl),
    kv('Signal URL', signalUrl),
  ].filter(Boolean).join('');

  const ifaceRows = [
    kv('WireGuard Interface', wgIface),
    ipAddress ? kv('IP Address', ipAddress) : '',
    publicKey ? kv('Public Key', truncateKey(publicKey) + '…') : '',
    privateKey ? kv('Private Key', '—', true) : '',
    preSharedKey ? kv('Pre-Shared Key', '—', true) : '',
  ].filter(Boolean).join('');

  const featRows = [
    sshEnabled != null ? boolRow('SSH Server', sshEnabled) : '',
    rosenpass != null ? boolRow('Rosenpass', rosenpass) : '',
    disableAutoConnect != null ? boolRow('Auto Connect', !disableAutoConnect) : '',
  ].filter(Boolean).join('');

  const turnsHtml = turns.length || stuns.length
    ? `<div class="netbird-sec"><h3>Relay Servers</h3><div class="netbird-card">
${kv('TURN servers', turns.length ? String(turns.length) : '')}
${kv('STUN servers', stuns.length ? String(stuns.length) : '')}
</div></div>`
    : '';

  const blacklistHtml = blacklist.length
    ? `<div class="netbird-sec"><h3>Interface Blacklist</h3><div class="netbird-pills">${blacklist.map((i) => `<span class="netbird-pill">${esc(i)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'netbird-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="netbird-title"><span class="badge-netbird">NetBird</span>NetBird Client Configuration</div>
<div class="netbird-sub">${esc(subParts.join(' · ') || 'WireGuard-based VPN configuration')}</div>
${connectRows ? `<div class="netbird-sec"><h3>Connectivity</h3><div class="netbird-card">${connectRows}</div></div>` : ''}
${ifaceRows ? `<div class="netbird-sec"><h3>WireGuard Interface</h3><div class="netbird-card">${ifaceRows}</div></div>` : ''}
${featRows ? `<div class="netbird-sec"><h3>Features</h3><div class="netbird-card">${featRows}</div></div>` : ''}
${turnsHtml}
${blacklistHtml}`;

  return { parentNode: host };
}
