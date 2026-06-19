const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function topScalar(text, key) {
  const m = text.match(new RegExp('^' + key + '\\s*=\\s*["\']?([^"\'\\n]+)["\']?', 'm'));
  return m ? m[1].trim() : null;
}

function sectionContent(text, section) {
  const re = new RegExp('^\\[' + section.replace('.', '\\.') + '\\]\\s*\\n(((?!\\[)[\\s\\S])*)', 'm');
  const m = text.match(re);
  return m ? m[1] : '';
}

function parseInlineDeps(block) {
  const deps = [];
  const lineRe = /^(\S+)\s*=\s*["']([^"']*)["']/gm;
  let m;
  while ((m = lineRe.exec(block)) !== null) deps.push({ name: m[1], spec: m[2] });
  return deps;
}

function parsePypaDepsList(block) {
  const deps = [];
  const re = /["']([a-zA-Z0-9_.\-]+)([^"']*)?["']/g;
  let m;
  while ((m = re.exec(block)) !== null) deps.push({ name: m[1], spec: m[2]?.trim() || '' });
  return deps;
}

const CSS = `
.ppy-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pyproject{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3776ab;color:#ffd343;vertical-align:middle;margin-right:8px;}
.ppy-name{font-size:18px;font-weight:700;margin:0 0 2px;}
.ppy-meta{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.ppy-sec{margin:12px 0;}
.ppy-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ppy-tools{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;}
.ppy-tool{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.ppy-deps{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0;}
.ppy-dep{font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.ppy-dep .ver{color:var(--fg-2,#888);font-size:11px;}
.ppy-build{font-size:12px;padding:6px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:4px 0;}
.ppy-kv{font-size:12px;color:var(--fg-2,#888);}
`;

export function render(intake) {
  const text = intake.text || '';

  // [project] section
  const projectBlock = sectionContent(text, 'project');
  const name = topScalar(projectBlock, 'name') || topScalar(text, 'name') || '—';
  const version = topScalar(projectBlock, 'version') || '—';
  const description = topScalar(projectBlock, 'description') || '';
  const pyReq = topScalar(projectBlock, 'requires-python') || '';
  const license = topScalar(projectBlock, 'license') || '';

  // [build-system]
  const buildBlock = sectionContent(text, 'build-system');
  const buildBackend = topScalar(buildBlock, 'build-backend') || '';
  const requiresM = buildBlock.match(/requires\s*=\s*\[([^\]]*)\]/s);
  const buildRequires = requiresM ? requiresM[1].replace(/["'\s]/g, '').split(',').filter(Boolean) : [];

  // dependencies
  const depsM = projectBlock.match(/^dependencies\s*=\s*\[([^\]]*)\]/ms);
  const deps = depsM ? parsePypaDepsList(depsM[1]) : [];

  // optional-dependencies
  const optM = [...text.matchAll(/^\[project\.optional-dependencies\.(\w+)\]/gm)];
  const optionalGroups = optM.map((m) => m[1]);

  // tool sections
  const toolSections = [...text.matchAll(/^\[tool\.(\w+)/gm)].map((m) => m[1]);
  const uniqueTools = [...new Set(toolSections)];

  // Poetry-style [tool.poetry.dependencies]
  const poetryDepBlock = sectionContent(text, 'tool.poetry.dependencies');
  const poetryDeps = poetryDepBlock ? parseInlineDeps(poetryDepBlock) : [];
  const poetryDevBlock = sectionContent(text, 'tool.poetry.dev-dependencies');
  const poetryDevDeps = poetryDevBlock ? parseInlineDeps(poetryDevBlock) : [];

  const allDeps = deps.length ? deps : poetryDeps;
  const devDeps = poetryDevDeps;

  const host = document.createElement('div');
  host.className = 'ppy-doc';

  const toolChips = uniqueTools.length
    ? `<div class="ppy-sec"><h3>Tool configs (${uniqueTools.length})</h3><div class="ppy-tools">${uniqueTools.map((t) => `<span class="ppy-tool">${esc(t)}</span>`).join('')}</div></div>`
    : '';

  const depsHtml = allDeps.length
    ? `<div class="ppy-sec"><h3>Dependencies (${allDeps.length})</h3><div class="ppy-deps">${allDeps.map((d) => `<span class="ppy-dep">${esc(d.name)}${d.spec ? ` <span class="ver">${esc(d.spec)}</span>` : ''}</span>`).join('')}</div></div>`
    : '';

  const devHtml = devDeps.length
    ? `<div class="ppy-sec"><h3>Dev Dependencies (${devDeps.length})</h3><div class="ppy-deps">${devDeps.map((d) => `<span class="ppy-dep">${esc(d.name)}${d.spec ? ` <span class="ver">${esc(d.spec)}</span>` : ''}</span>`).join('')}</div></div>`
    : '';

  const buildHtml = buildBackend
    ? `<div class="ppy-sec"><h3>Build system</h3><div class="ppy-build"><strong>${esc(buildBackend)}</strong>${buildRequires.length ? `<span class="ppy-kv"> · requires: ${buildRequires.map(esc).join(', ')}</span>` : ''}</div></div>`
    : '';

  const optHtml = optionalGroups.length
    ? `<div class="ppy-sec"><h3>Optional groups</h3><div class="ppy-tools">${optionalGroups.map((g) => `<span class="ppy-tool">${esc(g)}</span>`).join('')}</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="ppy-name"><span class="badge-pyproject">Python</span>${esc(name)}</div>
<div class="ppy-meta">${version !== '—' ? `v${esc(version)}` : ''}${pyReq ? ` · Python ${esc(pyReq)}` : ''}${license ? ` · ${esc(license)}` : ''}</div>
${description ? `<div class="ppy-kv">${esc(description)}</div>` : ''}
${buildHtml}
${depsHtml}
${devHtml}
${optHtml}
${toolChips}`;

  return { parentNode: host };
}
