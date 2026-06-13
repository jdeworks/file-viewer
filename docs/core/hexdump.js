// Classic hex dump for binary files (what hexdump/xxd and most editors show): a left
// offset column, 16 bytes per row in hex, and an ASCII column where printable bytes
// (0x20–0x7e) render as themselves and everything else as '.'. Bounded to the first
// `limit` bytes so huge files stay instant; a footer notes how many were omitted.
export function hexDump(bytes, limit = 4096) {
  if (!bytes || !bytes.length) return '(empty file — 0 bytes)';
  const n = Math.min(bytes.length, limit);
  const lines = [];
  for (let off = 0; off < n; off += 16) {
    const end = Math.min(off + 16, n);
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
  if (bytes.length > limit) {
    out += '\n\n… ' + (bytes.length - limit).toLocaleString() + ' more bytes not shown'
      + ' (hex view limited to the first ' + limit.toLocaleString() + ' of ' + bytes.length.toLocaleString() + ' bytes).';
  }
  return out;
}
