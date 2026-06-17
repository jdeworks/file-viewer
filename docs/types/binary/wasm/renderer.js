function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function fmtBytes(n) {
  if (typeof n !== 'number' || n < 0) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}

function readULEB128(bytes, offset) {
  let result = 0;
  let shift = 0;
  while (offset < bytes.length) {
    const b = bytes[offset++];
    result |= (b & 0x7f) << shift;
    if (!(b & 0x80)) break;
    shift += 7;
  }
  return { value: result >>> 0, next: offset };
}

function readString(bytes, offset) {
  const { value: len, next } = readULEB128(bytes, offset);
  if (next + len > bytes.length) return { str: null, next: next + len };
  const str = new TextDecoder().decode(bytes.slice(next, next + len));
  return { str, next: next + len };
}

const SECTION_NAMES = [
  'Custom', 'Type', 'Import', 'Function', 'Table', 'Memory',
  'Global', 'Export', 'Start', 'Element', 'Code', 'Data', 'DataCount',
];

function sectionName(id) {
  return SECTION_NAMES[id] ?? `Unknown(${id})`;
}

function parseSections(bytes) {
  const sections = [];
  let pos = 8;
  while (pos < bytes.length) {
    if (pos >= bytes.length) break;
    const id = bytes[pos++];
    const { value: size, next } = readULEB128(bytes, pos);
    sections.push({ id, size, contentStart: next, contentEnd: next + size });
    pos = next + size;
  }
  return sections;
}

const IMPORT_KIND_NAMES = ['function', 'table', 'memory', 'global'];

function parseImports(bytes, section) {
  const imports = [];
  let pos = section.contentStart;
  const end = section.contentEnd;
  try {
    const { value: count, next: afterCount } = readULEB128(bytes, pos);
    pos = afterCount;
    for (let i = 0; i < count && pos < end; i++) {
      const { str: modName, next: afterMod } = readString(bytes, pos);
      pos = afterMod;
      const { str: name, next: afterName } = readString(bytes, pos);
      pos = afterName;
      if (pos >= end) break;
      const kind = bytes[pos++];
      const kindName = IMPORT_KIND_NAMES[kind] ?? `unknown(${kind})`;
      imports.push({ module: modName ?? '?', name: name ?? '?', kind: kindName });
      // Skip type info for each kind
      if (kind === 0) {
        // function: one LEB128 type index
        const { next } = readULEB128(bytes, pos);
        pos = next;
      } else if (kind === 1) {
        // table: reftype (1 byte) + limits
        pos += 1;
        const flags = bytes[pos++];
        const { next: afterMin } = readULEB128(bytes, pos);
        pos = afterMin;
        if (flags & 1) { const { next } = readULEB128(bytes, pos); pos = next; }
      } else if (kind === 2) {
        // memory: limits
        const flags = bytes[pos++];
        const { next: afterMin } = readULEB128(bytes, pos);
        pos = afterMin;
        if (flags & 1) { const { next } = readULEB128(bytes, pos); pos = next; }
      } else if (kind === 3) {
        // global: value type (1 byte) + mutability (1 byte)
        pos += 2;
      }
    }
  } catch {
    // partial results are fine
  }
  return imports;
}

const EXPORT_KIND_NAMES = ['function', 'table', 'memory', 'global'];

function parseExports(bytes, section) {
  const exports_ = [];
  let pos = section.contentStart;
  const end = section.contentEnd;
  try {
    const { value: count, next: afterCount } = readULEB128(bytes, pos);
    pos = afterCount;
    for (let i = 0; i < count && pos < end; i++) {
      const { str: name, next: afterName } = readString(bytes, pos);
      pos = afterName;
      if (pos >= end) break;
      const kind = bytes[pos++];
      const { next: afterIdx } = readULEB128(bytes, pos);
      pos = afterIdx;
      const kindName = EXPORT_KIND_NAMES[kind] ?? `unknown(${kind})`;
      exports_.push({ name: name ?? '?', kind: kindName });
    }
  } catch {
    // partial results are fine
  }
  return exports_;
}

function parseMemory(bytes, section) {
  const mems = [];
  let pos = section.contentStart;
  const end = section.contentEnd;
  try {
    const { value: count, next: afterCount } = readULEB128(bytes, pos);
    pos = afterCount;
    for (let i = 0; i < count && pos < end; i++) {
      const flags = bytes[pos++];
      const { value: minPages, next: afterMin } = readULEB128(bytes, pos);
      pos = afterMin;
      let maxPages = null;
      if (flags & 1) {
        const { value: mx, next: afterMax } = readULEB128(bytes, pos);
        pos = afterMax;
        maxPages = mx;
      }
      mems.push({ minPages, maxPages });
    }
  } catch {
    // partial results
  }
  return mems;
}

