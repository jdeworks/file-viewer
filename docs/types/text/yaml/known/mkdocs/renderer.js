import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mkdocs-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-mkdocs{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#526cfe;color:#fff;vertical-align:middle;margin-right:8px;}
.mkdocs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mkdocs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.mkdocs-sec{margin:12px 0;}
.mkdocs-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.mkdocs-pills{display:flex;flex-wrap:wrap;gap:6px;}
.mkdocs-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.mkdocs-pill.plugin{background:#eef2ff;border-color:#a5b4fc;color:#3730a3;}
.mkdocs-pill.ext{background:#f0fdf4;border-color:#86efac;color:#166534;}
.mkdocs-pill.feature{background:#faf5ff;border-color:#d8b4fe;color:#6b21a8;}
.mkdocs-pill.scheme-light{background:#fffbeb;border-color:#fcd34d;color:#92400e;}
.mkdocs-pill.scheme-dark{background:#1e293b;border-color:#475569;color:#94a3b8;}
.mkdocs-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px;margin:4px 0;}
.mkdocs-kv dt{font-weight:600;white-space:nowrap;}
.mkdocs-kv dd{margin:0;color:var(--fg-2,#555);word-break:break-all;}
.mkdocs-nav{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px;}
.mkdocs-nav-item{display:flex;align-items:baseline;gap:8px;font-size:12px;padding:4px 8px;border-radius:4px;background:var(--bg-2,#f6f8fa);}
.mkdocs-nav-label{font-weight:600;}
.mkdocs-nav-count{color:var(--fg-2,#888);font-size:11px;}
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
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const siteName = cfg.site_name;
  const siteUrl = cfg.site_url;
  const repoUrl = cfg.repo_url;
  const siteAuthor = cfg.site_author;
  const theme = cfg.theme;
  const themeName = typeof theme === 'string' ? theme : (theme && typeof theme === 'object' ? theme.name : null);
  const nav = cfg.nav;
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins.map((p) => (typeof p === 'string' ? p : Object.keys(p)[0])) : [];
  const mdExtensions = Array.isArray(cfg.markdown_extensions) ? cfg.markdown_extensions.map((e) => (typeof e === 'string' ? e : Object.keys(e)[0])) : [];

  // Theme features and palette from theme object
  const themeFeatures = (theme && Array.isArray(theme.features)) ? theme.features : [];
  const themePalette = (theme && Array.isArray(theme.palette)) ? theme.palette : [];

  // Site identity card
  const shortRepo = repoUrl ? repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '') : null;
  const identityHtml = (siteUrl || shortRepo || siteAuthor) ? `<div class="mkdocs-sec"><h3>Site Identity</h3><dl class="mkdocs-kv">
    ${siteUrl ? `<dt>Site URL</dt><dd>${esc(siteUrl)}</dd>` : ''}
    ${shortRepo ? `<dt>Repo</dt><dd>${esc(shortRepo)}</dd>` : ''}
    ${siteAuthor ? `<dt>Author</dt><dd>${esc(siteAuthor)}</dd>` : ''}
  </dl></div>` : '';

  // Theme card
  const schemeChips = themePalette.map((p) => {
    const scheme = p && p.scheme ? p.scheme : null;
    if (!scheme) return '';
    const cls = scheme === 'slate' ? 'scheme-dark' : 'scheme-light';
    return `<span class="mkdocs-pill ${cls}">${esc(scheme)}</span>`;
  }).join('');

  const featureChips = themeFeatures.map((f) => `<span class="mkdocs-pill feature">${esc(f)}</span>`).join('');

  const themeHtml = themeName ? `<div class="mkdocs-sec"><h3>Theme</h3>
    <div class="mkdocs-pills" style="margin-bottom:6px"><span class="mkdocs-pill">${esc(themeName)}</span></div>
    ${schemeChips ? `<div class="mkdocs-pills" style="margin-bottom:4px">${schemeChips}</div>` : ''}
    ${featureChips ? `<div class="mkdocs-pills">${featureChips}</div>` : ''}
  </div>` : '';

  const navItems = getNavFirstLevel(nav);
  const totalPages = navItems.reduce((sum, i) => sum + i.pages, 0);
  const navHtml = navItems.length
    ? `<div class="mkdocs-sec"><h3>Navigation (${navItems.length} sections, ${totalPages} pages)</h3><ul class="mkdocs-nav">${navItems.map((item) => `<li class="mkdocs-nav-item"><span class="mkdocs-nav-label">${esc(item.label)}</span><span class="mkdocs-nav-count">${item.pages} page${item.pages !== 1 ? 's' : ''}</span></li>`).join('')}</ul></div>`
    : '';

  const pluginsHtml = plugins.length
    ? `<div class="mkdocs-sec"><h3>Plugins (${plugins.length})</h3><div class="mkdocs-pills">${plugins.map((p) => `<span class="mkdocs-pill plugin">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const extHtml = mdExtensions.length
    ? `<div class="mkdocs-sec"><h3>Markdown Extensions (${mdExtensions.length})</h3><div class="mkdocs-pills">${mdExtensions.map((e) => `<span class="mkdocs-pill ext">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const sub = [themeName ? `theme: ${themeName}` : '', navItems.length ? `${navItems.length} nav sections` : ''].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'mkdocs-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mkdocs-title"><span class="badge-mkdocs">MkDocs</span>${esc(siteName || 'Documentation config')}</div>
<div class="mkdocs-sub">${esc(sub)}</div>
${identityHtml}${themeHtml}${navHtml}${pluginsHtml}${extHtml}`;
  return { parentNode: host };
}
