function readStr(b, off, len) {
  let s = '';
  for (let i = 0; i < len; i++) {
    const c = b[off + i];
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.trim();
}

function u16le(b, off) {
  return b[off] | (b[off + 1] << 8);
}

function u32le(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}

function isoDate(b, off) {
  if (!b[off]) return null;
  const year = 1900 + b[off];
  const month = b[off + 1];
  const day = b[off + 2];
  if (!month || !day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function row(label, value) {
  return value ? { label, value: String(value) } : null;
}

export async function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 40 + 32) return { fields: [{ label: 'Format', value: 'ISO 9660' }] };
  const pvd = 16 * 2048;
  if (b.length < pvd + 40 + 32) return { fields: [{ label: 'Format', value: 'ISO 9660' }] };
  const magic = readStr(b, pvd + 1, 5);
  if (magic !== 'CD001') return { fields: [{ label: 'Format', value: 'ISO 9660' }] };

  const volumeId = readStr(b, pvd + 40, 32);
  const sysId = readStr(b, pvd + 8, 32);
  const publisher = readStr(b, pvd + 318, 128);
  const preparer = readStr(b, pvd + 446, 128);
  const appId = readStr(b, pvd + 574, 128);
  const sectorSize = u16le(b, pvd + 128);
  const totalSectors = u32le(b, pvd + 80);
  const rootDate = isoDate(b, pvd + 156 + 18);
  const totalBytes = sectorSize && totalSectors ? sectorSize * totalSectors : 0;
  return {
    fields: [
      { label: 'Format', value: 'ISO 9660' },
      row('Volume ID', volumeId),
      row('System ID', sysId),
      row('Publisher', publisher),
      row('Preparer', preparer),
      row('Application', appId),
      row('Sector size', sectorSize ? `${sectorSize.toLocaleString()} bytes` : null),
      row('Total sectors', totalSectors ? totalSectors.toLocaleString() : null),
      row('Total size', totalBytes ? `${totalBytes.toLocaleString()} bytes` : null),
      row('Root date', rootDate),
    ].filter((f) => f.value),
  };
}
