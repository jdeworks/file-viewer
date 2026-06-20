const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sqd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sqd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0066cc;color:#fff;vertical-align:middle;margin-right:8px;}
.sqd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sqd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sqd-sec{margin:12px 0;}
.sqd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.sqd-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.sqd-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.sqd-kv-key{color:var(--fg-2,#888);min-width:130px;flex-shrink:0;}
.sqd-kv-val{font-family:ui-monospace,monospace;}
.sqd-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.sqd-table{width:100%;border-collapse:collapse;font-size:13px;}
.sqd-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.sqd-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.sqd-allow{color:#1a7f37;}
.sqd-deny{color:#cf222e;}
`;

function parseSquid(text) {
  const lines = text.split('\n');
  const data = {
    httpPort: null,
    httpsPort: null,
    visibleHostname: null,
    acls: [],
    httpAccess: [],
    cacheDir: null,
    cacheMem: null,
    dnsNameservers: [],
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const stripped = line.replace(/\s+#.*$/, '').trim();
    if (!stripped) continue;

    const key = stripped.split(/\s+/)[0];
    const rest = stripped.slice(key.length).trim();

    switch (key) {
      case 'http_port':
        if (!data.httpPort) data.httpPort = rest.split(/\s+/)[0];
        break;
      case 'https_port':
        if (!data.httpsPort) data.httpsPort = rest.split(/\s+/)[0];
        break;
      case 'visible_hostname':
        data.visibleHostname = rest;
        break;
      case 'acl': {
        const parts = rest.split(/\s+/);
        if (parts.length >= 2) {
          data.acls.push({ name: parts[0], type: parts[1], value: parts.slice(2).join(' ') });
        }
        break;
      }
      case 'http_access': {
        const parts = rest.split(/\s+/);
        if (parts.length >= 1) {
          data.httpAccess.push({ action: parts[0], acls: parts.slice(1).join(' ') });
        }
        break;
      }
      case 'cache_dir': {
        const parts = rest.split(/\s+/);
        data.cacheDir = { type: parts[0] || '', path: parts[1] || '', size: parts[2] ? parts[2] + (parts[3] ? ' ' + parts[3] : '') : '' };
        break;
      }
      case 'cache_mem':
        data.cacheMem = rest;
        break;
      case 'dns_nameservers':
        data.dnsNameservers = rest.split(/\s+/);
        break;
    }
  }

  return data;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'sqd-doc';

  const text = intake.text || '';
  const data = parseSquid(text);

  const summaryParts = [];
  if (data.acls.length) summaryParts.push(`${data.acls.length} ACL${data.acls.length !== 1 ? 's' : ''}`);
  if (data.httpAccess.length) summaryParts.push(`${data.httpAccess.length} access rule${data.httpAccess.length !== 1 ? 's' : ''}`);
  const summary = summaryParts.join(' · ') || 'Squid proxy configuration';

  const portsHtml = (data.httpPort || data.httpsPort) ? `<div class="sqd-sec">
  <h3>Ports</h3>
  <div class="sqd-card">
    ${data.httpPort ? `<div class="sqd-kv"><span class="sqd-kv-key">http_port</span><span class="sqd-chip">${esc(data.httpPort)}</span></div>` : ''}
    ${data.httpsPort ? `<div class="sqd-kv"><span class="sqd-kv-key">https_port</span><span class="sqd-chip">${esc(data.httpsPort)}</span></div>` : ''}
    ${data.visibleHostname ? `<div class="sqd-kv"><span class="sqd-kv-key">visible_hostname</span><span class="sqd-kv-val">${esc(data.visibleHostname)}</span></div>` : ''}
  </div>
</div>` : '';

  const aclHtml = data.acls.length ? `<div class="sqd-sec">
  <h3>ACL Rules</h3>
  <table class="sqd-table">
    <thead><tr><th>Name</th><th>Type</th><th>Value</th></tr></thead>
    <tbody>${data.acls.map((a) => `<tr>
      <td>${esc(a.name)}</td>
      <td>${esc(a.type)}</td>
      <td>${esc(a.value) || '<span style="color:var(--fg-2,#888);">—</span>'}</td>
    </tr>`).join('')}</tbody>
  </table>
</div>` : '';

  const accessHtml = data.httpAccess.length ? `<div class="sqd-sec">
  <h3>Access Control</h3>
  <table class="sqd-table">
    <thead><tr><th>Action</th><th>ACL Refs</th></tr></thead>
    <tbody>${data.httpAccess.map((a) => `<tr>
      <td><span class="${a.action === 'allow' ? 'sqd-allow' : a.action === 'deny' ? 'sqd-deny' : ''}">${esc(a.action)}</span></td>
      <td>${esc(a.acls) || '<span style="color:var(--fg-2,#888);">—</span>'}</td>
    </tr>`).join('')}</tbody>
  </table>
</div>` : '';

  const cacheKvs = [];
  if (data.cacheDir) cacheKvs.push(`<div class="sqd-kv"><span class="sqd-kv-key">cache_dir</span><span class="sqd-kv-val">${esc(data.cacheDir.type)} ${esc(data.cacheDir.path)} <span style="color:var(--fg-2,#888);">${esc(data.cacheDir.size)}</span></span></div>`);
  if (data.cacheMem) cacheKvs.push(`<div class="sqd-kv"><span class="sqd-kv-key">cache_mem</span><span class="sqd-kv-val">${esc(data.cacheMem)}</span></div>`);
  const cacheHtml = cacheKvs.length ? `<div class="sqd-sec"><h3>Cache</h3><div class="sqd-card">${cacheKvs.join('')}</div></div>` : '';

  const dnsHtml = data.dnsNameservers.length ? `<div class="sqd-sec">
  <h3>DNS Nameservers</h3>
  <div>${data.dnsNameservers.map((d) => `<span class="sqd-chip">${esc(d)}</span>`).join('')}</div>
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="sqd-title"><span class="sqd-badge">Squid</span>Squid proxy config</div>
<div class="sqd-sub">${esc(summary)}</div>
${portsHtml}
${aclHtml}
${accessHtml}
${cacheHtml}
${dnsHtml}`;

  return { parentNode: host };
}
