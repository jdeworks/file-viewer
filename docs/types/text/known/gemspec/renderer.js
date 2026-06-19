const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gem-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gem{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc0000;color:#fff;vertical-align:middle;margin-right:8px;}
.gem-title{font-size:18px;font-weight:700;margin:0 0 2px;}
.gem-ver{font-size:13px;color:var(--fg-2,#888);margin:0 0 4px;}
.gem-summary{font-size:13px;margin:0 0 12px;color:var(--fg,#24292f);}
.gem-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.gem-sec{margin:12px 0;}
.gem-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;display:flex;align-items:center;gap:6px;}
.gem-count{font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:0 6px;color:var(--fg-2,#888);}
.gem-pills{display:flex;flex-wrap:wrap;gap:6px;}
.gem-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.gem-table{width:100%;border-collapse:collapse;font-size:12px;}
.gem-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.gem-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;}
.gem-tag-dev{display:inline-block;font-size:10px;padding:1px 5px;border-radius:5px;background:#fef3c7;border:1px solid #fcd34d;color:#92400e;font-weight:600;margin-left:4px;}
.gem-meta-row{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px;}
.gem-meta-chip{font-size:12px;padding:3px 10px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.gem-link{color:#0969da;text-decoration:none;font-size:12px;}
.gem-link:hover{text-decoration:underline;}
`;

function strVal(text, key) {
  // matches: spec.key = "value" or spec.key = 'value'
  const m = text.match(new RegExp(`\\.${key}\\s*=\\s*["']([^"']+)["']`));
  return m ? m[1] : null;
}

function arrVal(text, key) {
  // matches: spec.key = ["a", "b"] or spec.key = ['a', 'b']
  const m = text.match(new RegExp(`\\.${key}\\s*=\\s*\\[([^\\]]+)\\]`));
  if (!m) return [];
  return [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]);
}

function depList(text, method) {
  // matches: spec.add_dependency "name", ">= 1.0"  (or single/double quotes)
  const re = new RegExp(`\\.${method}\\s+["']([^"']+)["']([^\\n]*)`, 'g');
  const deps = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    const rest = m[2];
    const cons = [...rest.matchAll(/["']([><=~!][^"']*|[\d][^"']+)["']/g)].map((x) => x[1]);
    deps.push({ name, constraint: cons.join(', ') });
  }
  return deps;
}

export function render(intake) {
  const text = intake.text || '';

  const name = strVal(text, 'name');
  const version = strVal(text, 'version');
  const summary = strVal(text, 'summary');
  const description = strVal(text, 'description');
  const homepage = strVal(text, 'homepage');
  const license = strVal(text, 'license');
  const rubyVersion = strVal(text, 'required_ruby_version');
  const authors = arrVal(text, 'authors');
  const emails = arrVal(text, 'email');
  const runtimeDeps = depList(text, 'add_dependency');
  const devDeps = depList(text, 'add_development_dependency');

  const metaChips = [
    license && `<span class="gem-meta-chip">⚖ ${esc(license)}</span>`,
    rubyVersion && `<span class="gem-meta-chip">ruby ${esc(rubyVersion)}</span>`,
    homepage && `<a class="gem-link gem-meta-chip" href="${esc(homepage)}" target="_blank" rel="noopener noreferrer">${esc(homepage.replace(/^https?:\/\//, ''))} ↗</a>`,
  ].filter(Boolean).join('');

  const authorsHtml = authors.length
    ? `<div class="gem-sec"><h3>Authors <span class="gem-count">${authors.length}</span></h3><div class="gem-pills">${authors.map((a) => `<span class="gem-pill">${esc(a)}</span>`).join('')}</div></div>`
    : '';

  const emailsHtml = emails.length
    ? `<div class="gem-sec"><h3>Emails</h3><div class="gem-pills">${emails.map((e) => `<span class="gem-pill">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  function depTable(deps, isDev) {
    if (!deps.length) return '';
    const tag = isDev ? '<span class="gem-tag-dev">dev</span>' : '';
    const rows = deps.map((d) => `<tr><td>${esc(d.name)}${tag}</td><td>${esc(d.constraint) || '<span style="color:var(--fg-2,#888)">(any)</span>'}</td></tr>`).join('');
    const title = isDev ? 'Development Dependencies' : 'Runtime Dependencies';
    return `<div class="gem-sec"><h3>${title} <span class="gem-count">${deps.length}</span></h3><table class="gem-table"><thead><tr><th>Gem</th><th>Constraint</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const host = document.createElement('div');
  host.className = 'gem-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gem-title"><span class="badge-gem">gem</span>${esc(name || intake.filename || 'Gemspec')}</div>
${version ? `<div class="gem-ver">v${esc(version)}</div>` : ''}
${summary ? `<div class="gem-summary">${esc(summary)}</div>` : ''}
${description && description !== summary ? `<div class="gem-sub">${esc(description)}</div>` : ''}
${metaChips ? `<div class="gem-meta-row">${metaChips}</div>` : ''}
${authorsHtml}${emailsHtml}
${depTable(runtimeDeps, false)}
${depTable(devDeps, true)}`;
  return { parentNode: host };
}
