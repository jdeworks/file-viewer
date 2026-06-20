const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ps-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ps-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.badge-ps{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#6F42C1;color:#fff;vertical-align:middle;}
.ps-title{font-size:18px;font-weight:700;margin:0;}
.ps-sub{font-size:12px;color:var(--fg-2,#888);margin:2px 0 0;}
.ps-sec{margin-top:16px;}
.ps-sec h3{font-size:12px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.ps-card{border:1px solid var(--border,#e8eaed);border-radius:6px;padding:8px 12px;}
.ps-kv{display:flex;gap:10px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#eaecef);}
.ps-kv:last-child{border-bottom:none;}
.ps-kv-k{font-family:ui-monospace,monospace;font-weight:600;min-width:160px;flex-shrink:0;color:var(--fg,#24292f);}
.ps-kv-v{font-family:ui-monospace,monospace;color:var(--fg-2,#888);}
.ps-pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.ps-pill.err1{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.ps-pill.err2{background:#ffedd5;border-color:#fdba74;color:#9a3412;}
.ps-pill.err3{background:#fef9c3;border-color:#fde047;color:#713f12;}
.ps-pill.err4,.ps-pill.err5{background:#f0fdf4;border-color:#86efac;color:#166534;}
.ps-pill.plugin{background:#ede9fe;border-color:#c4b5fd;color:#4c1d95;}
.ps-pill.stub{background:#e0f2fe;border-color:#7dd3fc;color:#0c4a6e;}
.ps-pill.issue{background:#f1f5f9;border-color:#cbd5e1;color:#475569;}
.ps-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.ps-err{color:#c62828;font-size:13px;}
`;

function attr(el, name) { return el.getAttribute(name); }

function getChildren(el, tag) {
  return [...el.getElementsByTagName(tag)];
}

function errorLevelChip(level) {
  const n = parseInt(level, 10);
  const cls = isNaN(n) ? '' : n <= 2 ? 'err1' : n === 3 ? 'err3' : n <= 5 ? 'err4' : 'err5';
  return `<span class="ps-pill ${cls}">errorLevel ${esc(level)}</span>`;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const host = document.createElement('div');
  host.className = 'ps-doc';

  let doc;
  try { doc = new DOMParser().parseFromString(text, 'text/xml'); } catch (e) {
    host.innerHTML = `<style>${CSS}</style><p class="ps-err">Failed to parse XML: ${esc(String(e))}</p>`;
    return { parentNode: host };
  }
  if (doc.getElementsByTagName('parsererror').length) {
    host.innerHTML = `<style>${CSS}</style><p class="ps-err">Could not parse psalm.xml as XML.</p>`;
    return { parentNode: host };
  }

  const root = doc.documentElement;
  const errorLevel = attr(root, 'errorLevel') || attr(root, 'error-level') || '';
  const phpVersion = attr(root, 'phpVersion') || attr(root, 'php-version') || '';
  const resolveFromConfigFile = attr(root, 'resolveFromConfigFile') || '';
  const totallyTyped = attr(root, 'totallyTyped') || '';
  const findUnusedPsalmSuppress = attr(root, 'findUnusedPsalmSuppress') || '';

  // Project roots / includes
  const projectFilesEls = getChildren(root, 'projectFiles');
  const directories = [];
  const fileIncludes = [];
  if (projectFilesEls.length) {
    for (const d of getChildren(projectFilesEls[0], 'directory')) {
      directories.push(attr(d, 'name') || d.textContent.trim());
    }
    for (const f of getChildren(projectFilesEls[0], 'file')) {
      fileIncludes.push(attr(f, 'name') || f.textContent.trim());
    }
  }

  // Stubs
  const stubsEls = getChildren(root, 'stubs');
  const stubs = [];
  if (stubsEls.length) {
    for (const f of getChildren(stubsEls[0], 'file')) {
      stubs.push(attr(f, 'name') || f.textContent.trim());
    }
  }

  // Plugins
  const pluginsEls = getChildren(root, 'plugins');
  const plugins = [];
  if (pluginsEls.length) {
    for (const p of getChildren(pluginsEls[0], 'pluginClass')) {
      plugins.push(attr(p, 'class') || p.textContent.trim());
    }
    for (const p of getChildren(pluginsEls[0], 'plugin')) {
      const cls = attr(p, 'filename') || attr(p, 'class') || p.textContent.trim();
      if (cls) plugins.push(cls);
    }
  }

  // Forbidden functions
  const forbiddenFuncsEls = getChildren(root, 'forbiddenFunctions');
  const forbiddenFuncs = [];
  if (forbiddenFuncsEls.length) {
    for (const f of getChildren(forbiddenFuncsEls[0], 'function')) {
      forbiddenFuncs.push(attr(f, 'name') || f.textContent.trim());
    }
  }

  // Issue handlers (suppressed issues)
  const issueHandlersEls = getChildren(root, 'issueHandlers');
  const suppressedIssues = [];
  if (issueHandlersEls.length) {
    for (const child of issueHandlersEls[0].children) {
      const tagName = child.tagName;
      const errorLevel2 = attr(child, 'errorLevel') || '';
      // Only collect issues that are suppressed (error level = suppress or info)
      suppressedIssues.push({ name: tagName, level: errorLevel2 });
    }
  }

  // Build HTML
  const subtitle = [
    errorLevel ? `errorLevel ${errorLevel}` : '',
    phpVersion ? `PHP ${phpVersion}` : '',
    directories.length ? `${directories.length} root${directories.length !== 1 ? 's' : ''}` : '',
    plugins.length ? `${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ') || 'Psalm static analysis configuration';

  const configRows = [
    phpVersion ? `<div class="ps-kv"><span class="ps-kv-k">phpVersion</span><span class="ps-kv-v">${esc(phpVersion)}</span></div>` : '',
    resolveFromConfigFile ? `<div class="ps-kv"><span class="ps-kv-k">resolveFromConfigFile</span><span class="ps-kv-v">${esc(resolveFromConfigFile)}</span></div>` : '',
    totallyTyped ? `<div class="ps-kv"><span class="ps-kv-k">totallyTyped</span><span class="ps-kv-v">${esc(totallyTyped)}</span></div>` : '',
    findUnusedPsalmSuppress ? `<div class="ps-kv"><span class="ps-kv-k">findUnusedPsalmSuppress</span><span class="ps-kv-v">${esc(findUnusedPsalmSuppress)}</span></div>` : '',
  ].filter(Boolean).join('');

  const configHtml = (errorLevel || configRows) ? `<div class="ps-sec"><h3>Configuration</h3><div class="ps-card">
${errorLevel ? `<div class="ps-kv"><span class="ps-kv-k">errorLevel</span><span class="ps-kv-v">${errorLevelChip(errorLevel)}</span></div>` : ''}
${configRows}
</div></div>` : '';

  const rootsHtml = directories.length ? `<div class="ps-sec"><h3>Project Roots (${directories.length})</h3><div class="ps-pills">
${directories.map((d) => `<span class="ps-pill">${esc(d)}</span>`).join('')}
</div></div>` : '';

  const stubsHtml = stubs.length ? `<div class="ps-sec"><h3>Stubs (${stubs.length})</h3><div class="ps-pills">
${stubs.map((s) => `<span class="ps-pill stub">${esc(s.split('/').pop())}</span>`).join('')}
</div></div>` : '';

  const pluginsHtml = plugins.length ? `<div class="ps-sec"><h3>Plugins (${plugins.length})</h3><div class="ps-pills">
${plugins.map((p) => `<span class="ps-pill plugin">${esc(p.split('\\').pop().split('/').pop())}</span>`).join('')}
</div></div>` : '';

  const forbiddenHtml = forbiddenFuncs.length ? `<div class="ps-sec"><h3>Forbidden Functions (${forbiddenFuncs.length})</h3><div class="ps-pills">
${forbiddenFuncs.map((f) => `<span class="ps-pill">${esc(f)}</span>`).join('')}
</div></div>` : '';

  const issuesHtml = suppressedIssues.length ? `<div class="ps-sec"><h3>Issue Handlers (${suppressedIssues.length})</h3><div class="ps-pills">
${suppressedIssues.slice(0, 16).map((i) => `<span class="ps-pill issue">${esc(i.name)}${i.level ? ` <small>${esc(i.level)}</small>` : ''}</span>`).join('')}
${suppressedIssues.length > 16 ? `<span class="ps-pill" style="color:var(--fg-2,#888);">+${suppressedIssues.length - 16} more</span>` : ''}
</div></div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="ps-head">
  <span class="badge-ps">Psalm</span>
  <div>
    <div class="ps-title">psalm.xml</div>
    <div class="ps-sub">${esc(subtitle)}</div>
  </div>
</div>
${configHtml}${rootsHtml}${stubsHtml}${pluginsHtml}${forbiddenHtml}${issuesHtml}`;

  return { parentNode: host };
}
