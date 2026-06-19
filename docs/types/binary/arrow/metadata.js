function ascii(b, off, len) {
  return String.fromCharCode(...(b || []).slice(off, off + len));
}

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) return {};
  const magic = ascii(b, 0, 4);
  if (magic === 'FEA1') {
    return { Format: 'Apache Arrow Feather v1', 'File Size': `${b.length} bytes` };
  }
  if (ascii(b, 0, 6) === 'ARROW1') {
    return { Format: 'Apache Arrow IPC File', 'File Size': `${b.length} bytes` };
  }
  return {};
}
