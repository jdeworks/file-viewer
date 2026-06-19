const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clojarsUrl = (coord) => 'https://clojars.org/' + encodeURIComponent(coord);
const mvnUrl = (g, a) => 'https://mvnrepository.com/artifact/' + encodeURIComponent(g) + '/' + encodeURIComponent(a);
const extLink = (href, text) => '<a class="deps-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="deps-ext">\u2197</span></a>';
const CSS = `
.deps-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-deps{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px}
.deps-title{font-size:18px;font-weight:700;margin:0 0 12px}
.deps-sec{margin:12px 0}
.deps-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.deps-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.deps-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.deps-link{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da);text-decoration:none}
.deps-link:hover{text-decoration:underline}
.deps-ext{font-size:10px;opacity:.6}
.deps-ver{font:12px ui-monospace,monospace;color:var(--fg-2,#888);margin-left:auto}
.deps-pills{display:flex;flex-wrap:wrap;gap:6px}
.deps-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.deps-alias{margin:8px 0;padding:8px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)}
.deps-alias-name{font:13px/1 ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f);margin-bottom:4px}
.deps-alias-detail{font-size:12px;color:var(--fg-2,#888);font-family:ui-monospace,monospace}
.deps-note{color:var(--fg-2,#888);font-style:italic;font-size:13px;padding:4px 8px}
`;
function extractEDNValue(text, key, openChar, closeChar) {
  const re = new RegExp(':' + key + '[\\s,]+\\' + openChar);
  const m = re.exec(text);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth = 1, i = start + 1;
  while (i < text.length && depth > 0) {
    if (text[i] === openChar) depth++;
    else if (text[i] === closeChar) depth--;
    i++;
  }
  return text.slice(start, i);
}
function parseDepsMap(block) {
  if (!block) return [];
  const deps = [];
  const re = /([a-zA-Z0-9_.+\-]+(?:\/[a-zA-Z0-9_.+\-]+)?)\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(block))) {
    const coord = m[1], body = m[2];
    const verM = /:mvn\/version\s+"([^"]+)"/.exec(body);
    const gitM = /:git\/url\s+"([^"]+)"/.exec(body);
    const locM = /:local\/root\s+"([^"]+)"/.exec(body);
    let version = null, hint = null;
    if (verM) version = verM[1];
    else if (gitM) hint = 'git';
    else if (locM) { hint = 'local'; version = locM[1]; }
    deps.push({ coord, version, hint });
  }
  return deps;
}
function parsePaths(block) {
  if (!block) return [];
  const paths = [], re = /"([^"]+)"/g;
  let m;
  while ((m = re.exec(block))) paths.push(m[1]);
  return paths;
}
function parseAliases(block) {
  if (!block) return [];
  const aliases = [], re = /:([a-zA-Z0-9_+\-/]+)\s*\{/g;
  let m;
  while ((m = re.exec(block))) {
    const name = m[1], bs = m.index + m[0].length - 1;
    let depth = 1, i = bs + 1;
    while (i < block.length && depth > 0) { if (block[i] === '{') depth++; else if (block[i] === '}') depth--; i++; }
    const body = block.slice(bs + 1, i - 1);
    const moM = /:main-opts\s+\[([^\]]*)\]/.exec(body);
    const edBlock = extractEDNValue(body, 'extra-deps', '{', '}') || extractEDNValue(body, 'deps', '{', '}');
    const extraDepNames = edBlock ? parseDepsMap(edBlock).map((d) => d.coord) : [];
    aliases.push({ name, extraDeps: extraDepNames, mainOpts: moM ? moM[1].replace(/\s+/g, ' ').trim() : null });
  }
  return aliases;
}
function depLink(d) {
  if (d.hint) return `<span style="font:13px/1 ui-monospace,monospace;font-weight:600">${esc(d.coord)}</span>`;
  const slash = d.coord.indexOf('/');
  const isMvn = d.coord.startsWith('org.clojure') || (d.coord.includes('.') && slash !== -1);
  const href = isMvn ? mvnUrl(d.coord.slice(0, slash), d.coord.slice(slash + 1)) : clojarsUrl(d.coord);
  return extLink(href, d.coord);
}
export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const deps = parseDepsMap(extractEDNValue(text, 'deps', '{', '}'));
  const paths = parsePaths(extractEDNValue(text, 'paths', '[', ']'));
  const aliases = parseAliases(extractEDNValue(text, 'aliases', '{', '}'));
  const shown = deps.slice(0, 8), more = deps.length > 8 ? deps.length - 8 : 0;
  const depsHtml = deps.length ? `<div class="deps-sec"><h3>Dependencies (${deps.length})</h3><ul class="deps-list">${shown.map((d) => `<li class="deps-item">${depLink(d)}<span class="deps-ver">${esc(d.hint || d.version || '')}</span></li>`).join('')}${more ? `<li class="deps-note">\u2026and ${more} more</li>` : ''}</ul></div>` : '';
  const pathsHtml = paths.length ? `<div class="deps-sec"><h3>Source Paths</h3><div class="deps-pills">${paths.map((p) => `<span class="deps-pill">${esc(p)}</span>`).join('')}</div></div>` : '';
  const aliasesHtml = aliases.length ? `<div class="deps-sec"><h3>Aliases (${aliases.length})</h3>${aliases.map((a) => { const details = []; if (a.extraDeps.length) details.push('extra-deps: ' + a.extraDeps.slice(0, 3).join(', ') + (a.extraDeps.length > 3 ? ', \u2026' : '')); if (a.mainOpts) details.push('main-opts: ' + a.mainOpts.slice(0, 60)); return `<div class="deps-alias"><div class="deps-alias-name">:${esc(a.name)}</div>${details.map((d) => `<div class="deps-alias-detail">${esc(d)}</div>`).join('')}</div>`; }).join('')}</div>` : '';
  const host = document.createElement('div');
  host.className = 'deps-doc';
  host.innerHTML = `<style>${CSS}</style><div class="deps-title"><span class="badge-deps">Clojure CLI</span>deps.edn</div>${depsHtml}${pathsHtml}${aliasesHtml}`;
  return { parentNode: host };
}
