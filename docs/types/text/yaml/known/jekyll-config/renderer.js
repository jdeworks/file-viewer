import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.jky-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-jky{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc0000;color:#fff;vertical-align:middle;margin-right:8px}
.jky-title{font-size:18px;font-weight:700;margin:0 0 4px}
.jky-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.jky-sec{margin:12px 0}
.jky-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.jky-table{width:100%;border-collapse:collapse;font-size:13px}
.jky-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.jky-table td:first-child{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;width:140px}
.jky-table td:last-child{font-family:ui-monospace,monospace;word-break:break-all}
.jky-table tr:last-child td{border-bottom:none}
.jky-pills{display:flex;flex-wrap:wrap;gap:6px}
.jky-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

function row(label, value) {
  if (value == null || value === '') return '';
  return `<tr><td>${esc(label)}</td><td>${esc(String(value))}</td></tr>`;
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const text = intake.text || '';
  let cfg = {};
  try { cfg = jsYaml.load(text) || {}; } catch { /* ignore parse errors */ }
  if (typeof cfg !== 'object' || Array.isArray(cfg)) cfg = {};

  const author = typeof cfg.author === 'object' && cfg.author ? (cfg.author.name || '') : cfg.author;
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : (Array.isArray(cfg.gems) ? cfg.gems : []);
  const exclude = Array.isArray(cfg.exclude) ? cfg.exclude : [];
  const defaults = Array.isArray(cfg.defaults) ? cfg.defaults : [];

  const siteRows = [
    row('title', cfg.title),
    row('description', cfg.description),
    row('url', cfg.url),
    row('baseurl', cfg.baseurl),
    row('author', author),
    row('theme', cfg.theme || cfg.remote_theme),
    row('markdown', cfg.markdown),
    row('highlighter', cfg.highlighter),
    row('permalink', cfg.permalink),
  ].filter(Boolean).join('');

  const siteHtml = siteRows
    ? `<div class="jky-sec"><h3>Site</h3><table class="jky-table">${siteRows}</table></div>`
    : '';

  const pluginsHtml = plugins.length
    ? `<div class="jky-sec"><h3>Plugins (${plugins.length})</h3><div class="jky-pills">${plugins.map((p) => `<span class="jky-pill">${esc(String(p))}</span>`).join('')}</div></div>`
    : '';

  const excludeHtml = exclude.length
    ? `<div class="jky-sec"><h3>Excluded paths (${exclude.length})</h3><div class="jky-pills">${exclude.map((p) => `<span class="jky-pill">${esc(String(p))}</span>`).join('')}</div></div>`
    : '';

  const defaultsHtml = defaults.length
    ? `<div class="jky-sec"><h3>Front-matter defaults (${defaults.length})</h3><div class="jky-pills">${defaults.map((d) => {
        const scope = d && d.scope ? (d.scope.type || d.scope.path || 'all') : 'all';
        return `<span class="jky-pill">${esc(String(scope))}</span>`;
      }).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'jky-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="jky-title"><span class="badge-jky">Jekyll</span>${esc(cfg.title || '_config.yml')}</div>
<div class="jky-sub">Jekyll static site configuration</div>
${siteHtml}${pluginsHtml}${excludeHtml}${defaultsHtml}`;

  return { parentNode: host };
}
