const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.conan-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-conan{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e07b00;color:#fff;vertical-align:middle;margin-right:8px}
.conan-title{font-size:18px;font-weight:700;margin:0 0 4px}
.conan-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.conan-meta{font-size:13px;color:var(--fg-2,#888);margin:2px 0}
.conan-sec{margin:12px 0}
.conan-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.conan-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.conan-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);flex-wrap:wrap}
.conan-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.conan-ver{font:11px ui-monospace,monospace;padding:1px 6px;border-radius:8px;background:#fed7aa;border:1px solid #fb923c;color:#c2410c}
.conan-pills{display:flex;flex-wrap:wrap;gap:6px}
.conan-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.conan-hint{font-size:12px;color:var(--fg-2,#888)}
`;

// Parse conanfile.txt ini-style sections
function parseTxt(text) {
  const sections = {};
  let current = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const secMatch = /^\[([^\]]+)\]/.exec(line);
    if (secMatch) {
      current = secMatch[1].trim().toLowerCase();
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  }
  return sections;
}

// Parse a conan dep string like "boost/1.82.0" → { name, version }
function parseDep(dep) {
  const m = /^([^/@]+)\/([^\s@]+)/.exec(dep.trim());
  if (m) return { name: m[1], version: m[2] };
  return { name: dep.trim(), version: null };
}

// Parse conanfile.py for key attributes
function parsePy(text) {
  const result = { className: null, name: null, version: null, requires: [], buildRequires: [] };

  // class name
  const classM = /class\s+(\w+)\s*\(/.exec(text);
  if (classM) result.className = classM[1];

  // name = "..." or name = '...'
  const nameM = /\bname\s*=\s*["']([^"']+)["']/.exec(text);
  if (nameM) result.name = nameM[1];

  // version = "..." or version = '...'
  const verM = /\bversion\s*=\s*["']([^"']+)["']/.exec(text);
  if (verM) result.version = verM[1];

  // requires = [...] or requires = "pkg/ver"
  // Handle single string, list, and tuple forms
  const reqBlock = /\brequires\s*=\s*(\[[\s\S]*?\]|"[^"]*"|'[^']*'|\([^)]*\))/.exec(text);
  if (reqBlock) {
    const allDeps = [...reqBlock[1].matchAll(/["']([^"']+\/[^"']+)["']/g)];
    result.requires = allDeps.map((m) => parseDep(m[1]));
  }

  // build_requires = [...]
  const bReqBlock = /\bbuild_requires\s*=\s*(\[[\s\S]*?\]|"[^"]*"|'[^']*'|\([^)]*\))/.exec(text);
  if (bReqBlock) {
    const allDeps = [...bReqBlock[1].matchAll(/["']([^"']+\/[^"']+)["']/g)];
    result.buildRequires = allDeps.map((m) => parseDep(m[1]));
  }

  return result;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const filename = (intake.filename || '').split('/').pop() || 'conanfile';
  const isTxt = filename.toLowerCase() === 'conanfile.txt';

  const host = document.createElement('div');
  host.className = 'conan-doc';

  let html = `<style>${CSS}</style>`;
  html += `<div class="conan-title"><span class="badge-conan">Conan</span>${esc(filename)}</div>`;

  if (isTxt) {
    const sections = parseTxt(text);
    const requires = (sections.requires || []).filter(Boolean);
    const generators = (sections.generators || []).filter(Boolean);
    const options = (sections.options || []).filter(Boolean);
    const imports = (sections.imports || []).filter(Boolean);

    html += `<div class="conan-sub">Conan package manifest (INI format)</div>`;
    if (requires.length) html += `<div class="conan-meta">${requires.length} dependenc${requires.length === 1 ? 'y' : 'ies'}</div>`;

    if (requires.length) {
      html += `<div class="conan-sec"><h3>Requires (${requires.length})</h3><ul class="conan-list">`;
      for (const dep of requires) {
        const { name, version } = parseDep(dep);
        html += `<li class="conan-item"><span class="conan-name">${esc(name)}</span>`;
        if (version) html += `<span class="conan-ver">${esc(version)}</span>`;
        html += '</li>';
      }
      html += '</ul></div>';
    }

    if (generators.length) {
      html += `<div class="conan-sec"><h3>Generators</h3><div class="conan-pills">${generators.map((g) => `<span class="conan-pill">${esc(g)}</span>`).join('')}</div></div>`;
    }

    if (options.length) {
      html += `<div class="conan-sec"><h3>Options</h3><ul class="conan-list">`;
      for (const opt of options) {
        html += `<li class="conan-item"><span class="conan-hint" style="font-family:ui-monospace,monospace;font-size:12px">${esc(opt)}</span></li>`;
      }
      html += '</ul></div>';
    }

    if (imports.length) {
      html += `<div class="conan-sec"><h3>Imports</h3><ul class="conan-list">`;
      for (const imp of imports) {
        html += `<li class="conan-item"><span class="conan-hint" style="font-family:ui-monospace,monospace;font-size:12px">${esc(imp)}</span></li>`;
      }
      html += '</ul></div>';
    }
  } else {
    // conanfile.py
    const py = parsePy(text);
    const displayName = py.name || py.className || 'conanfile.py';

    html += `<div class="conan-sub">Conan package recipe (Python)</div>`;
    if (py.name) html += `<div class="conan-meta">Package: <strong>${esc(py.name)}</strong></div>`;
    if (py.version) html += `<div class="conan-meta">Version: <strong>${esc(py.version)}</strong></div>`;
    if (py.className) html += `<div class="conan-meta">Class: <code style="font-size:12px">${esc(py.className)}</code></div>`;

    const totalDeps = py.requires.length + py.buildRequires.length;
    if (totalDeps) html += `<div class="conan-meta">${totalDeps} dependenc${totalDeps === 1 ? 'y' : 'ies'}</div>`;

    if (py.requires.length) {
      html += `<div class="conan-sec"><h3>Requires (${py.requires.length})</h3><ul class="conan-list">`;
      for (const d of py.requires) {
        html += `<li class="conan-item"><span class="conan-name">${esc(d.name)}</span>`;
        if (d.version) html += `<span class="conan-ver">${esc(d.version)}</span>`;
        html += '</li>';
      }
      html += '</ul></div>';
    }

    if (py.buildRequires.length) {
      html += `<div class="conan-sec"><h3>Build Requires (${py.buildRequires.length})</h3><ul class="conan-list">`;
      for (const d of py.buildRequires) {
        html += `<li class="conan-item"><span class="conan-name">${esc(d.name)}</span>`;
        if (d.version) html += `<span class="conan-ver">${esc(d.version)}</span>`;
        html += '</li>';
      }
      html += '</ul></div>';
    }
  }

  host.innerHTML = html;
  return { parentNode: host };
}
