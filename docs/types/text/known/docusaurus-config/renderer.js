const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dcs-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-docusaurus{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3578e5;color:#fff;vertical-align:middle;margin-right:8px}
.dcs-title{font-size:18px;font-weight:700;margin:0 0 4px}
.dcs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.dcs-sec{margin:12px 0}
.dcs-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.dcs-meta{display:flex;flex-wrap:wrap;gap:10px;margin:4px 0}
.dcs-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.dcs-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.dcs-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600}
.dcs-pills{display:flex;flex-wrap:wrap;gap:6px}
.dcs-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

function extractStr(text, key) {
  const m = new RegExp(`['"\`]?${key}['"\`]?\\s*:\\s*['"\`]([^'"\`\\n]+)['"\`]`).exec(text);
  return m ? m[1].trim() : null;
}

function extractStrings(text, key) {
  const m = new RegExp(`${key}\\s*:\\s*\\[([^\\]]+)\\]`, 's').exec(text);
  if (!m) return [];
  const results = [];
  const re = /['"`]([^'"`]+)['"`]/g;
  let r;
  while ((r = re.exec(m[1])) !== null) results.push(r[1]);
  return results;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'docusaurus.config.js').split('/').pop();

  const title = extractStr(text, 'title');
  const tagline = extractStr(text, 'tagline');
  const url = extractStr(text, 'url');
  const orgName = extractStr(text, 'organizationName');
  const projectName = extractStr(text, 'projectName');
  const baseUrl = extractStr(text, 'baseUrl');

  // Count plugins
  const pluginsM = /\bplugins\s*:\s*\[/.exec(text);
  let pluginCount = 0;
  if (pluginsM) {
    const chunk = text.slice(pluginsM.index);
    // Count top-level items: strings + arrays
    const inner = chunk.match(/\bplugins\s*:\s*\[([^\]]*)\]/s);
    if (inner) {
      // Count comma-separated top-level entries (rough)
      pluginCount = (inner[1].match(/(?:['"`\[])/g) || []).filter((c, i, a) => {
        if (c === '[') return true;
        if (c === '"' || c === "'" || c === '`') return true;
        return false;
      }).length;
      // Simpler: count occurrences of string/array starts that are direct children
      pluginCount = (inner[1].match(/(?:require\(|'[^']+plugin|"[^"]+plugin|\[)/g) || []).length;
    }
  }

  // Count presets
  const presetsM = /\bpresets\s*:\s*\[/.exec(text);
  const presetCount = presetsM ? (text.slice(presetsM.index).match(/\bpresets\s*:\s*\[([^\]]*)\]/s)?.[1].match(/['"`\[]/g) || []).length : 0;

  // Nav items
  const navItems = [];
  const navM = /navbar\s*:\s*\{[^}]*items\s*:\s*\[([^\]]+)\]/s.exec(text);
  if (navM) {
    const lr = /label\s*:\s*['"`]([^'"`]+)['"`]/g;
    let lm;
    while ((lm = lr.exec(navM[1])) !== null) navItems.push(lm[1]);
  }

  // i18n locales
  const locales = extractStrings(text, 'locales');

  const host = document.createElement('div');
  host.className = 'dcs-doc';

  const metaItems = [
    title ? `<div class="dcs-kv"><span>Title</span><span>${esc(title)}</span></div>` : '',
    url ? `<div class="dcs-kv"><span>URL</span><span>${esc(url)}</span></div>` : '',
    baseUrl ? `<div class="dcs-kv"><span>Base URL</span><span>${esc(baseUrl)}</span></div>` : '',
    orgName ? `<div class="dcs-kv"><span>Org</span><span>${esc(orgName)}</span></div>` : '',
    projectName ? `<div class="dcs-kv"><span>Project</span><span>${esc(projectName)}</span></div>` : '',
  ].filter(Boolean).join('');

  const taglineHtml = tagline
    ? `<div class="dcs-sec"><h3>Tagline</h3><p style="margin:4px 0;font-style:italic;color:var(--fg-2,#555)">${esc(tagline)}</p></div>`
    : '';

  const navHtml = navItems.length
    ? `<div class="dcs-sec"><h3>Navbar Items (${navItems.length})</h3><div class="dcs-pills">${navItems.map((l) => `<span class="dcs-pill">${esc(l)}</span>`).join('')}</div></div>`
    : '';

  const localesHtml = locales.length
    ? `<div class="dcs-sec"><h3>Locales</h3><div class="dcs-pills">${locales.map((l) => `<span class="dcs-pill">${esc(l)}</span>`).join('')}</div></div>`
    : '';

  const countsHtml = (pluginCount > 0 || presetCount > 0)
    ? `<div class="dcs-sec"><h3>Plugins &amp; Presets</h3><div class="dcs-meta">${pluginCount > 0 ? `<div class="dcs-kv"><span>Plugins</span><span>${pluginCount}</span></div>` : ''}${presetCount > 0 ? `<div class="dcs-kv"><span>Presets</span><span>${presetCount}</span></div>` : ''}</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="dcs-title"><span class="badge-docusaurus">Docusaurus</span>${esc(name)}</div>
<div class="dcs-sub">Docusaurus documentation site configuration</div>
${metaItems ? `<div class="dcs-sec"><h3>Site Info</h3><div class="dcs-meta">${metaItems}</div></div>` : ''}
${taglineHtml}${navHtml}${localesHtml}${countsHtml}`;
  return { parentNode: host };
}
