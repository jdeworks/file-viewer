const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.erlvmargs-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.erlvmargs-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7C0000;color:#fff;vertical-align:middle;margin-right:8px}
.erlvmargs-title{font-size:18px;font-weight:700;margin:0 0 4px}
.erlvmargs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.erlvmargs-sec{margin:0 0 14px}
.erlvmargs-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.erlvmargs-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg-2,#f6f8fa)}
.erlvmargs-row{display:flex;align-items:baseline;gap:8px;padding:3px 0;font-size:13px}
.erlvmargs-row+.erlvmargs-row{border-top:1px solid var(--border,#e0e0e0)}
.erlvmargs-label{color:var(--fg-2,#888);min-width:160px;flex-shrink:0}
.erlvmargs-val{font-family:ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f)}
.erlvmargs-redacted{font-family:ui-monospace,monospace;color:var(--fg-2,#888);font-style:italic}
.erlvmargs-table{width:100%;border-collapse:collapse;font-size:13px}
.erlvmargs-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-weight:500}
.erlvmargs-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.erlvmargs-table td:first-child{font-family:ui-monospace,monospace;font-weight:600;white-space:nowrap}
.erlvmargs-table td:last-child{font-family:ui-monospace,monospace;color:var(--fg-2,#555)}
.erlvmargs-pill{display:inline-block;padding:1px 7px;border-radius:8px;font-size:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.erlvmargs-yes{color:#1a7f37;font-weight:600}
`;

/** Parse vm.args line-by-line, skipping # comments */
function parseVmArgs(text) {
  const node = { name: null, mode: null }; // -name or -sname
  let cookie = null;
  const schedulers = {};
  const network = {};
  const other = [];
  const envVars = [];

  for (const rawLine of text.split('\n')) {
    // Strip # comments (and ## double-hash comments)
    const line = rawLine.replace(/^\s*#+.*/, '').trim();
    if (!line) continue;

    // Node name
    if (/^-name\s+/.test(line)) {
      node.name = line.replace(/^-name\s+/, '').trim();
      node.mode = 'distributed';
    } else if (/^-sname\s+/.test(line)) {
      node.name = line.replace(/^-sname\s+/, '').trim();
      node.mode = 'local';
    }
    // Cookie — ALWAYS redact
    else if (/^-setcookie\s+/.test(line)) {
      cookie = '[configured]';
    }
    // Kernel poll
    else if (/^\+K\s+/.test(line)) {
      schedulers.kernelPoll = line.replace(/^\+K\s+/, '').trim();
    }
    // Max processes
    else if (/^\+P\s+/.test(line)) {
      schedulers.maxProcs = line.replace(/^\+P\s+/, '').trim();
    }
    // Max ports
    else if (/^\+Q\s+/.test(line)) {
      schedulers.maxPorts = line.replace(/^\+Q\s+/, '').trim();
    }
    // Async threads
    else if (/^\+A\s+/.test(line)) {
      schedulers.asyncThreads = line.replace(/^\+A\s+/, '').trim();
    }
    // Schedulers N:M
    else if (/^\+S\s+/.test(line)) {
      schedulers.schedulers = line.replace(/^\+S\s+/, '').trim();
    }
    // Warnings as type
    else if (/^\+W\s+/.test(line)) {
      schedulers.warnings = line.replace(/^\+W\s+/, '').trim();
    }
    // Heartbeat
    else if (/^-heart$/.test(line)) {
      network.heart = true;
    }
    // Additional config file
    else if (/^-config\s+/.test(line)) {
      network.config = line.replace(/^-config\s+/, '').trim();
    }
    // Distribution protocol
    else if (/^-proto_dist\s+/.test(line)) {
      network.protoDist = line.replace(/^-proto_dist\s+/, '').trim();
    }
    // TLS options file
    else if (/^-ssl_dist_optfile\s+/.test(line)) {
      network.sslDistOptfile = line.replace(/^-ssl_dist_optfile\s+/, '').trim();
    }
    // Environment vars
    else if (/^-env\s+/.test(line)) {
      const m = /^-env\s+(\S+)\s+(.+)$/.exec(line);
      if (m) envVars.push({ key: m[1], value: m[2].trim() });
    }
    // All other flags (+ or - flags not yet matched)
    else if (/^[+-]/.test(line)) {
      const m = /^(\S+)\s*(.*)$/.exec(line);
      if (m) other.push({ flag: m[1], value: m[2].trim() });
    }
  }

  return { node, cookie, schedulers, network, envVars, other };
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const { node, cookie, schedulers, network, envVars, other } = parseVmArgs(text);

  const host = document.createElement('div');
  host.className = 'erlvmargs-doc';

  let html = `<style>${CSS}</style>
<div class="erlvmargs-title"><span class="erlvmargs-badge">Erlang VM</span>vm.args</div>
<div class="erlvmargs-sub">BEAM virtual machine startup configuration</div>`;

  // Node identity card
  if (node.name || cookie !== null) {
    let nodeRows = '';
    if (node.name) {
      nodeRows += `<div class="erlvmargs-row"><span class="erlvmargs-label">Node name</span><span class="erlvmargs-val">${esc(node.name)}</span></div>`;
      nodeRows += `<div class="erlvmargs-row"><span class="erlvmargs-label">Distribution mode</span><span class="erlvmargs-val">${node.mode === 'distributed' ? 'distributed (-name)' : 'local (-sname)'}</span></div>`;
    }
    if (cookie !== null) {
      nodeRows += `<div class="erlvmargs-row"><span class="erlvmargs-label">Cluster cookie</span><span class="erlvmargs-redacted">[configured]</span></div>`;
    }
    html += `<div class="erlvmargs-sec"><h3>Node Identity</h3><div class="erlvmargs-card">${nodeRows}</div></div>`;
  }

  // Scheduler settings
  const hasSchedulers = Object.keys(schedulers).length > 0;
  if (hasSchedulers) {
    let rows = '';
    if (schedulers.maxProcs) rows += `<div class="erlvmargs-row"><span class="erlvmargs-label">Max processes (+P)</span><span class="erlvmargs-val">${esc(schedulers.maxProcs)}</span></div>`;
    if (schedulers.schedulers) rows += `<div class="erlvmargs-row"><span class="erlvmargs-label">Schedulers (+S)</span><span class="erlvmargs-val">${esc(schedulers.schedulers)}</span></div>`;
    if (schedulers.asyncThreads) rows += `<div class="erlvmargs-row"><span class="erlvmargs-label">Async threads (+A)</span><span class="erlvmargs-val">${esc(schedulers.asyncThreads)}</span></div>`;
    if (schedulers.kernelPoll) rows += `<div class="erlvmargs-row"><span class="erlvmargs-label">Kernel poll (+K)</span><span class="erlvmargs-val">${esc(schedulers.kernelPoll)}</span></div>`;
    if (schedulers.maxPorts) rows += `<div class="erlvmargs-row"><span class="erlvmargs-label">Max ports (+Q)</span><span class="erlvmargs-val">${esc(schedulers.maxPorts)}</span></div>`;
    if (schedulers.warnings) rows += `<div class="erlvmargs-row"><span class="erlvmargs-label">Warnings (+W)</span><span class="erlvmargs-val">${esc(schedulers.warnings)}</span></div>`;
    html += `<div class="erlvmargs-sec"><h3>Scheduler &amp; Concurrency</h3><div class="erlvmargs-card">${rows}</div></div>`;
  }

  // Network / Distribution
  const hasNetwork = network.heart || network.config || network.protoDist || network.sslDistOptfile;
  if (hasNetwork) {
    let rows = '';
    if (network.heart) rows += `<div class="erlvmargs-row"><span class="erlvmargs-label">Heartbeat (-heart)</span><span class="erlvmargs-val erlvmargs-yes">enabled</span></div>`;
    if (network.protoDist) rows += `<div class="erlvmargs-row"><span class="erlvmargs-label">Distribution protocol</span><span class="erlvmargs-val">${esc(network.protoDist)}</span></div>`;
    if (network.sslDistOptfile) rows += `<div class="erlvmargs-row"><span class="erlvmargs-label">TLS options file</span><span class="erlvmargs-val">${esc(network.sslDistOptfile)}</span></div>`;
    if (network.config) rows += `<div class="erlvmargs-row"><span class="erlvmargs-label">Additional config</span><span class="erlvmargs-val">${esc(network.config)}</span></div>`;
    html += `<div class="erlvmargs-sec"><h3>Network / Distribution</h3><div class="erlvmargs-card">${rows}</div></div>`;
  }

  // Env vars
  if (envVars.length > 0) {
    const rows = envVars.map((v) => `<tr><td>${esc(v.key)}</td><td>${esc(v.value)}</td></tr>`).join('');
    html += `<div class="erlvmargs-sec"><h3>Environment Variables</h3><table class="erlvmargs-table"><thead><tr><th>Variable</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // Other flags
  if (other.length > 0) {
    const rows = other.map((f) => `<tr><td>${esc(f.flag)}</td><td>${esc(f.value)}</td></tr>`).join('');
    html += `<div class="erlvmargs-sec"><h3>Other Flags</h3><table class="erlvmargs-table"><thead><tr><th>Flag</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
