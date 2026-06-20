const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ngx-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ngx-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#009639;color:#fff;vertical-align:middle;margin-right:8px;}
.ngx-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ngx-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ngx-sec{margin:12px 0;}
.ngx-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ngx-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.ngx-card-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:4px;}
.ngx-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.ngx-table{width:100%;border-collapse:collapse;font-size:13px;}
.ngx-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.ngx-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.ngx-path{font-weight:600;color:var(--fg,#24292f);}
.ngx-handler{color:var(--fg-2,#666);}
.ngx-upstream-name{font-family:ui-monospace,monospace;font-size:12px;font-weight:600;}
`;

/**
 * Parse an nginx config text into a structured object.
 * Uses regex/line scanning — not a full parser.
 */
function parseNginx(text) {
  const lines = text.split('\n');

  const serverBlocks = [];
  const upstreams = [];

  let depth = 0;
  let inServer = false;
  let inUpstream = false;
  let inLocation = false;

  // Current accumulators
  let serverData = null;
  let serverDepth = 0;
  let upstreamData = null;
  let upstreamDepth = 0;
  let locationData = null;
  let locationDepth = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Strip inline comments
    const stripped = line.replace(/#.*$/, '').trim();
    if (!stripped) continue;

    // Count braces
    const opens = (stripped.match(/\{/g) || []).length;
    const closes = (stripped.match(/\}/g) || []).length;

    // Detect block starts (before updating depth)
    const serverMatch = /^server\s*\{/.test(stripped);
    const upstreamMatch = /^upstream\s+(\S+)\s*\{/.exec(stripped);
    const locationMatch = /^location\s+(\S+)\s*\{/.exec(stripped) ||
                          /^location\s+(~\*?|=|^~)\s+(\S+)\s*\{/.exec(stripped);

    if (serverMatch && !inServer && !inUpstream) {
      inServer = true;
      serverDepth = depth;
      serverData = { serverNames: [], listens: [], root: null, index: null, locations: [] };
    }

    if (upstreamMatch && !inUpstream && !inServer) {
      inUpstream = true;
      upstreamDepth = depth;
      upstreamData = { name: upstreamMatch[1], servers: [] };
    }

    if (locationMatch && inServer && !inLocation) {
      inLocation = true;
      locationDepth = depth;
      // Determine path from match groups
      const path = locationMatch[2] || locationMatch[1];
      locationData = { path, proxyPass: null, returnDirective: null, alias: null, root: null };
    }

    // Update depth after detecting block starts
    depth += opens - closes;

    // Collect directives inside location block
    if (inLocation && locationData) {
      const ppMatch = /^proxy_pass\s+(\S+?);/.exec(stripped);
      if (ppMatch) locationData.proxyPass = ppMatch[1];

      const retMatch = /^return\s+(.+?);/.exec(stripped);
      if (retMatch) locationData.returnDirective = retMatch[1];

      const aliasMatch = /^alias\s+(\S+?);/.exec(stripped);
      if (aliasMatch) locationData.alias = aliasMatch[1];

      const rootMatch = /^root\s+(\S+?);/.exec(stripped);
      if (rootMatch) locationData.root = rootMatch[1];
    }

    // Collect directives inside server block (but not inside location)
    if (inServer && serverData && !inLocation) {
      const snMatch = /^server_name\s+(.+?);/.exec(stripped);
      if (snMatch) {
        serverData.serverNames.push(...snMatch[1].trim().split(/\s+/));
      }

      const listenMatch = /^listen\s+(.+?);/.exec(stripped);
      if (listenMatch) {
        serverData.listens.push(listenMatch[1].trim());
      }

      const rootMatch = /^root\s+(\S+?);/.exec(stripped);
      if (rootMatch) serverData.root = rootMatch[1];

      const indexMatch = /^index\s+(.+?);/.exec(stripped);
      if (indexMatch) serverData.index = indexMatch[1].trim();
    }

    // Collect directives inside upstream block
    if (inUpstream && upstreamData) {
      const svMatch = /^server\s+(\S+?);/.exec(stripped);
      if (svMatch) upstreamData.servers.push(svMatch[1]);
    }

    // Detect block ends
    if (inLocation && depth <= locationDepth) {
      if (locationData && serverData) serverData.locations.push(locationData);
      inLocation = false;
      locationData = null;
    }

    if (inServer && depth <= serverDepth) {
      if (serverData) serverBlocks.push(serverData);
      inServer = false;
      serverData = null;
    }

    if (inUpstream && depth <= upstreamDepth) {
      if (upstreamData) upstreams.push(upstreamData);
      inUpstream = false;
      upstreamData = null;
    }
  }

  return { serverBlocks, upstreams };
}

function handlerHtml(loc) {
  if (loc.proxyPass) return `<span class="ngx-handler">proxy_pass ${esc(loc.proxyPass)}</span>`;
  if (loc.returnDirective) return `<span class="ngx-handler">return ${esc(loc.returnDirective)}</span>`;
  if (loc.alias) return `<span class="ngx-handler">alias ${esc(loc.alias)}</span>`;
  if (loc.root) return `<span class="ngx-handler">root ${esc(loc.root)}</span>`;
  return `<span style="color:var(--fg-2,#888);">— static</span>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'ngx-doc';

  const text = intake.text || '';
  const { serverBlocks, upstreams } = parseNginx(text);

  const totalLocations = serverBlocks.reduce((n, s) => n + s.locations.length, 0);
  const summaryParts = [
    `${serverBlocks.length} server block${serverBlocks.length !== 1 ? 's' : ''}`,
    `${totalLocations} location${totalLocations !== 1 ? 's' : ''}`,
  ];
  if (upstreams.length) summaryParts.push(`${upstreams.length} upstream${upstreams.length !== 1 ? 's' : ''}`);
  const summary = summaryParts.join(' · ');

  // Server info cards
  const serverCardsHtml = serverBlocks.map((s, i) => {
    const names = s.serverNames.length
      ? s.serverNames.map((n) => `<span class="ngx-chip">${esc(n)}</span>`).join('')
      : '<span style="color:var(--fg-2,#888);font-size:12px;">—</span>';
    const ports = s.listens.length
      ? s.listens.map((l) => `<span class="ngx-chip">${esc(l)}</span>`).join('')
      : '<span style="color:var(--fg-2,#888);font-size:12px;">—</span>';
    const rootLine = s.root
      ? `<div style="margin-top:6px;font-size:12px;"><span style="color:var(--fg-2,#888);">root</span> <span style="font-family:ui-monospace,monospace;">${esc(s.root)}</span></div>`
      : '';
    const indexLine = s.index
      ? `<div style="margin-top:2px;font-size:12px;"><span style="color:var(--fg-2,#888);">index</span> <span style="font-family:ui-monospace,monospace;">${esc(s.index)}</span></div>`
      : '';
    return `<div class="ngx-card">
  <div class="ngx-card-label">Server block ${serverBlocks.length > 1 ? i + 1 : ''}</div>
  <div><span style="color:var(--fg-2,#888);font-size:12px;margin-right:6px;">server_name</span>${names}</div>
  <div style="margin-top:4px;"><span style="color:var(--fg-2,#888);font-size:12px;margin-right:6px;">listen</span>${ports}</div>
  ${rootLine}${indexLine}
</div>`;
  }).join('');

  // Locations table
  const allLocations = serverBlocks.flatMap((s) => s.locations);
  const locRowsHtml = allLocations.map((loc) => `<tr>
  <td><span class="ngx-path">${esc(loc.path)}</span></td>
  <td>${handlerHtml(loc)}</td>
</tr>`).join('');

  const locTableHtml = allLocations.length ? `<div class="ngx-sec">
  <h3>Locations</h3>
  <table class="ngx-table">
    <thead><tr><th>Path</th><th>Handler</th></tr></thead>
    <tbody>${locRowsHtml}</tbody>
  </table>
</div>` : '';

  // Upstreams
  const upstreamsHtml = upstreams.length ? `<div class="ngx-sec">
  <h3>Upstreams</h3>
  ${upstreams.map((u) => `<div class="ngx-card">
  <span class="ngx-upstream-name">${esc(u.name)}</span>
  ${u.servers.length ? `<div style="margin-top:6px;">${u.servers.map((sv) => `<span class="ngx-chip">${esc(sv)}</span>`).join('')}</div>` : ''}
</div>`).join('')}
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="ngx-title"><span class="ngx-badge">nginx</span>Nginx config</div>
<div class="ngx-sub">${esc(summary)}</div>
${serverBlocks.length ? `<div class="ngx-sec"><h3>Server${serverBlocks.length !== 1 ? 's' : ''}</h3>${serverCardsHtml}</div>` : ''}
${locTableHtml}
${upstreamsHtml}`;

  return { parentNode: host };
}
