function fmtSize(n) {
  if (n == null || n < 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}

function hasMagic(bytes, offset, values) {
  if (!bytes || bytes.length < offset + values.length) return false;
  for (let i = 0; i < values.length; i++) if (bytes[offset + i] !== values[i]) return false;
  return true;
}

function octal(bytes, start, length) {
  let s = '';
  for (let i = start; i < start + length && i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0 || b === 0x20) continue;
    if (b < 0x30 || b > 0x37) return null;
    s += String.fromCharCode(b);
  }
  return s ? parseInt(s, 8) : 0;
}

function inspectTar(bytes) {
  if (!hasMagic(bytes, 257, [0x75, 0x73, 0x74, 0x61, 0x72])) return null;
  let files = 0, folders = 0, total = 0;
  for (let p = 0; p + 512 <= bytes.length;) {
    let empty = true;
    for (let i = 0; i < 512; i++) {
      if (bytes[p + i]) { empty = false; break; }
    }
    if (empty) break;
    const size = octal(bytes, p + 124, 12);
    if (size == null) break;
    const type = bytes[p + 156];
    if (type === 0x35) folders++;
    else { files++; total += size; }
    p += 512 + Math.ceil(size / 512) * 512;
  }
  return { format: 'TAR', files, folders, total };
}

export function inspectArchive(bytes, filename = '') {
  const name = filename.toLowerCase();
  const tar = inspectTar(bytes);
  if (tar) return tar;
  if (hasMagic(bytes, 0, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) {
    const version = bytes.length >= 8 ? bytes[6] + '.' + bytes[7] : '';
    return { format: '7z', version };
  }
  if (hasMagic(bytes, 0, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00])) return { format: 'RAR5' };
  if (hasMagic(bytes, 0, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00])) return { format: 'RAR4' };
  if (hasMagic(bytes, 0, [0x1f, 0x8b])) return { format: name.endsWith('.tar.gz') || name.endsWith('.tgz') ? 'Gzip-compressed TAR' : 'Gzip' };
  if (hasMagic(bytes, 0, [0x42, 0x5a, 0x68])) return { format: name.endsWith('.tar.bz2') || name.endsWith('.tbz2') ? 'Bzip2-compressed TAR' : 'Bzip2' };
  if (hasMagic(bytes, 0, [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00])) return { format: name.endsWith('.tar.xz') || name.endsWith('.txz') ? 'XZ-compressed TAR' : 'XZ' };
  if (name.endsWith('.tar.zst')) return { format: 'Zstd-compressed TAR' };
  return { format: 'Archive' };
}

export async function extract(intake) {
  const info = inspectArchive(intake.bytes, intake.filename || '');
  const rows = [{ label: 'Type', value: info.format }];
  if (info.version) rows.push({ label: 'Version', value: info.version });
  if (info.files != null) rows.push({ label: 'Files', value: String(info.files) });
  if (info.folders != null) rows.push({ label: 'Folders', value: String(info.folders) });
  if (info.total > 0) rows.push({ label: 'Uncompressed', value: fmtSize(info.total) });
  return rows;
}
