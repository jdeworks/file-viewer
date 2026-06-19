import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kong-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-kong{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0b5fff;color:#fff;vertical-align:middle;margin-right:8px;}
.kong-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.kong-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.kong-sec{margin:14px 0;}
.kong-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.kong-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.kong-card-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px;}
.kong-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.kong-kv-k{color:var(--fg-2,#888);min-width:120px;}
.kong-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.kong-pills{display:flex;flex-wrap:wrap;gap:6px;}
.kong-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.kong-pill.plugin{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.kong-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;margin-left:4px;}
.kong-tag.dbless{background:#dcfce7;border-color:#86efac;color:#166534;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="kong-kv"><span class="kong-kv-k">${esc(label)}</span><span class="kong-kv-v">${esc(value)}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  // Format version / environment
  const formatVersion = cfg._format_version || cfg.format_version || '';
  const env = cfg._transform || '';

  // Database mode
  const dbMode = cfg.database || '';
  const isDbless = dbMode === 'off' || !dbMode;

  // Services
  const services = Array.isArray(cfg.services) ? cfg.services : [];

  const servicesHtml = services.length ? `
<div class="kong-sec"><h3>Services (${services.length})</h3>
${services.slice(0, 8).map((svc) => {
    const routes = Array.isArray(svc.routes) ? svc.routes : [];
    const plugins = Array.isArray(svc.plugins) ? svc.plugins : [];
    const url = svc.url || (svc.host ? `${svc.protocol || 'http'}://${svc.host}${svc.port ? ':' + svc.port : ''}${svc.path || ''}` : '');
    const routesSummary = routes.map((r) => {
      const paths = Array.isArray(r.paths) ? r.paths : [];
      const hosts = Array.isArray(r.hosts) ? r.hosts : [];
      return paths.length ? paths[0] : (hosts.length ? hosts[0] : '(route)');
    }).slice(0, 3).join(', ');
    return `<div class="kong-card">
<div class="kong-card-name">${esc(svc.name || '(unnamed)')}</div>
${url ? kv('url', url) : ''}
${routes.length ? `<div class="kong-kv"><span class="kong-kv-k">routes (${routes.length})</span><span class="kong-kv-v">${esc(routesSummary)}${routes.length > 3 ? ' …' : ''}</span></div>` : ''}
${plugins.length ? `<div class="kong-kv"><span class="kong-kv-k">plugins</span><span class="kong-pills">${plugins.map((p) => `<span class="kong-pill plugin">${esc(p.name)}</span>`).join('')}</span></div>` : ''}
</div>`;
  }).join('')}
${services.length > 8 ? `<div style="font-size:12px;color:var(--fg-2,#888);padding:4px 0">…and ${services.length - 8} more services</div>` : ''}
</div>` : '';

  // Global plugins
  const globalPlugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];
  const globalPluginsHtml = globalPlugins.length ? `
<div class="kong-sec"><h3>Global Plugins (${globalPlugins.length})</h3>
<div class="kong-pills">${globalPlugins.map((p) => `<span class="kong-pill plugin">${esc(p.name)}</span>`).join('')}</div>
</div>` : '';

  // Upstreams
  const upstreams = Array.isArray(cfg.upstreams) ? cfg.upstreams : [];
  const upstreamsHtml = upstreams.length ? `
<div class="kong-sec"><h3>Upstreams (${upstreams.length})</h3>
<div class="kong-pills">${upstreams.map((u) => {
    const targets = Array.isArray(u.targets) ? u.targets.length : 0;
    return `<span class="kong-pill">${esc(u.name)}${targets ? ` (${targets})` : ''}</span>`;
  }).join('')}</div>
</div>` : '';

  // Consumers
  const consumers = Array.isArray(cfg.consumers) ? cfg.consumers : [];
  const consumersHtml = consumers.length ? `
<div class="kong-sec"><h3>Consumers (${consumers.length})</h3>
<div class="kong-pills">${consumers.slice(0, 10).map((c) => `<span class="kong-pill">${esc(c.username || c.custom_id || '?')}</span>`).join('')}${consumers.length > 10 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${consumers.length - 10} more</span>` : ''}</div>
</div>` : '';

  const totalRoutes = services.reduce((n, s) => n + (Array.isArray(s.routes) ? s.routes.length : 0), 0);
  const subParts = [
    services.length ? `${services.length} service${services.length !== 1 ? 's' : ''}` : '',
    totalRoutes ? `${totalRoutes} route${totalRoutes !== 1 ? 's' : ''}` : '',
    isDbless ? 'DB-less' : `db: ${dbMode}`,
    formatVersion ? `v${formatVersion}` : '',
  ].filter(Boolean);
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  host.className = 'kong-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-kong">Kong</span>
  <span class="kong-title">Gateway Configuration</span>
  ${isDbless ? '<span class="kong-tag dbless">DB-less</span>' : (dbMode ? `<span class="kong-tag">${esc(dbMode)}</span>` : '')}
  ${formatVersion ? `<span class="kong-tag">v${esc(formatVersion)}</span>` : ''}
</div>
<div class="kong-sub">${esc(sub)}</div>
${servicesHtml}${globalPluginsHtml}${upstreamsHtml}${consumersHtml}`;
  return { parentNode: host };
}
