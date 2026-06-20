const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#D65079;color:#fff;margin-right:8px;}
.cc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cc-sec{margin:14px 0;}
.cc-sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;font-weight:600;}
.cc-tbl{width:100%;border-collapse:collapse;font-size:13px;}
.cc-tbl td{padding:5px 12px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.cc-tbl tr:last-child td{border-bottom:none;}
.cc-label{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;min-width:140px;}
.cc-val{font:13px ui-monospace,monospace;word-break:break-all;}
.cc-pill{display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;margin-right:4px;}
.cc-pill-server{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.cc-pill-agent{background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);color:var(--fg,#333);}
.cc-pill-on{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.cc-pill-off{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
.cc-hosts{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
.cc-host{font:12px ui-monospace,monospace;background:var(--bg-2,#f5f5f5);padding:2px 8px;border-radius:4px;border:1px solid var(--border,#e0e0e0);}
.cc-masked{font:13px ui-monospace,monospace;letter-spacing:2px;color:var(--fg-2,#888);}
`;

function extract(text, pattern) {
  const m = text.match(pattern);
  return m ? m[1] : null;
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');

  const datacenter = extract(text, /datacenter\s*=\s*"([^"]+)"/);
  const bindAddr = extract(text, /bind_addr\s*=\s*"([^"]+)"/);
  const clientAddr = extract(text, /client_addr\s*=\s*"([^"]+)"/);
  const serverRaw = extract(text, /server\s*=\s*(true|false)/);
  const isServer = serverRaw === 'true';
  const bootstrapExpect = extract(text, /bootstrap_expect\s*=\s*(\d+)/);
  const encryptKey = extract(text, /encrypt\s*=\s*"([^"]+)"/);
  const uiEnabled = extract(text, /ui_config\s*\{[^}]*enabled\s*=\s*(true|false)/s);
  const certFile = extract(text, /cert_file\s*=\s*"([^"]+)"/);
  const keyFile = extract(text, /key_file\s*=\s*"([^"]+)"/);
  const caFile = extract(text, /ca_file\s*=\s*"([^"]+)"/);

  // retry_join hosts
  const retryJoinMatch = text.match(/retry_join\s*=\s*\[([^\]]+)\]/s);
  const retryHosts = retryJoinMatch
    ? retryJoinMatch[1].match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, '')) || []
    : [];

  const networkRows = [
    datacenter ? `<tr><td class="cc-label">datacenter</td><td class="cc-val">${esc(datacenter)}</td></tr>` : '',
    bindAddr ? `<tr><td class="cc-label">bind_addr</td><td class="cc-val">${esc(bindAddr)}</td></tr>` : '',
    clientAddr ? `<tr><td class="cc-label">client_addr</td><td class="cc-val">${esc(clientAddr)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const tlsRows = [
    caFile ? `<tr><td class="cc-label">ca_file</td><td class="cc-val">${esc(caFile)}</td></tr>` : '',
    certFile ? `<tr><td class="cc-label">cert_file</td><td class="cc-val">${esc(certFile)}</td></tr>` : '',
    keyFile ? `<tr><td class="cc-label">key_file</td><td class="cc-val">${esc(keyFile)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'cc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cc-title"><span class="badge-cc">Consul</span>Consul Configuration</div>

${networkRows ? `<div class="cc-sec"><table class="cc-tbl">${networkRows}</table></div>` : ''}

<div class="cc-sec">
  <span class="cc-pill ${isServer ? 'cc-pill-server' : 'cc-pill-agent'}">${isServer ? 'Server Mode' : 'Agent Mode'}</span>
  ${isServer && bootstrapExpect ? `<span style="font-size:13px;color:var(--fg-2,#888)">bootstrap_expect: <strong>${esc(bootstrapExpect)}</strong></span>` : ''}
</div>

${retryHosts.length ? `<div class="cc-sec"><h3>retry_join Hosts (${retryHosts.length})</h3>
  <div class="cc-hosts">${retryHosts.map((h) => `<span class="cc-host">${esc(h)}</span>`).join('')}</div>
</div>` : ''}

${uiEnabled !== null ? `<div class="cc-sec"><h3>UI</h3>
  <span class="cc-pill ${uiEnabled === 'true' ? 'cc-pill-on' : 'cc-pill-off'}">ui_config.enabled: ${uiEnabled === 'true' ? 'yes' : 'no'}</span>
</div>` : ''}

${encryptKey ? `<div class="cc-sec"><h3>Gossip Encryption</h3>
  <table class="cc-tbl"><tr><td class="cc-label">encrypt</td><td><span class="cc-masked">••••••••••••••••</span> <span style="font-size:11px;color:var(--fg-2,#888)">(key configured — value masked)</span></td></tr></table>
</div>` : ''}

${tlsRows ? `<div class="cc-sec"><h3>TLS</h3><table class="cc-tbl">${tlsRows}</table></div>` : ''}`;

  return { parentNode: host };
}
