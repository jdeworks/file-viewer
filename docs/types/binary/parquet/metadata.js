function r32le(b, off) {
  return ((b[off] | (b[off + 1] << 8) | (b[off + 2] << 16)) >>> 0) + b[off + 3] * 0x1000000;
}

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) return {};
  const magic = String.fromCharCode(b[0], b[1], b[2], b[3]);
  if (magic !== 'PAR1') return {};
  const result = { Format: 'Apache Parquet', 'File Size': `${b.length} bytes` };
  if (b.length >= 8 && String.fromCharCode(...b.slice(b.length - 4)) === 'PAR1') {
    const footerLen = r32le(b, b.length - 8);
    if (footerLen > 0 && footerLen < b.length - 8) result['Footer Size'] = `${footerLen} bytes`;
  }
  return result;
}
