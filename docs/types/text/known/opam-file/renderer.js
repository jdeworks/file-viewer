const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function safeHref(url) {
  if (typeof url !== 'string') return null;
  return /^https?:\/\//i.test(url.trim()) ? url : null;
}

const CSS = `
.opam-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-opam{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c47d29;color:#fff;vertical-align:middle;margin-right:8px}
.opam-title{font-size:18px;font-weight:700;margin:0 0 4px}
.opam-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.opam-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin-left:6px;vertical-align:middle;font-family:ui-monospace,monospace}
.opam-sec{margin:12px 0}
.opam-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.opam-meta{font-size:13px;color:var(--fg,#24292f);margin:3px 0}
.opam-meta span{color:var(--fg-2,#888);margin-right:6px}
.opam-meta a{color:var(--accent,#0969da);text-decoration:none}
.opam-meta a:hover{text-decoration:underline}
.opam-synopsis{font-size:13px;margin:6px 0;color:var(--fg,#24292f)}
.opam-authors{font-size:13px;color:var(--fg-2,#888);margin:3px 0}
.opam-table{width:100%;border-collapse:collapse;font-size:13px}
.opam-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:2px solid var(--border,#e0e0e0)}
.opam-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:baseline}
.opam-table tr:last-child td{border-bottom:none}
.opam-pkg{font-family:ui-monospace,monospace;font-size:12px;font-weight:600;color:var(--accent,#0969da)}
.opam-ver{font-family:ui-monospace,monospace;font-size:11px;color:var(--fg-2,#888)}
.opam-flag{display:inline-block;font-size:10px;padding:1px 5px;border-radius:6px;margin-left:4px;vertical-align:middle}
.opam-flag-test{background:#fff3cd;border:1px solid #f0ad4e;color:#856404}
.opam-flag-doc{background:#d1ecf1;border:1px solid #17a2b8;color:#0c5460}
.opam-cmds{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:3px}
.opam-cmd{font-family:ui-monospace,monospace;font-size:12px;padding:4px 10px;background:var(--bg-2,#f6f8fa);border-radius:6px;color:var(--fg,#24292f)}
`;

function extractScalar(text, key) {
  const re = new RegExp('^' + key + ':\\s*"([^"]*)"', 'im');
  const m = re.exec(text);
  return m ? m[1].trim() : null;
}

function extractMultiline(text, key) {
  // Handles triple-quote blocks: key: """..."""
  const re = new RegExp('^' + key + ':\\s*"""([\\s\\S]*?)"""', 'im');
  const m = re.exec(text);
  if (m) return m[1].trim();
  return extractScalar(text, key);
}

function extractList(text, key) {
  // Handles [ "a" "b" ] blocks
  const re = new RegExp('^' + key + ':\\s*\\[([\\s\\S]*?)\\]', 'im');
  const m = re.exec(text);
  if (!m) {
    // single value
    const s = extractScalar(text, key);
    return s ? [s] : [];
  }
  const items = [];
  const inner = m[1];
  const itemRe = /"([^"]*)"/g;
  let im;
  while ((im = itemRe.exec(inner)) !== null) items.push(im[1]);
  return items;
}

function extractDepends(text) {
  // Extract the depends [ ... ] block
  const re = /^depends:\s*\[([^\]]*(?:\[[^\]]*\][^\]]*)*)\]/im;
  const m = re.exec(text);
  if (!m) return [];
  const block = m[1];
  const deps = [];
  // Each dep line: "pkgname" {constraint}
  const lineRe = /"([^"]+)"(?:\s*\{([^}]*)\})?/g;
  let lm;
  while ((lm = lineRe.exec(block)) !== null) {
    const name = lm[1];
    const constraint = lm[2] ? lm[2].trim() : '';
    const isTest = /with-test/.test(constraint);
    const isDoc = /with-doc/.test(constraint);
    // Extract version part (strip with-test/with-doc/& qualifiers)
    const ver = constraint
      .replace(/with-test|with-doc|&|\|/g, '')
      .replace(/^\s*[{(]|[})\s]+$/g, '')
      .trim();
    deps.push({ name, ver, isTest, isDoc });
  }
  return deps;
}

