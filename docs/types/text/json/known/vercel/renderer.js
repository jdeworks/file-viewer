const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { /* malformed JSON */ }

  const framework = cfg.framework || null;
  const version = cfg.version || null;
  const builds = Array.isArray(cfg.builds) ? cfg.builds : [];
  const routes = Array.isArray(cfg.routes) ? cfg.routes : [];
  const rewrites = Array.isArray(cfg.rewrites) ? cfg.rewrites : [];
  const redirects = Array.isArray(cfg.redirects) ? cfg.redirects : [];
  const headers = Array.isArray(cfg.headers) ? cfg.headers : [];
  const regions = Array.isArray(cfg.regions) ? cfg.regions : (cfg.regions ? [cfg.regions] : []);
  const envKeys = cfg.env ? Object.keys(cfg.env) : [];
  const buildEnvKeys = cfg.build?.env ? Object.keys(cfg.build.env) : [];
  const outputDir = cfg.outputDirectory || cfg.distDir || null;
  const installCmd = cfg.installCommand || null;
  const buildCmd = cfg.buildCommand || null;
  const devCmd = cfg.devCommand || null;
  const functions = cfg.functions ? Object.keys(cfg.functions) : [];

  let html = `<style>
.vcl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif}
.badge-vercel{display:inline-block;background:#000;color:#fff;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;margin-bottom:10px}
.vcl-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0 12px}
.vcl-key{color:var(--fg-2);font-size:12px}
.vcl-val{font:12px ui-monospace,monospace;color:var(--accent)}
.vcl-sec{margin:12px 0}
.vcl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2);margin:0 0 4px}
.vcl-pill{display:inline-block;background:var(--bg-3);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;margin:2px}
.vcl-route{font:11px ui-monospace,monospace;padding:2px 0;border-bottom:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap}
.vcl-route-src{color:var(--accent)}
.vcl-route-dst{color:var(--fg-2)}
</style>
<div class="vcl-doc">
<span class="badge-vercel">▲ Vercel Config</span>
<div class="vcl-grid">
${framework ? `<span class="vcl-key">Framework</span><span class="vcl-val">${esc(framework)}</span>` : ''}
${version ? `<span class="vcl-key">Schema version</span><span class="vcl-val">${esc(String(version))}</span>` : ''}
${buildCmd ? `<span class="vcl-key">Build command</span><span class="vcl-val">${esc(buildCmd)}</span>` : ''}
${installCmd ? `<span class="vcl-key">Install command</span><span class="vcl-val">${esc(installCmd)}</span>` : ''}
${outputDir ? `<span class="vcl-key">Output dir</span><span class="vcl-val">${esc(outputDir)}</span>` : ''}
${devCmd ? `<span class="vcl-key">Dev command</span><span class="vcl-val">${esc(devCmd)}</span>` : ''}
${regions.length ? `<span class="vcl-key">Regions</span><span class="vcl-val">${esc(regions.join(', '))}</span>` : ''}
${routes.length ? `<span class="vcl-key">Routes</span><span class="vcl-val">${routes.length}</span>` : ''}
${rewrites.length ? `<span class="vcl-key">Rewrites</span><span class="vcl-val">${rewrites.length}</span>` : ''}
${redirects.length ? `<span class="vcl-key">Redirects</span><span class="vcl-val">${redirects.length}</span>` : ''}
${headers.length ? `<span class="vcl-key">Custom headers</span><span class="vcl-val">${headers.length}</span>` : ''}
${builds.length ? `<span class="vcl-key">Build specs</span><span class="vcl-val">${builds.length}</span>` : ''}
</div>`;

  const allRoutes = [...rewrites.map((r) => ({ src: r.source, dst: r.destination, type: 'rewrite' })),
    ...redirects.map((r) => ({ src: r.source, dst: r.destination, type: 'redirect' })),
    ...routes.map((r) => ({ src: r.src, dst: r.dest, type: 'route' }))];
  if (allRoutes.length > 0) {
    html += `<div class="vcl-sec"><h3>Routes / Rewrites / Redirects</h3>`;
    html += allRoutes.slice(0, 12).map((r) => `<div class="vcl-route"><span class="vcl-route-src">${esc(r.src || r.source || '?')}</span><span>→</span><span class="vcl-route-dst">${esc(r.dst || r.destination || '?')}</span><span style="color:var(--fg-2);font-size:10px">[${r.type}]</span></div>`).join('');
    if (allRoutes.length > 12) html += `<div style="color:var(--fg-2);font-size:11px;margin-top:4px">+ ${allRoutes.length - 12} more</div>`;
    html += '</div>';
  }

  if (envKeys.length || buildEnvKeys.length) {
    html += `<div class="vcl-sec"><h3>Environment variables</h3>`;
    [...new Set([...envKeys, ...buildEnvKeys])].forEach((k) => { html += `<span class="vcl-pill">${esc(k)}</span>`; });
    html += '</div>';
  }

  if (functions.length) {
    html += `<div class="vcl-sec"><h3>Function overrides</h3>${functions.map((f) => `<span class="vcl-pill">${esc(f)}</span>`).join('')}</div>`;
  }

  html += '</div>';
  const host = document.createElement('div');
  host.innerHTML = html;
  return { parentNode: host };
}
