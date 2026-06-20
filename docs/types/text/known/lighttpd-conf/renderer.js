const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lighty-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.lighty-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#333;color:#fff;vertical-align:middle;margin-right:8px;}
.lighty-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.lighty-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.lighty-sec{margin:12px 0;}
.lighty-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.lighty-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.lighty-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.lighty-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.lighty-kv-k{color:var(--fg-2,#888);min-width:130px;font-family:ui-monospace,monospace;font-size:12px;}
.lighty-kv-v{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.lighty-table{width:100%;border-collapse:collapse;font-size:13px;}
.lighty-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.lighty-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.lighty-ssl-on{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;background:#dcfce7;color:#15803d;font-weight:700;}
.lighty-ssl-off{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);}
`;

/**
 * Parse a lighttpd config value — strips surrounding quotes.
 */
function stripQuotes(s) {
  return s.trim().replace(/^["']|["']$/g, '');
}

/**
 * Parse a lighttpd array value like ( "mod_access", "mod_alias" )
 * Returns an array of unquoted string values.
 */
function parseArray(s) {
  const items = [];
  const re = /["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(s)) !== null) items.push(m[1]);
  return items;
}

function parseLighttpd(text) {
  const config = {
    port: null,
    bind: null,
    documentRoot: null,
    uploadDirs: [],
    modules: [],
    sslEnabled: false,
    sslPemfile: null,
    sslCaFile: null,
    rewriteCount: 0,
    fastcgiBackends: [],
    proxyBackends: [],
    mimetypeCount: 0,
  };

  // Normalize multi-line arrays by collapsing them
  const normalized = text.replace(/\(\s*\n([\s\S]*?)\)/g, (_, inner) => {
    return '(' + inner.replace(/\n/g, ' ') + ')';
  });

  const lines = normalized.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // server.port = 80
    const portMatch = /^server\.port\s*=\s*(\d+)/.exec(line);
    if (portMatch) { config.port = portMatch[1]; continue; }

    // server.bind = "0.0.0.0"
    const bindMatch = /^server\.bind\s*=\s*(.+)$/.exec(line);
    if (bindMatch) { config.bind = stripQuotes(bindMatch[1]); continue; }

    // server.document-root = "/var/www/html"
    const docRootMatch = /^server\.document-root\s*=\s*(.+)$/.exec(line);
    if (docRootMatch) { config.documentRoot = stripQuotes(docRootMatch[1]); continue; }

    // server.modules = ( "mod_access", ... )
    const modulesMatch = /^server\.modules\s*=\s*\(([^)]*)\)/.exec(line);
    if (modulesMatch) { config.modules = parseArray(modulesMatch[1]); continue; }

    // ssl.engine = "enable"
    const sslEngineMatch = /^ssl\.engine\s*=\s*["']?(\w+)["']?/.exec(line);
    if (sslEngineMatch) { config.sslEnabled = sslEngineMatch[1] === 'enable'; continue; }

    // ssl.pemfile = "..."
    const sslPemMatch = /^ssl\.pemfile\s*=\s*(.+)$/.exec(line);
    if (sslPemMatch) { config.sslPemfile = stripQuotes(sslPemMatch[1]); continue; }

    // ssl.ca-file = "..."
    const sslCaMatch = /^ssl\.ca-file\s*=\s*(.+)$/.exec(line);
    if (sslCaMatch) { config.sslCaFile = stripQuotes(sslCaMatch[1]); continue; }

    // url.rewrite-once or url.redirect — count entries
    if (/^url\.(rewrite-once|rewrite-final|redirect)\s*=\s*\(/.test(line)) {
      const arrMatch = /\(([^)]*)\)/.exec(line);
      if (arrMatch) {
        // Count => patterns
        const count = (arrMatch[1].match(/=>/g) || []).length;
        config.rewriteCount += count;
      }
      continue;
    }

    // fastcgi.server
    if (/^fastcgi\.server\s*=\s*\(/.test(line)) {
      const hostMatch = /["']host["']\s*=>\s*["']([^"']+)["']/.exec(line);
      const portMatch2 = /["']port["']\s*=>\s*(\d+)/.exec(line);
      if (hostMatch || portMatch2) {
        config.fastcgiBackends.push({
          host: hostMatch ? hostMatch[1] : '127.0.0.1',
          port: portMatch2 ? portMatch2[1] : '—',
        });
      }
      continue;
    }

    // proxy.server
    if (/^proxy\.server\s*=\s*\(/.test(line)) {
      const hostMatch = /["']host["']\s*=>\s*["']([^"']+)["']/.exec(line);
      const portMatch2 = /["']port["']\s*=>\s*(\d+)/.exec(line);
      if (hostMatch || portMatch2) {
        config.proxyBackends.push({
          host: hostMatch ? hostMatch[1] : '127.0.0.1',
          port: portMatch2 ? portMatch2[1] : '—',
        });
      }
      continue;
    }

    // mimetype.assign — count entries
    if (/^mimetype\.assign\s*=\s*\(/.test(line)) {
      const arrMatch = /\(([^)]*)\)/.exec(line);
      if (arrMatch) {
        config.mimetypeCount = (arrMatch[1].match(/=>/g) || []).length;
      }
      continue;
    }
  }

  return config;
}

export function render(intake) {
  const text = intake.text || '';
  const cfg = parseLighttpd(text);

  const host = document.createElement('div');
  host.className = 'lighty-doc';

  // Summary parts
  const parts = [];
  if (cfg.port) parts.push(`port ${cfg.port}`);
  if (cfg.modules.length) parts.push(`${cfg.modules.length} module${cfg.modules.length !== 1 ? 's' : ''}`);
  if (cfg.sslEnabled) parts.push('SSL');
  if (cfg.fastcgiBackends.length) parts.push(`${cfg.fastcgiBackends.length} FastCGI backend${cfg.fastcgiBackends.length !== 1 ? 's' : ''}`);
  const summary = parts.join(' · ') || 'Lighttpd configuration';

  // Server card
  const sslBadge = cfg.sslEnabled
    ? `<span class="lighty-ssl-on">SSL on</span>`
    : `<span class="lighty-ssl-off">SSL off</span>`;

  const serverRows = [
    cfg.port ? `<div class="lighty-kv"><span class="lighty-kv-k">server.port</span><span class="lighty-kv-v">${esc(cfg.port)}</span></div>` : '',
    cfg.bind ? `<div class="lighty-kv"><span class="lighty-kv-k">server.bind</span><span class="lighty-kv-v">${esc(cfg.bind)}</span></div>` : '',
    cfg.documentRoot ? `<div class="lighty-kv"><span class="lighty-kv-k">document-root</span><span class="lighty-kv-v">${esc(cfg.documentRoot)}</span></div>` : '',
    `<div class="lighty-kv"><span class="lighty-kv-k">SSL</span><span class="lighty-kv-v">${sslBadge}${cfg.sslPemfile ? ` <span style="font-size:11px;color:var(--fg-2,#888);">${esc(cfg.sslPemfile)}</span>` : ''}</span></div>`,
  ].filter(Boolean).join('');

  const serverCardHtml = `<div class="lighty-sec">
  <h3>Server</h3>
  <div class="lighty-card">${serverRows}</div>
</div>`;

  // Modules
  const modulesHtml = cfg.modules.length ? `<div class="lighty-sec">
  <h3>Modules</h3>
  <div class="lighty-card">
    ${cfg.modules.map((m) => `<span class="lighty-chip">${esc(m)}</span>`).join('')}
  </div>
</div>` : '';

  // FastCGI / Proxy backends
  const backendsHtml = (cfg.fastcgiBackends.length || cfg.proxyBackends.length) ? `<div class="lighty-sec">
  <h3>Backends</h3>
  <table class="lighty-table">
    <thead><tr><th>Type</th><th>Host</th><th>Port</th></tr></thead>
    <tbody>
      ${cfg.fastcgiBackends.map((b) => `<tr>
        <td><span class="lighty-chip">FastCGI</span></td>
        <td>${esc(b.host)}</td>
        <td>${esc(b.port)}</td>
      </tr>`).join('')}
      ${cfg.proxyBackends.map((b) => `<tr>
        <td><span class="lighty-chip">Proxy</span></td>
        <td>${esc(b.host)}</td>
        <td>${esc(b.port)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : '';

  // URL rewrites
  const rewritesHtml = cfg.rewriteCount ? `<div class="lighty-sec">
  <h3>URL Rewrites</h3>
  <div class="lighty-card" style="font-size:13px;">${cfg.rewriteCount} rewrite rule${cfg.rewriteCount !== 1 ? 's' : ''} defined</div>
</div>` : '';

  // MIME types
  const mimetypeHtml = cfg.mimetypeCount ? `<div class="lighty-sec">
  <h3>MIME Types</h3>
  <div class="lighty-card" style="font-size:13px;">${cfg.mimetypeCount} MIME type${cfg.mimetypeCount !== 1 ? 's' : ''} assigned</div>
</div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="lighty-title"><span class="lighty-badge">⚡ Lighttpd</span>Lighttpd Config</div>
<div class="lighty-sub">${esc(summary)}</div>
${serverCardHtml}
${modulesHtml}
${backendsHtml}
${rewritesHtml}
${mimetypeHtml}`;

  return { parentNode: host };
}
