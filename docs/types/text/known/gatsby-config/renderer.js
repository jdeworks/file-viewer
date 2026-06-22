const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gatsby-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-gatsby{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#663399;color:#fff;vertical-align:middle;margin-right:8px}
.gatsby-title{font-size:18px;font-weight:700;margin:0 0 4px}
.gatsby-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.gatsby-grid{display:grid;grid-template-columns:max-content 1fr;gap:5px 16px;margin:10px 0}
.gatsby-key{color:var(--fg-2,#888);font-size:12px;align-self:center}
.gatsby-val{font:12px ui-monospace,monospace;color:#663399;word-break:break-all;align-self:center}
.gatsby-sec{margin:12px 0}
.gatsby-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.gatsby-pills{display:flex;flex-wrap:wrap;gap:6px}
.gatsby-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || 'gatsby-config.js').split('/').pop();

  // Parse siteMetadata fields
  const titleM = /title\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  const descM = /description\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);
  const siteUrlM = /siteUrl\s*:\s*['"`]([^'"`]+)['"`]/.exec(text);

  const siteTitle = titleM ? titleM[1] : null;
  const siteDesc = descM ? descM[1] : null;
  const siteUrl = siteUrlM ? siteUrlM[1] : null;

  // Parse plugin names — match string literals containing 'gatsby-'
  const pluginNames = new Set();
  const pluginRe = /['"`](gatsby-[^'"`\s]+)['"`]/g;
  let m;
  while ((m = pluginRe.exec(text)) !== null) {
    // Skip short fragments that are just prefixes, and nested remark plugins
    const name = m[1];
    if (name.startsWith('gatsby-')) pluginNames.add(name);
  }
  const plugins = [...pluginNames];

  const metaRows = [
    siteTitle ? `<span class="gatsby-key">Title</span><span class="gatsby-val">${esc(siteTitle)}</span>` : '',
    siteUrl ? `<span class="gatsby-key">Site URL</span><span class="gatsby-val">${esc(siteUrl)}</span>` : '',
    siteDesc ? `<span class="gatsby-key">Description</span><span class="gatsby-val">${esc(siteDesc)}</span>` : '',
  ].filter(Boolean);

  const metaHtml = metaRows.length
    ? `<div class="gatsby-sec"><h3>Site Metadata</h3><div class="gatsby-grid">${metaRows.join('')}</div></div>`
    : '';

  const pluginsHtml = plugins.length
    ? `<div class="gatsby-sec"><h3>Plugins (${plugins.length})</h3><div class="gatsby-pills">${plugins.map((p) => `<span class="gatsby-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'gatsby-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gatsby-title"><span class="badge-gatsby">Gatsby</span>${esc(name)}</div>
<div class="gatsby-sub">Gatsby static site generator configuration</div>
${metaHtml}${pluginsHtml}`;
  return { parentNode: host };
}
