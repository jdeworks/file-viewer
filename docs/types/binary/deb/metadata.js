const AR_MAGIC = [0x21, 0x3c, 0x61, 0x72, 0x63, 0x68, 0x3e, 0x0a];

function isAr(b) {
  return AR_MAGIC.every((byte, i) => b[i] === byte);
}

function ascii(b, start, end) {
  return new TextDecoder('ascii', { fatal: false }).decode(b.slice(start, end)).trim();
}

function readArEntries(b) {
  const entries = [];
  let off = 8;
  while (off + 60 <= b.length) {
    if (b[off + 58] !== 0x60 || b[off + 59] !== 0x0a) break;
    const name = ascii(b, off, off + 16).replace(/\/$/, '');
    const size = parseInt(ascii(b, off + 48, off + 58), 10);
    if (!name || !Number.isFinite(size) || size < 0) break;
    entries.push({ name, size, offset: off + 60 });
    off += 60 + size + (size % 2);
  }
  return entries;
}

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) return {};
  if (!isAr(b)) return {};
  const entries = readArEntries(b);
  const versionEntry = entries.find((entry) => entry.name === 'debian-binary');
  const version = versionEntry
    ? new TextDecoder('ascii', { fatal: false }).decode(b.slice(versionEntry.offset, versionEntry.offset + versionEntry.size)).trim()
    : '';
  return {
    Format: 'Debian Package',
    ...(version ? { 'Format version': version } : {}),
    'Archive members': String(entries.length),
    'Control archive': entries.some((entry) => entry.name.startsWith('control.tar')) ? 'present' : 'missing',
    'Data archive': entries.some((entry) => entry.name.startsWith('data.tar')) ? 'present' : 'missing',
  };
}

export const metadata = extractMetadata;
