export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 1) return {};
  const byte0 = b[0];
  const major = byte0 >> 5;
  const TYPE_NAMES = { 0: 'Unsigned Integer', 1: 'Negative Integer', 2: 'Byte String', 3: 'Text String', 4: 'Array', 5: 'Map', 6: 'Tagged', 7: 'Float / Simple' };
  const result = {};
  result['Format'] = 'CBOR (RFC 8949)';
  result['File Size'] = `${b.length} bytes`;
  result['Top-level Major Type'] = TYPE_NAMES[major] || `Major ${major}`;
  return result;
}
