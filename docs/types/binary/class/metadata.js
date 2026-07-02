// Map JVM major version to Java release name.
function javaVersion(major) {
  if (major < 45) return 'Pre-Java 1';
  if (major === 45) return 'Java 1';
  if (major === 46) return 'Java 2';
  if (major === 47) return 'Java 3';
  if (major === 48) return 'Java 4';
  if (major === 49) return 'Java 5';
  if (major === 50) return 'Java 6';
  if (major === 51) return 'Java 7';
  if (major === 52) return 'Java 8';
  if (major === 53) return 'Java 9';
  if (major === 54) return 'Java 10';
  if (major === 55) return 'Java 11';
  if (major === 56) return 'Java 12';
  if (major === 57) return 'Java 13';
  if (major === 58) return 'Java 14';
  if (major === 59) return 'Java 15';
  if (major === 60) return 'Java 16';
  if (major === 61) return 'Java 17';
  if (major === 62) return 'Java 18';
  if (major === 63) return 'Java 19';
  if (major === 64) return 'Java 20';
  if (major === 65) return 'Java 21';
  if (major === 66) return 'Java 22';
  if (major === 67) return 'Java 23';
  if (major === 68) return 'Java 24';
  return `Java ${major - 44} (major ${major})`;
}

function hasClassMagic(b) {
  return b?.[0] === 0xca && b[1] === 0xfe && b[2] === 0xba && b[3] === 0xbe;
}

// Walk the constant pool starting at offset 8. Returns { utf8: Map<index, string>,
// classes: number[], cpCount, nextOff } or null on error.
function parseConstantPool(b) {
  if (b.length < 10) return null;
  const cpCount = (b[8] << 8) | b[9]; // number of cp_info entries + 1
  if (cpCount < 1) return null;
  const utf8 = new Map();   // index -> string
  const classes = [];       // indices of CONSTANT_Class entries (tag 7) { index, nameIndex }
  let off = 10;
  let i = 1;
  while (i < cpCount) {
    if (off >= b.length) return null;
    const tag = b[off++];
    switch (tag) {
      case 1: { // Utf8
        if (off + 2 > b.length) return null;
        const len = (b[off] << 8) | b[off + 1];
        off += 2;
        if (off + len > b.length) return null;
        try {
          const str = new TextDecoder('utf-8', { fatal: false }).decode(b.slice(off, off + len));
          utf8.set(i, str);
        } catch { /* skip */ }
        off += len;
        i += 1;
        break;
      }
      case 3: // Integer
      case 4: // Float
        off += 4; i += 1; break;
      case 5: // Long  — consumes TWO slots
      case 6: // Double
        off += 8; i += 2; break;
      case 7: // Class
        if (off + 2 > b.length) return null;
        classes.push({ index: i, nameIndex: (b[off] << 8) | b[off + 1] });
        off += 2; i += 1; break;
      case 8: // String
        off += 2; i += 1; break;
      case 9:  // Fieldref
      case 10: // Methodref
      case 11: // InterfaceMethodref
      case 12: // NameAndType
        off += 4; i += 1; break;
      case 15: // MethodHandle
        off += 3; i += 1; break;
      case 16: // MethodType
        off += 2; i += 1; break;
      case 17: // Dynamic
      case 18: // InvokeDynamic
        off += 4; i += 1; break;
      case 19: // Module
      case 20: // Package
        off += 2; i += 1; break;
      default:
        // Unknown tag — can't continue parsing reliably.
        return { utf8, classes, cpCount, nextOff: off, error: `Unknown CP tag ${tag} at offset ${off - 1}` };
    }
  }
  return { utf8, classes, cpCount, nextOff: off };
}

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) {
    return { label: 'Java Class', fields: [{ label: 'Error', value: 'File too small' }] };
  }
  if (!hasClassMagic(b)) {
    return { label: 'Java Class', fields: [{ label: 'Error', value: 'Missing CAFEBABE class-file signature' }] };
  }

  const minor = (b[4] << 8) | b[5];
  const major = (b[6] << 8) | b[7];
  const jv = javaVersion(major);

  const cp = parseConstantPool(b);
  let className = null;
  if (cp) {
    // First CONSTANT_Class entry is typically the class being defined.
    for (const cls of cp.classes) {
      const name = cp.utf8.get(cls.nameIndex);
      if (name) { className = name; break; }
    }
  }

  const fields = [];
  if (className) {
    fields.push({ label: 'Class name', value: className.replace(/\//g, '.') });
  }
  fields.push({ label: 'Java version', value: jv });
  fields.push({ label: 'Major version', value: String(major) });
  fields.push({ label: 'Minor version', value: String(minor) });
  if (cp) {
    fields.push({ label: 'Constant pool entries', value: String(cp.cpCount - 1) });
    if (cp.error) {
      fields.push({ label: 'Parse warning', value: cp.error });
    }
  } else {
    fields.push({ label: 'Parse error', value: 'Constant pool truncated or malformed' });
  }

  const label = className
    ? className.replace(/\//g, '.').split('.').pop()
    : 'Java Class';

  return { label, fields };
}
