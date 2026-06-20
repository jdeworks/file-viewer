const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hpcfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.hpcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e85d04;color:#fff;vertical-align:middle;margin-right:8px;}
.hpcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hpcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.hpcfg-sec{margin:14px 0;}
.hpcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;font-weight:600;}
.hpcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.hpcfg-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.hpcfg-kv-key{color:var(--fg-2,#888);min-width:130px;flex-shrink:0;}
.hpcfg-kv-val{font-family:ui-monospace,monospace;}
.hpcfg-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;}
.hpcfg-chip-http{background:#dbeafe;color:#1e40af;border-color:#93c5fd;}
.hpcfg-chip-tcp{background:#dcfce7;color:#166534;border-color:#86efac;}
.hpcfg-chip-ssl{background:#fef3c7;color:#92400e;border-color:#fcd34d;}
.hpcfg-chip-daemon{background:#f3e8ff;color:#6b21a8;border-color:#d8b4fe;}
.hpcfg-chip-default{background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.hpcfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.hpcfg-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.hpcfg-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.hpcfg-table td:first-child{font-family:ui-monospace,monospace;font-size:12px;font-weight:600;}
.hpcfg-mono{font-family:ui-monospace,monospace;font-size:12px;}
`;

function parseHAProxy(text) {
  const lines = text.split('\n');
  const sections = [];
  let currentSection = null;

  for (const rawLine of lines) {
    const stripped = rawLine.trim().replace(/#.*$/, '').trim();
    if (!stripped) continue;

    const sectionMatch = /^(global|defaults|frontend|backend|listen)\b(.*)/.exec(stripped);
    if (sectionMatch) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type: sectionMatch[1], name: sectionMatch[2].trim() || null, rawLines: [] };
    } else if (currentSection) {
      currentSection.rawLines.push(stripped);
    }
  }
  if (currentSection) sections.push(currentSection);

  const globalSection = sections.find((s) => s.type === 'global') || null;
  const globalData = { logs: [], daemon: false };
  if (globalSection) {
    for (const l of globalSection.rawLines) {
      const m = /^maxconn\s+(\S+)/.exec(l); if (m) globalData.maxconn = m[1];
      const u = /^user\s+(\S+)/.exec(l); if (u) globalData.user = u[1];
      const g = /^group\s+(\S+)/.exec(l); if (g) globalData.group = g[1];
      const lo = /^log\s+(.+)/.exec(l); if (lo) globalData.logs.push(lo[1]);
      if (/^daemon\b/.test(l)) globalData.daemon = true;
    }
  }

  const defaultsSection = sections.find((s) => s.type === 'defaults') || null;
  const defaultsData = {};
  if (defaultsSection) {
    for (const l of defaultsSection.rawLines) {
      const mo = /^mode\s+(\S+)/.exec(l); if (mo) defaultsData.mode = mo[1];
      const tc = /^timeout connect\s+(\S+)/.exec(l); if (tc) defaultsData.timeoutConnect = tc[1];
      const tcl = /^timeout client\s+(\S+)/.exec(l); if (tcl) defaultsData.timeoutClient = tcl[1];
      const ts = /^timeout server\s+(\S+)/.exec(l); if (ts) defaultsData.timeoutServer = ts[1];
    }
  }

  const frontends = sections.filter((s) => s.type === 'frontend').map((s) => {
    const data = { name: s.name, binds: [], defaultBackend: null };
    for (const l of s.rawLines) {
      const b = /^bind\s+(\S+)/.exec(l);
      if (b) {
        const addr = b[1];
        const ssl = /\bssl\b/.test(l);
        data.binds.push({ addr, ssl });
      }
      const db = /^default_backend\s+(\S+)/.exec(l); if (db) data.defaultBackend = db[1];
    }
    return data;
  });

  const backends = sections.filter((s) => s.type === 'backend').map((s) => {
    const data = { name: s.name, balance: null, servers: [], healthCheck: false };
    for (const l of s.rawLines) {
      const bal = /^balance\s+(\S+)/.exec(l); if (bal) data.balance = bal[1];
      const sv = /^server\s+(\S+)\s+(\S+)(.*)/.exec(l);
      if (sv) {
        const opts = sv[3] ? sv[3].trim() : '';
        data.servers.push({ name: sv[1], address: sv[2] });
        if (/\bcheck\b/.test(opts)) data.healthCheck = true;
      }
      if (/^option httpchk\b/.test(l) || /^option tcp-check\b/.test(l)) data.healthCheck = true;
    }
    return data;
  });

  const listens = sections.filter((s) => s.type === 'listen').map((s) => {
    const data = { name: s.name, binds: [], statsAuth: null };
    for (const l of s.rawLines) {
      const b = /^bind\s+(\S+)/.exec(l); if (b) data.binds.push(b[1]);
      // Security: mask password in stats auth
      const sa = /^stats auth\s+(\S+):(\S+)/.exec(l);
      if (sa) data.statsAuth = { user: sa[1] };
    }
    return data;
  });

  return { globalData, defaultsData, frontends, backends, listens };
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'hpcfg-doc haproxycfg-doc haproxy-doc ha-doc';

  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'haproxy.cfg';
  const { globalData, defaultsData, frontends, backends, listens } = parseHAProxy(text);

  const counts = [];
  if (frontends.length) counts.push(`${frontends.length} frontend${frontends.length !== 1 ? 's' : ''}`);
  if (backends.length) counts.push(`${backends.length} backend${backends.length !== 1 ? 's' : ''}`);
  if (listens.length) counts.push(`${listens.length} listen${listens.length !== 1 ? 's' : ''}`);
  const subtitle = counts.join(' · ') || 'HAProxy configuration';

  // Global section card
  const globalKvs = [];
  if (globalData.maxconn) globalKvs.push(`<div class="hpcfg-kv"><span class="hpcfg-kv-key">maxconn</span><span class="hpcfg-kv-val hpcfg-mono">${esc(globalData.maxconn)}</span></div>`);
  if (globalData.user) globalKvs.push(`<div class="hpcfg-kv"><span class="hpcfg-kv-key">user</span><span class="hpcfg-kv-val hpcfg-mono">${esc(globalData.user)}</span></div>`);
  if (globalData.group) globalKvs.push(`<div class="hpcfg-kv"><span class="hpcfg-kv-key">group</span><span class="hpcfg-kv-val hpcfg-mono">${esc(globalData.group)}</span></div>`);
  globalData.logs.forEach((l) => {
    globalKvs.push(`<div class="hpcfg-kv"><span class="hpcfg-kv-key">log</span><span class="hpcfg-kv-val hpcfg-mono">${esc(l)}</span></div>`);
  });
  if (globalData.daemon) globalKvs.push(`<div class="hpcfg-kv"><span class="hpcfg-kv-key">daemon</span><span class="hpcfg-chip hpcfg-chip-daemon">enabled</span></div>`);
  const globalHtml = globalKvs.length ? `<div class="hpcfg-sec"><h3>Global</h3><div class="hpcfg-card">${globalKvs.join('')}</div></div>` : '';

  // Defaults section card
  const defaultsKvs = [];
  if (defaultsData.mode) {
    const modeClass = defaultsData.mode === 'http' ? 'hpcfg-chip-http' : defaultsData.mode === 'tcp' ? 'hpcfg-chip-tcp' : 'hpcfg-chip-default';
    defaultsKvs.push(`<div class="hpcfg-kv"><span class="hpcfg-kv-key">mode</span><span class="hpcfg-chip ${esc(modeClass)}">${esc(defaultsData.mode)}</span></div>`);
  }
  if (defaultsData.timeoutConnect) defaultsKvs.push(`<div class="hpcfg-kv"><span class="hpcfg-kv-key">timeout connect</span><span class="hpcfg-kv-val hpcfg-mono">${esc(defaultsData.timeoutConnect)}</span></div>`);
  if (defaultsData.timeoutClient) defaultsKvs.push(`<div class="hpcfg-kv"><span class="hpcfg-kv-key">timeout client</span><span class="hpcfg-kv-val hpcfg-mono">${esc(defaultsData.timeoutClient)}</span></div>`);
  if (defaultsData.timeoutServer) defaultsKvs.push(`<div class="hpcfg-kv"><span class="hpcfg-kv-key">timeout server</span><span class="hpcfg-kv-val hpcfg-mono">${esc(defaultsData.timeoutServer)}</span></div>`);
  const defaultsHtml = defaultsKvs.length ? `<div class="hpcfg-sec"><h3>Defaults</h3><div class="hpcfg-card">${defaultsKvs.join('')}</div></div>` : '';

  // Frontends table
  const frontendsHtml = frontends.length ? `<div class="hpcfg-sec">
  <h3>Frontends</h3>
  <table class="hpcfg-table">
    <thead><tr><th>Name</th><th>Bind Address(es)</th><th>SSL</th><th>Backend</th></tr></thead>
    <tbody>${frontends.map((f) => {
    const bindHtml = f.binds.map((b) => `<span class="hpcfg-chip hpcfg-chip-default">${esc(b.addr)}</span>`).join('') || '—';
    const sslHtml = f.binds.some((b) => b.ssl) ? '<span class="hpcfg-chip hpcfg-chip-ssl">SSL</span>' : '<span style="color:var(--fg-2,#888);">—</span>';
    return `<tr>
      <td>${esc(f.name || '—')}</td>
      <td class="hpcfg-mono">${bindHtml}</td>
      <td>${sslHtml}</td>
      <td class="hpcfg-mono">${f.defaultBackend ? esc(f.defaultBackend) : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
    </tr>`;
  }).join('')}</tbody>
  </table>
</div>` : '';

  // Backends table
  const backendsHtml = backends.length ? `<div class="hpcfg-sec">
  <h3>Backends</h3>
  <table class="hpcfg-table">
    <thead><tr><th>Name</th><th>Balance</th><th>Servers</th><th>Health Check</th></tr></thead>
    <tbody>${backends.map((b) => `<tr>
      <td>${esc(b.name || '—')}</td>
      <td class="hpcfg-mono">${b.balance ? esc(b.balance) : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
      <td>${b.servers.length}</td>
      <td>${b.healthCheck ? '<span class="hpcfg-chip hpcfg-chip-http">enabled</span>' : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
    </tr>`).join('')}</tbody>
  </table>
</div>` : '';

  // Listen blocks
  const listensHtml = listens.length ? `<div class="hpcfg-sec">
  <h3>Listen</h3>
  ${listens.map((l) => `<div class="hpcfg-card">
    <div class="hpcfg-kv"><span class="hpcfg-kv-key">name</span><span class="hpcfg-kv-val hpcfg-mono">${esc(l.name || '—')}</span></div>
    ${l.binds.map((b) => `<div class="hpcfg-kv"><span class="hpcfg-kv-key">bind</span><span class="hpcfg-chip hpcfg-chip-default">${esc(b)}</span></div>`).join('')}
    ${l.statsAuth ? `<div class="hpcfg-kv"><span class="hpcfg-kv-key">stats auth</span><span class="hpcfg-kv-val hpcfg-mono">${esc(l.statsAuth.user)}</span>:<span style="color:var(--fg-2,#888);font-style:italic;font-size:11px;">[configured]</span></div>` : ''}
  </div>`).join('')}
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="hpcfg-title"><span class="hpcfg-badge">HAProxy</span>${esc(filename)}</div>
<div class="hpcfg-sub">${esc(subtitle)}</div>
${globalHtml}
${defaultsHtml}
${frontendsHtml}
${backendsHtml}
${listensHtml}`;

  return { parentNode: host };
}
