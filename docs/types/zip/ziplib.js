// Shared zip helpers (vendored JSZip — no extraction, just the central-directory listing).
import { loadGlobal, vendor } from '../../core/script-loader.js';

export function fmtSize(n) {
  if (n == null) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}

export async function readZip(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);
  const entries = Object.keys(zip.files).map((k) => zip.files[k]);
  const files = entries.filter((e) => !e.dir);
  const folders = entries.filter((e) => e.dir);
  let totalU = 0, totalC = 0;
  for (const f of files) {
    const d = f._data || {};
    totalU += d.uncompressedSize || 0;
    totalC += d.compressedSize || 0;
  }
  // `zip` is retained so callers can decompress a single entry on demand (extractEntry).
  return { zip, files, folders, totalU, totalC, ratio: totalU > 0 ? Math.round((1 - totalC / totalU) * 100) : 0 };
}

// Decompress ONE entry by name → its bytes (Uint8Array). Used to open a file inside the archive.
export async function extractEntry(zip, name) {
  const entry = zip && zip.file(name);
  if (!entry) return null;
  return entry.async('uint8array');
}

// List the zip from its central directory WITHOUT JSZip — so it works even for password-protected
// archives (JSZip throws "Encrypted zip are not supported" at load). Reads name, sizes, date, the
// directory flag, and the encrypted flag (general-purpose bit-flag bit 0). No decryption.
export function listCentralDirectory(bytes) {
  if (!bytes || bytes.length < 22) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }   // 'PK\5\6'
  if (eocd < 0) return null;
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const files = [], folders = [];
  let totalU = 0, totalC = 0;
  for (let n = 0; n < count && p + 46 <= bytes.length; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;                  // 'PK\1\2' central-dir header
    const gp = dv.getUint16(p + 8, true);
    const mt = dv.getUint16(p + 12, true), md = dv.getUint16(p + 14, true);
    const compressedSize = dv.getUint32(p + 20, true), uncompressedSize = dv.getUint32(p + 24, true);
    const fnLen = dv.getUint16(p + 28, true), exLen = dv.getUint16(p + 30, true), cmLen = dv.getUint16(p + 32, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + fnLen));
    let date = null;
    if (md) date = new Date(1980 + ((md >> 9) & 0x7f), ((md >> 5) & 0xf) - 1, md & 0x1f, (mt >> 11) & 0x1f, (mt >> 5) & 0x3f, (mt & 0x1f) * 2);
    const entry = { name, uncompressedSize, compressedSize, date, encrypted: !!(gp & 1), dir: name.endsWith('/') };
    if (entry.dir) folders.push(entry); else { files.push(entry); totalU += uncompressedSize; totalC += compressedSize; }
    p += 46 + fnLen + exLen + cmLen;
  }
  return { files, folders, totalU, totalC, ratio: totalU > 0 ? Math.round((1 - totalC / totalU) * 100) : 0, encrypted: new Set(files.filter((f) => f.encrypted).map((f) => f.name)) };
}

// Just the encrypted entry names (dependency-free).
export function encryptedNames(bytes) { const cd = listCentralDirectory(bytes); return cd ? cd.encrypted : new Set(); }
