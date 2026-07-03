const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// http(s)-only allowlist — a build.zig.zon dependency URL is untrusted file content and must
// never reach an href unvalidated (rejects javascript:, data:, etc.).
function safeHref(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim()) ? url : null;
}
const ext = (href, text) => {
  const safe = safeHref(href);
  return safe
    ? `<a class="zon-link" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(text)} <span class="zon-exticon">↗</span></a>`
    : `<span class="zon-link">${esc(text)}</span>`;
};

// ZON (Zig Object Notation) is like JSON but with .{ ... } and bare identifiers.
// We use regex extraction rather than a full parser.
function zonScalar(text, key) {
  // .key = "value" or .key = identifier
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
  // Find each .depname = .{ ... } inside the block
  const re = /\.\s*(\w+)\s*=\s*\.{/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const name = m[1];
    const bodyStart = m.index + m[0].length;
    // find matching closing }
    let depth = 1, i = bodyStart;
    while (i < block.length && depth > 0) {
      if (block[i] === '{') depth++;
      else if (block[i] === '}') depth--;
      i++;
    }
    const body = block.slice(bodyStart, i - 1);
    const url = (/"url"\s*=\s*"([^"]*)"/.exec(body) || [, null])[1]
      || (/\.url\s*=\s*"([^"]*)"/.exec(body) || [, null])[1];
    const hash = (/"hash"\s*=\s*"([^"]*)"/.exec(body) || [, null])[1]
      || (/\.hash\s*=\s*"([^"]*)"/.exec(body) || [, null])[1];
    const path = (/"path"\s*=\s*"([^"]*)"/.exec(body) || [, null])[1]
      || (/\.path\s*=\s*"([^"]*)"/.exec(body) || [, null])[1];
    deps.push({ name, url, hash, path });
  }
  return deps;
}

const CSS = `
.zon-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-zig{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F7A41D;color:#1a1a1a;vertical-align:middle;margin-right:8px;}
.zon-title{font-size:20px;font-weight:700;margin:0 0 4px;}
.zon-meta{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.zon-tag{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e5e7eb);margin-right:4px;}
.zon-sec{margin:14px 0;}
.zon-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.zon-deps{list-style:none;margin:0;padding:0;}
.zon-deps li{padding:6px 0;border-bottom:1px solid var(--border,#e5e7eb);}
.zon-dep-name{font:13px ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);}
.zon-dep-url{font-size:12px;display:block;margin-top:2px;}
.zon-dep-hash{font:11px ui-monospace,monospace;color:var(--fg-2,#888);display:block;margin-top:1px;word-break:break-all;}
.zon-dep-path{font:11px ui-monospace,monospace;color:var(--fg-2,#888);}
.zon-link{color:var(--accent,#0969da);text-decoration:none;}
.zon-link:hover{text-decoration:underline;}
.zon-exticon{font-size:10px;opacity:.6;}
`;

export function render(intake) {
  const t = intake.text || '';
  const name = zonScalar(t, 'name') || '(unnamed)';
  const version = zonScalar(t, 'version') || '';
  const minZig = zonScalar(t, 'minimum_zig_version') || '';

  const depsBlock = extractDepsBlock(t);
  const deps = parseDeps(depsBlock);

  const meta = [
    version && `v${version}`,
    minZig && `zig ≥ ${minZig}`,
  ].filter(Boolean).map((m) => `<span class="zon-tag">${esc(m)}</span>`).join('');

  let depsHtml = '';
  if (deps.length) {
    const rows = deps.map((d) => {
      let srcHtml = '';
      if (d.url) {
        // Shorten URL for display
        const display = d.url.replace(/^https?:\/\//, '').replace(/\/archive\/.*$/, '/…').slice(0, 70);
        srcHtml = `<span class="zon-dep-url">${ext(d.url, display)}</span>`;
      } else if (d.path) {
        srcHtml = `<span class="zon-dep-url"><span class="zon-dep-path">path: ${esc(d.path)}</span></span>`;
      }
      const hashHtml = d.hash
        ? `<span class="zon-dep-hash">${esc(d.hash.slice(0, 16))}…</span>`
        : '';
      return `<li><span class="zon-dep-name">${esc(d.name)}</span>${srcHtml}${hashHtml}</li>`;
    }).join('');
    depsHtml = `<div class="zon-sec"><h3>Dependencies (${deps.length})</h3><ul class="zon-deps">${rows}</ul></div>`;
  } else if (depsBlock !== '') {
    depsHtml = `<div class="zon-sec"><h3>Dependencies</h3><p style="color:var(--fg-2,#888);font-size:13px">No dependencies declared.</p></div>`;
  }

  const host = document.createElement('div');
  host.innerHTML = `<style>${CSS}</style>
<div class="zon-doc">
  <span class="badge-zig">Zig</span>
  <div class="zon-title">${esc(name)}${version ? `<span style="font-size:14px;font-weight:400;color:var(--fg-2,#888);margin-left:8px">v${esc(version)}</span>` : ''}</div>
  ${meta ? `<div class="zon-meta">${meta}</div>` : ''}
  ${depsHtml}
</div>`;
  return { parentNode: host };
}
