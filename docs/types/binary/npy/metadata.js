function parseNpyHeader(bytes) {
  if (bytes[0] !== 0x93) throw new Error('Not a NumPy file');
  const major = bytes[6];
  const minor = bytes[7];
  let headerLen, dataOffset;
  if (major === 1) {
    headerLen = bytes[8] | (bytes[9] << 8);
    dataOffset = 10 + headerLen;
  } else if (major === 2) {
    headerLen = bytes[8] | (bytes[9] << 8) | (bytes[10] << 16) | (bytes[11] << 24);
    dataOffset = 12 + headerLen;
  } else {
    throw new Error(`Unknown NumPy format version ${major}.${minor}`);
  }

  const headerStart = major === 1 ? 10 : 12;
  const headerStr = new TextDecoder('ascii').decode(bytes.slice(headerStart, dataOffset));

  const descrMatch = headerStr.match(/'descr'\s*:\s*'([^']+)'/);
  const shapeMatch = headerStr.match(/'shape'\s*:\s*\(([^)]*)\)/);
  const fortranMatch = headerStr.match(/'fortran_order'\s*:\s*(True|False)/);

  const descr = descrMatch ? descrMatch[1] : '<f8';
  const shapeStr = shapeMatch ? shapeMatch[1] : '';
  const shape = shapeStr.trim() === '' ? [] : shapeStr.split(',').map(s => s.trim()).filter(Boolean).map(Number);
  const fortranOrder = fortranMatch ? fortranMatch[1] === 'True' : false;

  return { major, minor, descr, shape, fortranOrder, dataOffset };
}

function decodeDtype(descr) {
  const endian = descr[0];
  const kind = descr[1];
  const itemsize = parseInt(descr.slice(2)) || 1;

  const endianName = endian === '<' ? 'little-endian' : endian === '>' ? 'big-endian' : '';
  const kindNames = { f: 'float', i: 'int', u: 'uint', b: 'bool', c: 'complex', U: 'unicode', S: 'bytes', V: 'void' };
  const bits = itemsize * 8;

  return `${endianName ? endianName + ' ' : ''}${kindNames[kind] || kind}${bits > 0 ? bits : ''}`;
}

function listZipFiles(bytes) {
  let eocdPos = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (bytes[i] === 0x50 && bytes[i+1] === 0x4B && bytes[i+2] === 0x05 && bytes[i+3] === 0x06) {
      eocdPos = i; break;
    }
  }
  if (eocdPos < 0) return [];

  const dv = new DataView(bytes.buffer, bytes.byteOffset);
  const cdOffset = dv.getUint32(eocdPos + 16, true);
  const cdCount = dv.getUint16(eocdPos + 8, true);

  const files = [];
  let pos = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (dv.getUint32(pos, true) !== 0x02014B50) break;
    const compressionMethod = dv.getUint16(pos + 10, true);
    const compressedSize = dv.getUint32(pos + 20, true);
    const uncompressedSize = dv.getUint32(pos + 24, true);
    const nameLen = dv.getUint16(pos + 28, true);
    const extraLen = dv.getUint16(pos + 30, true);
    const commentLen = dv.getUint16(pos + 32, true);
    const localHeaderOffset = dv.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(bytes.slice(pos + 46, pos + 46 + nameLen));
    files.push({ name, compressedSize, uncompressedSize, localHeaderOffset, compressionMethod });
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

export async function extractMetadata(intake) {
  const b = intake.bytes;
  const ext = intake.filename?.split('.').pop()?.toLowerCase();
  try {
    if (ext === 'npz' || (b && b[0] === 0x50 && b[1] === 0x4B)) {
      const files = listZipFiles(b);
      const arrays = files.filter(f => f.name.endsWith('.npy'));
      return {
        format: 'NumPy Archive',
        arrayCount: arrays.length,
        arrays: arrays.map(f => f.name.replace(/\.npy$/, '')),
        size: intake.size,
      };
    } else {
      const { descr, shape, fortranOrder } = parseNpyHeader(b);
      const total = shape.length === 0 ? 1 : shape.reduce((a, b) => a * b, 1);
      return {
        format: 'NumPy Array',
        dtype: descr,
        dtypeHuman: decodeDtype(descr),
        shape,
        elements: total,
        fortranOrder,
        size: intake.size,
      };
    }
  } catch (e) {
    return { format: 'NumPy', error: e.message, size: intake.size };
  }
}
