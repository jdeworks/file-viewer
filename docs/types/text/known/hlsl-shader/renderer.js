const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hlsl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.hlsl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px}
.hlsl-title{font-size:18px;font-weight:700;margin:0 0 4px}
.hlsl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.hlsl-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.hlsl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.hlsl-card strong{display:block;font-size:1.2rem;font-weight:700}
.hlsl-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.hlsl-sec{margin:14px 0}
.hlsl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.hlsl-table{width:100%;border-collapse:collapse;font-size:13px}
.hlsl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff)}
.hlsl-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px}
.hlsl-table tr:last-child td{border-bottom:none}
.hlsl-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px;overflow:auto;font-size:12px;font-family:ui-monospace,monospace;line-height:1.6;margin:0;white-space:pre}
.hlsl-trunc{font-size:11px;color:var(--fg-2,#888);padding:4px 12px;font-style:italic}
.hlsl-kw{color:#7c3aed;font-weight:700}
.hlsl-type{color:#0550ae;font-weight:700}
.hlsl-semantic{color:#b45309;font-weight:700}
.hlsl-comment{color:var(--fg-2,#6e7681);font-style:italic}
.hlsl-preproc{color:#b45309;font-weight:700}
.hlsl-reg{color:#1a7f37}
.hlsl-entry-tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;margin-left:4px;font-family:ui-monospace,monospace}
`;

const KEYWORDS = ['struct', 'cbuffer', 'tbuffer', 'void', 'return', 'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'register', 'groupshared', 'inline', 'static', 'const', 'extern', 'row_major', 'column_major', 'nointerpolation', 'linear', 'centroid', 'noperspective', 'sample', 'in', 'out', 'inout', 'uniform'];
const TYPES = ['float', 'float2', 'float3', 'float4', 'float2x2', 'float3x3', 'float4x4', 'float4x3', 'float3x4', 'int', 'int2', 'int3', 'int4', 'uint', 'uint2', 'uint3', 'uint4', 'bool', 'bool2', 'bool3', 'bool4', 'half', 'double', 'matrix', 'vector', 'Texture1D', 'Texture2D', 'Texture3D', 'TextureCube', 'Texture2DArray', 'RWTexture2D', 'Buffer', 'RWBuffer', 'StructuredBuffer', 'RWStructuredBuffer', 'ByteAddressBuffer', 'RWByteAddressBuffer', 'SamplerState', 'SamplerComparisonState', 'string'];
const SEMANTICS = ['SV_Position', 'SV_Target', 'SV_Target0', 'SV_Target1', 'SV_Target2', 'SV_Target3', 'SV_Depth', 'SV_VertexID', 'SV_InstanceID', 'SV_DispatchThreadID', 'SV_GroupID', 'SV_GroupThreadID', 'SV_GroupIndex', 'SV_IsFrontFace', 'SV_SampleIndex', 'POSITION', 'NORMAL', 'TEXCOORD', 'TEXCOORD0', 'TEXCOORD1', 'COLOR', 'COLOR0', 'TANGENT', 'BINORMAL', 'BLENDINDICES', 'BLENDWEIGHT'];

const KW_RE = new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'g');
const TYPE_RE = new RegExp(`\\b(${TYPES.join('|')})\\b`, 'g');
const SEM_RE = new RegExp(`\\b(${SEMANTICS.join('|')})\\b`, 'g');
const REG_RE = /\b(register\s*\([btsgu]\d*\))/g;

function parseHlsl(text) {
  const lines = text.split('\n');
  const cbuffers = [];
  const textures = [];
  const entryPoints = [];
  const semanticSet = new Set();
  let inCbuffer = null;
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // cbuffer / tbuffer
    const cbM = trimmed.match(/^(?:cbuffer|tbuffer)\s+(\w+)(?:\s*:\s*register\s*\(\s*b(\d+)\s*\))?/);
    if (cbM) {
      inCbuffer = { name: cbM[1], reg: cbM[2] != null ? `b${cbM[2]}` : null, members: [] };
      braceDepth = 0;
      continue;
    }
    if (inCbuffer) {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      if (braceDepth <= 0) { cbuffers.push(inCbuffer); inCbuffer = null; continue; }
      const memM = trimmed.match(/^([\w<>]+)\s+(\w+)\s*(?:\[\d+\])?\s*;/);
      if (memM) inCbuffer.members.push({ type: memM[1], name: memM[2] });
      continue;
    }

    // Texture / Sampler bindings
    const texM = trimmed.match(/^(Texture\w*|RWTexture\w*|SamplerState|SamplerComparisonState)\s+(\w+)\s*(?::\s*register\s*\(\s*([ts]\d*)\s*\))?/);
    if (texM) { textures.push({ kind: texM[1], name: texM[2], reg: texM[3] || null }); continue; }

    // Entry points — function with semantic return or void with compute attribute
    const epM = trimmed.match(/^(?:\w+\s+)?(\w+)\s+(\w+)\s*\([^)]*\)\s*(?::\s*(\w[\w_]*))?\s*\{?$/);
    if (epM && /^(VS|PS|CS|GS|HS|DS|Main|main|VSMain|PSMain|CSMain|GSMain|HSMain|DSMain)/.test(epM[2])) {
      entryPoints.push({ returnType: epM[1], name: epM[2], semantic: epM[3] || null });
    }

    // Semantics collection
    const semMatch = trimmed.match(/:\s*(SV_\w+|\b(?:POSITION|NORMAL|TEXCOORD\d*|COLOR\d*|TANGENT)\b)/g);
    if (semMatch) semMatch.forEach((m) => semanticSet.add(m.replace(/^:\s*/, '')));
  }

  return { cbuffers, textures, entryPoints, semantics: [...semanticSet] };
}

function highlightHlsl(lines) {
  return lines.map((line) => {
    if (/^\s*\/\//.test(line)) return `<span class="hlsl-comment">${esc(line)}</span>`;
    if (/^\s*\/\*/.test(line) || /^\s*\*/.test(line)) return `<span class="hlsl-comment">${esc(line)}</span>`;
    if (/^\s*#/.test(line)) return `<span class="hlsl-preproc">${esc(line)}</span>`;

    let out = esc(line);
    out = out.replace(SEM_RE, '<span class="hlsl-semantic">$1</span>');
    out = out.replace(TYPE_RE, '<span class="hlsl-type">$1</span>');
    out = out.replace(KW_RE, '<span class="hlsl-kw">$1</span>');
    out = out.replace(/\bregister\s*\([btsgu]\d*\)/g, (m) => `<span class="hlsl-reg">${m}</span>`);
    return out;
  }).join('\n');
}

export function render(intake) {
  const text = intake.text || '';
  const { cbuffers, textures, entryPoints, semantics } = parseHlsl(text);
  const allLines = text.split('\n');
  const MAX_LINES = 80;
  const truncated = allLines.length > MAX_LINES;
  const displayLines = truncated ? allLines.slice(0, MAX_LINES) : allLines;

  const host = document.createElement('div');
  host.className = 'hlsl-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'hlsl-badge';
  badge.textContent = 'HLSL';
  const titleEl = document.createElement('span');
  titleEl.className = 'hlsl-title';
  titleEl.textContent = (intake.name || intake.filename || '').split('/').pop() || 'HLSL Shader';
  header.appendChild(badge);
  header.appendChild(titleEl);
  host.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'hlsl-sub';
  const subParts = ['DirectX High-Level Shading Language'];
  if (entryPoints.length) subParts.push(`${entryPoints.length} entry point${entryPoints.length !== 1 ? 's' : ''}`);
  sub.textContent = subParts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'hlsl-summary';
  for (const { value, label } of [
    { value: cbuffers.length, label: 'Constant buffers' },
    { value: textures.length, label: 'Textures / samplers' },
    { value: entryPoints.length, label: 'Entry points' },
    { value: semantics.length, label: 'Semantics' },
  ]) {
    const card = document.createElement('div');
    card.className = 'hlsl-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Entry points
  if (entryPoints.length) {
    const sec = document.createElement('div');
    sec.className = 'hlsl-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Entry Points';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'hlsl-table';
    table.innerHTML = '<thead><tr><th>Function</th><th>Return type</th><th>Semantic</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const { name, returnType, semantic } of entryPoints) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td><td>${esc(returnType)}</td><td>${semantic ? `<span class="hlsl-semantic">${esc(semantic)}</span>` : '—'}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // cbuffers
  if (cbuffers.length) {
    const sec = document.createElement('div');
    sec.className = 'hlsl-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Constant Buffers';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'hlsl-table';
    table.innerHTML = '<thead><tr><th>Name</th><th>Register</th><th>Members</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const { name, reg, members } of cbuffers) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(name)}</td><td>${reg ? `<span class="hlsl-reg">${esc(reg)}</span>` : '—'}</td><td>${esc(members.map((m) => `${m.type} ${m.name}`).join(', '))}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Texture/Sampler bindings
  if (textures.length) {
    const sec = document.createElement('div');
    sec.className = 'hlsl-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Textures & Samplers';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'hlsl-table';
    table.innerHTML = '<thead><tr><th>Kind</th><th>Name</th><th>Register</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const { kind, name, reg } of textures) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(kind)}</td><td>${esc(name)}</td><td>${reg ? `<span class="hlsl-reg">${esc(reg)}</span>` : '—'}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Source preview
  const codeSec = document.createElement('div');
  codeSec.className = 'hlsl-sec';
  const codeH3 = document.createElement('h3');
  codeH3.textContent = truncated ? `Source (first ${MAX_LINES} lines)` : 'Source';
  codeSec.appendChild(codeH3);
  const pre = document.createElement('pre');
  pre.className = 'hlsl-pre';
  pre.innerHTML = highlightHlsl(displayLines);
  codeSec.appendChild(pre);
  if (truncated) {
    const trunc = document.createElement('div');
    trunc.className = 'hlsl-trunc';
    trunc.textContent = `… truncated — ${allLines.length - MAX_LINES} more lines not shown`;
    codeSec.appendChild(trunc);
  }
  host.appendChild(codeSec);

  return { parentNode: host };
}
