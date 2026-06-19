function hasExtension(intake, ...exts) {
  const name = (intake.filename || '').toLowerCase();
  return exts.some((e) => name.endsWith('.' + e));
}

// CBOR has no universal magic — rely on extension + basic structural validity
function looksLikeCbor(bytes) {
  if (!bytes || bytes.length === 0) return false;
  const major = (bytes[0] >> 5) & 0x7;
  // Major types 0-7 are all valid; but text/binary files have text-range bytes at offset 0
  // CBOR map (0xa0..0xbf) or array (0x80..0x9f) at offset 0 is a strong signal
  const b0 = bytes[0];
  if ((b0 >= 0xa0 && b0 <= 0xbf) || (b0 >= 0x80 && b0 <= 0x9f)) return true;
  // Also: unsigned int (0x00..0x1f), negative int (0x20..0x3f), byte string (0x40..0x5f)
  // text string (0x60..0x7f), float (0xe0..0xf8), simple (0xf4=false,0xf5=true,0xf6=null)
  if (b0 === 0xf4 || b0 === 0xf5 || b0 === 0xf6) return true;
  if (major >= 0 && major <= 6) return true;
  return false;
}

export function detect(intake) {
  if (intake.isBinary === false) return 0; // CBOR is always binary
  const b = intake.bytes;
  if (!b || b.length === 0) return 0;

  if (hasExtension(intake, 'cbor')) {
    return looksLikeCbor(b) ? 0.95 : 0.75;
  }
  // CBOR has no magic — extension-only detection
  return 0;
}