function extractBuildCmds(text) {
  const re = /^build:\s*\[([^\]]*(?:\[[^\]]*\][^\]]*)*)\]/im;
  const m = re.exec(text);
  if (!m) return [];
  const block = m[1];
  // Each command is a bracketed list like ["dune" "build" ...] {optional}
  const cmdRe = /\[([^\]]+)\](?:\s*\{[^}]*\})?/g;
  const cmds = [];
  let cm;
  while ((cm = cmdRe.exec(block)) !== null) {
    const parts = [];
    const partRe = /"([^"]*)"|(\S+)/g;
    let pm;
    const inner = cm[1];
    while ((pm = partRe.exec(inner)) !== null) {
      parts.push(pm[1] !== undefined ? pm[1] : pm[2]);
    }
    if (parts.length) cmds.push(parts.join(' '));
  }
  return cmds;
}

export function render(intake) {
  const text = intake.text || '';

  const name = extractScalar(text, 'name') || (intake.name || intake.filename || '').split('/').pop().replace(/\.opam$/, '') || 'opam package';
  const version = extractScalar(text, 'version') || '';
  const synopsis = extractMultiline(text, 'synopsis') || '';
  const license = extractScalar(text, 'license') || '';
  const maintainer = extractScalar(text, 'maintainer') || '';
  const homepage = extractScalar(text, 'homepage') || '';
  const bugReports = extractScalar(text, 'bug-reports') || '';
  const authors = extractList(text, 'authors');
  const deps = extractDepends(text);
  const buildCmds = extractBuildCmds(text);

  // Deps table
  const depsRows = deps.map((d) => {
    const flags = [
      d.isTest ? `<span class="opam-flag opam-flag-test">with-test</span>` : '',
      d.isDoc ? `<span class="opam-flag opam-flag-doc">with-doc</span>` : '',
    ].join('');
    return `<tr>
      <td><span class="opam-pkg">${esc(d.name)}</span></td>
      <td><span class="opam-ver">${esc(d.ver)}</span></td>
      <td>${flags}</td>
    </tr>`;
  }).join('');

  const depsSection = deps.length ? `
<div class="opam-sec">
  <h3>Dependencies (${deps.length})</h3>
  <table class="opam-table">
    <thead><tr><th>Package</th><th>Constraint</th><th>Flags</th></tr></thead>
    <tbody>${depsRows}</tbody>
  </table>
</div>` : '';

  // Build commands
  const cmdsHtml = buildCmds.length ? `
<div class="opam-sec">
  <h3>Build</h3>
  <ul class="opam-cmds">
    ${buildCmds.map((c) => `<li class="opam-cmd">${esc(c)}</li>`).join('')}
  </ul>
</div>` : '';

  // Identity info
  const identRows = [
    synopsis ? `<div class="opam-synopsis">${esc(synopsis)}</div>` : '',
    maintainer ? `<div class="opam-meta"><span>Maintainer</span>${esc(maintainer)}</div>` : '',
    authors.length ? `<div class="opam-authors"><span style="color:var(--fg-2,#888);margin-right:6px">Authors</span>${authors.map(esc).join(', ')}</div>` : '',
    license ? `<div class="opam-meta"><span>License</span>${esc(license)}</div>` : '',
    homepage ? (safeHref(homepage) ? `<div class="opam-meta"><span>Homepage</span><a href="${esc(safeHref(homepage))}" target="_blank" rel="noopener">${esc(homepage)}</a></div>` : `<div class="opam-meta"><span>Homepage</span>${esc(homepage)}</div>`) : '',
    bugReports ? (safeHref(bugReports) ? `<div class="opam-meta"><span>Bug reports</span><a href="${esc(safeHref(bugReports))}" target="_blank" rel="noopener">${esc(bugReports)}</a></div>` : `<div class="opam-meta"><span>Bug reports</span>${esc(bugReports)}</div>`) : '',
  ].filter(Boolean).join('');

  const identSection = identRows ? `<div class="opam-sec">${identRows}</div>` : '';

  const host = document.createElement('div');
  host.className = 'opam-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="opam-title"><span class="badge-opam">opam</span>${esc(name)}${version ? `<span class="opam-chip">${esc(version)}</span>` : ''}</div>
<div class="opam-sub">${deps.length} dependenc${deps.length !== 1 ? 'ies' : 'y'}${buildCmds.length ? ` · ${buildCmds.length} build step${buildCmds.length !== 1 ? 's' : ''}` : ''}</div>
${identSection}
${depsSection}
${cmdsHtml}`;

  return { parentNode: host };
}
