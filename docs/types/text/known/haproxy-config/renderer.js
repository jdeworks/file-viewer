const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ha-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ha-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0066cc;color:#fff;vertical-align:middle;margin-right:8px;}
.ha-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ha-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ha-sec{margin:12px 0;}
.ha-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ha-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.ha-card-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px;font-weight:600;}
.ha-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.ha-kv-key{color:var(--fg-2,#888);min-width:110px;flex-shrink:0;}
.ha-kv-val{font-family:ui-monospace,monospace;}
.ha-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.ha-table{width:100%;border-collapse:collapse;font-size:13px;}
.ha-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.ha-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.ha-block-name{font-weight:600;color:var(--fg,#24292f);}
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
      currentSection = { type: sectionMatch[1], name: sectionMatch[2].trim() || null, lines: [] };
    } else if (currentSection) {
      currentSection.lines.push(stripped);
    }
  }
  if (currentSection) sections.push(currentSection);

  const globalSection = sections.find((s) => s.type === 'global') || null;
  const globalData = {};
  if (globalSection) {
    for (const l of globalSection.lines) {
      const m = /^maxconn\s+(\S+)/.exec(l); if (m) globalData.maxconn = m[1];
      const u = /^user\s+(\S+)/.exec(l); if (u) globalData.user = u[1];
      const g = /^group\s+(\S+)/.exec(l); if (g) globalData.group = g[1];
      const lo = /^log\s+(.+)/.exec(l); if (lo) {
        if (!globalData.logs) globalData.logs = [];
        globalData.logs.push(lo[1]);
      }
    }
  }

  const defaultsSection = sections.find((s) => s.type === 'defaults') || null;
  const defaultsData = {};
  if (defaultsSection) {
    for (const l of defaultsSection.lines) {
      const mo = /^mode\s+(\S+)/.exec(l); if (mo) defaultsData.mode = mo[1];
      const tc = /^timeout connect\s+(\S+)/.exec(l); if (tc) defaultsData.timeoutConnect = tc[1];
      const tcl = /^timeout client\s+(\S+)/.exec(l); if (tcl) defaultsData.timeoutClient = tcl[1];
      const ts = /^timeout server\s+(\S+)/.exec(l); if (ts) defaultsData.timeoutServer = ts[1];
    }
  }

  const frontends = sections.filter((s) => s.type === 'frontend').map((s) => {
    const data = { name: s.name, binds: [], defaultBackend: null };
    for (const l of s.lines) {
      const b = /^bind\s+(\S+)/.exec(l); if (b) data.binds.push(b[1]);
      const db = /^default_backend\s+(\S+)/.exec(l); if (db) data.defaultBackend = db[1];
    }
    return data;
  });

  const backends = sections.filter((s) => s.type === 'backend' || s.type === 'listen').map((s) => {
    const data = { name: s.name, type: s.type, balance: null, servers: [] };
    for (const l of s.lines) {
      const bal = /^balance\s+(\S+)/.exec(l); if (bal) data.balance = bal[1];
      const sv = /^server\s+(\S+)\s+(\S+)(.*)?/.exec(l);
      if (sv) {
        const opts = sv[3] ? sv[3].trim() : '';
        const weightM = /weight\s+(\d+)/.exec(opts);
        data.servers.push({ name: sv[1], address: sv[2], weight: weightM ? weightM[1] : null });
      }
    }
    return data;
  });

  return { globalData, defaultsData, frontends, backends };
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'ha-doc';

  const text = intake.text || '';
  const { globalData, defaultsData, frontends, backends } = parseHAProxy(text);

  const summaryParts = [];
  if (frontends.length) summaryParts.push(`${frontends.length} frontend${frontends.length !== 1 ? 's' : ''}`);
  if (backends.length) summaryParts.push(`${backends.length} backend${backends.length !== 1 ? 's' : ''}`);
  const totalServers = backends.reduce((n, b) => n + b.servers.length, 0);
  if (totalServers) summaryParts.push(`${totalServers} server${totalServers !== 1 ? 's' : ''}`);
  const summary = summaryParts.join(' · ') || 'HAProxy configuration';

  const globalKvs = [];
  if (globalData.maxconn) globalKvs.push(`<div class="ha-kv"><span class="ha-kv-key">maxconn</span><span class="ha-kv-val">${esc(globalData.maxconn)}</span></div>`);
  if (globalData.user) globalKvs.push(`<div class="ha-kv"><span class="ha-kv-key">user</span><span class="ha-kv-val">${esc(globalData.user)}</span></div>`);
  if (globalData.group) globalKvs.push(`<div class="ha-kv"><span class="ha-kv-key">group</span><span class="ha-kv-val">${esc(globalData.group)}</span></div>`);
  if (globalData.logs && globalData.logs.length) {
    globalData.logs.forEach((l) => {
      globalKvs.push(`<div class="ha-kv"><span class="ha-kv-key">log</span><span class="ha-kv-val">${esc(l)}</span></div>`);
    });
  }
  const globalHtml = globalKvs.length ? `<div class="ha-sec"><h3>Global</h3><div class="ha-card">${globalKvs.join('')}</div></div>` : '';

  const defaultsKvs = [];
  if (defaultsData.mode) defaultsKvs.push(`<div class="ha-kv"><span class="ha-kv-key">mode</span><span class="ha-kv-val">${esc(defaultsData.mode)}</span></div>`);
  if (defaultsData.timeoutConnect) defaultsKvs.push(`<div class="ha-kv"><span class="ha-kv-key">timeout connect</span><span class="ha-kv-val">${esc(defaultsData.timeoutConnect)}</span></div>`);
  if (defaultsData.timeoutClient) defaultsKvs.push(`<div class="ha-kv"><span class="ha-kv-key">timeout client</span><span class="ha-kv-val">${esc(defaultsData.timeoutClient)}</span></div>`);
  if (defaultsData.timeoutServer) defaultsKvs.push(`<div class="ha-kv"><span class="ha-kv-key">timeout server</span><span class="ha-kv-val">${esc(defaultsData.timeoutServer)}</span></div>`);
  const defaultsHtml = defaultsKvs.length ? `<div class="ha-sec"><h3>Defaults</h3><div class="ha-card">${defaultsKvs.join('')}</div></div>` : '';

  const frontendsHtml = frontends.length ? `<div class="ha-sec">
  <h3>Frontends</h3>
  <table class="ha-table">
    <thead><tr><th>Name</th><th>Bind</th><th>Default Backend</th></tr></thead>
    <tbody>${frontends.map((f) => `<tr>
      <td><span class="ha-block-name">${esc(f.name || '—')}</span></td>
      <td>${f.binds.map((b) => `<span class="ha-chip">${esc(b)}</span>`).join('') || '—'}</td>
      <td>${f.defaultBackend ? esc(f.defaultBackend) : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
    </tr>`).join('')}</tbody>
  </table>
</div>` : '';

  const backendsHtml = backends.length ? `<div class="ha-sec">
  <h3>Backends</h3>
  ${backends.map((b) => `<div class="ha-card">
    <div class="ha-card-label">${esc(b.type === 'listen' ? 'listen' : 'backend')} <span style="font-family:ui-monospace,monospace;font-size:12px;">${esc(b.name || '')}</span>${b.balance ? ` <span style="font-weight:400;color:var(--fg-2,#888);font-size:11px;">· balance ${esc(b.balance)}</span>` : ''}</div>
    ${b.servers.length ? `<table class="ha-table">
      <thead><tr><th>Server</th><th>Address</th><th>Weight</th></tr></thead>
      <tbody>${b.servers.map((sv) => `<tr>
        <td>${esc(sv.name)}</td>
        <td>${esc(sv.address)}</td>
        <td>${sv.weight ? esc(sv.weight) : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
      </tr>`).join('')}</tbody>
    </table>` : '<span style="color:var(--fg-2,#888);font-size:12px;">No servers defined</span>'}
  </div>`).join('')}
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="ha-title"><span class="ha-badge">HAProxy</span>HAProxy config</div>
<div class="ha-sub">${esc(summary)}</div>
${globalHtml}
${defaultsHtml}
${frontendsHtml}
${backendsHtml}`;

  return { parentNode: host };
}
