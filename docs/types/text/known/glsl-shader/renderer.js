const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.glsl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.glsl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2e7d32;color:#fff;vertical-align:middle;margin-right:8px}
.glsl-title{font-size:18px;font-weight:700;margin:0 0 4px}
.glsl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.glsl-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.glsl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.glsl-card strong{display:block;font-size:1.2rem;font-weight:700}
.glsl-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.glsl-sec{margin:14px 0}
.glsl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.glsl-table{width:100%;border-collapse:collapse;font-size:13px}
.glsl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff)}
.glsl-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px}
.glsl-table tr:last-child td{border-bottom:none}
.glsl-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px;overflow:auto;font-size:12px;font-family:ui-monospace,monospace;line-height:1.6;margin:0;white-space:pre}
.glsl-trunc{font-size:11px;color:var(--fg-2,#888);padding:4px 12px;font-style:italic}
.glsl-kw{color:#7c3aed;font-weight:700}
.glsl-type{color:#0550ae;font-weight:700}
.glsl-comment{color:var(--fg-2,#6e7681);font-style:italic}
.glsl-preproc{color:#b45309;font-weight:700}
.glsl-builtin{color:#0f6fba}
.glsl-stage-tag{display:inline-block;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:700;background:var(--bg-2,#e8f5e9);color:#2e7d32;border:1px solid #a5d6a7;margin-left:6px}
`;

const STAGE_FROM_EXT = { '.vert': 'vertex', '.frag': 'fragment', '.geom': 'geometry', '.comp': 'compute', '.tese': 'tessellation evaluation', '.tesc': 'tessellation control' };
const KEYWORDS = ['void', 'if', 'else', 'for', 'while', 'do', 'return', 'discard', 'break', 'continue', 'in', 'out', 'inout', 'layout', 'precision', 'struct'];
const TYPES = ['float', 'int', 'uint', 'bool', 'double', 'vec2', 'vec3', 'vec4', 'ivec2', 'ivec3', 'ivec4', 'uvec2', 'uvec3', 'uvec4', 'bvec2', 'bvec3', 'bvec4', 'mat2', 'mat3', 'mat4', 'mat2x2', 'mat2x3', 'mat2x4', 'mat3x2', 'mat3x3', 'mat3x4', 'mat4x2', 'mat4x3', 'mat4x4', 'sampler2D', 'sampler3D', 'samplerCube', 'sampler2DShadow', 'isampler2D', 'usampler2D', 'mediump', 'highp', 'lowp'];
const QUALIFIERS = ['uniform', 'attribute', 'varying'];
const BUILTINS = ['gl_Position', 'gl_FragColor', 'gl_FragDepth', 'gl_PointSize', 'gl_VertexID', 'gl_InstanceID', 'texture', 'texture2D', 'normalize', 'dot', 'cross', 'length', 'reflect', 'refract', 'mix', 'clamp', 'smoothstep', 'step', 'abs', 'sign', 'floor', 'ceil', 'fract', 'mod', 'min', 'max', 'pow', 'exp', 'log', 'sqrt', 'sin', 'cos', 'tan', 'atan'];

const KW_RE = new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'g');
const TYPE_RE = new RegExp(`\\b(${TYPES.join('|')})\\b`, 'g');
const QUAL_RE = new RegExp(`\\b(${QUALIFIERS.join('|')})\\b`, 'g');
const BUILTIN_RE = new RegExp(`\\b(${BUILTINS.join('|')})\\b`, 'g');

function inferStage(name, text) {
  const dot = name.lastIndexOf('.');
  if (dot !== -1) {
    const ext = name.slice(dot).toLowerCase();
    if (STAGE_FROM_EXT[ext]) return STAGE_FROM_EXT[ext];
  }
  if (/gl_Position/.test(text)) return 'vertex';
  if (/gl_FragColor|gl_FragDepth/.test(text)) return 'fragment';
  if (/layout\s*\(.*local_size/.test(text)) return 'compute';
  return 'unknown';
}

function parseGlsl(text) {
  const lines = text.split('\n');
  let version = null;
  const uniforms = [];
  const attributes = [];
  const inputs = [];
  const outputs = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // #version directive
    const verM = trimmed.match(/^#version\s+(\d+(?:\s+\w+)?)/);
    if (verM && !version) { version = verM[1].trim(); continue; }

    // uniform declarations
    const uniM = trimmed.match(/^uniform\s+([\w]+)\s+([\w\[\]]+)\s*;/);
    if (uniM) { uniforms.push({ type: uniM[1], name: uniM[2].replace(/\[.*/, '') }); continue; }

    // attribute declarations (GLSL 1.x)
    const attrM = trimmed.match(/^attribute\s+([\w]+)\s+([\w]+)\s*;/);
    if (attrM) { attributes.push({ type: attrM[1], name: attrM[2] }); continue; }

    // in/out with optional layout
    const inM = trimmed.match(/^(?:layout\s*\([^)]*\)\s*)?in\s+([\w]+)\s+([\w]+)\s*;/);
    if (inM) { inputs.push({ type: inM[1], name: inM[2] }); continue; }
    const outM = trimmed.match(/^(?:layout\s*\([^)]*\)\s*)?out\s+([\w]+)\s+([\w]+)\s*;/);
    if (outM) { outputs.push({ type: outM[1], name: outM[2] }); continue; }
  }

  return { version, uniforms, attributes, inputs, outputs };
}

function highlightGlsl(lines) {
  return lines.map((line) => {
    // Single-line comment
    if (/^\s*\/\//.test(line)) return `<span class="glsl-comment">${esc(line)}</span>`;
    // Block comment lines
    if (/^\s*\/\*/.test(line) || /^\s*\*/.test(line)) return `<span class="glsl-comment">${esc(line)}</span>`;
    // Preprocessor
    if (/^\s*#/.test(line)) return `<span class="glsl-preproc">${esc(line)}</span>`;

    let out = esc(line);
    out = out.replace(QUAL_RE, '<span class="glsl-kw">$1</span>');
    out = out.replace(TYPE_RE, '<span class="glsl-type">$1</span>');
    out = out.replace(KW_RE, '<span class="glsl-kw">$1</span>');
    out = out.replace(BUILTIN_RE, '<span class="glsl-builtin">$1</span>');
    return out;
  }).join('\n');
}

export function render(intake) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').toLowerCase();
  const { version, uniforms, attributes, inputs, outputs } = parseGlsl(text);
  const stage = inferStage(name, text);
  const allLines = text.split('\n');
  const MAX_LINES = 80;
  const truncated = allLines.length > MAX_LINES;
  const displayLines = truncated ? allLines.slice(0, MAX_LINES) : allLines;

  const host = document.createElement('div');
  host.className = 'glsl-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'glsl-badge';
  badge.textContent = 'GLSL';
  const titleEl = document.createElement('span');
  titleEl.className = 'glsl-title';
  titleEl.textContent = (intake.name || intake.filename || '').split('/').pop() || 'GLSL Shader';
  const stageTag = document.createElement('span');
  stageTag.className = 'glsl-stage-tag';
  stageTag.textContent = stage;
  header.appendChild(badge);
  header.appendChild(titleEl);
  header.appendChild(stageTag);
  host.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'glsl-sub';
  sub.textContent = `OpenGL Shading Language${version ? ` · version ${version}` : ''} · ${stage} stage`;
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'glsl-summary';
  for (const { value, label } of [
    { value: version || 'n/a', label: 'GLSL version' },
    { value: uniforms.length, label: 'Uniforms' },
    { value: attributes.length + inputs.length, label: 'Inputs' },
    { value: outputs.length, label: 'Outputs' },
  ]) {
    const card = document.createElement('div');
    card.className = 'glsl-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Uniforms table
  if (uniforms.length) {
    const sec = document.createElement('div');
    sec.className = 'glsl-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Uniforms';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'glsl-table';
    table.innerHTML = '<thead><tr><th>Type</th><th>Name</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const { type, name: uname } of uniforms) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(type)}</td><td>${esc(uname)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Inputs (attribute + in)
  const allInputs = [...attributes.map((a) => ({ ...a, qualifier: 'attribute' })), ...inputs.map((i) => ({ ...i, qualifier: 'in' }))];
  if (allInputs.length) {
    const sec = document.createElement('div');
    sec.className = 'glsl-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Vertex Inputs';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'glsl-table';
    table.innerHTML = '<thead><tr><th>Qualifier</th><th>Type</th><th>Name</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const { qualifier, type, name: iname } of allInputs) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(qualifier)}</td><td>${esc(type)}</td><td>${esc(iname)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Outputs
  if (outputs.length) {
    const sec = document.createElement('div');
    sec.className = 'glsl-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Outputs';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'glsl-table';
    table.innerHTML = '<thead><tr><th>Type</th><th>Name</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const { type, name: oname } of outputs) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(type)}</td><td>${esc(oname)}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Source preview
  const codeSec = document.createElement('div');
  codeSec.className = 'glsl-sec';
  const codeH3 = document.createElement('h3');
  codeH3.textContent = truncated ? `Source (first ${MAX_LINES} lines)` : 'Source';
  codeSec.appendChild(codeH3);
  const pre = document.createElement('pre');
  pre.className = 'glsl-pre';
  pre.innerHTML = highlightGlsl(displayLines);
  codeSec.appendChild(pre);
  if (truncated) {
    const trunc = document.createElement('div');
    trunc.className = 'glsl-trunc';
    trunc.textContent = `… truncated — ${allLines.length - MAX_LINES} more lines not shown`;
    codeSec.appendChild(trunc);
  }
  host.appendChild(codeSec);

  return { parentNode: host };
}
