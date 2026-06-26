import { ensureKnownUiStyle, issueList, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

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
.hpcfg-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.hpcfg-link:hover{color:var(--accent,#2563eb);}
.hpcfg-help{font-size:11px;color:var(--fg-2,#888);margin-top:3px;}
.hpcfg-masked{color:var(--fg-2,#888);font-style:italic;font-size:11px;}
.hpcfg-source-key{color:#e85d04;font-weight:700;}
.hpcfg-source-comment{color:#6e7781;font-style:italic;}
`;

function parseHAProxy(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let currentSection = null;

  for (const [idx, rawLine] of lines.entries()) {
    const lineNo = idx + 1;
    const stripped = rawLine.trim().replace(/#.*$/, '').trim();
    if (!stripped) continue;

    const sectionMatch = /^(global|defaults|frontend|backend|listen)\b(.*)/.exec(stripped);
    if (sectionMatch) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type: sectionMatch[1], name: sectionMatch[2].trim() || null, line: lineNo, rawLines: [] };
    } else if (currentSection) {
      currentSection.rawLines.push({ text: stripped, line: lineNo });
    }
  }
  if (currentSection) sections.push(currentSection);

  const globalSection = sections.find((s) => s.type === 'global') || null;
  const globalData = { line: globalSection?.line || 1, logs: [], daemon: null };
  if (globalSection) {
    for (const { text: l, line } of globalSection.rawLines) {
      const m = /^maxconn\s+(\S+)/.exec(l); if (m) globalData.maxconn = { value: m[1], line };
      const u = /^user\s+(\S+)/.exec(l); if (u) globalData.user = { value: u[1], line };
      const g = /^group\s+(\S+)/.exec(l); if (g) globalData.group = { value: g[1], line };
      const lo = /^log\s+(.+)/.exec(l); if (lo) globalData.logs.push({ value: lo[1], line });
      if (/^daemon\b/.test(l)) globalData.daemon = { value: 'enabled', line };
    }
  }

  const defaultsSection = sections.find((s) => s.type === 'defaults') || null;
  const defaultsData = { line: defaultsSection?.line || 1 };
  if (defaultsSection) {
    for (const { text: l, line } of defaultsSection.rawLines) {
      const mo = /^mode\s+(\S+)/.exec(l); if (mo) defaultsData.mode = { value: mo[1], line };
      const tc = /^timeout connect\s+(\S+)/.exec(l); if (tc) defaultsData.timeoutConnect = { value: tc[1], line };
      const tcl = /^timeout client\s+(\S+)/.exec(l); if (tcl) defaultsData.timeoutClient = { value: tcl[1], line };
      const ts = /^timeout server\s+(\S+)/.exec(l); if (ts) defaultsData.timeoutServer = { value: ts[1], line };
    }
  }

  const frontends = sections.filter((s) => s.type === 'frontend').map((s) => {
    const data = { name: s.name, line: s.line, binds: [], defaultBackend: null, useBackends: [] };
    for (const { text: l, line } of s.rawLines) {
      const b = /^bind\s+(\S+)/.exec(l);
      if (b) {
        const addr = b[1];
        const ssl = /\bssl\b/.test(l);
        data.binds.push({ addr, ssl, line });
      }
      const db = /^default_backend\s+(\S+)/.exec(l); if (db) data.defaultBackend = { value: db[1], line };
      const ub = /^use_backend\s+(\S+)(.*)/.exec(l); if (ub) data.useBackends.push({ value: ub[1], condition: ub[2].trim(), line });
    }
    return data;
  });

  const backends = sections.filter((s) => s.type === 'backend').map((s) => {
    const data = { name: s.name, line: s.line, balance: null, servers: [], healthCheck: null };
    for (const { text: l, line } of s.rawLines) {
      const bal = /^balance\s+(\S+)/.exec(l); if (bal) data.balance = { value: bal[1], line };
      const sv = /^server\s+(\S+)\s+(\S+)(.*)/.exec(l);
      if (sv) {
        const opts = sv[3] ? sv[3].trim() : '';
        data.servers.push({ name: sv[1], address: sv[2], opts, line, check: /\bcheck\b/.test(opts) });
        if (/\bcheck\b/.test(opts)) data.healthCheck = { value: 'server check', line };
      }
      if (/^option httpchk\b/.test(l) || /^option tcp-check\b/.test(l)) data.healthCheck = { value: l, line };
    }
    return data;
  });

  const listens = sections.filter((s) => s.type === 'listen').map((s) => {
    const data = { name: s.name, line: s.line, binds: [], statsAuth: null, statsEnabled: null };
    for (const { text: l, line } of s.rawLines) {
      const b = /^bind\s+(\S+)/.exec(l); if (b) data.binds.push({ value: b[1], line });
      if (/^stats enable\b/.test(l)) data.statsEnabled = { value: 'enabled', line };
      // Security: mask password in stats auth
      const sa = /^stats auth\s+(\S+):(\S+)/.exec(l);
      if (sa) data.statsAuth = { user: sa[1], line };
    }
    return data;
  });

  return { globalData, defaultsData, frontends, backends, listens };
}

const HELP = {
  maxconn: 'Maximum concurrent connections accepted by this HAProxy process.',
  user: 'Operating-system user HAProxy drops privileges to after startup.',
  group: 'Operating-system group HAProxy drops privileges to after startup.',
  log: 'Syslog target for HAProxy events.',
  daemon: 'Runs HAProxy in the background.',
  mode: 'Default proxy mode for sections that do not override it.',
  timeout: 'Connection timeout; missing or excessive timeouts can create stuck sessions.',
  frontend: 'Entry point that accepts client traffic and routes it to backends.',
  bind: 'Socket address and port accepted by a frontend or listen section.',
  default_backend: 'Backend used when no ACL/use_backend rule selects another target.',
  backend: 'Pool of origin servers selected by frontend routing.',
  balance: 'Load-balancing algorithm used for backend server selection.',
  server: 'Backend server endpoint and options.',
  health: 'Health checking controls whether unhealthy servers receive traffic.',
  listen: 'Combined frontend/backend section, often used for stats endpoints.',
  stats_auth: 'Credential-protected HAProxy stats endpoint.',
};

function helpFor(kind) {
  return HELP[kind] || 'Open this HAProxy directive in source.';
}

function lineButton(label, line, kind = '') {
  const title = `${helpFor(kind)} Open line ${line || 1} in source.`;
  return `<button class="hpcfg-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function kv(label, entry, kind = label) {
  if (!entry) return '';
  return `<div class="hpcfg-kv"><span class="hpcfg-kv-key">${lineButton(label, entry.line, kind)}</span><span class="hpcfg-kv-val hpcfg-mono">${esc(entry.value)}</span></div>`;
}

function collectIssues({ frontends, backends, listens }) {
  const issues = [];
  const backendNames = new Set(backends.map((b) => b.name).filter(Boolean));
  for (const frontend of frontends) {
    for (const bind of frontend.binds) {
      if (/(^|\D)(80|8080)(\D|$)/.test(bind.addr) && !bind.ssl) {
        issues.push({
          severity: 'warning',
          label: 'plain bind',
          line: bind.line,
          message: `Frontend ${frontend.name || '(unnamed)'} binds ${bind.addr} without SSL. Confirm it redirects or only serves trusted traffic.`,
        });
      }
      if (/^\*/.test(bind.addr)) {
        issues.push({
          severity: 'info',
          label: 'public bind',
          line: bind.line,
          message: `Frontend ${frontend.name || '(unnamed)'} binds ${bind.addr}; confirm firewall and network exposure.`,
        });
      }
    }
    const referenced = [frontend.defaultBackend, ...frontend.useBackends].filter(Boolean);
    for (const ref of referenced) {
      if (!backendNames.has(ref.value)) {
        issues.push({
          severity: 'warning',
          label: 'missing backend',
          line: ref.line,
          message: `Frontend ${frontend.name || '(unnamed)'} references backend ${ref.value}, but no matching backend section was found.`,
        });
      }
    }
  }
  for (const backend of backends) {
    if (!backend.servers.length) {
      issues.push({
        severity: 'warning',
        label: 'empty backend',
        line: backend.line,
        message: `Backend ${backend.name || '(unnamed)'} has no server entries.`,
      });
    }
    if (backend.servers.length && !backend.healthCheck) {
      issues.push({
        severity: 'warning',
        label: 'health check',
        line: backend.line,
        message: `Backend ${backend.name || '(unnamed)'} has servers but no explicit health check.`,
      });
    }
  }
  for (const listen of listens) {
    for (const bind of listen.binds) {
      if (/^\*/.test(bind.value)) {
        issues.push({
          severity: 'info',
          label: 'stats bind',
          line: bind.line,
          message: `Listen ${listen.name || '(unnamed)'} binds ${bind.value}; confirm the stats/admin endpoint is not exposed publicly.`,
        });
      }
    }
    if (listen.statsEnabled && !listen.statsAuth) {
      issues.push({
        severity: 'warning',
        label: 'stats auth',
        line: listen.statsEnabled.line,
        message: `Listen ${listen.name || '(unnamed)'} enables stats without stats auth.`,
      });
    }
    if (listen.statsAuth) {
      issues.push({
        severity: 'info',
        label: 'secret configured',
        line: listen.statsAuth.line,
        message: `Stats auth secret is configured and redacted in the preview and source.`,
      });
    }
  }
  return issues;
}

function redactedSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const match = line.match(/^(\s*stats\s+auth\s+)([^:\s]+):(\S+)/i);
    if (!match) return line;
    return `${match[1]}${match[2]}:[configured]`;
  }).join('\n');
}

function highlightHAProxyLine(line) {
  const escaped = esc(line);
  if (/^\s*#/.test(line)) return `<span class="hpcfg-source-comment">${escaped}</span>`;
  return escaped.replace(/^(\s*[A-Za-z_][\w-]*)/, '<span class="hpcfg-source-key">$1</span>');
}

export function render(intake) {
  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'hpcfg-doc haproxycfg-doc haproxy-doc ha-doc';

  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'haproxy.cfg';
  const { globalData, defaultsData, frontends, backends, listens } = parseHAProxy(text);
  const issues = collectIssues({ frontends, backends, listens });

  const counts = [];
  if (frontends.length) counts.push(`${frontends.length} frontend${frontends.length !== 1 ? 's' : ''}`);
  if (backends.length) counts.push(`${backends.length} backend${backends.length !== 1 ? 's' : ''}`);
  if (listens.length) counts.push(`${listens.length} listen${listens.length !== 1 ? 's' : ''}`);
  const subtitle = counts.join(' · ') || 'HAProxy configuration';

  // Global section card
  const globalKvs = [];
  if (globalData.maxconn) globalKvs.push(kv('maxconn', globalData.maxconn));
  if (globalData.user) globalKvs.push(kv('user', globalData.user));
  if (globalData.group) globalKvs.push(kv('group', globalData.group));
  globalData.logs.forEach((l) => {
    globalKvs.push(kv('log', l));
  });
  if (globalData.daemon) globalKvs.push(`<div class="hpcfg-kv"><span class="hpcfg-kv-key">${lineButton('daemon', globalData.daemon.line, 'daemon')}</span><span class="hpcfg-chip hpcfg-chip-daemon">enabled</span></div>`);
  const globalHtml = globalKvs.length ? `<div class="hpcfg-sec"><h3>Global</h3><div class="hpcfg-card">${globalKvs.join('')}</div></div>` : '';

  // Defaults section card
  const defaultsKvs = [];
  if (defaultsData.mode) {
    const modeClass = defaultsData.mode.value === 'http' ? 'hpcfg-chip-http' : defaultsData.mode.value === 'tcp' ? 'hpcfg-chip-tcp' : 'hpcfg-chip-default';
    defaultsKvs.push(`<div class="hpcfg-kv"><span class="hpcfg-kv-key">${lineButton('mode', defaultsData.mode.line, 'mode')}</span><span class="hpcfg-chip ${esc(modeClass)}">${esc(defaultsData.mode.value)}</span></div>`);
  }
  if (defaultsData.timeoutConnect) defaultsKvs.push(kv('timeout connect', defaultsData.timeoutConnect, 'timeout'));
  if (defaultsData.timeoutClient) defaultsKvs.push(kv('timeout client', defaultsData.timeoutClient, 'timeout'));
  if (defaultsData.timeoutServer) defaultsKvs.push(kv('timeout server', defaultsData.timeoutServer, 'timeout'));
  const defaultsHtml = defaultsKvs.length ? `<div class="hpcfg-sec"><h3>Defaults</h3><div class="hpcfg-card">${defaultsKvs.join('')}</div></div>` : '';

  // Frontends table
  const frontendsHtml = frontends.length ? `<div class="hpcfg-sec">
  <h3>Frontends</h3>
  <table class="hpcfg-table">
    <thead><tr><th>Name</th><th>Bind Address(es)</th><th>SSL</th><th>Backend</th></tr></thead>
    <tbody>${frontends.map((f) => {
    const bindHtml = f.binds.map((b) => `<span class="hpcfg-chip hpcfg-chip-default">${lineButton(b.addr, b.line, 'bind')}</span>`).join('') || '—';
    const sslHtml = f.binds.some((b) => b.ssl) ? '<span class="hpcfg-chip hpcfg-chip-ssl">SSL</span>' : '<span style="color:var(--fg-2,#888);">—</span>';
    return `<tr>
      <td>${lineButton(f.name || '—', f.line, 'frontend')}</td>
      <td class="hpcfg-mono">${bindHtml}</td>
      <td>${sslHtml}</td>
      <td class="hpcfg-mono">${f.defaultBackend ? lineButton(f.defaultBackend.value, f.defaultBackend.line, 'default_backend') : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
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
      <td>${lineButton(b.name || '—', b.line, 'backend')}</td>
      <td class="hpcfg-mono">${b.balance ? lineButton(b.balance.value, b.balance.line, 'balance') : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
      <td>${b.servers.length}</td>
      <td>${b.healthCheck ? `<span class="hpcfg-chip hpcfg-chip-http">${lineButton('enabled', b.healthCheck.line, 'health')}</span>` : '<span style="color:var(--fg-2,#888);">—</span>'}</td>
    </tr>`).join('')}</tbody>
  </table>
</div>` : '';

  // Listen blocks
  const listensHtml = listens.length ? `<div class="hpcfg-sec">
  <h3>Listen</h3>
  ${listens.map((l) => `<div class="hpcfg-card">
    <div class="hpcfg-kv"><span class="hpcfg-kv-key">${lineButton('name', l.line, 'listen')}</span><span class="hpcfg-kv-val hpcfg-mono">${esc(l.name || '—')}</span></div>
    ${l.binds.map((b) => `<div class="hpcfg-kv"><span class="hpcfg-kv-key">${lineButton('bind', b.line, 'bind')}</span><span class="hpcfg-chip hpcfg-chip-default">${esc(b.value)}</span></div>`).join('')}
    ${l.statsAuth ? `<div class="hpcfg-kv"><span class="hpcfg-kv-key">${lineButton('stats auth', l.statsAuth.line, 'stats_auth')}</span><span class="hpcfg-kv-val hpcfg-mono">${esc(l.statsAuth.user)}</span>:<span class="hpcfg-masked">[configured]</span></div>` : ''}
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
  const review = issueList(issues, { title: 'HAProxy Review' });
  if (review) host.insertBefore(review, host.querySelector('.hpcfg-sec'));
  host.appendChild(sourcePreview(redactedSource(text), { title: 'Redacted source', collapsed: true, idPrefix: 'haproxy-line', highlighter: highlightHAProxyLine }));
  wireSourceLinks(host, { idPrefix: 'haproxy-line' });

  return { parentNode: host };
}
