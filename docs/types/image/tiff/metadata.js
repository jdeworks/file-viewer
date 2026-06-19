const TAGS = new Map([
  [256, 'Width'],
  [257, 'Height'],
  [258, 'Bits per sample'],
  [259, 'Compression'],
  [262, 'Photometric interpretation'],
  [277, 'Samples per pixel'],
]);

const COMPRESSION = new Map([[1, 'None'], [5, 'LZW'], [7, 'JPEG'], [8, 'Deflate'], [32773, 'PackBits']]);
const PHOTO = new Map([[0, 'WhiteIsZero'], [1, 'BlackIsZero'], [2, 'RGB'], [3, 'Palette'], [4, 'Transparency mask'], [6, 'YCbCr']]);

export async function extractMetadata(intake) {
  return { fields: parseTiffMetadata(intake.bytes || new Uint8Array()) };
}

export function parseTiffMetadata(bytes) {
  const info = parseIfd(bytes);
  const fields = [
    { label: 'Format', value: info.bigTiff ? 'BigTIFF' : 'TIFF' },
    { label: 'Byte order', value: info.littleEndian ? 'Little-endian' : 'Big-endian' },
  ];
  for (const [tag, label] of TAGS) {
    if (!info.values.has(tag)) continue;
    let value = info.values.get(tag).join(', ');
    if (tag === 259) value = COMPRESSION.get(Number(value)) || value;
    if (tag === 262) value = PHOTO.get(Number(value)) || value;
    fields.push({ label, value });
  }
  if (info.ifdOffset) fields.push({ label: 'First IFD offset', value: String(info.ifdOffset) });
  return fields;
}

function parseIfd(bytes) {
  if (bytes.length < 8) return { values: new Map(), littleEndian: true, bigTiff: false };
  const sig = String.fromCharCode(bytes[0], bytes[1]);
  const littleEndian = sig === 'II';
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (o) => dv.getUint16(o, littleEndian);
  const u32 = (o) => dv.getUint32(o, littleEndian);
  const magic = u16(2);
  const bigTiff = magic === 43;
  const ifdOffset = bigTiff && bytes.length >= 16 ? Number(dv.getBigUint64(8, littleEndian)) : u32(4);
  const values = new Map();
  if (bigTiff || ifdOffset + 2 > bytes.length) return { values, littleEndian, bigTiff, ifdOffset };
  const count = u16(ifdOffset);
  for (let i = 0; i < count; i++) {
    const p = ifdOffset + 2 + i * 12;
    if (p + 12 > bytes.length) break;
    const tag = u16(p);
    const type = u16(p + 2);
    const n = u32(p + 4);
    const rawOffset = p + 8;
    const size = type === 3 ? 2 : type === 4 ? 4 : 0;
    if (!size || n > 16) continue;
    const total = size * n;
    const dataOffset = total <= 4 ? rawOffset : u32(rawOffset);
    if (dataOffset + total > bytes.length) continue;
    const vals = [];
    for (let j = 0; j < n; j++) vals.push(type === 3 ? u16(dataOffset + j * 2) : u32(dataOffset + j * 4));
    values.set(tag, vals);
  }
  return { values, littleEndian, bigTiff, ifdOffset };
}
