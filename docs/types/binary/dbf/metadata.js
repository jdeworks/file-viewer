const VERSION_NAMES = {
  0x02: 'dBASE II', 0x03: 'dBASE III+', 0x04: 'dBASE IV', 0x05: 'dBASE V',
  0x30: 'Visual FoxPro', 0x83: 'dBASE III+ (memo)', 0x8b: 'dBASE IV (memo)',
  0xf5: 'FoxPro (memo)',
};

function countFields(b, headerSize) {
  let count = 0;
  let off = 32;
  while (off + 32 <= headerSize && off + 32 <= b.length) {
    if (b[off] === 0x0d || b[off] === 0x00) break;
    count += 1;
    off += 32;
    if (count >= 100) break;
  }
  return count;
}

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 32) return {};
  const version = b[0];
  const numRecords = (b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24)) >>> 0;
  const headerSize = b[8] | (b[9] << 8);
  const fieldCount = countFields(b, headerSize);
  const year = b[1]; const month = b[2]; const day = b[3];
  const y = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
  return {
    Format: 'dBase / DBF',
    Version: VERSION_NAMES[version] || `0x${version.toString(16)}`,
    Records: String(numRecords),
    Fields: String(fieldCount),
    'Last update': `${y}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
  };
}
