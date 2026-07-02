export function metadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 10) return {};
  if (b[0] !== 0xed || b[1] !== 0xab || b[2] !== 0xee || b[3] !== 0xdb) return {};
  const isSrpm = ((b[6] << 8) | b[7]) === 1;
  // RPM lead: name is a fixed 66-byte, null-terminated field at bytes [10, 76).
  const name = (() => {
    let end = 10;
    while (end < 76 && b[end] !== 0) end++;
    return new TextDecoder('utf-8', { fatal: false }).decode(b.subarray(10, end));
  })();
  return { format: isSrpm ? 'Source RPM' : 'Binary RPM', name: name || null };
}
