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

function parseSections(bytes) {
  const sections = [];
  let pos = 8;
  while (pos < bytes.length) {
    const id = bytes[pos++];
    const { value: size, next } = readULEB128(bytes, pos);
    sections.push({ id, size, contentStart: next, contentEnd: next + size });
    pos = next + size;
  }
  return sections;
}

function countFromSection(bytes, section) {
  try {
    const { value } = readULEB128(bytes, section.contentStart);
    return value;
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

function countImports(bytes, section) {
  try {
    const { value: count, next: pos0 } = readULEB128(bytes, section.contentStart);
    // Just return the declared count; full parse is in renderer
    return count;
  } catch {
    return null;
  }
}

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) {
    return {
      format: 'WebAssembly',
      version: null,
      size: intake.size,
      sectionCount: 0,
      importCount: 0,
      exportCount: 0,
      functionCount: 0,
      hasMemory: false,
      customSections: [],
    };
  }

  // Little-endian uint32 at offset 4; avoid 32-bit sign overflow on the high byte.
  const version = ((b[4] | (b[5] << 8) | (b[6] << 16)) >>> 0) + (b[7] * 0x1000000);

  let sections = [];
  let importCount = 0;
  let exportCount = 0;
  let functionCount = 0;
  let hasMemory = false;
  const customSections = [];

  try {
    sections = parseSections(b);
    for (const sec of sections) {
      switch (sec.id) {
        case 0: {
          const name = parseCustomName(b, sec);
          if (name != null) customSections.push(name);
          break;
        }
        case 2: {
          const n = countImports(b, sec);
          if (n != null) importCount = n;
          break;
        }
        case 5:
          hasMemory = true;
          break;
        case 7: {
          const n = countFromSection(b, sec);
          if (n != null) exportCount = n;
          break;
        }
        case 10: {
          const n = countFromSection(b, sec);
          if (n != null) functionCount = n;
          break;
        }
      }
    }
    // Also check imports for memory imports
    if (!hasMemory) {
      const importSec = sections.find((s) => s.id === 2);
      if (importSec) {
        // Quick scan: if any import has kind 2 (memory), set hasMemory
        try {
          const { value: icount, next: p0 } = readULEB128(b, importSec.contentStart);
          let pos = p0;
          for (let i = 0; i < icount && pos < importSec.contentEnd; i++) {
            const { next: afterMod } = readString(b, pos);
            pos = afterMod;
            const { next: afterName } = readString(b, pos);
            pos = afterName;
            const kind = b[pos++];
            if (kind === 2) { hasMemory = true; break; }
            // Skip type info
            if (kind === 0) { const { next } = readULEB128(b, pos); pos = next; }
            else if (kind === 1) { pos++; const flags = b[pos++]; const { next: nm } = readULEB128(b, pos); pos = nm; if (flags & 1) { const { next } = readULEB128(b, pos); pos = next; } }
            else if (kind === 2) { const flags = b[pos++]; const { next: nm } = readULEB128(b, pos); pos = nm; if (flags & 1) { const { next } = readULEB128(b, pos); pos = next; } }
            else if (kind === 3) { pos += 2; }
          }
        } catch { /* ignore */ }
      }
    }
  } catch { /* return what we have */ }

  return {
    format: 'WebAssembly',
    version,
    size: intake.size,
    sectionCount: sections.length,
    importCount,
    exportCount,
    functionCount,
    hasMemory,
    customSections,
  };
}
