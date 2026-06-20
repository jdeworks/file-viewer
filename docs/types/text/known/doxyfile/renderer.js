const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.doxyfile-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.doxyfile-doc .badge-doxygen{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#9c27b0;color:#fff;vertical-align:middle;margin-right:8px}
.doxyfile-doc .doxy-title{font-size:18px;font-weight:700;margin:0 0 4px}
.doxyfile-doc .doxy-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.doxyfile-doc .doxy-sec{margin:12px 0}
.doxyfile-doc .doxy-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.doxyfile-doc .doxy-meta{display:flex;flex-wrap:wrap;gap:10px;margin:4px 0}
.doxyfile-doc .doxy-kv{display:flex;gap:6px;align-items:baseline;font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.doxyfile-doc .doxy-kv span:first-child{color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.doxyfile-doc .doxy-kv span:last-child{font-family:ui-monospace,monospace;font-weight:600}
.doxyfile-doc .doxy-pills{display:flex;flex-wrap:wrap;gap:6px}
.doxyfile-doc .doxy-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.doxyfile-doc .doxy-badge-yes{padding:1px 7px;border-radius:8px;background:#d1fae5;border:1px solid #6ee7b7;color:#065f46;font-size:11px;font-weight:700}
.doxyfile-doc .doxy-badge-no{padding:1px 7px;border-radius:8px;background:#f6f8fa;border:1px solid #e0e0e0;color:#888;font-size:11px}
`;

function doxyVal(text, key) {
  const m = new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'm').exec(text);
  if (!m) return null;
  return m[1].replace(/#.*$/, '').trim() || null;
}

function doxyBool(text, key) {
  const v = doxyVal(text, key);
  return v ? v.toUpperCase() === 'YES' : null;
}

function doxyList(text, key) {
  // Doxyfile values can span multiple lines with backslash continuation
  const m = new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'm').exec(text);
  if (!m) return [];
  let val = m[1].trim();
  // Collect continuation lines
  let idx = text.indexOf(m[0]) + m[0].length;
  while (val.endsWith('\\')) {
    val = val.slice(0, -1);
    const nl = text.indexOf('\n', idx);
    if (nl === -1) break;
    const cont = text.slice(idx, nl).trim();
    val += ' ' + cont;
    idx = nl + 1;
  }
  return val.split(/\s+/).filter((s) => s && s !== '\\');
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.name || intake.filename || 'Doxyfile').split('/').pop();

  const projectName = doxyVal(text, 'PROJECT_NAME');
  const projectNumber = doxyVal(text, 'PROJECT_NUMBER');
  const outputDir = doxyVal(text, 'OUTPUT_DIRECTORY');
  const inputDirs = doxyList(text, 'INPUT');

  const extractAll = doxyBool(text, 'EXTRACT_ALL');
  const extractPrivate = doxyBool(text, 'EXTRACT_PRIVATE');
  const generateHtml = doxyBool(text, 'GENERATE_HTML');
  const generateLatex = doxyBool(text, 'GENERATE_LATEX');
  const generateXml = doxyBool(text, 'GENERATE_XML');
  const generateMan = doxyBool(text, 'GENERATE_MAN');
  const haveGraphs = doxyBool(text, 'HAVE_DOT');
  const umlLook = doxyBool(text, 'UML_LOOK');
  const recursive = doxyBool(text, 'RECURSIVE');
  const generateTreeview = doxyBool(text, 'GENERATE_TREEVIEW');
  const interactiveHtml = doxyBool(text, 'INTERACTIVE_SVG');

  const badge = (val) => val === true
    ? '<span class="doxy-badge-yes">YES</span>'
    : val === false ? '<span class="doxy-badge-no">NO</span>' : '';

  const host = document.createElement('div');
  host.className = 'doxyfile-doc';

  const metaItems = [
    projectName ? `<div class="doxy-kv"><span>Project</span><span>${esc(projectName)}</span></div>` : '',
    projectNumber ? `<div class="doxy-kv"><span>Version</span><span>${esc(projectNumber)}</span></div>` : '',
    outputDir ? `<div class="doxy-kv"><span>Output</span><span>${esc(outputDir)}</span></div>` : '',
    recursive !== null ? `<div class="doxy-kv"><span>Recursive</span><span>${badge(recursive)}</span></div>` : '',
  ].filter(Boolean).join('');

  const outputFormats = [
    generateHtml !== null ? `<div class="doxy-kv"><span>HTML</span><span>${badge(generateHtml)}</span></div>` : '',
    generateLatex !== null ? `<div class="doxy-kv"><span>LaTeX</span><span>${badge(generateLatex)}</span></div>` : '',
    generateXml !== null ? `<div class="doxy-kv"><span>XML</span><span>${badge(generateXml)}</span></div>` : '',
    generateMan !== null ? `<div class="doxy-kv"><span>Man pages</span><span>${badge(generateMan)}</span></div>` : '',
  ].filter(Boolean).join('');

  const extractFlags = [
    extractAll !== null ? `<div class="doxy-kv"><span>Extract all</span><span>${badge(extractAll)}</span></div>` : '',
    extractPrivate !== null ? `<div class="doxy-kv"><span>Extract private</span><span>${badge(extractPrivate)}</span></div>` : '',
    haveGraphs !== null ? `<div class="doxy-kv"><span>Graphs (dot)</span><span>${badge(haveGraphs)}</span></div>` : '',
    umlLook !== null ? `<div class="doxy-kv"><span>UML look</span><span>${badge(umlLook)}</span></div>` : '',
    generateTreeview !== null ? `<div class="doxy-kv"><span>Tree view</span><span>${badge(generateTreeview)}</span></div>` : '',
  ].filter(Boolean).join('');

  const inputHtml = inputDirs.length
    ? `<div class="doxy-sec"><h3>Input (${inputDirs.length})</h3><div class="doxy-pills">${inputDirs.slice(0, 10).map((d) => `<span class="doxy-pill">${esc(d)}</span>`).join('')}${inputDirs.length > 10 ? `<span class="doxy-pill">+${inputDirs.length - 10} more</span>` : ''}</div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="doxy-title"><span class="badge-doxygen">Doxygen</span>${esc(name)}</div>
<div class="doxy-sub">Doxygen documentation generator configuration</div>
${metaItems ? `<div class="doxy-sec"><h3>Project</h3><div class="doxy-meta">${metaItems}</div></div>` : ''}
${outputFormats ? `<div class="doxy-sec"><h3>Output Formats</h3><div class="doxy-meta">${outputFormats}</div></div>` : ''}
${extractFlags ? `<div class="doxy-sec"><h3>Extraction &amp; Diagrams</h3><div class="doxy-meta">${extractFlags}</div></div>` : ''}
${inputHtml}`;
  return { parentNode: host };
}
