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
`;

function parseApache(text) {
  const lines = text.split('\n');

  // Global directives (outside of any block)
  const global = {
    serverName: null,
    serverAdmin: null,
    documentRoot: null,
    serverRoot: null,
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

  for (const rawLine of lines) {
    const line = rawLine.trim().replace(/#.*$/, '').trim();
    if (!line) continue;

    // Opening tag: <VirtualHost *:80>, <Directory "/path">, etc.
    const openMatch = /^<(\w+)\s*(.*)>$/.exec(line);
    // Closing tag: </VirtualHost>
    const closeMatch = /^<\/(\w+)>$/.exec(line);

    if (openMatch) {
      const tagName = openMatch[1];
      const tagArg = openMatch[2].trim().replace(/^["']|["']$/g, '');
      const block = { type: tagName, arg: tagArg, directives: {} };
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
      if (dirLower === 'servername') global.serverName = value;
      else if (dirLower === 'serveradmin') global.serverAdmin = value;
      else if (dirLower === 'documentroot') global.documentRoot = value;
      else if (dirLower === 'serverroot') global.serverRoot = value;
      else if (dirLower === 'loadmodule') global.loadModules.push(value);
    } else {
      // Inside a block
      if (currentBlock) {
        currentBlock.directives[dirLower] = value;
      }
    }

    // Count rewrites and SSL globally regardless of context
    if (dirLower === 'rewriteengine' && /on/i.test(value)) rewriteEngines++;
    if (dirLower === 'rewriterule') rewriteRules++;
    if (dirLower === 'sslcertificatefile') sslCertFiles++;
  }

  return { global, virtualHosts, blocks, rewriteEngines, rewriteRules, sslCertFiles };
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'apachecfg-doc';

  const text = intake.text || '';
  const { global: g, virtualHosts, blocks, rewriteEngines, rewriteRules, sslCertFiles } = parseApache(text);

  // Summary line
  const summaryParts = [];
  if (virtualHosts.length) summaryParts.push(`${virtualHosts.length} virtual host${virtualHosts.length !== 1 ? 's' : ''}`);
  if (g.loadModules.length) summaryParts.push(`${g.loadModules.length} module${g.loadModules.length !== 1 ? 's' : ''} loaded`);
  if (rewriteRules) summaryParts.push(`${rewriteRules} rewrite rule${rewriteRules !== 1 ? 's' : ''}`);
  if (sslCertFiles) summaryParts.push('SSL enabled');
  const summary = summaryParts.join(' · ') || 'Apache HTTP Server configuration';

  // Global info card
  const globalKvs = [];
  if (g.serverRoot) globalKvs.push(`<div class="apachecfg-kv"><span class="apachecfg-kv-key">ServerRoot</span><span class="apachecfg-kv-val">${esc(g.serverRoot)}</span></div>`);
  if (g.serverName) globalKvs.push(`<div class="apachecfg-kv"><span class="apachecfg-kv-key">ServerName</span><span class="apachecfg-kv-val">${esc(g.serverName)}</span></div>`);
  if (g.serverAdmin) globalKvs.push(`<div class="apachecfg-kv"><span class="apachecfg-kv-key">ServerAdmin</span><span class="apachecfg-kv-val">${esc(g.serverAdmin)}</span></div>`);
  if (g.documentRoot) globalKvs.push(`<div class="apachecfg-kv"><span class="apachecfg-kv-key">DocumentRoot</span><span class="apachecfg-kv-val">${esc(g.documentRoot)}</span></div>`);
  if (g.loadModules.length) globalKvs.push(`<div class="apachecfg-kv"><span class="apachecfg-kv-key">LoadModule</span><span class="apachecfg-kv-val">${g.loadModules.length} module${g.loadModules.length !== 1 ? 's' : ''}</span></div>`);
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
    if (serverName) kvs.push(`<div class="apachecfg-kv"><span class="apachecfg-kv-key">ServerName</span><span class="apachecfg-kv-val">${esc(serverName)}</span></div>`);
    if (docRoot) kvs.push(`<div class="apachecfg-kv"><span class="apachecfg-kv-key">DocumentRoot</span><span class="apachecfg-kv-val">${esc(docRoot)}</span></div>`);
    return `<div class="apachecfg-card">
      <div class="apachecfg-card-label"><span class="apachecfg-block-name">${esc(vh.arg)}</span>${ssl ? '<span class="apachecfg-ssl">SSL</span>' : ''}</div>
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
        .map(([k, v]) => `<span class="apachecfg-chip">${esc(k)}</span>`)
        .join('');
      return `<tr>
        <td>${esc(b.type)}</td>
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

  return { parentNode: host };
}
