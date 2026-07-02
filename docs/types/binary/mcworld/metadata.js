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

function packageType(intake, names) {
  const lowerName = String(intake.filename || '').toLowerCase();
  const hasLevelDat = names.some((name) => name === 'level.dat' || name.endsWith('/level.dat'));
  const hasManifest = names.some((name) => name === 'manifest.json' || name.endsWith('/manifest.json'));
  const hasBehavior = names.some((name) => /behavior_packs?/i.test(name));
  const hasResource = names.some((name) => /resource_packs?/i.test(name));
  if (lowerName.endsWith('.mctemplate')) return 'World Template';
  if (lowerName.endsWith('.mcpack')) return hasBehavior ? 'Behavior Pack' : hasResource ? 'Resource Pack' : 'Add-On Pack';
  if (!hasLevelDat && hasBehavior) return 'Behavior Pack';
  if (!hasLevelDat && hasResource) return 'Resource Pack';
  if (!hasLevelDat && hasManifest) return 'Add-On Pack';
  return 'World';
}

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4 || u32(b, 0) !== 0x04034b50) return {};
  const entries = readLocalZipEntries(b);
  const names = entries.map((entry) => entry.name);
  const uncompressed = entries.reduce((sum, entry) => sum + (entry.uncompressedSize || 0), 0);
  const out = {
    Format: 'Minecraft Bedrock Package',
    Container: 'ZIP',
    'Package type': packageType(intake, names),
    Files: String(entries.length),
  };
  if (names.some((name) => name === 'level.dat' || name.endsWith('/level.dat'))) out['level.dat'] = 'present';
  if (names.some((name) => name === 'levelname.txt' || name.endsWith('/levelname.txt'))) out['levelname.txt'] = 'present';
  if (names.some((name) => name === 'manifest.json' || name.endsWith('/manifest.json'))) out['manifest.json'] = 'present';
  if (names.some((name) => name.startsWith('db/'))) out.LevelDB = 'present';
  if (uncompressed) out['Uncompressed size'] = `${uncompressed.toLocaleString()} bytes`;
  return out;
}
