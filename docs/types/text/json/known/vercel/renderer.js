const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRET_RE = /secret|token|key|password|api/i;
function maskVal(k, v) {
  return SECRET_RE.test(k) ? '[configured]' : String(v == null ? '' : v).slice(0, 60);
}

const CSS = `
.verceljson-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.verceljson-doc .badge-vercel{display:inline-block;background:#000;color:#fff;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;margin-bottom:10px;}
.verceljson-doc .vcl-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0 12px;}
.verceljson-doc .vcl-key{color:var(--fg-2,#888);font-size:12px;}
.verceljson-doc .vcl-val{font:12px ui-monospace,monospace;color:var(--accent,#0070f3);word-break:break-all;}
.verceljson-doc .vcl-sec{margin:14px 0;}
.verceljson-doc .vcl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.verceljson-doc .vcl-pill{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;margin:2px;}
.verceljson-doc .vcl-table{width:100%;border-collapse:collapse;font-size:13px;}
.verceljson-doc .vcl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.verceljson-doc .vcl-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.verceljson-doc .vcl-src{color:var(--accent,#0070f3);}
.verceljson-doc .vcl-dst{color:var(--fg-2,#888);}
.verceljson-doc .vcl-badge{display:inline-block;background:var(--bg-3,#e8e8e8);color:var(--fg-2,#888);border-radius:3px;padding:0 5px;font-size:10px;margin-left:4px;vertical-align:middle;}
.verceljson-doc .vcl-masked{color:var(--fg-2,#888);font-style:italic;}
`;

function kv(key, val) {
  if (val == null || val === '') return '';
  return `<span class="vcl-key">${esc(key)}</span><span class="vcl-val">${esc(val)}</span>`;
}

