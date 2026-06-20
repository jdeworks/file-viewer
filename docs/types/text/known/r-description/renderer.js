const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rdesc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-rdesc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#276dc2;color:#fff;vertical-align:middle;margin-right:8px}
.rdesc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rdesc-subtitle{font-size:13px;color:var(--fg-2,#888);margin:0 0 4px}
.rdesc-meta{font-size:13px;color:var(--fg-2,#888);margin:2px 0}
.rdesc-meta strong{color:var(--fg,#24292f)}
.rdesc-desc{font-size:13px;margin:10px 0;padding:10px 12px;background:var(--bg-2,#f6f8fa);border-radius:6px;border-left:3px solid var(--border,#e0e0e0);color:var(--fg,#24292f)}
.rdesc-sec{margin:14px 0}
.rdesc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.rdesc-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.rdesc-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.rdesc-pill-ver{font-size:11px;color:var(--fg-2,#888);margin-left:4px}
.rdesc-url{font-size:12px;color:var(--accent,#0969da);word-break:break-all}
`;

// Parse DCF (Debian Control File) format used by R's DESCRIPTION files.
// Keys may span multiple continuation lines (lines starting with whitespace).
function parseDCF(text) {
  const fields = {};
  const lines = text.split('\n');
  let currentKey = null;
  let currentVal = [];

  function flush() {
    if (currentKey) {
      fields[currentKey.toLowerCase()] = currentVal.join('\n').trim();
    }
  }

  for (const line of lines) {
    if (/^\s*$/.test(line)) {
      flush();
      currentKey = null;
      currentVal = [];
      continue;
    }
    const kv = line.match(/^([A-Za-z][A-Za-z0-9._-]*):\s*(.*)/);
    if (kv) {
      flush();
      currentKey = kv[1];
      currentVal = [kv[2]];
    } else if (currentKey && /^\s/.test(line)) {
      currentVal.push(line.trim());
    }
  }
  flush();
  return fields;
}

// Parse a comma-separated dependency field, stripping version constraints.
// e.g. "dplyr (>= 1.0.0),\n    ggplot2" => [{name:'dplyr', ver:'(>= 1.0.0)'}, {name:'ggplot2', ver:''}]
function parseDeps(fieldText) {
  if (!fieldText) return [];
  return fieldText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^([^\s(]+)\s*(\([^)]*\))?/);
      return m ? { name: m[1], ver: m[2] || '' } : { name: s, ver: '' };
    })
    .filter((d) => d.name && d.name !== 'R');
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const f = parseDCF(text);

  const pkgName = f['package'] || '(unnamed)';
  const version = f['version'] || '';
  const title = f['title'] || '';
  const description = f['description'] || '';
  const license = f['license'] || '';
  const author = f['authors@r'] || f['author'] || f['maintainer'] || '';
  const maintainer = f['maintainer'] || '';
  const url = f['url'] || '';
  const depends = parseDeps(f['depends']);
  const imports = parseDeps(f['imports']);
  const suggests = parseDeps(f['suggests']);
  const rVersion = f['depends'] ? (f['depends'].match(/R\s*\([^)]+\)/) || [])[0] || '' : '';

  const host = document.createElement('div');
  host.className = 'rdesc-doc';

  let html = `<style>${CSS}</style>
<div class="rdesc-title"><span class="badge-rdesc">R Package</span>${esc(pkgName)}${version ? `<span style="font-size:14px;font-weight:400;color:var(--fg-2,#888);margin-left:8px">v${esc(version)}</span>` : ''}</div>`;

  if (title) html += `<div class="rdesc-subtitle">${esc(title)}</div>`;
  if (license) html += `<div class="rdesc-meta">License: <strong>${esc(license)}</strong></div>`;
  if (rVersion) html += `<div class="rdesc-meta">Requires: <strong>${esc(rVersion)}</strong></div>`;
  if (maintainer) html += `<div class="rdesc-meta">Maintainer: <strong>${esc(maintainer.replace(/<[^>]+>/, '').trim())}</strong></div>`;

  if (description) {
    const short = description.length > 300 ? description.slice(0, 300) + '…' : description;
    html += `<div class="rdesc-desc">${esc(short)}</div>`;
  }

  function depsSection(label, deps) {
    if (!deps.length) return '';
    const pills = deps.map((d) =>
      `<span class="rdesc-pill">${esc(d.name)}${d.ver ? `<span class="rdesc-pill-ver">${esc(d.ver)}</span>` : ''}</span>`
    ).join('');
    return `<div class="rdesc-sec"><h3>${esc(label)} (${deps.length})</h3><div class="rdesc-pills">${pills}</div></div>`;
  }

  html += depsSection('Imports', imports);
  html += depsSection('Depends', depends);
  html += depsSection('Suggests', suggests);

  if (url) {
    const urls = url.split(/[\s,]+/).filter(Boolean);
    html += `<div class="rdesc-sec"><h3>URL${urls.length > 1 ? 's' : ''}</h3>`;
    for (const u of urls) {
      html += `<div><a class="rdesc-url" href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a></div>`;
    }
    html += `</div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
