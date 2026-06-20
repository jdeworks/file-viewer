const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.syslogng-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.syslogng-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#006B75;color:#fff;vertical-align:middle;margin-right:8px;}
.syslogng-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.syslogng-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.syslogng-sec{margin:14px 0;}
.syslogng-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.syslogng-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.syslogng-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;}
.syslogng-name{font-family:ui-monospace,monospace;font-weight:600;font-size:13px;}
.syslogng-driver{font-family:ui-monospace,monospace;font-size:11px;color:var(--fg-2,#666);margin-left:6px;}
.syslogng-table{width:100%;border-collapse:collapse;font-size:13px;}
.syslogng-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.syslogng-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.syslogng-arrow{color:var(--fg-2,#888);padding:0 4px;}
.syslogng-muted{color:var(--fg-2,#888);font-size:12px;}
.syslogng-mono{font-family:ui-monospace,monospace;font-size:12px;}
.syslogng-path-row{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:5px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:12px;}
.syslogng-path-row:last-child{border-bottom:none;}
`;

// Parse top-level named blocks: source s_name { driver(...) ... };
function parseBlocks(text, keyword) {
  const results = [];
  const re = new RegExp(`\\b${keyword}\\s+(\\w+)\\s*\\{([^}]*)\\}`, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    const body = m[2];
    // extract driver names: word followed by (
    const drivers = [];
    const driverRe = /\b(\w+)\s*\(/g;
    let dm;
    while ((dm = driverRe.exec(body)) !== null) {
      // filter out common sub-keywords that are not drivers
      const kw = dm[1];
      if (!['if', 'for', 'while', 'flags', 'keep_hostname', 'use_dns', 'use_fqdn'].includes(kw)) {
        if (!drivers.includes(kw)) drivers.push(kw);
      }
    }
    results.push({ name, drivers });
  }
  return results;
}

// Parse log { source(s1); filter(f1); destination(d1); } paths
function parseLogPaths(text) {
  const paths = [];
  const re = /\blog\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const body = m[1];
    const sources = [];
    const filters = [];
    const destinations = [];
    const srcRe = /\bsource\s*\(\s*(\w+)\s*\)/g;
    const fltRe = /\bfilter\s*\(\s*(\w+)\s*\)/g;
    const dstRe = /\bdestination\s*\(\s*(\w+)\s*\)/g;
    let bm;
    while ((bm = srcRe.exec(body)) !== null) sources.push(bm[1]);
    while ((bm = fltRe.exec(body)) !== null) filters.push(bm[1]);
    while ((bm = dstRe.exec(body)) !== null) destinations.push(bm[1]);
    paths.push({ sources, filters, destinations });
  }
  return paths;
}

function parseModules(text) {
  const modules = [];
  const re = /@module\s+(\S+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!modules.includes(m[1])) modules.push(m[1]);
  }
  return modules;
}

function parseVersion(text) {
  const m = /@version:\s*(\S+)/.exec(text);
  return m ? m[1] : null;
}

export function render(intake) {
  const text = intake.text || '';
  const version = parseVersion(text);
  const sources = parseBlocks(text, 'source');
  const destinations = parseBlocks(text, 'destination');
  const filters = parseBlocks(text, 'filter');
  const logPaths = parseLogPaths(text);
  const modules = parseModules(text);

  // Sources section
  const sourcesHtml = sources.length ? `<div class="syslogng-sec">
    <h3>Sources (${sources.length})</h3>
    <table class="syslogng-table">
      <thead><tr><th>Name</th><th>Drivers</th></tr></thead>
      <tbody>${sources.map((s) => `<tr>
        <td><span class="syslogng-name">${esc(s.name)}</span></td>
        <td>${s.drivers.length ? s.drivers.map((d) => `<span class="syslogng-chip">${esc(d)}()</span>`).join('') : '<span class="syslogng-muted">—</span>'}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>` : '';

  // Destinations section
  const destsHtml = destinations.length ? `<div class="syslogng-sec">
    <h3>Destinations (${destinations.length})</h3>
    <table class="syslogng-table">
      <thead><tr><th>Name</th><th>Drivers</th></tr></thead>
      <tbody>${destinations.map((d) => `<tr>
        <td><span class="syslogng-name">${esc(d.name)}</span></td>
        <td>${d.drivers.length ? d.drivers.map((dr) => `<span class="syslogng-chip">${esc(dr)}()</span>`).join('') : '<span class="syslogng-muted">—</span>'}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>` : '';

  // Filters section
  const filtersHtml = filters.length ? `<div class="syslogng-sec">
    <h3>Filters (${filters.length})</h3>
    <div class="syslogng-card">
      ${filters.map((f) => `<span class="syslogng-chip">${esc(f.name)}</span>`).join('')}
    </div>
  </div>` : '';

  // Log paths section
  const logPathsHtml = logPaths.length ? `<div class="syslogng-sec">
    <h3>Log Paths (${logPaths.length})</h3>
    <div class="syslogng-card">
      ${logPaths.map((p, i) => `<div class="syslogng-path-row">
        <span class="syslogng-muted">#${i + 1}</span>
        ${p.sources.map((s) => `<span class="syslogng-chip">${esc(s)}</span>`).join('')}
        ${p.filters.length ? `<span class="syslogng-arrow">▸</span>${p.filters.map((f) => `<span class="syslogng-chip">${esc(f)}</span>`).join('')}` : ''}
        <span class="syslogng-arrow">▸</span>
        ${p.destinations.map((d) => `<span class="syslogng-chip">${esc(d)}</span>`).join('')}
      </div>`).join('')}
    </div>
  </div>` : '';

  // Modules section
  const modulesHtml = modules.length ? `<div class="syslogng-sec">
    <h3>Modules</h3>
    <div class="syslogng-card">
      ${modules.map((m) => `<span class="syslogng-chip">${esc(m)}</span>`).join('')}
    </div>
  </div>` : '';

  const parts = [];
  if (version) parts.push(`v${version}`);
  if (sources.length) parts.push(`${sources.length} source${sources.length !== 1 ? 's' : ''}`);
  if (destinations.length) parts.push(`${destinations.length} destination${destinations.length !== 1 ? 's' : ''}`);
  if (filters.length) parts.push(`${filters.length} filter${filters.length !== 1 ? 's' : ''}`);
  if (logPaths.length) parts.push(`${logPaths.length} log path${logPaths.length !== 1 ? 's' : ''}`);
  const summary = parts.join(' · ') || 'syslog-ng configuration';

  const host = document.createElement('div');
  host.className = 'syslogng-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="syslogng-title"><span class="syslogng-badge">syslog-ng</span>syslog-ng Config</div>
<div class="syslogng-sub">${esc(summary)}</div>
${sourcesHtml}
${destsHtml}
${filtersHtml}
${logPathsHtml}
${modulesHtml}`;

  return { parentNode: host };
}
