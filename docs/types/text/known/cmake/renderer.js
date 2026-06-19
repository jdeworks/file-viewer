const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cmake-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-cmake{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#064e8a;color:#fff;vertical-align:middle;margin-right:8px}
.cmake-title{font-size:18px;font-weight:700;margin:0 0 4px}
.cmake-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.cmake-sec{margin:12px 0}
.cmake-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.cmake-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.cmake-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.cmake-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.cmake-kind{font:11px ui-monospace,monospace;padding:1px 6px;border-radius:8px;background:#dbeafe;border:1px solid #93c5fd;color:#1e40af}
.cmake-pills{display:flex;flex-wrap:wrap;gap:6px}
.cmake-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.cmake-meta{font-size:13px;color:var(--fg-2,#888);margin:4px 0}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const lines = text.split('\n');

  // Extract cmake_minimum_required version
  let minVersion = null;
  for (const line of lines) {
    const m = /cmake_minimum_required\s*\(\s*VERSION\s+([\d.]+)/i.exec(line);
    if (m) { minVersion = m[1]; break; }
  }

  // Extract project name and optional language/version
  let projectName = null;
  let projectVersion = null;
  for (const line of lines) {
    const m = /^project\s*\(\s*([^\s)]+)/i.exec(line.trim());
    if (m) {
      projectName = m[1];
      const vm = /VERSION\s+([\d.]+)/i.exec(line);
      if (vm) projectVersion = vm[1];
      break;
    }
  }

  // Extract targets: add_executable, add_library
  const targets = [];
  const seenTargets = new Set();
  for (const line of lines) {
    const m = /^(add_executable|add_library)\s*\(\s*([^\s)]+)/i.exec(line.trim());
    if (m && !seenTargets.has(m[2])) {
      seenTargets.add(m[2]);
      targets.push({ name: m[2], kind: m[1].toLowerCase().replace('add_', '') });
    }
  }

  // Extract subdirectories
  const subdirs = [];
  for (const line of lines) {
    const m = /^add_subdirectory\s*\(\s*([^\s)]+)/i.exec(line.trim());
    if (m) subdirs.push(m[1]);
  }

  // Extract find_package calls
  const packages = [];
  const seenPkgs = new Set();
  for (const line of lines) {
    const m = /^find_package\s*\(\s*([^\s)]+)/i.exec(line.trim());
    if (m && !seenPkgs.has(m[1])) {
      seenPkgs.add(m[1]);
      packages.push(m[1]);
    }
  }

  const metaHtml = [
    minVersion ? `<div class="cmake-meta">CMake &ge; <strong>${esc(minVersion)}</strong></div>` : '',
    projectVersion ? `<div class="cmake-meta">Version: <strong>${esc(projectVersion)}</strong></div>` : '',
  ].join('');

  const targetsHtml = targets.length
    ? `<div class="cmake-sec"><h3>Targets (${targets.length})</h3><ul class="cmake-list">${targets.map((t) => `<li class="cmake-item"><span class="cmake-name">${esc(t.name)}</span><span class="cmake-kind">${esc(t.kind)}</span></li>`).join('')}</ul></div>`
    : '';

  const pkgsHtml = packages.length
    ? `<div class="cmake-sec"><h3>Dependencies (${packages.length})</h3><div class="cmake-pills">${packages.map((p) => `<span class="cmake-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const subdirsHtml = subdirs.length
    ? `<div class="cmake-sec"><h3>Subdirectories (${subdirs.length})</h3><div class="cmake-pills">${subdirs.map((d) => `<span class="cmake-pill">${esc(d)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'cmake-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cmake-title"><span class="badge-cmake">CMake</span>${esc(projectName || 'CMakeLists.txt')}</div>
<div class="cmake-sub">CMake build configuration</div>
${metaHtml}${targetsHtml}${pkgsHtml}${subdirsHtml}`;
  return { parentNode: host };
}