function parseTypeCount(bytes, section) {
  try {
    const { value: count } = readULEB128(bytes, section.contentStart);
    return count;
  } catch {
    return null;
  }
}

function parseCodeCount(bytes, section) {
  try {
    const { value: count } = readULEB128(bytes, section.contentStart);
    return count;
  } catch {
    return null;
  }
}

function parseDataCount(bytes, section) {
  try {
    const { value: count } = readULEB128(bytes, section.contentStart);
    return count;
  } catch {
    return null;
  }
}

function parseCustomName(bytes, section) {
  try {
    const { str } = readString(bytes, section.contentStart);
    return str;
  } catch {
    return null;
  }
}

const STYLE = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--fg, #1a1a1a);
  background: var(--bg, #f5f5f5);
  padding: 20px 16px;
}
.header-card {
  background: var(--panel, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.badge {
  display: inline-block;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.08em;
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid var(--border, #e0e0e0);
  background: var(--badge-bg, #f0f0f0);
  color: var(--fg, #1a1a1a);
}
.badge-main {
  background: #6040c0;
  border-color: #5030b0;
  color: #fff;
  font-size: 13px;
}
.badge-version {
  background: var(--badge-bg, #e8f4e8);
  border-color: #8bc48b;
  color: #2a6b2a;
}
.badge-size {
  background: var(--badge-bg, #f0f0f0);
  border-color: var(--border, #d0d0d0);
  color: var(--fg2, #555);
}
.section-block {
  margin-bottom: 20px;
}
.section-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg2, #666);
  margin-bottom: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
  background: var(--panel, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  overflow: hidden;
}
th {
  text-align: left;
  padding: 7px 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--fg2, #777);
  background: var(--th-bg, #f9f9f9);
  border-bottom: 1px solid var(--border, #e8e8e8);
}
td {
  padding: 6px 12px;
  border-bottom: 1px solid var(--border, #f0f0f0);
  color: var(--fg, #1a1a1a);
  word-break: break-all;
}
tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--hover, #fafafa); }
.td-size { color: var(--fg2, #888); text-align: right; white-space: nowrap; }
.td-kind {
  color: var(--fg2, #555);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}
.kind-function { color: #1a6bbf; }
.kind-memory   { color: #2a8a4a; }
.kind-global   { color: #8a4a1a; }
.kind-table    { color: #8a1a8a; }
.info-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  background: var(--panel, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  flex-wrap: wrap;
}
.info-label { color: var(--fg2, #666); font-size: 12px; }
.info-value { font-weight: 600; }
.error-box {
  margin-top: 16px;
  padding: 10px 14px;
  background: var(--err-bg, #fff3f3);
  border: 1px solid var(--err-border, #f5c6c6);
  border-radius: 6px;
  color: var(--err-fg, #b00020);
  font-size: 12px;
}
.empty-note { color: var(--fg2, #999); font-style: italic; padding: 8px 12px; }
`;

function kindClass(kind) {
  if (kind === 'function') return 'kind-function';
  if (kind === 'memory') return 'kind-memory';
  if (kind === 'global') return 'kind-global';
  if (kind === 'table') return 'kind-table';
  return '';
}

export function render(intake) {
  const b = intake.bytes;

  if (!b || b.length < 8) {
    const html = `<style>${STYLE}</style>
<div class="header-card">
  <span class="badge badge-main">WebAssembly</span>
</div>
<div class="error-box">File too small to be a valid WebAssembly module (${b ? b.length : 0} bytes, need at least 8).</div>`;
    return { bodyHtml: html, hadUnsafe: false };
  }

  let parseError = null;
  let sections = [];
  let imports = [];
  let exports_ = [];
  let memories = [];
  let typeCount = null;
  let codeCount = null;
  let dataCount = null;
  let customNames = [];

  // Read version (little-endian uint32 at offset 4)
  const versionNum = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);

  try {
    sections = parseSections(b);

    for (const sec of sections) {
      switch (sec.id) {
        case 0: {
          const name = parseCustomName(b, sec);
          if (name != null) customNames.push(name);
          break;
        }
        case 1:
          typeCount = parseTypeCount(b, sec);
          break;
        case 2:
          imports = parseImports(b, sec);
          break;
        case 5:
          memories = parseMemory(b, sec);
          break;
        case 7:
          exports_ = parseExports(b, sec);
          break;
        case 10:
          codeCount = parseCodeCount(b, sec);
          break;
        case 11:
          dataCount = parseDataCount(b, sec);
          break;
      }
    }
  } catch (e) {
    parseError = String(e);
  }

  let html = `<style>${STYLE}</style>`;

  // Header
  html += `<div class="header-card">`;
  html += `<span class="badge badge-main">WebAssembly Module</span>`;
  html += `<span class="badge badge-version">v${versionNum2}</span>`;
  html += `<span class="badge badge-size">${esc(fmtBytes(intake.size))}</span>`;
  html += `</div>`;

  // Sections table
  html += `<div class="section-block">`;
  html += `<div class="section-title">Sections (${sections.length})</div>`;
  if (sections.length === 0) {
    html += `<div class="empty-note">No sections found.</div>`;
  } else {
    html += `<table><thead><tr><th>Section</th><th style="text-align:right">Size</th></tr></thead><tbody>`;
    for (const sec of sections) {
      let label = sectionName(sec.id);
      if (sec.id === 0) {
        const customName = parseCustomName(b, sec);
        if (customName) label = `Custom (${customName})`;
      }
      html += `<tr><td>${esc(label)}</td><td class="td-size">${esc(fmtBytes(sec.size))}</td></tr>`;
    }
    html += `</tbody></table>`;
  }
  html += `</div>`;

  // Imports table
  html += `<div class="section-block">`;
  html += `<div class="section-title">Imports (${imports.length})</div>`;
  if (imports.length === 0) {
    html += `<div class="empty-note">No imports.</div>`;
  } else {
    html += `<table><thead><tr><th>Module</th><th>Name</th><th>Kind</th></tr></thead><tbody>`;
    for (const imp of imports) {
      const kc = kindClass(imp.kind);
      html += `<tr><td>${esc(imp.module)}</td><td>${esc(imp.name)}</td><td class="td-kind ${kc}">${esc(imp.kind)}</td></tr>`;
    }
    html += `</tbody></table>`;
  }
  html += `</div>`;

  // Exports table
  html += `<div class="section-block">`;
  html += `<div class="section-title">Exports (${exports_.length})</div>`;
  if (exports_.length === 0) {
    html += `<div class="empty-note">No exports.</div>`;
  } else {
    html += `<table><thead><tr><th>Name</th><th>Kind</th></tr></thead><tbody>`;
    for (const exp of exports_) {
      const kc = kindClass(exp.kind);
      html += `<tr><td>${esc(exp.name)}</td><td class="td-kind ${kc}">${esc(exp.kind)}</td></tr>`;
    }
    html += `</tbody></table>`;
  }
  html += `</div>`;

  // Memory info
  const importedMemories = imports.filter((i) => i.kind === 'memory');
  const totalMemories = memories.length + importedMemories.length;
  if (totalMemories > 0 || memories.length > 0) {
    html += `<div class="section-block">`;
    html += `<div class="section-title">Memory</div>`;
    const allMems = [...memories];
    if (allMems.length > 0) {
      for (const mem of allMems) {
        const initialMB = (mem.minPages * 65536 / 1048576).toFixed(0);
        const maxStr = mem.maxPages != null
          ? `${mem.maxPages} pages (${(mem.maxPages * 65536 / 1048576).toFixed(0)} MB)`
          : 'unbounded';
        html += `<div class="info-row">`;
        html += `<span class="info-label">Segments:</span><span class="info-value">${allMems.length}</span>`;
        html += `<span class="info-label" style="margin-left:12px">Initial:</span><span class="info-value">${mem.minPages} pages (${initialMB} MB)</span>`;
        html += `<span class="info-label" style="margin-left:12px">Max:</span><span class="info-value">${maxStr}</span>`;
        html += `</div>`;
      }
    } else if (importedMemories.length > 0) {
      html += `<div class="info-row"><span class="info-label">Memory imported from:</span> <span class="info-value">${esc(importedMemories[0].module + '.' + importedMemories[0].name)}</span></div>`;
    }
    html += `</div>`;
  }

  // Summary row
  html += `<div class="section-block">`;
  html += `<div class="section-title">Summary</div>`;
  html += `<div class="info-row">`;
  if (typeCount != null) html += `<span class="info-label">Types:</span><span class="info-value">${typeCount}</span>`;
  if (codeCount != null) html += `<span class="info-label" style="margin-left:12px">Defined functions:</span><span class="info-value">${codeCount}</span>`;
  if (dataCount != null) html += `<span class="info-label" style="margin-left:12px">Data segments:</span><span class="info-value">${dataCount}</span>`;
  if (customNames.length > 0) html += `<span class="info-label" style="margin-left:12px">Custom sections:</span><span class="info-value">${esc(customNames.join(', '))}</span>`;
  html += `</div>`;
  html += `</div>`;

  if (parseError) {
    html += `<div class="error-box">Parse error: ${esc(parseError)}</div>`;
  }

  return { bodyHtml: html, hadUnsafe: false };
}
