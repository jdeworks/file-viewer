import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mdk-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-mdk{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#526CFE;color:#fff;vertical-align:middle;margin-right:8px;}
.mdk-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mdk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.mdk-sec{margin:12px 0;}
.mdk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.mdk-pills{display:flex;flex-wrap:wrap;gap:6px;}
.mdk-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.mdk-pill.plugin{background:#eef2ff;border-color:#a5b4fc;color:#3730a3;}
.mdk-pill.ext{background:#f0fdf4;border-color:#86efac;color:#166534;}
.mdk-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px;margin:4px 0;}
.mdk-kv dt{font-weight:600;white-space:nowrap;}
.mdk-kv dd{margin:0;color:var(--fg-2,#555);}
.mdk-nav{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px;}
.mdk-nav-item{display:flex;align-items:baseline;gap:8px;font-size:12px;padding:4px 8px;border-radius:4px;background:var(--bg-2,#f6f8fa);}
.mdk-nav-label{font-weight:600;}
.mdk-nav-count{color:var(--fg-2,#888);font-size:11px;}
`;

function countNavPages(navSection) {
  if (!navSection) return 0;
  if (typeof navSection === 'string') return 1;
  if (Array.isArray(navSection)) {
    return navSection.reduce((sum, item) => sum + countNavPages(item), 0);
  }
  if (typeof navSection === 'object') {
    return Object.values(navSection).reduce((sum, v) => sum + countNavPages(v), 0);
  }
  return 0;
}

function getNavFirstLevel(nav) {
  if (!Array.isArray(nav)) return [];
  return nav.map((item) => {
    if (typeof item === 'string') return { label: item, pages: 1 };
    if (typeof item === 'object' && item !== null) {
      const key = Object.keys(item)[0];
      const val = item[key];
      return { label: key, pages: countNavPages(val) };
    }
    return null;
  }).filter(Boolean);
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const siteName = cfg.site_name;
  const siteUrl = cfg.site_url;
  const docsDir = cfg.docs_dir || 'docs';
  const theme = cfg.theme;
  const themeName = typeof theme === 'string' ? theme : (theme && typeof theme === 'object' ? theme.name : null);
  const nav = cfg.nav;
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins.map((p) => (typeof p === 'string' ? p : Object.keys(p)[0])) : [];
  const mdExtensions = Array.isArray(cfg.markdown_extensions) ? cfg.markdown_extensions.map((e) => (typeof e === 'string' ? e : Object.keys(e)[0])) : [];

  const infoHtml = `<div class="mdk-sec"><h3>Site Info</h3><dl class="mdk-kv">
    ${siteName ? `<dt>Site Name</dt><dd>${esc(siteName)}</dd>` : ''}
    ${siteUrl ? `<dt>Site URL</dt><dd>${esc(siteUrl)}</dd>` : ''}
    ${themeName ? `<dt>Theme</dt><dd>${esc(themeName)}</dd>` : ''}
    ${docsDir ? `<dt>Docs Dir</dt><dd>${esc(docsDir)}</dd>` : ''}
  </dl></div>`;

  const navItems = getNavFirstLevel(nav);
  const totalPages = navItems.reduce((sum, i) => sum + i.pages, 0);
  const navHtml = navItems.length
    ? `<div class="mdk-sec"><h3>Navigation (${navItems.length} sections, ${totalPages} pages)</h3><ul class="mdk-nav">${navItems.map((item) => `<li class="mdk-nav-item"><span class="mdk-nav-label">${esc(item.label)}</span><span class="mdk-nav-count">${item.pages} page${item.pages !== 1 ? 's' : ''}</span></li>`).join('')}</ul></div>`
    : '';

  const pluginsHtml = plugins.length
    ? `<div class="mdk-sec"><h3>Plugins (${plugins.length})</h3><div class="mdk-pills">${plugins.map((p) => `<span class="mdk-pill plugin">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const extHtml = mdExtensions.length
    ? `<div class="mdk-sec"><h3>Markdown Extensions (${mdExtensions.length})</h3><div class="mdk-pills">${mdExtensions.map((e) => `<span class="mdk-pill ext">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const sub = [siteName || '', themeName ? `theme: ${themeName}` : '', navItems.length ? `${navItems.length} nav sections` : ''].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'mdk-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mdk-title"><span class="badge-mdk">MkDocs</span>Documentation config</div>
<div class="mdk-sub">${esc(sub)}</div>
${infoHtml}${navHtml}${pluginsHtml}${extHtml}`;
  return { parentNode: host };
}
