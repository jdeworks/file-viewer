const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const REDACT_KEYS = new Set(['token','secretkey','secret_key','password','passwd']);
const maybeRedact = (k, v) => REDACT_KEYS.has(String(k).toLowerCase()) ? '[configured]' : esc(v);

const CSS = `
.frpc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.frpc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0891b2;color:#fff;vertical-align:middle;margin-right:8px}
.frpc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.frpc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.frpc-sec{margin:12px 0}
.frpc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.frpc-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.frpc-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.frpc-row:last-child{border-bottom:none}
.frpc-key{color:var(--fg-2,#888);min-width:120px;flex-shrink:0;font-size:12px}
.frpc-val{font-family:ui-monospace,monospace;word-break:break-all}
.frpc-table{width:100%;border-collapse:collapse;font-size:13px}
.frpc-table th{text-align:left;font-size:11px;text-transform:uppercase;color:var(--fg-2,#888);padding:3px 6px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.frpc-table td{padding:4px 6px 4px 0;border-bottom:1px solid var(--border,#f0f0f0);font-family:ui-monospace,monospace;font-size:12px}
.frpc-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#e0f2fe;border:1px solid #7dd3fc;color:#0c4a6e;font-weight:600}
`;

export function render(intake) {
  const cfg = intake.parsed || {};

  // Server info (common section)
  const common = cfg.common || cfg;
  const serverAddr = common.serverAddr || common.server_addr || common.server || '';
  const serverPort = common.serverPort || common.server_port || '';
  const token = common.token || common.auth?.token || '';

  // Proxies: frpc.toml has named sections for each proxy
  const proxies = Object.entries(cfg)
    .filter(([k]) => k !== 'common')
    .filter(([, v]) => v && typeof v === 'object' && (v.type || v.localPort || v.local_port))
    .slice(0, 20);

  const serverRows = [
    serverAddr ? `<div class="frpc-row"><span class="frpc-key">serverAddr</span><span class="frpc-val">${esc(serverAddr)}</span></div>` : '',
    serverPort ? `<div class="frpc-row"><span class="frpc-key">serverPort</span><span class="frpc-val">${esc(serverPort)}</span></div>` : '',
    token ? `<div class="frpc-row"><span class="frpc-key">token</span><span class="frpc-val">[configured]</span></div>` : '',
  ].filter(Boolean).join('');

  let proxiesHtml = '';
  if (proxies.length) {
    const rows = proxies.map(([name, p]) => {
      const type = p.type || '?';
      const local = `${p.localIP || p.local_ip || '127.0.0.1'}:${p.localPort || p.local_port || ''}`;
      const remote = p.remotePort || p.remote_port || p.customDomains || p.custom_domains || '';
      return `<tr><td>${esc(name)}</td><td><span class="frpc-chip">${esc(type)}</span></td><td>${esc(local)}</td><td>${esc(remote)}</td></tr>`;
    }).join('');
    proxiesHtml = `<div class="frpc-sec"><h3>Proxies (${proxies.length})</h3><div class="frpc-card">
      <table class="frpc-table">
        <thead><tr><th>Name</th><th>Type</th><th>Local</th><th>Remote</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div></div>`;
  }

  const host = document.createElement('div');
  host.className = 'frpc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="frpc-title"><span class="frpc-badge">FRP Client</span>frpc.toml</div>
<div class="frpc-sub">Fast Reverse Proxy client configuration</div>
${serverRows ? `<div class="frpc-sec"><h3>Server</h3><div class="frpc-card">${serverRows}</div></div>` : ''}
${proxiesHtml}`;
  return { parentNode: host };
}
