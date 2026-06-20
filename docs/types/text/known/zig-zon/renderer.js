const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function zonScalar(text, key) {
  const m = new RegExp('\\.\\s*' + key + '\\s*=\\s*"([^"]*)"').exec(text);
  if (m) return m[1];
  const m2 = new RegExp('\\.\\s*' + key + '\\s*=\\s*([^,\\s}]+)').exec(text);
  return m2 ? m2[1] : null;
}

// Extract the dependencies block between .dependencies = .{ ... }
function extractDepsBlock(text) {
  const start = text.search(/\.dependencies\s*=\s*\.{/);
  if (start < 0) return '';
  let depth = 0, i = text.indexOf('.{', start);
  if (i < 0) return '';
  const begin = i;
  while (i < text.length) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return text.slice(begin + 2, i); }
    i++;
  }
  return '';
}

// Parse individual dep entries: .name = .{ .url = "...", .hash = "..." }
function parseDeps(block) {
  const deps = [];
  const re = /\.\s*(\w+)\s*=\s*\.{/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const name = m[1];
    const bodyStart = m.index + m[0].length;
    let depth = 1, i = bodyStart;
    while (i < block.length && depth > 0) {
      if (block[i] === '{') depth++;
      else if (block[i] === '}') depth--;
      i++;
    }
    const body = block.slice(bodyStart, i - 1);
    const url = (/\.url\s*=\s*"([^"]*)"/.exec(body) || [, null])[1];
    const hash = (/\.hash\s*=\s*"([^"]*)"/.exec(body) || [, null])[1];
    const path = (/\.path\s*=\s*"([^"]*)"/.exec(body) || [, null])[1];
    deps.push({ name, url, hash, path });
  }
  return deps;
}

// Extract .paths = .{ "...", "...", } entries
function extractPaths(text) {
  const start = text.search(/\.paths\s*=\s*\.{/);
  if (start < 0) return [];
  let depth = 0, i = text.indexOf('.{', start);
  if (i < 0) return [];
  const begin = i + 2;
  while (i < text.length) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  const block = text.slice(begin, i);
  const paths = [];
  const re = /"([^"]*)"/g;
  let pm;
  while ((pm = re.exec(block)) !== null) paths.push(pm[1]);
  return paths;
}

const CSS = `
.zigzon-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.zigzon-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f7971e;color:#1a1a1a;vertical-align:middle;margin-right:8px;}
.zigzon-title{font-size:20px;font-weight:700;margin:0 0 2px;}
.zigzon-meta{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 12px;}
.zigzon-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e5e7eb);}
.zigzon-sec{margin:14px 0;}
.zigzon-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.zigzon-deps{list-style:none;margin:0;padding:0;}
.zigzon-deps li{padding:6px 0;border-bottom:1px solid var(--border,#e5e7eb);}
.zigzon-dep-name{font:13px ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);}
.zigzon-dep-url{font-size:12px;display:block;margin-top:2px;word-break:break-all;}
.zigzon-dep-hash{font:11px ui-monospace,monospace;color:var(--fg-2,#888);display:block;margin-top:1px;}
.zigzon-dep-path{font:11px ui-monospace,monospace;color:var(--fg-2,#888);}
.zigzon-link{color:var(--accent,#0969da);text-decoration:none;}
.zigzon-link:hover{text-decoration:underline;}
.zigzon-paths{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px;}
.zigzon-paths li{font:11px ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e5e7eb);border-radius:4px;padding:1px 6px;}
`;

export function render(intake) {
  const t = intake.text || '';
  const name = zonScalar(t, 'name') || 'Zig Package';
  const version = zonScalar(t, 'version') || '';
  const minZig = zonScalar(t, 'minimum_zig_version') || '';

  const depsBlock = extractDepsBlock(t);
  const deps = parseDeps(depsBlock);
  const paths = extractPaths(t);

  const chips = [
    version && `v${version}`,
    minZig && `zig ≥ ${minZig}`,
  ].filter(Boolean).map((m) => `<span class="zigzon-chip">${esc(m)}</span>`).join('');

  let depsHtml = '';
  if (deps.length) {
    const rows = deps.map((d) => {
      let srcHtml = '';
      if (d.url) {
        const display = d.url.replace(/^https?:\/\//, '').slice(0, 50);
        const truncated = d.url.length > 53 ? display + '...' : display;
        srcHtml = `<span class="zigzon-dep-url"><a class="zigzon-link" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">${esc(truncated)}</a></span>`;
      } else if (d.path) {
        srcHtml = `<span class="zigzon-dep-url"><span class="zigzon-dep-path">path: ${esc(d.path)}</span></span>`;
      }
      const hashHtml = d.hash
        ? `<span class="zigzon-dep-hash">${esc(d.hash.slice(0, 8))}…</span>`
        : '';
      return `<li><span class="zigzon-dep-name">${esc(d.name)}</span>${srcHtml}${hashHtml}</li>`;
    }).join('');
    depsHtml = `<div class="zigzon-sec"><h3>Dependencies (${deps.length})</h3><ul class="zigzon-deps">${rows}</ul></div>`;
  } else if (depsBlock !== '') {
    depsHtml = `<div class="zigzon-sec"><h3>Dependencies</h3><p style="color:var(--fg-2,#888);font-size:13px">No dependencies declared.</p></div>`;
  }

  let pathsHtml = '';
  if (paths.length) {
    pathsHtml = `<div class="zigzon-sec"><h3>Paths</h3><ul class="zigzon-paths">${paths.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
  }

  const host = document.createElement('div');
  host.innerHTML = `<style>${CSS}</style>
<div class="zigzon-doc">
  <span class="zigzon-badge">Zig</span>
  <div class="zigzon-title">${esc(name)}</div>
  ${chips ? `<div class="zigzon-meta">${chips}</div>` : ''}
  ${depsHtml}
  ${pathsHtml}
</div>`;
  return { parentNode: host };
}
