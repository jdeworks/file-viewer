// OpenEXR header parser — reads version and attribute block.
// Full pixel data requires imath/openexr-js (~large); this shows header info only.
//
// OpenEXR v1 layout:
//   bytes 0-3:  magic  0x76 0x2F 0x31 0x01
//   bytes 4-7:  version (LE int32): bits 0-7 = file format version, bits 8+ = flags
//   bytes 8+:   null-terminated attribute list
//
// OpenEXR v2 multipart adds additional flags in the version word.

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function r32le(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}

function readCStr(b, off) {
  let end = off;
  while (end < b.length && b[end] !== 0) end++;
  return { val: new TextDecoder('utf-8', { fatal: false }).decode(b.slice(off, end)), next: end + 1 };
}

function parseAttributes(b, off) {
  const attrs = [];
  while (off < b.length) {
    if (b[off] === 0) break; // end of header marker
    const name = readCStr(b, off); off = name.next;
    if (off >= b.length) break;
    const type = readCStr(b, off); off = type.next;
    if (off + 4 > b.length) break;
    const size = r32le(b, off); off += 4;
    if (off + size > b.length) break;
    const valBytes = b.slice(off, off + size);
    off += size;
    let val = null;
    try {
      if (type.val === 'int' && size === 4) val = (valBytes[0] | (valBytes[1] << 8) | (valBytes[2] << 16) | (valBytes[3] << 24)) | 0;
      else if (type.val === 'float' && size === 4) {
        const ab = new ArrayBuffer(4); new Uint8Array(ab).set(valBytes); val = new DataView(ab).getFloat32(0, true).toFixed(4);
      } else if (type.val === 'double' && size === 8) {
        const ab = new ArrayBuffer(8); new Uint8Array(ab).set(valBytes); val = new DataView(ab).getFloat64(0, true).toFixed(4);
      } else if (type.val === 'string') val = new TextDecoder('utf-8', { fatal: false }).decode(valBytes);
      else if (type.val === 'box2i' && size === 16) {
        const [xMin, yMin, xMax, yMax] = [0, 4, 8, 12].map((o) => (valBytes[o] | (valBytes[o+1] << 8) | (valBytes[o+2] << 16) | (valBytes[o+3] << 24)) | 0);
        val = `(${xMin},${yMin}) → (${xMax},${yMax})`;
      } else if (type.val === 'v2f' && size === 8) {
        const ab = new ArrayBuffer(8); new Uint8Array(ab).set(valBytes);
        const dv = new DataView(ab);
        val = `(${dv.getFloat32(0, true).toFixed(3)}, ${dv.getFloat32(4, true).toFixed(3)})`;
      } else if (type.val === 'chromaticities' && size === 32) {
        val = '(encoded)';
      } else if (type.val === 'compression' && size === 1) {
        const comprNames = ['none', 'RLE', 'ZIPS', 'ZIP', 'PIZ', 'PXR24', 'B44', 'B44A', 'DWAA', 'DWAB'];
        val = comprNames[valBytes[0]] || `type ${valBytes[0]}`;
      } else if (type.val === 'lineOrder' && size === 1) {
        val = ['INCREASING_Y', 'DECREASING_Y', 'RANDOM_Y'][valBytes[0]] || `${valBytes[0]}`;
      } else if (type.val === 'envmap' && size === 1) {
        val = ['LATLONG', 'CUBE'][valBytes[0]] || `${valBytes[0]}`;
      } else {
        val = `(${type.val}, ${size}B)`;
      }
    } catch (_) { val = `(${type.val}, ${size}B)`; }
    attrs.push({ name: name.val, type: type.val, val: String(val) });
    if (attrs.length >= 50) { attrs.push({ name: '…', type: '', val: 'truncated' }); break; }
  }
  return attrs;
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) {
    return { bodyHtml: '<p class="viewer-message">Not a valid OpenEXR file.</p>', hadUnsafe: false };
  }

  const MAGIC = [0x76, 0x2f, 0x31, 0x01];
  if (!MAGIC.every((v, i) => b[i] === v)) {
    return { bodyHtml: '<p class="viewer-message">Missing OpenEXR magic signature.</p>', hadUnsafe: false };
  }

  const version = r32le(b, 4);
  const fileVersion = version & 0xff;
  const isTiled = !!(version & 0x0200);
  const isLongNames = !!(version & 0x0400);
  const isNonImage = !!(version & 0x0800);
  const isMultiPart = !!(version & 0x1000);

  let attrs = [];
  try { attrs = parseAttributes(b, 8); } catch (_) {}

  const getAttr = (n) => attrs.find((a) => a.name === n);
  const displayWindow = getAttr('displayWindow');
  const dataWindow = getAttr('dataWindow');
  const pixelAspect = getAttr('pixelAspectRatio');
  const compression = getAttr('compression');
  const channels = getAttr('channels');

  const flags = [
    isTiled ? 'Tiled' : 'Scanline',
    isLongNames ? 'Long names' : null,
    isNonImage ? 'Non-image' : null,
    isMultiPart ? 'Multi-part' : null,
  ].filter(Boolean).join(', ');

  const metaRows = [
    ['Format', 'OpenEXR (High Dynamic Range Image)'],
    ['File version', `${fileVersion}`],
    ['Flags', flags || 'none'],
    displayWindow ? ['Display window', displayWindow.val] : null,
    dataWindow ? ['Data window', dataWindow.val] : null,
    pixelAspect ? ['Pixel aspect ratio', pixelAspect.val] : null,
    compression ? ['Compression', compression.val] : null,
    ['File size', `${b.length.toLocaleString()} bytes`],
  ].filter(Boolean).map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  const attrRows = attrs
    .filter((a) => !['displayWindow', 'dataWindow', 'pixelAspectRatio', 'compression'].includes(a.name))
    .slice(0, 20)
    .map((a) =>
      `<div class="meta-row"><span class="meta-key">${esc(a.name)}</span><span class="meta-val"><span class="exr-type">${esc(a.type)}</span> ${esc(a.val)}</span></div>`
    ).join('');

  return {
    bodyHtml: `
      <style>
        .badge-exr { background: #c62828; color: #fff; }
        .exr-type { color: #888; font-size: 0.8em; margin-right: 0.4em; }
      </style>
      <div class="badge-row"><span class="badge badge-exr">OpenEXR</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">File Info</h4>
        ${metaRows}
      </div>
      ${attrRows ? `<div class="meta-section"><h4 class="meta-section-title">Attributes</h4>${attrRows}</div>` : ''}
      <div class="meta-section">
        <h4 class="meta-section-title">About this format</h4>
        <p style="font-size:0.85rem;line-height:1.6;margin:0">
          OpenEXR is an HDR image format developed by Industrial Light &amp; Magic, widely used in visual effects and film.
          It supports multiple layers, channels, deep compositing, and lossless/lossy compression.
          Full pixel rendering requires <strong>openexr-js</strong> or a WebGL decoder — only the file header is shown here.
        </p>
      </div>`,
    hadUnsafe: false,
  };
}
