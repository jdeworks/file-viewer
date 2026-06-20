const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const CSS = `
.frps-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.frps-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px}
.frps-title{font-size:18px;font-weight:700;margin:0 0 4px}
.frps-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.frps-sec{margin:12px 0}
.frps-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.frps-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.frps-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.frps-row:last-child{border-bottom:none}
.frps-key{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;font-size:12px}
.frps-val{font-family:ui-monospace,monospace;word-break:break-all}
`;

export function render(intake) {
  const cfg = intake.parsed || {};
  const common = cfg.common || cfg;

  const bindAddr = common.bindAddr || common.bind_addr || '';
  const bindPort = common.bindPort || common.bind_port || '';
  const token = common.token || common.auth?.token || '';
  const dashboardAddr = common.dashboardAddr || common.dashboard_addr || '';
  const dashboardPort = common.dashboardPort || common.dashboard_port || '';
  const dashboardUser = common.dashboardUser || common.dashboard_user || '';
  const maxPoolCount = common.maxPoolCount || common.max_pool_count || '';
  const allowPorts = common.allowPorts || common.allow_ports || '';
  const subdomain = common.subdomainHost || common.subdomain_host || '';

  const row = (label, val) => val ? `<div class="frps-row"><span class="frps-key">${esc(label)}</span><span class="frps-val">${esc(val)}</span></div>` : '';

  const serverRows = [
    row('bindAddr', bindAddr || '0.0.0.0'),
    row('bindPort', bindPort || '7000'),
    token ? `<div class="frps-row"><span class="frps-key">token</span><span class="frps-val">[configured]</span></div>` : '',
    row('maxPoolCount', maxPoolCount),
    row('allowPorts', allowPorts),
    row('subdomainHost', subdomain),
  ].filter(Boolean).join('');

  const dashRows = [
    row('dashboardAddr', dashboardAddr),
    row('dashboardPort', dashboardPort),
    row('dashboardUser', dashboardUser),
    dashboardPort && common.dashboardPwd ? `<div class="frps-row"><span class="frps-key">dashboardPwd</span><span class="frps-val">[configured]</span></div>` : '',
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'frps-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="frps-title"><span class="frps-badge">FRP Server</span>frps.toml</div>
<div class="frps-sub">Fast Reverse Proxy server configuration</div>
<div class="frps-sec"><h3>Server</h3><div class="frps-card">${serverRows}</div></div>
${dashRows ? `<div class="frps-sec"><h3>Dashboard</h3><div class="frps-card">${dashRows}</div></div>` : ''}`;
  return { parentNode: host };
}
