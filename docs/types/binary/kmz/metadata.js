function u16(b, off) {
  return b[off] | (b[off + 1] << 8);
}

function u32(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}

function readLocalZipEntries(bytes) {
  const td = new TextDecoder();
  const entries = [];
  let off = 0;
  while (off + 30 <= bytes.length && u32(bytes, off) === 0x04034b50) {
    const method = u16(bytes, off + 8);
    const compressedSize = u32(bytes, off + 18);
    const uncompressedSize = u32(bytes, off + 22);
    const nameLen = u16(bytes, off + 26);
    const extraLen = u16(bytes, off + 28);
    const nameStart = off + 30;
    const dataStart = nameStart + nameLen + extraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) break;
    const name = td.decode(bytes.slice(nameStart, nameStart + nameLen));
    entries.push({ name, method, compressedSize, uncompressedSize });
    off = dataEnd;
  }
  return entries;
}

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4) return {};
  if (!(b[0] === 0x50 && b[1] === 0x4b)) return {};
  const entries = readLocalZipEntries(b);
  const kmlEntries = entries.filter((entry) => entry.name.toLowerCase().endsWith('.kml'));
  const primary = kmlEntries.find((entry) => /(?:^|\/)doc\.kml$/i.test(entry.name)) || kmlEntries[0];
  const out = {
    Format: 'KMZ (Compressed KML)',
    Container: 'ZIP',
    Files: String(entries.length),
  };
  if (kmlEntries.length) out['KML files'] = String(kmlEntries.length);
  if (primary) out['Primary KML'] = primary.name;
  const uncompressed = entries.reduce((sum, entry) => sum + (entry.uncompressedSize || 0), 0);
  if (uncompressed) out['Uncompressed size'] = `${uncompressed.toLocaleString()} bytes`;
  return out;
}
