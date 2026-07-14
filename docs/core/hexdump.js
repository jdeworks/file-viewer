// Classic hex dump for binary files (what hexdump/xxd and most editors show): a left
// offset column, 16 bytes per row in hex, and an ASCII column where printable bytes
// (0x20–0x7e) render as themselves and everything else as '.'. Bounded to the first
// `limit` bytes so huge files stay instant. `offset` supports the windowed binary inspector.
export function hexDump(bytes, limit = 4096, offset = 0) {
  if (!bytes || !bytes.length) return '(empty file — 0 bytes)';
  const start = Math.max(0, Math.min(bytes.length - 1, Math.trunc(Number(offset)) || 0));
  const endOffset = Math.min(bytes.length, start + Math.max(16, Math.trunc(Number(limit)) || 4096));
  const lines = [];
  for (let off = start; off < endOffset; off += 16) {
    const end = Math.min(off + 16, endOffset);
    let hex = '';
    let ascii = '';
    for (let i = 0; i < 16; i++) {
      if (i === 8) hex += ' ';                 // group into two 8-byte halves
      const idx = off + i;
      if (idx < end) {
        const b = bytes[idx];
        hex += b.toString(16).padStart(2, '0') + ' ';
        ascii += (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '.';
      } else {
        hex += '   ';
      }
    }
    lines.push(off.toString(16).padStart(8, '0') + '  ' + hex + ' |' + ascii + '|');
  }
  let out = lines.join('\n');
  if (start > 0 || endOffset < bytes.length) {
    out += '\n\nWindow 0x' + start.toString(16).padStart(8, '0') + '–0x'
      + Math.max(start, endOffset - 1).toString(16).padStart(8, '0') + ' of '
      + bytes.length.toLocaleString() + ' loaded bytes.';
  }
  return out;
}
