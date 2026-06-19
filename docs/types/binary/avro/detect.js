function hasAscii(b, off, s) {
  if (off + s.length > b.length) return false;
  for (let i = 0; i < s.length; i++) if (b[off + i] !== s.charCodeAt(i)) return false;
  return true;
}

function hasExtension(intake, ...exts) {
  const name = (intake.filename || '').toLowerCase();
  return exts.some((e) => name.endsWith('.' + e));
}

export function detect(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4) return 0;

  // Avro object container file magic: 0x4F 0x62 0x6A 0x01 = 'Obj\x01'
  if (hasAscii(b, 0, 'Obj') && b[3] === 0x01) {
    return hasExtension(intake, 'avro') ? 0.99 : 0.95;
  }

  if (hasExtension(intake, 'avro')) return 0.45;
  return 0;
}
