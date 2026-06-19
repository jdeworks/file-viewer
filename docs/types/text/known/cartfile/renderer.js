const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-cf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c0392b;color:#fff;vertical-align:middle;margin-right:8px}
.cf-title{font-size:18px;font-weight:700;margin:0 0 4px}
.cf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.cf-sec{margin:14px 0}
.cf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;display:flex;align-items:center;gap:6px}
.cf-count{font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:0 6px;color:var(--fg-2,#888)}
.cf-table{width:100%;border-collapse:collapse;font-size:13px}
.cf-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.cf-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px}
.cf-table tr:last-child td{border-bottom:none}
.cf-kind{display:inline-block;font-size:10px;padding:1px 6px;border-radius:5px;font-weight:600}
.cf-kind-github{background:#dbeafe;border:1px solid #93c5fd;color:#1e40af}
.cf-kind-git{background:#d1fae5;border:1px solid #6ee7b7;color:#065f46}
.cf-kind-binary{background:#fef3c7;border:1px solid #fcd34d;color:#92400e}
.cf-ver{color:var(--fg-2,#888);font-size:11px}
.cf-link{color:#0969da;text-decoration:none}
.cf-link:hover{text-decoration:underline}
.cf-note{color:var(--fg-2,#888);font-size:13px;font-style:italic}
`;

function parseDeps(text) {
  const deps = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    let m;
    // github "Owner/Repo" constraint
    if ((m = line.match(/^github\s+"([^"]+)"\s*(.*)/i))) {
      const repo = m[1];
      const constraint = m[2].replace(/^["']|["']$/g, '').trim();
      deps.push({ kind: 'github', name: repo, constraint, url: `https://github.com/${repo}` });
    // git "url" constraint
    } else if ((m = line.match(/^git\s+"([^"]+)"\s*(.*)/i))) {
      const url = m[1];
      const constraint = m[2].replace(/^["']|["']$/g, '').trim();
      const name = url.replace(/\.git$/, '').split('/').pop();
      deps.push({ kind: 'git', name, constraint, url });
    // binary "url" constraint
    } else if ((m = line.match(/^binary\s+"([^"]+)"\s*(.*)/i))) {
      const url = m[1];
      const constraint = m[2].replace(/^["']|["']$/g, '').trim();
      const name = url.split('/').pop().replace(/\.json$/, '');
      deps.push({ kind: 'binary', name, constraint, url });
    }
  }
  return deps;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const filename = (intake.name || intake.filename || 'Cartfile').split('/').pop();
  const isResolved = filename.toLowerCase() === 'cartfile.resolved';
  const deps = parseDeps(text);

  const byKind = { github: [], git: [], binary: [] };
  for (const d of deps) (byKind[d.kind] || []).push(d);

  function section(title, list) {
    if (!list.length) return '';
    const rows = list.map((d) => {
      const nameCell = d.url
        ? `<a class="cf-link" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">${esc(d.name)}</a>`
        : esc(d.name);
      return `<tr><td>${nameCell}</td><td><span class="cf-ver">${esc(d.constraint) || '<i>any</i>'}</span></td></tr>`;
    }).join('');
    return `<div class="cf-sec"><h3>${title} <span class="cf-count">${list.length}</span></h3>
<table class="cf-table"><thead><tr><th>Package</th><th>${isResolved ? 'Pinned Version' : 'Constraint'}</th></tr></thead>
<tbody>${rows}</tbody></table></div>`;
  }

  const host = document.createElement('div');
  host.className = 'cf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cf-title"><span class="badge-cf">Carthage</span>${esc(filename)}</div>
<div class="cf-sub">${deps.length} dependenc${deps.length !== 1 ? 'ies' : 'y'}${isResolved ? ' · pinned' : ''}</div>
${deps.length === 0 ? '<p class="cf-note">No dependencies found.</p>' : ''}
${section('GitHub', byKind.github)}
${section('Git', byKind.git)}
${section('Binary', byKind.binary)}`;
  return { parentNode: host };
}
