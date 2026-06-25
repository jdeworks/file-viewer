// Shared zip helpers (vendored JSZip — no extraction, just the central-directory listing).
import { loadGlobal, vendor } from '../../core/script-loader.js';
import { extractFile as extractArchiveFile } from '../../core/archivelib.js';

export function fmtSize(n) {
  if (n == null) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}

const METHOD_NAMES = {
  0: 'Stored',
  8: 'Deflated',
  9: 'Deflate64',
  12: 'BZIP2',
  14: 'LZMA',
  98: 'PPMd',
  99: 'AES',
};

export function compressionMethodName(method) {
  return METHOD_NAMES[method] || ('Method ' + method);
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

export async function extractEncryptedEntry(intake, name, password) {
  return extractArchiveFile(intake, name, { password });
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32Byte(crc, value) {
  return (CRC_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8)) >>> 0;
}

function crc32Bytes(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = crc32Byte(crc, b);
  return (crc ^ 0xffffffff) >>> 0;
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function zipCryptoKeys(password) {
  let k0 = 0x12345678;
  let k1 = 0x23456789;
  let k2 = 0x34567890;
  const update = (value) => {
    k0 = crc32Byte(k0, value);
    k1 = (Math.imul((k1 + (k0 & 0xff)) >>> 0, 134775813) + 1) >>> 0;
    k2 = crc32Byte(k2, k1 >>> 24);
  };
  const enc = new TextEncoder();
  for (const b of enc.encode(password)) update(b);
  return {
    update,
    decryptByte() {
      const temp = (k2 | 2) >>> 0;
      return ((Math.imul(temp, temp ^ 1) >>> 8) & 0xff) >>> 0;
    },
  };
}

export function verifyZipCryptoPassword(bytes, entry, password) {
  if (!bytes || !entry || entry.encryption !== 'zipcrypto' || typeof password !== 'string') return false;
  const offset = entry.localHeaderOffset;
  if (offset == null || offset < 0 || offset + 30 > bytes.length) return false;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(offset, true) !== 0x04034b50) return false;
  const gp = dv.getUint16(offset + 6, true);
  const fnLen = dv.getUint16(offset + 26, true);
  const exLen = dv.getUint16(offset + 28, true);
  const dataOffset = offset + 30 + fnLen + exLen;
  if (dataOffset + 12 > bytes.length) return false;
  const verifier = gp & 0x08 ? ((entry.modTime || 0) >>> 8) & 0xff : ((entry.crc32 || 0) >>> 24) & 0xff;
  const keys = zipCryptoKeys(password);
  let last = 0;
  for (let i = 0; i < 12; i++) {
    const plain = (bytes[dataOffset + i] ^ keys.decryptByte()) & 0xff;
    keys.update(plain);
    last = plain;
  }
  return last === verifier;
}

export async function verifyZipCryptoPasswordFull(bytes, entry, password) {
  if (!verifyZipCryptoPassword(bytes, entry, password)) return false;
  const offset = entry.localHeaderOffset;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fnLen = dv.getUint16(offset + 26, true);
  const exLen = dv.getUint16(offset + 28, true);
  const dataOffset = offset + 30 + fnLen + exLen;
  const encryptedSize = Number(entry.compressedSize) || 0;
  if (encryptedSize < 12 || dataOffset + encryptedSize > bytes.length) return false;
  const keys = zipCryptoKeys(password);
  for (let i = 0; i < 12; i++) {
    const plain = (bytes[dataOffset + i] ^ keys.decryptByte()) & 0xff;
    keys.update(plain);
  }
  const payload = new Uint8Array(encryptedSize - 12);
  for (let i = 0; i < payload.length; i++) {
    const plain = (bytes[dataOffset + 12 + i] ^ keys.decryptByte()) & 0xff;
    keys.update(plain);
    payload[i] = plain;
  }
  let plain;
  if (entry.method === 0) plain = payload;
  else if (entry.method === 8) {
    try { plain = await inflateRaw(payload); }
    catch { return false; }
  } else {
    return true;
  }
  if (entry.uncompressedSize != null && plain.length !== entry.uncompressedSize) return false;
  return crc32Bytes(plain) === (entry.crc32 >>> 0);
}

function hasAesExtra(bytes, start, length) {
  let p = start;
  const end = start + length;
  if (end > bytes.length) return false;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (p + 4 <= end) {
    const id = dv.getUint16(p, true);
    const size = dv.getUint16(p + 2, true);
    p += 4;
    if (p + size > end) break;
    if (id === 0x9901) return true;
    p += size;
  }
  return false;
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
  if (p >= bytes.length) return null;
  const dec = new TextDecoder();
  const files = [], folders = [];
  const methods = new Map();
  let totalU = 0, totalC = 0;
  for (let n = 0; n < count && p + 46 <= bytes.length; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;                  // 'PK\1\2' central-dir header
    const gp = dv.getUint16(p + 8, true);
    const method = dv.getUint16(p + 10, true);
    const mt = dv.getUint16(p + 12, true), md = dv.getUint16(p + 14, true);
    const crc32 = dv.getUint32(p + 16, true);
    const compressedSize = dv.getUint32(p + 20, true), uncompressedSize = dv.getUint32(p + 24, true);
    const fnLen = dv.getUint16(p + 28, true), exLen = dv.getUint16(p + 30, true), cmLen = dv.getUint16(p + 32, true);
    const localHeaderOffset = dv.getUint32(p + 42, true);
    if (p + 46 + fnLen + exLen + cmLen > bytes.length) break;
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + fnLen));
    let date = null;
    if (md) date = new Date(1980 + ((md >> 9) & 0x7f), ((md >> 5) & 0xf) - 1, md & 0x1f, (mt >> 11) & 0x1f, (mt >> 5) & 0x3f, (mt & 0x1f) * 2);
    const aes = method === 99 || hasAesExtra(bytes, p + 46 + fnLen, exLen);
    const encrypted = !!(gp & 1);
    const entry = {
      name,
      uncompressedSize,
      compressedSize,
      crc32,
      modTime: mt,
      date,
      encrypted,
      encryption: encrypted ? (aes ? 'aes' : 'zipcrypto') : null,
      encryptionLabel: encrypted ? (aes ? 'AES' : 'ZipCrypto') : '',
      localHeaderOffset,
      dir: name.endsWith('/'),
      method,
    };
    if (entry.dir) folders.push(entry); else { files.push(entry); totalU += uncompressedSize; totalC += compressedSize; }
    methods.set(method, (methods.get(method) || 0) + 1);
    p += 46 + fnLen + exLen + cmLen;
  }
  return { files, folders, totalU, totalC, ratio: totalU > 0 ? Math.round((1 - totalC / totalU) * 100) : 0, encrypted: new Set(files.filter((f) => f.encrypted).map((f) => f.name)), methods };
}

// Repack a zip: load original, apply text + binary edits, return new Blob.
// textEdits: Map<entryName, string>; binaryEdits: Map<entryName, {getBytes:()=>Promise<Uint8Array>}>
export async function repackZip(intake, textEdits, binaryEdits) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);
  for (const [name, text] of (textEdits || new Map())) zip.file(name, text);
  for (const [name, edit] of (binaryEdits || new Map())) zip.file(name, await edit.getBytes());
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

// Just the encrypted entry names (dependency-free).
export function encryptedNames(bytes) { const cd = listCentralDirectory(bytes); return cd ? cd.encrypted : new Set(); }

export function imageEntryCount(files) {
  return files.filter((f) => /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(f.name || '')).length;
}
