import { ensureKnownUiStyle, issueList, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.apachecfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.apachecfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#D22128;color:#fff;vertical-align:middle;margin-right:8px;}
.apachecfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.apachecfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.apachecfg-sec{margin:12px 0;}
.apachecfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.apachecfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.apachecfg-card-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin-bottom:6px;font-weight:600;}
.apachecfg-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.apachecfg-kv-key{color:var(--fg-2,#888);min-width:130px;flex-shrink:0;}
.apachecfg-kv-val{font-family:ui-monospace,monospace;}
.apachecfg-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.apachecfg-ssl{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#e6f4ea;border:1px solid #a8d5b5;color:#1a6630;font-weight:600;margin-left:6px;}
.apachecfg-table{width:100%;border-collapse:collapse;font-size:13px;}
.apachecfg-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.apachecfg-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.apachecfg-block-name{font-weight:600;color:var(--fg,#24292f);}
.apachecfg-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.apachecfg-link:hover{color:var(--accent,#2563eb);}
.apachecfg-help{font-size:11px;color:var(--fg-2,#888);margin-top:3px;}
.apachecfg-source-key{color:#D22128;font-weight:700;}
.apachecfg-source-comment{color:#6e7781;font-style:italic;}
`;

function parseApache(text) {
  const lines = text.split(/\r?\n/);

  // Global directives (outside of any block)
  const global = {
    serverName: null,
    serverAdmin: null,
    documentRoot: null,
    serverRoot: null,
    listens: [],
    loadModules: [],
  };

  // Block sections: VirtualHost, Directory, Location, Files
  const virtualHosts = [];
  const blocks = []; // Directory, Location, Files

  let rewriteEngines = 0;
  let rewriteRules = 0;
  let sslCertFiles = 0;

  // Stack-based block parser
  const blockStack = [];
  let currentBlock = null;

  for (const [idx, rawLine] of lines.entries()) {
    const lineNo = idx + 1;
    const line = rawLine.trim().replace(/#.*$/, '').trim();
    if (!line) continue;

    // Opening tag: <VirtualHost *:80>, <Directory "/path">, etc.
    const openMatch = /^<(\w+)\s*(.*)>$/.exec(line);
    // Closing tag: </VirtualHost>
    const closeMatch = /^<\/(\w+)>$/.exec(line);

    if (openMatch) {
      const tagName = openMatch[1];
      const tagArg = openMatch[2].trim().replace(/^["']|["']$/g, '');
      const block = { type: tagName, arg: tagArg, line: lineNo, directives: {}, directiveEntries: [] };
      blockStack.push(block);
      currentBlock = block;
      continue;
    }

    if (closeMatch) {
      if (blockStack.length > 0) {
        const closed = blockStack.pop();
        currentBlock = blockStack.length > 0 ? blockStack[blockStack.length - 1] : null;

        const t = closed.type.toLowerCase();
        if (t === 'virtualhost') {
          virtualHosts.push(closed);
        } else if (t === 'directory' || t === 'location' || t === 'files') {
          blocks.push(closed);
        }
      }
      continue;
    }

    // Parse directive
    const dirMatch = /^(\S+)\s*(.*)$/.exec(line);
    if (!dirMatch) continue;
    const directive = dirMatch[1];
    const value = dirMatch[2].trim().replace(/^["']|["']$/g, '');
    const dirLower = directive.toLowerCase();

    if (blockStack.length === 0) {
      // Global context
      if (dirLower === 'servername') global.serverName = { value, line: lineNo };
      else if (dirLower === 'serveradmin') global.serverAdmin = { value, line: lineNo };
      else if (dirLower === 'documentroot') global.documentRoot = { value, line: lineNo };
      else if (dirLower === 'serverroot') global.serverRoot = { value, line: lineNo };
      else if (dirLower === 'listen') global.listens.push({ value, line: lineNo });
      else if (dirLower === 'loadmodule') global.loadModules.push({ value, line: lineNo });
    } else {
      // Inside a block
      if (currentBlock) {
        currentBlock.directives[dirLower] = { value, line: lineNo };
        currentBlock.directiveEntries.push({ key: directive, keyLower: dirLower, value, line: lineNo });
      }
    }

    // Count rewrites and SSL globally regardless of context
    if (dirLower === 'rewriteengine' && /on/i.test(value)) rewriteEngines++;
    if (dirLower === 'rewriterule') rewriteRules++;
    if (dirLower === 'sslcertificatefile') sslCertFiles++;
  }

  return { global, virtualHosts, blocks, rewriteEngines, rewriteRules, sslCertFiles };
}

const HELP = {
  serverroot: 'Base directory for Apache relative paths.',
  servername: 'Canonical host name Apache uses for redirects and self-references.',
  serveradmin: 'Contact address exposed in generated error pages.',
  documentroot: 'Filesystem directory used as the web root.',
  listen: 'Address or port where Apache accepts connections.',
  loadmodule: 'Dynamically loaded Apache module.',
  virtualhost: 'Host and port scoped configuration block.',
  directory: 'Filesystem path access policy block.',
  location: 'URL path access or proxy policy block.',
  files: 'Filename pattern access policy block.',
  require: 'Authorization rule for this block.',
  allowoverride: 'Controls whether .htaccess can override settings below this path.',
  options: 'Enables or disables directory features such as Indexes and FollowSymLinks.',
  proxypass: 'Forwards matching requests to another origin.',
  rewriteengine: 'Enables mod_rewrite rules in this context.',
  rewriterule: 'URL rewrite or redirect rule.',
  sslcertificatefile: 'TLS certificate presented by this virtual host.',
};

function helpFor(kind) {
  return HELP[String(kind || '').toLowerCase()] || 'Open this Apache directive in source.';
}

function lineButton(label, line, kind = label) {
  const title = `${helpFor(kind)} Open line ${line || 1} in source.`;
  return `<button class="apachecfg-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function kv(label, entry, kind = label) {
  if (!entry) return '';
  return `<div class="apachecfg-kv"><span class="apachecfg-kv-key">${lineButton(label, entry.line, kind)}</span><span class="apachecfg-kv-val">${esc(entry.value)}</span></div>`;
}

function collectIssues({ global: g, virtualHosts, blocks }) {
  const issues = [];
  for (const listen of g.listens) {
    if (/\b80\b/.test(listen.value)) {
      const hasRedirect = virtualHosts.some((vh) => /\b80\b/.test(vh.arg) && Object.prototype.hasOwnProperty.call(vh.directives, 'rewriterule'));
      issues.push({
        severity: hasRedirect ? 'info' : 'warning',
        label: hasRedirect ? 'http redirect' : 'plain http',
        line: listen.line,
        message: hasRedirect
          ? `Listen ${listen.value} accepts HTTP and a port 80 VirtualHost appears to redirect.`
          : `Listen ${listen.value} accepts plain HTTP without an obvious redirect rule.`,
      });
    }
  }
  for (const vh of virtualHosts) {
    const hasSsl = Object.prototype.hasOwnProperty.call(vh.directives, 'sslcertificatefile');
    if (/\b443\b/.test(vh.arg) && !hasSsl) {
      issues.push({
        severity: 'warning',
        label: 'tls cert',
        line: vh.line,
        message: `VirtualHost ${vh.arg} listens on 443 but no SSLCertificateFile was found in the block.`,
      });
    }
    const proxy = vh.directiveEntries.find((entry) => entry.keyLower === 'proxypass');
    if (proxy && /^http:\/\//i.test(proxy.value)) {
      issues.push({
        severity: 'info',
        label: 'proxy cleartext',
        line: proxy.line,
        message: `ProxyPass target ${proxy.value} uses cleartext HTTP; confirm it is local or trusted.`,
      });
    }
  }
  for (const block of blocks) {
    const options = block.directives.options?.value || '';
    if (/\bIndexes\b/i.test(options)) {
      issues.push({
        severity: 'warning',
        label: 'directory listing',
        line: block.directives.options.line,
        message: `${block.type} ${block.arg} enables Indexes; directory listings may be exposed.`,
      });
    }
    const allowOverride = block.directives.allowoverride?.value || '';
    if (/^all$/i.test(allowOverride)) {
      issues.push({
        severity: 'info',
        label: 'htaccess',
        line: block.directives.allowoverride.line,
        message: `${block.type} ${block.arg} allows .htaccess overrides; review delegated configuration risk.`,
      });
    }
    const require = block.directives.require?.value || '';
    if (/^all\s+granted$/i.test(require)) {
      issues.push({
        severity: 'info',
        label: 'public access',
        line: block.directives.require.line,
        message: `${block.type} ${block.arg} grants access to all clients.`,
      });
    }
  }
  return issues;
}

function highlightApacheLine(line) {
  const escaped = esc(line);
  if (/^\s*#/.test(line)) return `<span class="apachecfg-source-comment">${escaped}</span>`;
  return escaped
    .replace(/^(\s*<\/?\w+)/, '<span class="apachecfg-source-key">$1</span>')
    .replace(/^(\s*\w+)/, '<span class="apachecfg-source-key">$1</span>');
}

export function render(intake) {
  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'apachecfg-doc';

  const text = intake.text || '';
  const { global: g, virtualHosts, blocks, rewriteEngines, rewriteRules, sslCertFiles } = parseApache(text);
  const issues = collectIssues({ global: g, virtualHosts, blocks });

  // Summary line
  const summaryParts = [];
  if (virtualHosts.length) summaryParts.push(`${virtualHosts.length} virtual host${virtualHosts.length !== 1 ? 's' : ''}`);
  if (g.loadModules.length) summaryParts.push(`${g.loadModules.length} module${g.loadModules.length !== 1 ? 's' : ''} loaded`);
  if (rewriteRules) summaryParts.push(`${rewriteRules} rewrite rule${rewriteRules !== 1 ? 's' : ''}`);
  if (sslCertFiles) summaryParts.push('SSL enabled');
  const summary = summaryParts.join(' · ') || 'Apache HTTP Server configuration';

  // Global info card
  const globalKvs = [];
  if (g.serverRoot) globalKvs.push(kv('ServerRoot', g.serverRoot));
  if (g.serverName) globalKvs.push(kv('ServerName', g.serverName));
  if (g.serverAdmin) globalKvs.push(kv('ServerAdmin', g.serverAdmin));
  if (g.documentRoot) globalKvs.push(kv('DocumentRoot', g.documentRoot));
  if (g.listens.length) globalKvs.push(`<div class="apachecfg-kv"><span class="apachecfg-kv-key">Listen</span><span class="apachecfg-kv-val">${g.listens.map((entry) => `<span class="apachecfg-chip">${lineButton(entry.value, entry.line, 'listen')}</span>`).join('')}</span></div>`);
  if (g.loadModules.length) globalKvs.push(`<div class="apachecfg-kv"><span class="apachecfg-kv-key">${lineButton('LoadModule', g.loadModules[0].line, 'loadmodule')}</span><span class="apachecfg-kv-val">${g.loadModules.length} module${g.loadModules.length !== 1 ? 's' : ''}</span></div>`);
  if (rewriteRules) globalKvs.push(`<div class="apachecfg-kv"><span class="apachecfg-kv-key">RewriteRule</span><span class="apachecfg-kv-val">${rewriteRules} rule${rewriteRules !== 1 ? 's' : ''}</span></div>`);
  const globalHtml = globalKvs.length
    ? `<div class="apachecfg-sec"><h3>Global</h3><div class="apachecfg-card">${globalKvs.join('')}</div></div>`
    : '';

  // VirtualHost section
  const vhostHtml = virtualHosts.length
    ? `<div class="apachecfg-sec">
  <h3>VirtualHost</h3>
  ${virtualHosts.map((vh) => {
    const ssl = 'sslcertificatefile' in vh.directives;
    const serverName = vh.directives['servername'] || null;
    const docRoot = vh.directives['documentroot'] || null;
    const kvs = [];
    if (serverName) kvs.push(kv('ServerName', serverName));
    if (docRoot) kvs.push(kv('DocumentRoot', docRoot));
    if (vh.directives['proxypass']) kvs.push(kv('ProxyPass', vh.directives['proxypass']));
    return `<div class="apachecfg-card">
      <div class="apachecfg-card-label"><span class="apachecfg-block-name">${lineButton(vh.arg, vh.line, 'virtualhost')}</span>${ssl ? `<span class="apachecfg-ssl">${lineButton('SSL', vh.directives.sslcertificatefile.line, 'sslcertificatefile')}</span>` : ''}</div>
      ${kvs.join('') || '<span style="color:var(--fg-2,#888);font-size:12px;">No directives</span>'}
    </div>`;
  }).join('')}
</div>`
    : '';

  // Directory/Location/Files blocks
  const blocksHtml = blocks.length
    ? `<div class="apachecfg-sec">
  <h3>Directory / Location / Files</h3>
  <table class="apachecfg-table">
    <thead><tr><th>Type</th><th>Path</th><th>Key Directives</th></tr></thead>
    <tbody>${blocks.map((b) => {
      const keyDirs = Object.entries(b.directives)
        .filter(([k]) => ['require', 'allowoverride', 'options', 'authtype', 'proxypass'].includes(k))
        .map(([k, v]) => `<span class="apachecfg-chip">${lineButton(k, v.line, k)}</span>`)
        .join('');
      return `<tr>
        <td>${lineButton(b.type, b.line, b.type)}</td>
        <td>${esc(b.arg || '—')}</td>
        <td>${keyDirs || '<span style="color:var(--fg-2,#888);">—</span>'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>
</div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="apachecfg-title"><span class="apachecfg-badge">Apache</span>Apache Config</div>
<div class="apachecfg-sub">${esc(summary)}</div>
${globalHtml}
${vhostHtml}
${blocksHtml}`;
  const review = issueList(issues, { title: 'Apache Review' });
  if (review) host.insertBefore(review, host.querySelector('.apachecfg-sec'));
  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'apache-line', highlighter: highlightApacheLine }));
  wireSourceLinks(host, { idPrefix: 'apache-line' });

  return { parentNode: host };
}
