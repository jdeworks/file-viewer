// MATLAB v5 MAT-file format:
//   bytes 0-115:   descriptive text (null-padded), e.g. "MATLAB 5.0 MAT-file, Platform: MACI64, Created on: ..."
//   bytes 116-123: version + endian indicator
//     [116-117]: version (always 0x0100)
//     [118-119]: subsystem offset (usually 0)
//     [120-121]: reserved
//     [122-123]: version (always 0x0100 as LE short)
//     [124-125]: reserved
//     [126-127]: endian indicator: 'MI' or 'IM'
//   bytes 128+: sequence of data elements:
//     [0-3]: type tag (uint32)
//     [4-7]: byte count (uint32)
//     [8+]:  data

const MAT_TYPES = {
  1: 'miINT8', 2: 'miUINT8', 3: 'miINT16', 4: 'miUINT16',
  5: 'miINT32', 6: 'miUINT32', 7: 'miSINGLE', 9: 'miDOUBLE',
  12: 'miINT64', 13: 'miUINT64', 14: 'miMATRIX', 15: 'miCOMPRESSED',
  16: 'miUTF8', 17: 'miUTF16', 18: 'miUTF32',
};

const MX_CLASSES = {
  1: 'cell', 2: 'struct', 3: 'object', 4: 'char',
  5: 'sparse', 6: 'double', 7: 'single',
  8: 'int8', 9: 'uint8', 10: 'int16', 11: 'uint16',
  12: 'int32', 13: 'uint32', 14: 'int64', 15: 'uint64',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function r32le(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}
function r32be(b, off) {
  return ((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0;
}

function parseElements(b, isLE) {
  const r32 = isLE ? r32le : r32be;
  const elements = [];
  let off = 128;

  while (off + 8 <= b.length && elements.length < 30) {
    const typeTag = r32(b, off);
    const byteCount = r32(b, off + 4);
    const dataOff = off + 8;

    // Small data element format: tag has size in upper 16 bits
    const isSmall = (typeTag >> 16) !== 0;
    const realType = isSmall ? (typeTag & 0xffff) : typeTag;
    const realSize = isSmall ? (typeTag >> 16) : byteCount;

    const typeName = MAT_TYPES[realType] || `type${realType}`;

    if (realType === 14 && !isSmall) {
      // miMATRIX — parse sub-elements to get name and dimensions
      let name = '?';
      let className = '?';
      let dims = '';
      try {
        let subOff = dataOff;
        // flags sub-element
        const flagsType = r32(b, subOff);
        const flagsSize = r32(b, subOff + 4);
        const mxClass = b[subOff + 8] & 0xff;
        className = MX_CLASSES[mxClass] || `class${mxClass}`;
        subOff += 8 + Math.ceil(flagsSize / 8) * 8;
        // dims sub-element
        const dimsType = r32(b, subOff);
        const dimsSize = r32(b, subOff + 4);
        const numDims = dimsSize / 4;
        const dimArr = [];
        for (let i = 0; i < numDims && i < 4; i++) {
          dimArr.push(r32(b, subOff + 8 + i * 4));
        }
        dims = dimArr.join('×');
        subOff += 8 + Math.ceil(dimsSize / 8) * 8;
        // name sub-element
        const nameType = r32(b, subOff);
        const nameSize = (nameType >> 16) !== 0 ? (nameType >> 16) : r32(b, subOff + 4);
        const nameOff = (nameType >> 16) !== 0 ? subOff + 4 : subOff + 8;
        name = new TextDecoder('ascii', { fatal: false }).decode(b.slice(nameOff, nameOff + nameSize));
      } catch (_) {}
      elements.push({ type: typeName, size: byteCount, name, className, dims });
    } else {
      elements.push({ type: typeName, size: realSize, name: null, className: null, dims: null });
    }

    if (isSmall) off = off + 8;
    else off = off + 8 + Math.ceil(byteCount / 8) * 8;
  }
  return elements;
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 128) {
    return { bodyHtml: '<p class="viewer-message">Not a valid MATLAB v5 MAT-file.</p>', hadUnsafe: false };
  }

  const headerText = new TextDecoder('ascii', { fatal: false }).decode(b.slice(0, 116)).replace(/\x00/g, '').trim();
  if (!headerText.startsWith('MATLAB 5.0 MAT-file')) {
    return { bodyHtml: '<p class="viewer-message">Not a MATLAB v5 MAT-file (missing header text).</p>', hadUnsafe: false };
  }

  const isLE = b[126] === 0x49; // 'I' = IM = little-endian
  const endianStr = isLE ? 'Little-endian (IM)' : 'Big-endian (MI)';

  const elements = parseElements(b, isLE);
  const matrices = elements.filter((e) => e.name !== null);

  const metaRows = [
    ['Format', 'MATLAB MAT-file v5'],
    ['Endianness', endianStr],
    ['Header', headerText.length > 80 ? headerText.slice(0, 80) + '…' : headerText],
    ['Variables', String(matrices.length)],
    ['File size', `${b.length.toLocaleString()} bytes`],
  ].map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  const varTableHtml = matrices.length ? `
    <div class="meta-section">
      <h4 class="meta-section-title">Variables</h4>
      <table class="mat-table">
        <thead><tr><th>Name</th><th>Class</th><th>Dimensions</th><th>Size</th></tr></thead>
        <tbody>${matrices.map((m) =>
          `<tr><td class="mat-name">${esc(m.name)}</td><td class="mat-class">${esc(m.className)}</td><td>${esc(m.dims)}</td><td>${m.size.toLocaleString()}B</td></tr>`
        ).join('')}</tbody>
      </table>
    </div>` : '';

  return {
    bodyHtml: `
      <style>
        .badge-mat { background: #c2185b; color: #fff; }
        .mat-table { border-collapse: collapse; width: 100%; font-size: 0.84rem; margin: 8px 0; }
        .mat-table th { background: #fce4ec; text-align: left; padding: 4px 8px; border-bottom: 2px solid #f48fb1; }
        .mat-table td { padding: 3px 8px; border-bottom: 1px solid #f5f5f5; }
        .mat-name { font-family: monospace; font-weight: 700; color: #c2185b; }
        .mat-class { font-family: monospace; color: #555; font-size: 0.82rem; }
      </style>
      <div class="badge-row"><span class="badge badge-mat">MAT</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">File Info</h4>
        ${metaRows}
      </div>
      ${varTableHtml}`,
    hadUnsafe: false,
  };
}
