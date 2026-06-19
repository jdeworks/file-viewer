const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clojarsUrl = (coord) => 'https://clojars.org/' + encodeURIComponent(coord);
const extLink = (href, text) => '<a class="sc-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="sc-ext">\u2197</span></a>';
const CSS = `
.sc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-sc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6a1b9a;color:#fff;vertical-align:middle;margin-right:8px}
.sc-title{font-size:18px;font-weight:700;margin:0 0 12px}
.sc-sec{margin:12px 0}
.sc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.sc-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.sc-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.sc-link{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da);text-decoration:none}
.sc-link:hover{text-decoration:underline}
.sc-ext{font-size:10px;opacity:.6}
.sc-ver{font:12px ui-monospace,monospace;color:var(--fg-2,#888);margin-left:auto}
.sc-pills{display:flex;flex-wrap:wrap;gap:6px}
.sc-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.sc-build{margin:8px 0;padding:8px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)}
.sc-build-name{font:13px/1 ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f);margin-bottom:4px}
.sc-build-detail{font-size:12px;color:var(--fg-2,#888)}
.sc-tag{display:inline-block;padding:1px 6px;border-radius:6px;font-size:11px;font-weight:600;background:#e8f5e9;color:#2e7d32;margin-left:6px}
.sc-note{color:var(--fg-2,#888);font-style:italic;font-size:13px;padding:4px 8px}
`;
function extractEDNValue(text, key, openChar, closeChar) {
  const re = new RegExp(':' + key + '[\\s,]+\\' + openChar);
  const m = re.exec(text);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth = 1, i = start + 1;
  while (i < text.length && depth > 0) { if (text[i] === openChar) depth++; else if (text[i] === closeChar) depth--; i++; }
  return text.slice(start, i);
}
function parseLeinDeps(block) {
  if (!block) return [];
  const deps = [], re = /\[\s*([^\s\]"]+)\s+"([^"]+)"/g;
  let m;
  while ((m = re.exec(block))) { if (!m[1].startsWith(';')) deps.push({ coord: m[1], version: m[2] }); }
  return deps;
}
function parsePaths(block) {
  if (!block) return [];
  const paths = [], re = /"([^"]+)"/g;
  let m;
  while ((m = re.exec(block))) paths.push(m[1]);
  return paths;
}
function parseBuilds(block) {
  if (!block) return [];
  const builds = [], re = /:([a-zA-Z0-9_+\-]+)\s*\{/g;
  let m;
  while ((m = re.exec(block))) {
    const id = m[1], bs = m.index + m[0].length - 1;
    let depth = 1, i = bs + 1;
    while (i < block.length && depth > 0) { if (block[i] === '{') depth++; else if (block[i] === '}') depth--; i++; }
    const body = block.slice(bs + 1, i - 1);
    const tM = /:target\s+:([a-zA-Z0-9_+\-]+)/.exec(body);
    const pM = /:port\s+(\d+)/.exec(body);
    const oM = /:output-to\s+"([^"]+)"/.exec(body);
    builds.push({ id, target: tM ? tM[1] : null, port: pM ? pM[1] : null, outputTo: oM ? oM[1] : null });
  }
  return builds;
}
export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const deps = parseLeinDeps(extractEDNValue(text, 'dependencies', '[', ']'));
  const paths = parsePaths(extractEDNValue(text, 'source-paths', '[', ']'));
  const builds = parseBuilds(extractEDNValue(text, 'builds', '{', '}'));
  let devHttpPort = null;
  const dhBlock = extractEDNValue(text, 'dev-http', '{', '}');
  if (dhBlock) { const pm = /(\d{4,5})/.exec(dhBlock); if (pm) devHttpPort = pm[1]; }
  if (!devHttpPort) { const dtBlock = extractEDNValue(text, 'devtools', '{', '}'); if (dtBlock) { const pm = /:http-port\s+(\d+)/.exec(dtBlock); if (pm) devHttpPort = pm[1]; } }
  const shown = deps.slice(0, 8), more = deps.length > 8 ? deps.length - 8 : 0;
  const depsHtml = deps.length ? `<div class="sc-sec"><h3>Clojure Dependencies (${deps.length})</h3><ul class="sc-list">${shown.map((d) => `<li class="sc-item">${extLink(clojarsUrl(d.coord), d.coord)}<span class="sc-ver">${esc(d.version)}</span></li>`).join('')}${more ? `<li class="sc-note">\u2026and ${more} more</li>` : ''}</ul></div>` : '';
  const pathsHtml = paths.length ? `<div class="sc-sec"><h3>Source Paths</h3><div class="sc-pills">${paths.map((p) => `<span class="sc-pill">${esc(p)}</span>`).join('')}</div></div>` : '';
  const buildsHtml = builds.length ? `<div class="sc-sec"><h3>Builds (${builds.length})</h3>${builds.map((b) => { const details = []; if (b.target) details.push(`Target: <strong>${esc(b.target)}</strong>`); if (b.port) details.push(`Port: <strong>${esc(b.port)}</strong>`); if (b.outputTo) details.push(`Output: <code>${esc(b.outputTo)}</code>`); return `<div class="sc-build"><div class="sc-build-name">:${esc(b.id)}${b.target ? `<span class="sc-tag">${esc(b.target)}</span>` : ''}</div>${details.map((d) => `<div class="sc-build-detail">${d}</div>`).join('')}</div>`; }).join('')}</div>` : '';
  const devHtml = devHttpPort ? `<div class="sc-sec"><h3>Dev Server</h3><div class="sc-pills"><span class="sc-pill">port ${esc(devHttpPort)}</span></div></div>` : '';
  const host = document.createElement('div');
  host.className = 'sc-doc';
  host.innerHTML = `<style>${CSS}</style><div class="sc-title"><span class="badge-sc">Shadow-cljs</span>shadow-cljs.edn</div>${depsHtml}${pathsHtml}${buildsHtml}${devHtml}`;
  return { parentNode: host };
}
