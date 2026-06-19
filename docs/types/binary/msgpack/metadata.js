export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length === 0) return {};
  const first = b[0];
  let rootType = 'Unknown';
  if (first >= 0x80 && first <= 0x8f) rootType = `Map (${first & 0x0f} keys)`;
  else if (first >= 0x90 && first <= 0x9f) rootType = `Array (${first & 0x0f} items)`;
  else if (first >= 0xa0 && first <= 0xbf) rootType = `String (${first & 0x1f} bytes)`;
  else if (first <= 0x7f) rootType = `Integer (${first})`;
  else if (first === 0xc0) rootType = 'Nil';
  else if (first === 0xc2 || first === 0xc3) rootType = 'Boolean';
  else if (first === 0xdc || first === 0xdd) rootType = 'Array';
  else if (first === 0xde || first === 0xdf) rootType = 'Map';
  return {
    Format: 'MessagePack',
    'Root type': rootType,
    'File size': `${b.length} bytes`,
  };
}
