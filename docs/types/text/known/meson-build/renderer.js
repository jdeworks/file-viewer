const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.msn-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-msn{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1D4ED8;color:#fff;vertical-align:middle;margin-right:8px}
.msn-title{font-size:18px;font-weight:700;margin:0 0 4px}
.msn-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.msn-sec{margin:12px 0}
.msn-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.msn-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.msn-item{display:flex;align-items:baseline;gap:8px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.msn-name{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.msn-kind{font:11px ui-monospace,monospace;padding:1px 6px;border-radius:8px;background:#dbeafe;border:1px solid #93c5fd;color:#1e40af}
.msn-pills{display:flex;flex-wrap:wrap;gap:6px}
.msn-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.msn-meta{font-size:13px;color:var(--fg-2,#888);margin:3px 0}
`;

function extractFirstString(line) {
  const m = /['"]((?:[^'"\\]|\\.)+)['"]/.exec(line);
  return m ? m[1] : null;
}

function extractCall(text, fn) {
  // Find all occurrences of fn( and extract first string arg
  const results = [];
  const seen = new Set();
  const re = new RegExp(fn + '\\s*\\(', 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    const rest = text.slice(m.index);
    const name = extractFirstString(rest);
    if (name && !seen.has(name)) { seen.add(name); results.push(name); }
  }
  return results;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const filename = (intake.filename || '').split('/').pop().toLowerCase();

  // project() — extract name and version
  let projectName = null;
  let projectVersion = null;
  let mesonVersion = null;
  let languages = [];
  const projMatch = /project\s*\(\s*['"]([^'"]+)['"]([^)]*)\)/s.exec(text);
  if (projMatch) {
    projectName = projMatch[1];
    const rest = projMatch[2];
    const verM = /version\s*:\s*['"]([^'"]+)['"]/.exec(rest);
    if (verM) projectVersion = verM[1];
    const mvM = /meson_version\s*:\s*['"]([^'"]+)['"]/.exec(rest);
    if (mvM) mesonVersion = mvM[1];
    // languages: look for quoted strings that look like lang codes
    const langRe = /['"](c|cpp|c\+\+|d|fortran|java|objc|objcpp|rust|vala|cs|nasm|python)['"]/gi;
    let lm;
    while ((lm = langRe.exec(rest)) !== null) languages.push(lm[1]);
  }

  // executables
  const executables = extractCall(text, 'executable');

  // libraries (shared, static, or generic)
  const sharedLibs = extractCall(text, 'shared_library');
  const staticLibs = extractCall(text, 'static_library');
  const genericLibs = extractCall(text, 'library').filter((l) => !sharedLibs.includes(l) && !staticLibs.includes(l));
  const allLibs = [
    ...sharedLibs.map((n) => ({ name: n, kind: 'shared' })),
    ...staticLibs.map((n) => ({ name: n, kind: 'static' })),
    ...genericLibs.map((n) => ({ name: n, kind: 'library' })),
  ];

  // dependencies
  const deps = extractCall(text, 'dependency');
  const programs = extractCall(text, 'find_program');

  // subdir
  const subdirs = extractCall(text, 'subdir');

  // tests
  const tests = extractCall(text, 'test');

  const parts = [];
  if (projectName) parts.push(projectName + (projectVersion ? ` ${projectVersion}` : ''));
  if (languages.length) parts.push(languages.join(', '));
  if (executables.length) parts.push(`${executables.length} executable${executables.length !== 1 ? 's' : ''}`);
  if (allLibs.length) parts.push(`${allLibs.length} lib${allLibs.length !== 1 ? 's' : ''}`);

  const metaHtml = [
    projectVersion ? `<div class="msn-meta">Version: <strong>${esc(projectVersion)}</strong></div>` : '',
    mesonVersion ? `<div class="msn-meta">Meson &ge; <strong>${esc(mesonVersion)}</strong></div>` : '',
    languages.length ? `<div class="msn-meta">Languages: <strong>${languages.map(esc).join(', ')}</strong></div>` : '',
  ].filter(Boolean).join('');

  const execHtml = executables.length
    ? `<div class="msn-sec"><h3>Executables (${executables.length})</h3><ul class="msn-list">${executables.map((e) => `<li class="msn-item"><span class="msn-name">${esc(e)}</span><span class="msn-kind">executable</span></li>`).join('')}</ul></div>`
    : '';

  const libsHtml = allLibs.length
    ? `<div class="msn-sec"><h3>Libraries (${allLibs.length})</h3><ul class="msn-list">${allLibs.map((l) => `<li class="msn-item"><span class="msn-name">${esc(l.name)}</span><span class="msn-kind">${esc(l.kind)}</span></li>`).join('')}</ul></div>`
    : '';

  const depsHtml = (deps.length || programs.length)
    ? `<div class="msn-sec"><h3>Dependencies (${deps.length + programs.length})</h3><div class="msn-pills">
        ${deps.map((d) => `<span class="msn-pill">${esc(d)}</span>`).join('')}
        ${programs.map((p) => `<span class="msn-pill">${esc(p)}</span>`).join('')}
      </div></div>`
    : '';

  const subdirsHtml = subdirs.length
    ? `<div class="msn-sec"><h3>Subdirectories (${subdirs.length})</h3><div class="msn-pills">${subdirs.map((d) => `<span class="msn-pill">${esc(d)}</span>`).join('')}</div></div>`
    : '';

  const testsHtml = tests.length
    ? `<div class="msn-sec"><h3>Tests (${tests.length})</h3><div class="msn-pills">${tests.map((t) => `<span class="msn-pill">${esc(t)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'msn-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="msn-title"><span class="badge-msn">Meson</span>${esc(projectName || filename)}</div>
<div class="msn-sub">${parts.length ? parts.join(' · ') : 'Meson build configuration'}</div>
${metaHtml}${execHtml}${libsHtml}${depsHtml}${subdirsHtml}${testsHtml}`;
  return { parentNode: host };
}
