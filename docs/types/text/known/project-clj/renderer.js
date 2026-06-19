const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clojarsUrl = (coord) => 'https://clojars.org/' + encodeURIComponent(coord);
const mvnUrl = (g, a) => 'https://mvnrepository.com/artifact/' + encodeURIComponent(g) + '/' + encodeURIComponent(a);
const extLink = (href, text) => '<a class="lein-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="lein-ext">\u2197</span></a>';
const CSS = `
.lein-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-lein{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2e7d32;color:#fff;vertical-align:middle;margin-right:8px}
.lein-title{font-size:18px;font-weight:700;margin:0 0 4px}
.lein-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 4px}
.lein-desc{font-size:13px;color:var(--fg-2,#888);margin:0 0 12px;font-style:italic}
.lein-sec{margin:12px 0}
.lein-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.lein-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.lein-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.lein-link{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da);text-decoration:none}
.lein-link:hover{text-decoration:underline}
.lein-ext{font-size:10px;opacity:.6}
.lein-ver{font:12px ui-monospace,monospace;color:var(--fg-2,#888);margin-left:auto}
.lein-pills{display:flex;flex-wrap:wrap;gap:6px}
.lein-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.lein-meta{font-size:13px;color:var(--fg-2,#888);margin:2px 0}
.lein-note{color:var(--fg-2,#888);font-style:italic;font-size:13px;padding:4px 8px}
`;
function extractBlock(text, keyword, openChar, closeChar) {
  const idx = text.indexOf(keyword);
  if (idx === -1) return null;
  const start = text.indexOf(openChar, idx + keyword.length);
  if (start === -1) return null;
  let depth = 1, i = start + 1;
  while (i < text.length && depth > 0) {
    if (text[i] === openChar) depth++;
    else if (text[i] === closeChar) depth--;
    i++;
  }
  return text.slice(start, i);
}
function parseDeps(vectorText) {
  if (!vectorText) return [];
  const deps = [];
  const re = /\[\s*([^\s\]"]+)\s+"([^"]+)"/g;
  let m;
  while ((m = re.exec(vectorText))) {
    const coord = m[1];
    if (coord.startsWith(';')) continue;
    const slash = coord.indexOf('/');
    const group = slash === -1 ? coord : coord.slice(0, slash);
    const artifact = slash === -1 ? coord : coord.slice(slash + 1);
    deps.push({ coord, group, artifact, version: m[2] });
  }
  return deps;
}
function depLink(d) {
  const isMvn = d.group.startsWith('org.clojure') || (d.group.includes('.') && d.group !== d.artifact);
  const href = isMvn ? mvnUrl(d.group, d.artifact) : clojarsUrl(d.coord);
  return extLink(href, d.coord);
}
export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  let projectName = null, version = null;
  const defMatch = /\(\s*defproject\s+([^\s]+)\s+"([^"]+)"/.exec(text);
  if (defMatch) { projectName = defMatch[1]; version = defMatch[2]; }
  let description = null;
  const descMatch = /:description\s+"([^"]+)"/.exec(text);
  if (descMatch) description = descMatch[1];
  let clojureVer = null;
  const cvMatch = /\[\s*org\.clojure\/clojure\s+"([^"]+)"/.exec(text);
  if (cvMatch) clojureVer = cvMatch[1];
  let mainNs = null;
  const mainMatch = /:main\s+([^\s\)]+)/.exec(text);
  if (mainMatch) mainNs = mainMatch[1];
  const depsBlock = extractBlock(text, ':dependencies', '[', ']');
  const deps = parseDeps(depsBlock).filter((d) => d.coord !== 'org.clojure/clojure');
  const pluginsBlock = extractBlock(text, ':plugins', '[', ']');
  const plugins = parseDeps(pluginsBlock);
  const profileNames = [];
  const profilesBlock = extractBlock(text, ':profiles', '{', '}');
  if (profilesBlock) { for (const m of profilesBlock.matchAll(/:([a-zA-Z0-9_-]+)\s*\{/g)) profileNames.push(m[1]); }
  const shown = deps.slice(0, 8), more = deps.length > 8 ? deps.length - 8 : 0;
  const metaHtml = [clojureVer ? `<div class="lein-meta">Clojure: <strong>${esc(clojureVer)}</strong></div>` : '', mainNs ? `<div class="lein-meta">Main: <code>${esc(mainNs)}</code></div>` : ''].join('');
  const depsHtml = deps.length ? `<div class="lein-sec"><h3>Dependencies (${deps.length})</h3><ul class="lein-list">${shown.map((d) => `<li class="lein-item">${depLink(d)}<span class="lein-ver">${esc(d.version)}</span></li>`).join('')}${more ? `<li class="lein-note">\u2026and ${more} more</li>` : ''}</ul></div>` : '';
  const pluginsHtml = plugins.length ? `<div class="lein-sec"><h3>Plugins (${plugins.length})</h3><ul class="lein-list">${plugins.map((d) => `<li class="lein-item">${depLink(d)}<span class="lein-ver">${esc(d.version)}</span></li>`).join('')}</ul></div>` : '';
  const profilesHtml = profileNames.length ? `<div class="lein-sec"><h3>Profiles</h3><div class="lein-pills">${profileNames.map((p) => `<span class="lein-pill">${esc(p)}</span>`).join('')}</div></div>` : '';
  const host = document.createElement('div');
  host.className = 'lein-doc';
  host.innerHTML = `<style>${CSS}</style><div class="lein-title"><span class="badge-lein">Leiningen</span>${esc(projectName || 'project.clj')}</div>${version ? `<div class="lein-sub">v${esc(version)}</div>` : ''}${description ? `<div class="lein-desc">${esc(description)}</div>` : ''}${metaHtml}${depsHtml}${pluginsHtml}${profilesHtml}`;
  return { parentNode: host };
}
