export async function extractMetadata(intake) {
  const b = intake.bytes;
  if (b.length < 8) return null;
  const sig = String.fromCharCode(b[0], b[1], b[2]);
  const version = b[3];
  const fileLen = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
  const compression = { 'FWS': 'None', 'CWS': 'zlib', 'ZWS': 'LZMA' }[sig] || 'Unknown';
  return { 'SWF Version': version, 'Compression': compression, 'File size': fileLen + ' bytes' };
}
