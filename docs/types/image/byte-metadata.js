const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_COLOR = {
  0: 'Grayscale',
  2: 'Truecolor',
  3: 'Indexed color',
  4: 'Grayscale + alpha',
  6: 'Truecolor + alpha',
};
const GIF_LIMIT = 512 * 1024;
const RIFF_LIMIT = 512 * 1024;

const ascii = (b, o, n) => {
  if (!b || o + n > b.length) return '';
  let s = '';
  for (let i = 0; i < n; i++) s += String.fromCharCode(b[o + i]);
  return s;
};

const u16le = (b, o) => b[o] | (b[o + 1] << 8);
const u24le = (b, o) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const u32be = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

export function parseImageContainer(bytes) {
  if (!bytes || bytes.length < 12) return [];
  if (isPng(bytes)) return parsePng(bytes);
  if (ascii(bytes, 0, 3) === 'GIF') return parseGif(bytes);
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return parseWebp(bytes);
  if (bytes.length >= 6 && u16le(bytes, 0) === 0 && (u16le(bytes, 2) === 1 || u16le(bytes, 2) === 2)) return parseIco(bytes);
  return [];
}

function isPng(bytes) {
  return PNG_SIG.every((v, i) => bytes[i] === v);
}

function parsePng(bytes) {
  if (bytes.length < 33 || ascii(bytes, 12, 4) !== 'IHDR' || u32be(bytes, 8) !== 13) return [];
  const bitDepth = bytes[24];
  const colorType = PNG_COLOR[bytes[25]];
  const interlace = bytes[28] === 1 ? 'Adam7' : bytes[28] === 0 ? 'None' : null;
  let frames = 0;
  let plays = null;
  let o = 8;
  while (o + 12 <= bytes.length) {
    const len = u32be(bytes, o);
    const type = ascii(bytes, o + 4, 4);
    const data = o + 8;
    if (len > bytes.length - data) break;
    if (type === 'acTL' && len >= 8) {
      frames = u32be(bytes, data);
      plays = u32be(bytes, data + 4);
      break;
    }
    o = data + len + 4;
    if (type === 'IDAT' || o > 512 * 1024) break;
  }
  const rows = [];
  if (colorType) rows.push({ label: 'Color', value: colorType + ', ' + bitDepth + '-bit' });
  if (interlace) rows.push({ label: 'Interlace', value: interlace });
  if (frames > 1) rows.push({ label: 'Animation', value: frames + ' frames' + (plays === 0 ? ', loops forever' : '') });
  return rows;
}

function parseGif(bytes) {
  if (bytes.length < 13) return [];
  const version = ascii(bytes, 3, 3);
  const packed = bytes[10];
  const colorCount = (packed & 0x80) ? 2 ** ((packed & 0x07) + 1) : 0;
  let o = 13 + colorCount * 3;
  let frames = 0;
  let loopCount = null;
  const end = Math.min(bytes.length, GIF_LIMIT);
  while (o < end) {
    const block = bytes[o++];
    if (block === 0x3b) break;
    if (block === 0x2c) {
      frames++;
      if (o + 9 > end) break;
      const imagePacked = bytes[o + 8];
      o += 9;
      if (imagePacked & 0x80) o += 3 * (2 ** ((imagePacked & 0x07) + 1));
      if (!skipSubBlocks()) break;
    } else if (block === 0x21) {
      const label = bytes[o++];
      if (label === 0xff && o < end) {
        const size = bytes[o++];
        const id = ascii(bytes, o, Math.min(size, 11));
        o += size;
        if (id === 'NETSCAPE2.0' && o + 4 <= end && bytes[o] === 3 && bytes[o + 1] === 1) loopCount = u16le(bytes, o + 2);
        if (!skipSubBlocks()) break;
      } else if (!skipSubBlocks()) break;
    } else break;
  }
  const rows = [{ label: 'GIF version', value: version }];
  if (colorCount) rows.push({ label: 'Palette', value: colorCount + ' colors' });
  if (frames > 1) rows.push({ label: 'Animation', value: frames + ' frames' + (loopCount === 0 ? ', loops forever' : loopCount ? ', loops ' + loopCount + ' times' : '') });
  return rows;

  function skipSubBlocks() {
    while (o < end) {
      const n = bytes[o++];
      if (n === 0) return true;
      o += n;
    }
    return false;
  }
}

function parseWebp(bytes) {
  const rows = [];
  let o = 12;
  let codec = null;
  let features = [];
  let frames = 0;
  const end = Math.min(bytes.length, RIFF_LIMIT);
  while (o + 8 <= end) {
    const type = ascii(bytes, o, 4);
    const len = bytes[o + 4] | (bytes[o + 5] << 8) | (bytes[o + 6] << 16) | (bytes[o + 7] << 24);
    const data = o + 8;
    if (len < 0 || len > bytes.length - data) break;
    if (type === 'VP8 ') codec = 'VP8 lossy';
    else if (type === 'VP8L') codec = 'VP8L lossless';
    else if (type === 'VP8X' && len >= 10) {
      codec = 'Extended WebP';
      const flags = bytes[data];
      if (flags & 0x10) features.push('alpha');
      if (flags & 0x02) features.push('animation');
      if (flags & 0x08) features.push('EXIF');
      if (flags & 0x04) features.push('XMP');
      const w = u24le(bytes, data + 4) + 1;
      const h = u24le(bytes, data + 7) + 1;
      rows.push({ label: 'Canvas', value: w + ' × ' + h + ' px' });
    } else if (type === 'ANMF') frames++;
    o = data + len + (len % 2);
  }
  if (codec) rows.unshift({ label: 'Codec', value: codec });
  if (features.length) rows.push({ label: 'Features', value: features.join(', ') });
  if (frames > 1) rows.push({ label: 'Animation', value: frames + ' frames' });
  return rows;
}

function parseIco(bytes) {
  const count = u16le(bytes, 4);
  if (!count || bytes.length < 6 + count * 16) return [];
  const sizes = [];
  let maxBits = 0;
  for (let i = 0; i < count; i++) {
    const o = 6 + i * 16;
    const w = bytes[o] || 256;
    const h = bytes[o + 1] || 256;
    const bits = u16le(bytes, o + 6);
    sizes.push(w + ' × ' + h);
    maxBits = Math.max(maxBits, bits);
  }
  const rows = [{ label: 'Images', value: String(count) }];
  rows.push({ label: 'Icon sizes', value: sizes.join(', ') + ' px' });
  if (maxBits) rows.push({ label: 'Color depth', value: maxBits + '-bit' });
  return rows;
}
