import { ensureKnownUiStyle, issueList, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

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
.ngx-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.ngx-link:hover{color:var(--accent,#2563eb);}
.ngx-help{font-size:11px;color:var(--fg-2,#888);margin-top:3px;}
.ngx-source-key{color:#009639;font-weight:700;}
.ngx-source-comment{color:#6e7781;font-style:italic;}
`;

/**
 * Parse an nginx config text into a structured object.
 * Uses regex/line scanning — not a full parser.
 */
function parseNginx(text) {
  const lines = text.split(/\r?\n/);

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

  for (const [idx, rawLine] of lines.entries()) {
    const lineNo = idx + 1;
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
      serverData = { line: lineNo, serverNames: [], listens: [], root: null, index: null, locations: [] };
    }

    if (upstreamMatch && !inUpstream && !inServer) {
      inUpstream = true;
      upstreamDepth = depth;
      upstreamData = { name: upstreamMatch[1], line: lineNo, servers: [] };
    }

    if (locationMatch && inServer && !inLocation) {
      inLocation = true;
      locationDepth = depth;
      // Determine path from match groups
      const path = locationMatch[2] || locationMatch[1];
      locationData = { path, line: lineNo, proxyPass: null, returnDirective: null, alias: null, root: null, tryFiles: null, fastcgiPass: null };
    }

    // Update depth after detecting block starts
    depth += opens - closes;

    // Collect directives inside location block
    if (inLocation && locationData) {
      const ppMatch = /^proxy_pass\s+(\S+?);/.exec(stripped);
      if (ppMatch) locationData.proxyPass = { value: ppMatch[1], line: lineNo };

      const retMatch = /^return\s+(.+?);/.exec(stripped);
      if (retMatch) locationData.returnDirective = { value: retMatch[1], line: lineNo };

      const aliasMatch = /^alias\s+(\S+?);/.exec(stripped);
      if (aliasMatch) locationData.alias = { value: aliasMatch[1], line: lineNo };

      const rootMatch = /^root\s+(\S+?);/.exec(stripped);
      if (rootMatch) locationData.root = { value: rootMatch[1], line: lineNo };

      const tryFilesMatch = /^try_files\s+(.+?);/.exec(stripped);
      if (tryFilesMatch) locationData.tryFiles = { value: tryFilesMatch[1], line: lineNo };

      const fastcgiMatch = /^fastcgi_pass\s+(\S+?);/.exec(stripped);
      if (fastcgiMatch) locationData.fastcgiPass = { value: fastcgiMatch[1], line: lineNo };
    }

    // Collect directives inside server block (but not inside location)
    if (inServer && serverData && !inLocation) {
      const snMatch = /^server_name\s+(.+?);/.exec(stripped);
      if (snMatch) {
        serverData.serverNames.push(...snMatch[1].trim().split(/\s+/).map((value) => ({ value, line: lineNo })));
      }

      const listenMatch = /^listen\s+(.+?);/.exec(stripped);
      if (listenMatch) {
        serverData.listens.push({ value: listenMatch[1].trim(), line: lineNo });
      }

      const rootMatch = /^root\s+(\S+?);/.exec(stripped);
      if (rootMatch) serverData.root = { value: rootMatch[1], line: lineNo };

      const indexMatch = /^index\s+(.+?);/.exec(stripped);
      if (indexMatch) serverData.index = { value: indexMatch[1].trim(), line: lineNo };
    }

    // Collect directives inside upstream block
    if (inUpstream && upstreamData) {
      const svMatch = /^server\s+(\S+?);/.exec(stripped);
      if (svMatch) upstreamData.servers.push({ value: svMatch[1], line: lineNo });
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

const HELP = {
  listen: 'Address and port accepted by this server block. Plain port 80 is usually a redirect-only listener.',
  server_name: 'Hostnames matched by this server block.',
  root: 'Filesystem directory used for static files in this context.',
  index: 'Default files tried for directory requests.',
  location: 'URI matcher that selects request handling rules.',
  proxy_pass: 'Forwards matching requests to an upstream URL or named upstream.',
  return: 'Stops processing and returns a status or redirect.',
  alias: 'Maps a location to a filesystem path; trailing slash semantics matter.',
  try_files: 'Checks files in order before falling back.',
  fastcgi_pass: 'Forwards matching requests to a FastCGI backend.',
  upstream: 'Named backend pool used by proxy_pass or related directives.',
};

function helpFor(kind) {
  return HELP[kind] || 'Open this Nginx directive in source.';
}

function lineButton(label, line, kind = '') {
  const title = `${helpFor(kind)} Open line ${line || 1} in source.`;
  return `<button class="ngx-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function handlerHtml(loc) {
  if (loc.proxyPass) return `<span class="ngx-handler">${lineButton('proxy_pass', loc.proxyPass.line, 'proxy_pass')} ${esc(loc.proxyPass.value)}</span>`;
  if (loc.returnDirective) return `<span class="ngx-handler">${lineButton('return', loc.returnDirective.line, 'return')} ${esc(loc.returnDirective.value)}</span>`;
  if (loc.alias) return `<span class="ngx-handler">${lineButton('alias', loc.alias.line, 'alias')} ${esc(loc.alias.value)}</span>`;
  if (loc.root) return `<span class="ngx-handler">${lineButton('root', loc.root.line, 'root')} ${esc(loc.root.value)}</span>`;
  if (loc.tryFiles) return `<span class="ngx-handler">${lineButton('try_files', loc.tryFiles.line, 'try_files')} ${esc(loc.tryFiles.value)}</span>`;
  if (loc.fastcgiPass) return `<span class="ngx-handler">${lineButton('fastcgi_pass', loc.fastcgiPass.line, 'fastcgi_pass')} ${esc(loc.fastcgiPass.value)}</span>`;
  return `<span style="color:var(--fg-2,#888);">— static</span>`;
}

function collectIssues({ serverBlocks, upstreams }) {
  const issues = [];
  for (const server of serverBlocks) {
    for (const listen of server.listens) {
      const value = listen.value.toLowerCase();
      const isPlainHttp = /\b80\b/.test(value) && !/\bssl\b/.test(value);
      const isDefault = /\bdefault_server\b/.test(value);
      if (isPlainHttp) {
        const hasRedirect = server.locations.some((loc) => /^30[1278]\b/.test(loc.returnDirective?.value || ''));
        issues.push({
          severity: hasRedirect ? 'info' : 'warning',
          label: hasRedirect ? 'http redirect' : 'plain http',
          line: listen.line,
          message: hasRedirect
            ? `listen ${listen.value} accepts HTTP and appears to redirect to HTTPS.`
            : `listen ${listen.value} accepts plain HTTP without an obvious HTTPS redirect.`,
        });
      }
      if (isDefault) {
        issues.push({
          severity: 'info',
          label: 'default server',
          line: listen.line,
          message: `listen ${listen.value} is a default server; unmatched hostnames will land here.`,
        });
      }
    }
    if (!server.serverNames.length) {
      issues.push({
        severity: 'info',
        label: 'host match',
        line: server.line,
        message: 'Server block has no server_name directive; it may act as a catch-all depending on listen order.',
      });
    }
    for (const loc of server.locations) {
      if (loc.alias && !loc.path.endsWith('/') && loc.alias.value.endsWith('/')) {
        issues.push({
          severity: 'warning',
          label: 'alias slash',
          line: loc.alias.line,
          message: `alias ${loc.alias.value} is used under location ${loc.path}; confirm trailing slash mapping is intentional.`,
        });
      }
    }
  }
  for (const upstream of upstreams) {
    if (!upstream.servers.length) {
      issues.push({
        severity: 'warning',
        label: 'empty upstream',
        line: upstream.line,
        message: `upstream ${upstream.name} has no backend servers.`,
      });
    }
  }
  return issues;
}

function highlightNginxLine(line) {
  const escaped = esc(line);
  if (/^\s*#/.test(line)) return `<span class="ngx-source-comment">${escaped}</span>`;
  return escaped.replace(/^(\s*[A-Za-z_][\w-]*)/, '<span class="ngx-source-key">$1</span>');
}

export function render(intake) {
  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'ngx-doc nginxconf-doc';

  const text = intake.text || '';
  const { serverBlocks, upstreams } = parseNginx(text);
  const issues = collectIssues({ serverBlocks, upstreams });

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
      ? s.serverNames.map((n) => `<span class="ngx-chip">${lineButton(n.value, n.line, 'server_name')}</span>`).join('')
      : '<span style="color:var(--fg-2,#888);font-size:12px;">—</span>';
    const ports = s.listens.length
      ? s.listens.map((l) => `<span class="ngx-chip">${lineButton(l.value, l.line, 'listen')}</span>`).join('')
      : '<span style="color:var(--fg-2,#888);font-size:12px;">—</span>';
    const rootLine = s.root
      ? `<div style="margin-top:6px;font-size:12px;"><span style="color:var(--fg-2,#888);">${lineButton('root', s.root.line, 'root')}</span> <span style="font-family:ui-monospace,monospace;">${esc(s.root.value)}</span></div>`
      : '';
    const indexLine = s.index
      ? `<div style="margin-top:2px;font-size:12px;"><span style="color:var(--fg-2,#888);">${lineButton('index', s.index.line, 'index')}</span> <span style="font-family:ui-monospace,monospace;">${esc(s.index.value)}</span></div>`
      : '';
    return `<div class="ngx-card">
  <div class="ngx-card-label">${lineButton(`Server block ${serverBlocks.length > 1 ? i + 1 : ''}`.trim(), s.line, 'server')}</div>
  <div><span style="color:var(--fg-2,#888);font-size:12px;margin-right:6px;">server_name</span>${names}</div>
  <div style="margin-top:4px;"><span style="color:var(--fg-2,#888);font-size:12px;margin-right:6px;">listen</span>${ports}</div>
  <div class="ngx-help">${esc(helpFor('listen'))}</div>
  ${rootLine}${indexLine}
</div>`;
  }).join('');

  // Locations table
  const allLocations = serverBlocks.flatMap((s) => s.locations);
  const locRowsHtml = allLocations.map((loc) => `<tr>
  <td><span class="ngx-path">${lineButton(loc.path, loc.line, 'location')}</span></td>
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
  <span class="ngx-upstream-name">${lineButton(u.name, u.line, 'upstream')}</span>
  ${u.servers.length ? `<div style="margin-top:6px;">${u.servers.map((sv) => `<span class="ngx-chip">${lineButton(sv.value, sv.line, 'upstream')}</span>`).join('')}</div>` : ''}
</div>`).join('')}
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="ngx-title"><span class="ngx-badge">nginx</span>Nginx config</div>
<div class="ngx-sub">${esc(summary)}</div>
${serverBlocks.length ? `<div class="ngx-sec"><h3>Server${serverBlocks.length !== 1 ? 's' : ''}</h3>${serverCardsHtml}</div>` : ''}
${locTableHtml}
${upstreamsHtml}`;
  const review = issueList(issues, { title: 'Nginx Review' });
  if (review) host.insertBefore(review, host.querySelector('.ngx-sec'));
  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'nginx-line', highlighter: highlightNginxLine }));

  wireSourceLinks(host, { idPrefix: 'nginx-line' });
  return { parentNode: host };
}
