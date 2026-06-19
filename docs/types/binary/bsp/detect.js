function r32le(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}

function hasAscii(b, off, s) {
  for (let i = 0; i < s.length; i++) if (b[off + i] !== s.charCodeAt(i)) return false;
  return true;
}

function hasExtension(intake, ...exts) {
  const name = (intake.filename || '').toLowerCase();
  return exts.some((e) => name.endsWith('.' + e));
}

export function detect(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) return 0;

  if (hasAscii(b, 0, 'IBSP') || hasAscii(b, 0, 'VBSP')) {
    return hasExtension(intake, 'bsp') ? 0.98 : 0.91;
  }

  const version = r32le(b, 0);
  if (version === 29 || version === 30) {
    return hasExtension(intake, 'bsp') ? 0.93 : 0;
  }

  if (hasExtension(intake, 'bsp') && b.length > 124) return 0.3;
  return 0;
}
