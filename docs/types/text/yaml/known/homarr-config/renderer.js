import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.homarr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-homarr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#fa5252;color:#fff;vertical-align:middle;margin-right:8px;}
.homarr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.homarr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.homarr-sec{margin:14px 0;}
.homarr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.homarr-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.homarr-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.homarr-kv-k{color:var(--fg-2,#888);min-width:110px;}
.homarr-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.homarr-apps-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px;margin-top:4px;}
.homarr-app-chip{border:1px solid var(--border,#e0e0e0);border-radius:7px;padding:5px 9px;background:var(--bg,#fff);font-size:12px;}
.homarr-app-name{font-weight:600;color:var(--fg,#24292f);}
.homarr-app-domain{font-size:11px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;word-break:break-all;}
.homarr-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.homarr-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.homarr-pill-widget{background:#fdf4ff;border-color:#e9d5ff;color:#6b21a8;}
.homarr-pill-integration{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="homarr-kv"><span class="homarr-kv-k">${esc(label)}</span><span class="homarr-kv-v">${esc(String(value))}</span></div>`;
}

function iconDomain(icon) {
  if (!icon) return '';
  try {
    // Try to extract a domain from URL-like icons
    const m = icon.match(/https?:\/\/([^/]+)/);
    if (m) return m[1];
    // /imgs/tools/plex.png → plex.png
    return icon.split('/').pop() || '';
  } catch { return ''; }
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const name = cfg.name || 'Homarr Dashboard';
  const background = cfg.background || '';
  const favicon = cfg.favicon || '';

  // Board section
  const boardItems = [
    kv('name', name),
    background ? kv('background', background) : '',
    favicon ? kv('favicon', favicon) : '',
  ].filter(Boolean).join('');
  const boardHtml = boardItems ? `<div class="homarr-sec"><h3>Board</h3><div class="homarr-card">${boardItems}</div></div>` : '';

  // Apps section
  const apps = Array.isArray(cfg.apps) ? cfg.apps : [];
  const first8 = apps.slice(0, 8);
  const appsHtml = apps.length ? `
<div class="homarr-sec"><h3>Apps (${apps.length})</h3>
<div class="homarr-apps-grid">
${first8.map((a) => {
  const domain = iconDomain(a.icon || '');
  return `<div class="homarr-app-chip">
<div class="homarr-app-name">${esc(a.name || '(unnamed)')}</div>
${domain ? `<div class="homarr-app-domain">${esc(domain)}</div>` : ''}
</div>`;
}).join('')}
${apps.length > 8 ? `<div class="homarr-app-chip" style="display:flex;align-items:center;justify-content:center;color:var(--fg-2,#888);font-size:11px;">+${apps.length - 8} more</div>` : ''}
</div></div>` : '';

  // Widgets section
  const widgets = Array.isArray(cfg.widgets) ? cfg.widgets : [];
  const widgetTypes = [...new Set(widgets.map((w) => w.type || '(unknown)').filter(Boolean))];
  const widgetsHtml = widgetTypes.length ? `
<div class="homarr-sec"><h3>Widgets</h3>
<div class="homarr-pills">${widgetTypes.map((t) => `<span class="homarr-pill homarr-pill-widget">${esc(t)}</span>`).join('')}</div>
</div>` : '';

  // Integrations — from apps that have integration.type
  const integrationTypes = [...new Set(
    apps
      .map((a) => a.integration?.type)
      .filter(Boolean)
  )];
  const integrationsHtml = integrationTypes.length ? `
<div class="homarr-sec"><h3>Integrations</h3>
<div class="homarr-pills">${integrationTypes.map((t) => `<span class="homarr-pill homarr-pill-integration">${esc(t)}</span>`).join('')}</div>
</div>` : '';

  // Sub-summary
  const subParts = [];
  if (apps.length) subParts.push(`${apps.length} app${apps.length !== 1 ? 's' : ''}`);
  if (widgets.length) subParts.push(`${widgets.length} widget${widgets.length !== 1 ? 's' : ''}`);
  if (integrationTypes.length) subParts.push(`${integrationTypes.length} integration${integrationTypes.length !== 1 ? 's' : ''}`);
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  host.className = 'homarr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-homarr">Homarr</span>
  <span class="homarr-title">${esc(name)}</span>
</div>
<div class="homarr-sub">${esc(sub)}</div>
${boardHtml}${appsHtml}${widgetsHtml}${integrationsHtml}`;
  return { parentNode: host };
}
