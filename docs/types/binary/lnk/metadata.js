function filetimeToDate(lo, hi) {
  const ms = (hi * 4294967296 + lo) / 10000 - 11644473600000;
  if (ms <= 0 || !isFinite(ms)) return null;
  return new Date(ms);
}

function readUint16LE(b, off) {
  return b[off] | (b[off + 1] << 8);
}
function readUint32LE(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}

function readNullTermAscii(b, off) {
  let end = off;
  while (end < b.length && b[end] !== 0) end++;
  return new TextDecoder('ascii').decode(b.slice(off, end));
}

const LF = {
  HasLinkTargetIDList: 1 << 0,
  HasLinkInfo:         1 << 1,
  HasName:             1 << 2,
  HasRelativePath:     1 << 3,
  HasWorkingDir:       1 << 4,
  HasArguments:        1 << 5,
  HasIconLocation:     1 << 6,
  IsUnicode:           1 << 7,
};

const SHOW_CMD = { 1: 'Normal', 3: 'Maximized', 7: 'Minimized' };

export function extractMetadata(intake) {
  try {
    const bytes = intake.bytes;
    if (!bytes || bytes.length < 76) return { format: 'Windows Shortcut' };

    const linkFlags  = readUint32LE(bytes, 20);
    const targetSize = readUint32LE(bytes, 52);
    const showCmd    = readUint32LE(bytes, 60);
    const ctimeLo    = readUint32LE(bytes, 28);
    const ctimeHi    = readUint32LE(bytes, 32);
    const wtimeLo    = readUint32LE(bytes, 44);
    const wtimeHi    = readUint32LE(bytes, 48);

    const created  = filetimeToDate(ctimeLo, ctimeHi);
    const modified = filetimeToDate(wtimeLo, wtimeHi);

    let off = 76;
    let localPath = null;
    let relativePath = null;
    let workingDir = null;
    let args = null;
    let iconLocation = null;

    // Skip LinkTargetIDList
    if (linkFlags & LF.HasLinkTargetIDList) {
      if (off + 2 > bytes.length) return { format: 'Windows Shortcut' };
      const idListSize = readUint16LE(bytes, off);
      off += 2 + idListSize;
    }

    // Parse LinkInfo
    if (linkFlags & LF.HasLinkInfo) {
      if (off + 4 > bytes.length) return { format: 'Windows Shortcut' };
      const liSize       = readUint32LE(bytes, off);
      const liHeaderSize = readUint32LE(bytes, off + 4);
      const liFlags      = readUint32LE(bytes, off + 8);
      const localPathOff = readUint32LE(bytes, off + 16);

      let localPathOffUnicode = 0;
      if (liHeaderSize >= 36 && off + 36 <= bytes.length) {
        localPathOffUnicode = readUint32LE(bytes, off + 28);
      }

      if (liFlags & 0x01) {
        if (localPathOffUnicode > 0) {
          const absOff = off + localPathOffUnicode;
          let end = absOff;
          while (end + 1 < bytes.length && (bytes[end] !== 0 || bytes[end + 1] !== 0)) end += 2;
          localPath = new TextDecoder('utf-16le').decode(bytes.slice(absOff, end));
        } else {
          localPath = readNullTermAscii(bytes, off + localPathOff);
        }
      }

      off += liSize;
    }

    // Parse StringData
    const isUnicode = !!(linkFlags & LF.IsUnicode);
    const charSize = isUnicode ? 2 : 1;

    function readStr() {
      if (off + 2 > bytes.length) return null;
      const count = readUint16LE(bytes, off);
      off += 2;
      const byteLen = count * charSize;
      if (off + byteLen > bytes.length) return null;
      const slice = bytes.slice(off, off + byteLen);
      off += byteLen;
      const s = isUnicode
        ? new TextDecoder('utf-16le').decode(slice)
        : new TextDecoder('ascii').decode(slice);
      return s || null;
    }

    if (linkFlags & LF.HasName)         readStr(); // skip description
    if (linkFlags & LF.HasRelativePath) relativePath = readStr();
    if (linkFlags & LF.HasWorkingDir)   workingDir   = readStr();
    if (linkFlags & LF.HasArguments)    args         = readStr();
    if (linkFlags & LF.HasIconLocation) iconLocation = readStr();

    return {
      format:       'Windows Shortcut',
      targetPath:   localPath || null,
      workingDir:   workingDir || null,
      arguments:    args || null,
      relativePath: relativePath || null,
      showCommand:  SHOW_CMD[showCmd] || null,
      targetSize:   targetSize > 0 ? targetSize : null,
      created:      created ? created.toISOString() : null,
      modified:     modified ? modified.toISOString() : null,
      iconLocation: iconLocation || null,
    };
  } catch {
    return { format: 'Windows Shortcut' };
  }
}
