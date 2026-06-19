const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-vitepress{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#41b883;color:#fff;vertical-align:middle;margin-right:8px}
.vp-title{font-size:18px;font-weight:700;margin:0 0 4px}
.vp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.vp-sec{margin:12px 0}
.vp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.vp-meta{display:flex;flex-wrap:wrap;gap:10px;margin:4px 0}
.vp-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.vp-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.vp-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600}
.vp-pills{display:flex;flex-wrap:wrap;gap:6px}
.vp-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);

  // Extract simple string values
  const strVal = (key) => {
    const m = new RegExp(`['"\`]?${key}['"\`]?\\s*:\\s*['"\`]([^'"\`\\n]+)['"\`]`).exec(text);
    return m ? m[1].trim() : null;
  };

  const title = strVal('title');
  const description = strVal('description');
  const base = strVal('base');
  const lang = strVal('lang');

  // Nav items (themeConfig.nav)
  const navItems = [];
  const navM = /\bnav\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (navM) {
    const re = /text\s*:\s*['"`]([^'"`]+)['"`]/g;
    let m;
    while ((m = re.exec(navM[1])) !== null) navItems.push(m[1]);
  }

  // Sidebar sections
  const sidebarItems = [];
  const sidebarM = /\bsidebar\s*:\s*(?:\[|\{)/.exec(text);
  if (sidebarM) {
    const chunk = text.slice(sidebarM.index, sidebarM.index + 2000);
    const re = /text\s*:\s*['"`]([^'"`]+)['"`]/g;
    let m;
    while ((m = re.exec(chunk)) !== null) sidebarItems.push(m[1]);
  }

  // Social links
  const socialLinks = [];
  const socialM = /socialLinks\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (socialM) {
    const re = /icon\s*:\s*['"`]([^'"`]+)['"`]/g;
    let m;
    while ((m = re.exec(socialM[1])) !== null) socialLinks.push(m[1]);
  }

  // Algolia search
  const hasAlgolia = /algolia/i.test(text);

  const host = document.createElement('div');
  host.className = 'vp-doc';

  const metaItems = [
    title ? `<div class="vp-kv"><span>Title</span><span>${esc(title)}</span></div>` : '',
    base ? `<div class="vp-kv"><span>Base</span><span>${esc(base)}</span></div>` : '',
    lang ? `<div class="vp-kv"><span>Lang</span><span>${esc(lang)}</span></div>` : '',
    hasAlgolia ? `<div class="vp-kv"><span>Search</span><span>Algolia</span></div>` : '',
  ].filter(Boolean).join('');

  const descHtml = description
    ? `<div class="vp-sec"><h3>Description</h3><p style="margin:4px 0;color:var(--fg-2,#555)">${esc(description)}</p></div>`
    : '';

  const navHtml = navItems.length
    ? `<div class="vp-sec"><h3>Nav (${navItems.length})</h3><div class="vp-pills">${navItems.map((l) => `<span class="vp-pill">${esc(l)}</span>`).join('')}</div></div>`
    : '';

  const sidebarHtml = sidebarItems.length
    ? `<div class="vp-sec"><h3>Sidebar Sections (${sidebarItems.length})</h3><div class="vp-pills">${sidebarItems.slice(0, 12).map((l) => `<span class="vp-pill">${esc(l)}</span>`).join('')}${sidebarItems.length > 12 ? `<span class="vp-pill">+${sidebarItems.length - 12} more</span>` : ''}</div></div>`
    : '';

  const socialHtml = socialLinks.length
    ? `<div class="vp-sec"><h3>Social Links</h3><div class="vp-pills">${socialLinks.map((l) => `<span class="vp-pill">${esc(l)}</span>`).join('')}</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="vp-title"><span class="badge-vitepress">VitePress</span>.vitepress/config</div>
<div class="vp-sub">VitePress documentation site configuration</div>
${metaItems ? `<div class="vp-sec"><h3>Site Info</h3><div class="vp-meta">${metaItems}</div></div>` : ''}
${descHtml}${navHtml}${sidebarHtml}${socialHtml}`;
  return { parentNode: host };
}
