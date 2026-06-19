const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cdf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-cdf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00ADE0;color:#fff;vertical-align:middle;margin-right:8px}
.cdf-title{font-size:18px;font-weight:700;margin:0 0 4px}
.cdf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.cdf-sec{margin:12px 0}
.cdf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.cdf-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px}
.cdf-addr{font:14px/1.4 ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f);margin-bottom:6px}
.cdf-directives{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.cdf-dir{font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.cdf-dir.proxy{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
.cdf-dir.tls{background:#f0fdf4;border-color:#86efac;color:#166534}
.cdf-dir.redir{background:#fff7ed;border-color:#fdba74;color:#9a3412}
.cdf-proxy-row{display:flex;align-items:center;gap:8px;font-size:12px;margin:3px 0;font-family:ui-monospace,monospace}
.cdf-proxy-label{color:var(--fg-2,#888);font-size:11px}
`;

const KEY_DIRECTIVES = new Set(['root', 'file_server', 'reverse_proxy', 'redir', 'handle', 'encode', 'header', 'tls', 'php_fastcgi', 'basicauth', 'log', 'respond', 'rewrite', 'try_files', 'push', 'templates']);

function parseCaddyfile(text) {
  const lines = text.split('\n');
  const sites = [];
  let depth = 0;
  let currentSite = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/#.*/g, '').trim();
    if (!line) continue;

    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;

    if (depth === 0 && opens > 0) {
      // Top-level site block opener: the address is the part before the {
      const addr = line.replace(/\s*\{.*$/, '').trim();
      if (addr) {
        currentSite = { addresses: addr.split(/\s+/).filter(Boolean), directives: [] };
        sites.push(currentSite);
      }
    } else if (depth === 1 && currentSite && !opens && !closes) {
      // Directive line inside site block
      const directive = line.split(/\s+/)[0];
      if (directive && KEY_DIRECTIVES.has(directive)) {
        const rest = line.slice(directive.length).trim();
        currentSite.directives.push({ name: directive, args: rest });
      }
    } else if (depth === 1 && currentSite && opens > 0) {
      // Sub-block directive (like handle { ... })
      const directive = line.split(/[\s{]/)[0];
      if (directive && KEY_DIRECTIVES.has(directive)) {
        const rest = line.slice(directive.length).replace(/\s*\{.*$/, '').trim();
        currentSite.directives.push({ name: directive, args: rest });
      }
    }

    depth += opens - closes;
    if (depth <= 0) {
      depth = 0;
      currentSite = null;
    }
  }

  return sites;
}

function dirClass(name) {
  if (name === 'reverse_proxy' || name === 'php_fastcgi') return 'proxy';
  if (name === 'tls') return 'tls';
  if (name === 'redir') return 'redir';
  return '';
}

export function render(intake) {
  const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : '');
  const sites = parseCaddyfile(text);

  const sub = `${sites.length} site${sites.length !== 1 ? 's' : ''}`;

  const siteCards = sites.map((site) => {
    const addrHtml = site.addresses.map((a) => `<div class="cdf-addr">${esc(a)}</div>`).join('');

    const proxyDirs = site.directives.filter((d) => d.name === 'reverse_proxy');
    const proxySummary = proxyDirs.length
      ? `<div style="margin-top:6px">${proxyDirs.map((d) => `<div class="cdf-proxy-row"><span class="cdf-proxy-label">reverse_proxy</span><span>${esc(d.args)}</span></div>`).join('')}</div>`
      : '';

    const otherDirs = site.directives.filter((d) => d.name !== 'reverse_proxy');
    const dirChips = otherDirs.map((d) => {
      const cls = dirClass(d.name);
      const label = d.args ? `${d.name} ${d.args.split(/\s+/)[0]}` : d.name;
      return `<span class="cdf-dir${cls ? ' ' + cls : ''}">${esc(label.length > 30 ? label.slice(0, 28) + '…' : label)}</span>`;
    }).join('');

    return `<div class="cdf-card">
  ${addrHtml}
  ${proxySummary}
  ${otherDirs.length ? `<div class="cdf-directives">${dirChips}</div>` : ''}
</div>`;
  }).join('');

  const noSites = !sites.length
    ? '<div style="color:var(--fg-2,#888);font-size:13px">No site blocks found — may be a global-options-only config.</div>'
    : '';

  const host = document.createElement('div');
  host.className = 'cdf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cdf-title"><span class="badge-cdf">Caddy</span>Caddyfile</div>
<div class="cdf-sub">${esc(sub)}</div>
<div class="cdf-sec"><h3>Sites</h3>${siteCards}${noSites}</div>`;
  return { parentNode: host };
}
