// Nimble package manifest (.nimble) viewer. Parses the NimScript metadata assignments and
// `requires` declarations with regex. Pure text parsing — no eval, no execution.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nmb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-nmb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ffc200;color:#1a1a1a;vertical-align:middle;margin-right:8px}
.nmb-title{font-size:18px;font-weight:700;margin:0 0 2px}
.nmb-ver{font-size:13px;color:var(--fg-2,#888);margin:0 0 4px}
.nmb-summary{font-size:13px;margin:0 0 12px;color:var(--fg,#24292f)}
.nmb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.nmb-meta-row{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.nmb-meta-chip{font-size:12px;padding:3px 10px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)}
.nmb-sec{margin:12px 0}
.nmb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;display:flex;align-items:center;gap:6px}
.nmb-count{font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:0 6px;color:var(--fg-2,#888)}
.nmb-table{width:100%;border-collapse:collapse;font-size:12px}
.nmb-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.nmb-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px}
.nmb-table tr:last-child td{border-bottom:none}
.nmb-pills{display:flex;flex-wrap:wrap;gap:6px}
.nmb-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
`;

function strVal(text, key) {
  const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, 'm'));
  return m ? m[1] : null;
}

function arrVal(text, key) {
  const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*@\\[([^\\]]*)\\]`, 'm'));
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

function parseRequires(text) {
  const deps = [];
  const re = /^\s*requires\s+"([^"]+)"/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const spec = m[1].trim();
    const dm = /^([^\s><=!~]+)\s*(.*)$/.exec(spec);
    deps.push({ name: dm ? dm[1] : spec, constraint: dm && dm[2] ? dm[2].trim() : '' });
  }
  return deps;
}

function parseTasks(text) {
  const tasks = [];
  const re = /^\s*task\s+([a-zA-Z_]\w*)\s*,\s*"([^"]*)"/gm;
  let m;
  while ((m = re.exec(text)) !== null) tasks.push({ name: m[1], desc: m[2] });
  return tasks;
}

export function render(intake) {
  const text = intake.text || '';

  const version = strVal(text, 'version');
  const author = strVal(text, 'author');
  const description = strVal(text, 'description');
  const license = strVal(text, 'license');
  const srcDir = strVal(text, 'srcDir');
  const bins = arrVal(text, 'bin');
  const deps = parseRequires(text);
  const tasks = parseTasks(text);

  const pkgName = (intake.filename || intake.name || '').split('/').pop().replace(/\.nimble$/i, '') || 'Nimble package';

  const metaChips = [
    license && `<span class="nmb-meta-chip">⚖ ${esc(license)}</span>`,
    author && `<span class="nmb-meta-chip">${esc(author)}</span>`,
    srcDir && `<span class="nmb-meta-chip">src: ${esc(srcDir)}</span>`,
  ].filter(Boolean).join('');

  const depsHtml = deps.length
    ? `<div class="nmb-sec"><h3>Dependencies <span class="nmb-count">${deps.length}</span></h3><table class="nmb-table"><thead><tr><th>Package</th><th>Constraint</th></tr></thead><tbody>${deps.map((d) => `<tr><td>${esc(d.name)}</td><td>${esc(d.constraint) || '<span style="color:var(--fg-2,#888)">(any)</span>'}</td></tr>`).join('')}</tbody></table></div>`
    : '';

  const binsHtml = bins.length
    ? `<div class="nmb-sec"><h3>Binaries <span class="nmb-count">${bins.length}</span></h3><div class="nmb-pills">${bins.map((b) => `<span class="nmb-pill">${esc(b)}</span>`).join('')}</div></div>`
    : '';

  const tasksHtml = tasks.length
    ? `<div class="nmb-sec"><h3>Tasks <span class="nmb-count">${tasks.length}</span></h3><table class="nmb-table"><thead><tr><th>Task</th><th>Description</th></tr></thead><tbody>${tasks.map((t) => `<tr><td>${esc(t.name)}</td><td>${esc(t.desc)}</td></tr>`).join('')}</tbody></table></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'nmb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nmb-title"><span class="badge-nmb">nimble</span>${esc(pkgName)}</div>
${version ? `<div class="nmb-ver">v${esc(version)}</div>` : ''}
${description ? `<div class="nmb-summary">${esc(description)}</div>` : ''}
${metaChips ? `<div class="nmb-meta-row">${metaChips}</div>` : ''}
${depsHtml}${binsHtml}${tasksHtml}`;

  return { parentNode: host };
}
