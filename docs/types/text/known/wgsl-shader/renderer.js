const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wgsl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wgsl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6d28d9;color:#fff;vertical-align:middle;margin-right:8px;}
.wgsl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wgsl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.wgsl-stages{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
.wgsl-stage{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;border:2px solid;}
.wgsl-stage-vertex{background:#fef9c3;border-color:#ca8a04;color:#854d0e;}
.wgsl-stage-fragment{background:#dcfce7;border-color:#16a34a;color:#166534;}
.wgsl-stage-compute{background:#dbeafe;border-color:#2563eb;color:#1e40af;}
.wgsl-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.wgsl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.wgsl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.wgsl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.wgsl-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.wgsl-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.wgsl-list{margin:0;padding:0;list-style:none;}
.wgsl-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;}
.wgsl-list li:last-child{border-bottom:none;}
.wgsl-binding-group{font-size:11px;padding:1px 6px;border-radius:4px;background:#ede9fe;color:#6d28d9;}
.wgsl-binding-slot{font-size:11px;color:var(--fg-2,#888);}
.wgsl-fn-name{font-weight:600;}
.wgsl-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.wgsl-kw{color:#6d28d9;font-weight:600;}
.wgsl-attr{color:#c2410c;font-weight:600;}
.wgsl-builtin{color:#0891b2;}
.wgsl-str{color:#0369a1;}
.wgsl-comment{color:#6e7781;font-style:italic;}
.wgsl-num{color:#b45309;}
.wgsl-type{color:#0f766e;}
`;

const KEYWORDS = new Set(['fn', 'let', 'var', 'const', 'struct', 'if', 'else', 'for', 'loop', 'while', 'break', 'continue', 'return', 'discard', 'true', 'false', 'switch', 'case', 'default', 'enable', 'override', 'alias']);
const TYPES = new Set(['f32', 'f16', 'i32', 'u32', 'bool', 'vec2', 'vec3', 'vec4', 'vec2f', 'vec3f', 'vec4f', 'vec2i', 'vec3i', 'vec4i', 'vec2u', 'vec3u', 'vec4u', 'mat2x2', 'mat3x3', 'mat4x4', 'mat2x2f', 'mat3x3f', 'mat4x4f', 'array', 'texture_2d', 'texture_cube', 'texture_depth_2d', 'sampler', 'sampler_comparison', 'atomic']);
const BUILTIN_FNS = new Set(['textureSample', 'textureSampleLevel', 'textureSampleBias', 'textureLoad', 'textureStore', 'textureDimensions', 'dot', 'normalize', 'cross', 'reflect', 'refract', 'length', 'distance', 'abs', 'min', 'max', 'clamp', 'mix', 'step', 'smoothstep', 'pow', 'sqrt', 'inverseSqrt', 'floor', 'ceil', 'round', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'exp', 'log', 'exp2', 'log2', 'sign', 'fract', 'saturate', 'transpose', 'determinant', 'all', 'any', 'select']);

function analyzeWgsl(text) {
  const lines = (text || '').split(/\r?\n/);
  let hasVertex = false;
  let hasFragment = false;
  let hasCompute = false;
  const structs = [];
  const bindings = [];
  const entryPoints = [];
  const builtinsUsed = new Set();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('//')) { i++; continue; }

    // Shader stage attributes
    if (/@vertex/.test(trimmed)) hasVertex = true;
    if (/@fragment/.test(trimmed)) hasFragment = true;
    if (/@compute/.test(trimmed)) hasCompute = true;

    // Entry point functions
    const fnMatch = trimmed.match(/@(vertex|fragment|compute)(?:\s+@\S+)*\s*\nfn\s+(\w+)|@(vertex|fragment|compute)\s+fn\s+(\w+)/);

    // Detect fn after attribute block
    if (/@vertex|@fragment|@compute/.test(trimmed)) {
      // Look ahead for the fn keyword (may be on same line or next)
      let fnName = null;
      const sameLine = trimmed.match(/fn\s+(\w+)/);
      if (sameLine) {
        fnName = sameLine[1];
      } else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const nextFn = nextLine.match(/^fn\s+(\w+)/);
        if (nextFn) fnName = nextFn[1];
      }
      const stage = /@vertex/.test(trimmed) ? 'vertex' : /@fragment/.test(trimmed) ? 'fragment' : 'compute';
      if (fnName) entryPoints.push({ stage, name: fnName });
    }

    // Struct declarations
    const structMatch = trimmed.match(/^struct\s+(\w+)/);
    if (structMatch) structs.push(structMatch[1]);

    // Bindings: @group(N) @binding(M) var
    const bindingMatch = trimmed.match(/@group\((\d+)\)\s+@binding\((\d+)\)\s+var(?:<[^>]+>)?\s+(\w+)/);
    if (bindingMatch) {
      bindings.push({ group: parseInt(bindingMatch[1]), binding: parseInt(bindingMatch[2]), name: bindingMatch[3] });
    }

    // Built-in function usage
    for (const fn of BUILTIN_FNS) {
      if (trimmed.includes(fn + '(')) builtinsUsed.add(fn);
    }

    i++;
  }

  // Group bindings by group number
  const bindingGroups = {};
  for (const b of bindings) {
    if (!bindingGroups[b.group]) bindingGroups[b.group] = [];
    bindingGroups[b.group].push(b);
  }

  return { hasVertex, hasFragment, hasCompute, structs, bindings, bindingGroups, entryPoints, builtinsUsed: [...builtinsUsed] };
}

function highlightWgsl(text) {
  const lines = (text || '').split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Line comments
    if (trimmed.startsWith('//')) {
      result.push('<span class="wgsl-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    const chars = line;
    while (i < chars.length) {
      // Inline comment
      if (chars[i] === '/' && chars[i + 1] === '/') {
        out += '<span class="wgsl-comment">' + esc(chars.slice(i)) + '</span>';
        i = chars.length;
        continue;
      }
      // String (rare in WGSL but possible)
      if (chars[i] === '"') {
        let j = i + 1;
        while (j < chars.length && chars[j] !== '"') {
          if (chars[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="wgsl-str">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Attributes @...
      if (chars[i] === '@') {
        let j = i + 1;
        while (j < chars.length && /\w/.test(chars[j])) j++;
        // Include (N) if present
        if (chars[j] === '(') {
          let depth = 1; j++;
          while (j < chars.length && depth > 0) {
            if (chars[j] === '(') depth++;
            else if (chars[j] === ')') depth--;
            j++;
          }
        }
        out += '<span class="wgsl-attr">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Keywords, types, built-in functions
      if (/[a-zA-Z_]/.test(chars[i])) {
        let j = i;
        while (j < chars.length && /[\w]/.test(chars[j])) j++;
        const word = chars.slice(i, j);
        if (KEYWORDS.has(word)) {
          out += '<span class="wgsl-kw">' + esc(word) + '</span>';
        } else if (TYPES.has(word)) {
          out += '<span class="wgsl-type">' + esc(word) + '</span>';
        } else if (BUILTIN_FNS.has(word)) {
          out += '<span class="wgsl-builtin">' + esc(word) + '</span>';
        } else {
          out += esc(word);
        }
        i = j;
        continue;
      }
      // Numbers (including hex 0x...)
      if (/[0-9]/.test(chars[i])) {
        let j = i;
        if (chars[i] === '0' && (chars[i + 1] === 'x' || chars[i + 1] === 'X')) {
          j += 2;
          while (j < chars.length && /[0-9a-fA-F]/.test(chars[j])) j++;
        } else {
          while (j < chars.length && /[0-9._eEfh]/.test(chars[j])) j++;
        }
        out += '<span class="wgsl-num">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      out += esc(chars[i]);
      i++;
    }
    result.push(out);
  }
  return result.join('\n');
}

export function render(intake) {
  const text = intake.text || '';
  const { hasVertex, hasFragment, hasCompute, structs, bindings, bindingGroups, entryPoints, builtinsUsed } = analyzeWgsl(text);

  const host = document.createElement('div');
  host.className = 'wgsl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'wgsl-title';
  title.innerHTML = '<span class="wgsl-badge">WGSL</span>';
  host.appendChild(title);

  const stages = [];
  if (hasVertex) stages.push('vertex');
  if (hasFragment) stages.push('fragment');
  if (hasCompute) stages.push('compute');

  const sub = document.createElement('div');
  sub.className = 'wgsl-sub';
  sub.textContent = (stages.length ? stages.join(' + ') + ' shader' : 'shader') + ` · ${structs.length} struct${structs.length !== 1 ? 's' : ''} · ${bindings.length} binding${bindings.length !== 1 ? 's' : ''} · ${builtinsUsed.length} built-in${builtinsUsed.length !== 1 ? 's' : ''} used`;
  host.appendChild(sub);

  // Shader stage pills
  if (stages.length > 0) {
    const stagesEl = document.createElement('div');
    stagesEl.className = 'wgsl-stages';
    const labels = { vertex: 'Vertex', fragment: 'Fragment', compute: 'Compute' };
    const icons = { vertex: '▲', fragment: '◆', compute: '⬡' };
    for (const s of stages) {
      const pill = document.createElement('div');
      pill.className = 'wgsl-stage wgsl-stage-' + s;
      pill.textContent = (icons[s] || '') + ' ' + labels[s];
      stagesEl.appendChild(pill);
    }
    host.appendChild(stagesEl);
  }

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'wgsl-cards';
  const groupCount = Object.keys(bindingGroups).length;
  for (const { value, label } of [
    { value: stages.length, label: 'Shader stages' },
    { value: structs.length, label: 'Structs' },
    { value: bindings.length, label: 'Bindings' },
    { value: groupCount, label: 'Binding groups' },
    { value: builtinsUsed.length, label: 'Built-ins used' },
  ]) {
    const card = document.createElement('div');
    card.className = 'wgsl-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Structs section
  if (structs.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'wgsl-section';
    const hd = document.createElement('div');
    hd.className = 'wgsl-section-hd';
    hd.textContent = 'Structs';
    sec.appendChild(hd);
    const ul = document.createElement('ul');
    ul.className = 'wgsl-list';
    for (const name of structs) {
      const li = document.createElement('li');
      li.textContent = name;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Bindings section grouped by @group
  if (bindings.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'wgsl-section';
    const hd = document.createElement('div');
    hd.className = 'wgsl-section-hd';
    hd.textContent = 'Bindings';
    sec.appendChild(hd);
    const ul = document.createElement('ul');
    ul.className = 'wgsl-list';
    for (const groupIdx of Object.keys(bindingGroups).sort((a, b) => a - b)) {
      for (const { binding, name } of bindingGroups[groupIdx]) {
        const li = document.createElement('li');
        const groupSpan = document.createElement('span');
        groupSpan.className = 'wgsl-binding-group';
        groupSpan.textContent = 'group ' + groupIdx;
        const slotSpan = document.createElement('span');
        slotSpan.className = 'wgsl-binding-slot';
        slotSpan.textContent = '@binding(' + binding + ')';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        li.appendChild(groupSpan);
        li.appendChild(slotSpan);
        li.appendChild(nameSpan);
        ul.appendChild(li);
      }
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Built-in functions used
  if (builtinsUsed.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'wgsl-section';
    const hd = document.createElement('div');
    hd.className = 'wgsl-section-hd';
    hd.textContent = 'Built-in Functions Used';
    sec.appendChild(hd);
    const ul = document.createElement('ul');
    ul.className = 'wgsl-list';
    for (const fn of builtinsUsed.sort()) {
      const li = document.createElement('li');
      li.textContent = fn;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const srcSec = document.createElement('div');
  srcSec.className = 'wgsl-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'wgsl-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'wgsl-pre';
  pre.innerHTML = highlightWgsl(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