export function render(intake) {
  const cfg = intake.parsed ?? (() => { try { return JSON.parse(intake.text || '{}'); } catch { return {}; } })();

  const framework = cfg.framework || null;
  const version = cfg.version || null;
  const buildCmd = cfg.buildCommand || null;
  const installCmd = cfg.installCommand || null;
  const outputDir = cfg.outputDirectory || cfg.distDir || null;
  const devCmd = cfg.devCommand || null;

  const rewrites = Array.isArray(cfg.rewrites) ? cfg.rewrites : [];
  const redirects = Array.isArray(cfg.redirects) ? cfg.redirects : [];
  const headers = Array.isArray(cfg.headers) ? cfg.headers : [];
  const regions = Array.isArray(cfg.regions) ? cfg.regions : (cfg.regions ? [cfg.regions] : []);
  const routes = Array.isArray(cfg.routes) ? cfg.routes : [];

  const allEnv = { ...(cfg.env || {}), ...(cfg.build?.env || {}) };
  const envEntries = Object.entries(allEnv);

  const functions = cfg.functions && typeof cfg.functions === 'object' ? Object.entries(cfg.functions) : [];

  const host = document.createElement('div');
  host.className = 'verceljson-doc';

  // header grid
  const gridLines = [
    version != null ? kv('Schema version', version) : '',
    framework ? kv('Framework', framework) : '',
    buildCmd ? kv('Build command', buildCmd) : '',
    installCmd ? kv('Install command', installCmd) : '',
    outputDir ? kv('Output directory', outputDir) : '',
    devCmd ? kv('Dev command', devCmd) : '',
    regions.length ? kv('Regions', regions.join(', ')) : '',
  ].filter(Boolean);

  // rewrites table
  const rewritesHtml = rewrites.length
    ? `<div class="vcl-sec"><h3>Rewrites (${rewrites.length})</h3><table class="vcl-table"><thead><tr><th>Source</th><th>Destination</th></tr></thead><tbody>${rewrites.slice(0, 12).map((r) => `<tr><td class="vcl-src">${esc(r.source || r.src || '?')}</td><td class="vcl-dst">${esc(r.destination || r.dest || '?')}</td></tr>`).join('')}${rewrites.length > 12 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:11px">+${rewrites.length - 12} more</td></tr>` : ''}</tbody></table></div>`
    : '';

  // redirects table
  const redirectsHtml = redirects.length
    ? `<div class="vcl-sec"><h3>Redirects (${redirects.length})</h3><table class="vcl-table"><thead><tr><th>Source</th><th>Destination</th><th>Status</th></tr></thead><tbody>${redirects.slice(0, 12).map((r) => {
        const status = r.statusCode || (r.permanent ? '308' : '307');
        return `<tr><td class="vcl-src">${esc(r.source || r.src || '?')}</td><td class="vcl-dst">${esc(r.destination || r.dest || '?')}</td><td>${esc(status)}</td></tr>`;
      }).join('')}${redirects.length > 12 ? `<tr><td colspan="3" style="color:var(--fg-2,#888);font-size:11px">+${redirects.length - 12} more</td></tr>` : ''}</tbody></table></div>`
    : '';

  // legacy routes
  const routesHtml = routes.length && !rewrites.length && !redirects.length
    ? `<div class="vcl-sec"><h3>Routes (${routes.length})</h3><table class="vcl-table"><thead><tr><th>Source</th><th>Destination</th></tr></thead><tbody>${routes.slice(0, 12).map((r) => `<tr><td class="vcl-src">${esc(r.src || '?')}</td><td class="vcl-dst">${esc(r.dest || '?')}</td></tr>`).join('')}${routes.length > 12 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:11px">+${routes.length - 12} more</td></tr>` : ''}</tbody></table></div>`
    : '';

  // headers list
  const headersHtml = headers.length
    ? `<div class="vcl-sec"><h3>Headers (${headers.length} rule${headers.length !== 1 ? 's' : ''})</h3>${headers.slice(0, 6).map((h) => {
        const hdrs = Array.isArray(h.headers) ? h.headers.map((hh) => `<span class="vcl-pill">${esc(hh.key)}</span>`).join('') : '';
        return `<div style="margin:4px 0;font-size:12px"><span class="vcl-src" style="font-family:ui-monospace,monospace">${esc(h.source || '?')}</span> ${hdrs}</div>`;
      }).join('')}${headers.length > 6 ? `<div style="color:var(--fg-2,#888);font-size:11px">+${headers.length - 6} more</div>` : ''}</div>`
    : '';

  // functions table
  const functionsHtml = functions.length
    ? `<div class="vcl-sec"><h3>Functions (${functions.length})</h3><table class="vcl-table"><thead><tr><th>Pattern</th><th>Max duration</th><th>Memory</th></tr></thead><tbody>${functions.map(([pattern, opts]) => {
        const dur = opts.maxDuration != null ? `${opts.maxDuration}s` : '—';
        const mem = opts.memory != null ? `${opts.memory} MB` : '—';
        return `<tr><td>${esc(pattern)}</td><td>${esc(dur)}</td><td>${esc(mem)}</td></tr>`;
      }).join('')}</tbody></table></div>`
    : '';

  // env vars with masking
  const envHtml = envEntries.length
    ? `<div class="vcl-sec"><h3>Environment variables (${envEntries.length})</h3><div style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0">${envEntries.map(([k, v]) => {
        const masked = SECRET_RE.test(k);
        const val = masked ? `<span class="vcl-masked">=[configured]</span>` : `=<span style="color:var(--fg-2,#888);font-size:11px">${esc(String(v).slice(0, 30))}</span>`;
        return `<span class="vcl-pill">${esc(k)}${val}</span>`;
      }).join('')}</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<span class="badge-vercel">▲ Vercel</span>
<div class="vcl-grid">${gridLines.join('')}</div>
${rewritesHtml}
${redirectsHtml}
${routesHtml}
${headersHtml}
${functionsHtml}
${envHtml}`;

  return { parentNode: host };
}
