// Small, dependency-free magic-byte classifier used for trust diagnostics. It deliberately
// recognizes only signatures that are stable enough to compare with a filename/MIME claim; type
// detection remains the authority for choosing a renderer.

const FAMILY = Object.freeze({
  pdf: { label: 'PDF', extensions: ['pdf'], mimes: ['application/pdf'] },
  zip: {
    label: 'ZIP container',
    extensions: [
      'zip', 'cbz', 'docx', 'docm', 'dotx', 'dotm', 'xlsx', 'xlsm', 'xltx', 'xltm',
      'pptx', 'pptm', 'potx', 'potm', 'ppsx', 'ppsm', 'odt', 'ods', 'odp', 'odg',
      'epub', 'apk', 'aab', 'ipa', 'jar', 'war', 'ear', 'kmz', 'vsix', 'nupkg',
      'procreate', 'sketch', 'pages', 'numbers', 'key',
    ],
    mimes: [
      'application/zip', 'application/x-zip-compressed', 'application/epub+zip',
      'application/java-archive', 'application/vnd.android.package-archive',
      'application/vnd.openxmlformats-officedocument', 'application/vnd.oasis.opendocument',
    ],
  },
  png: { label: 'PNG image', extensions: ['png'], mimes: ['image/png'] },
  jpeg: { label: 'JPEG image', extensions: ['jpg', 'jpeg', 'jpe', 'jfif'], mimes: ['image/jpeg'] },
  gif: { label: 'GIF image', extensions: ['gif'], mimes: ['image/gif'] },
  webp: { label: 'WebP image', extensions: ['webp'], mimes: ['image/webp'] },
  tiff: { label: 'TIFF image', extensions: ['tif', 'tiff'], mimes: ['image/tiff'] },
  bmp: { label: 'BMP image', extensions: ['bmp', 'dib'], mimes: ['image/bmp'] },
  ico: { label: 'ICO image', extensions: ['ico', 'cur'], mimes: ['image/x-icon', 'image/vnd.microsoft.icon'] },
  rar: { label: 'RAR archive', extensions: ['rar'], mimes: ['application/vnd.rar', 'application/x-rar-compressed'] },
  sevenZip: { label: '7-Zip archive', extensions: ['7z'], mimes: ['application/x-7z-compressed'] },
  gzip: { label: 'gzip stream', extensions: ['gz', 'tgz'], mimes: ['application/gzip', 'application/x-gzip'] },
  sqlite: { label: 'SQLite database', extensions: ['sqlite', 'sqlite3', 'db', 'db3'], mimes: ['application/vnd.sqlite3', 'application/x-sqlite3'] },
  wasm: { label: 'WebAssembly module', extensions: ['wasm'], mimes: ['application/wasm'], executable: true },
  pe: {
    label: 'Windows PE/DOS executable',
    extensions: ['exe', 'dll', 'sys', 'scr', 'cpl', 'ocx', 'drv'],
    mimes: ['application/x-msdownload', 'application/vnd.microsoft.portable-executable'],
    executable: true,
  },
  elf: {
    label: 'ELF executable/object',
    extensions: ['elf', 'so', 'o', 'run', 'bin'],
    mimes: ['application/x-elf', 'application/x-executable', 'application/x-sharedlib'],
    executable: true,
  },
  macho: {
    label: 'Mach-O executable/object',
    extensions: ['dylib', 'bundle', 'bin'],
    mimes: ['application/x-mach-binary'],
    executable: true,
  },
  script: {
    label: 'executable script (shebang)',
    extensions: ['sh', 'bash', 'zsh', 'fish', 'py', 'pyw', 'rb', 'pl', 'php'],
    mimes: ['application/x-sh', 'application/x-shellscript', 'text/x-shellscript'],
    executable: true,
  },
  text: {
    label: 'text document',
    extensions: ['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'jsonc', 'json5', 'xml', 'html', 'htm', 'css', 'yaml', 'yml', 'toml', 'ini'],
    mimes: ['text/', 'application/json', 'application/xml', 'application/yaml'],
  },
});

function match(bytes, expected, offset = 0) {
  if (!(bytes instanceof Uint8Array) || bytes.length < offset + expected.length) return false;
  for (let i = 0; i < expected.length; i += 1) if (bytes[offset + i] !== expected[i]) return false;
  return true;
}

function ascii(bytes, start, length) {
  if (!(bytes instanceof Uint8Array) || bytes.length < start + length) return '';
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function result(family) {
  const info = FAMILY[family];
  return { family, label: info.label, executable: !!info.executable };
}

export function detectContentSignature(bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length) return null;
  if (match(bytes, [0x7f, 0x45, 0x4c, 0x46])) return result('elf');
  if (match(bytes, [0x4d, 0x5a])) return result('pe');
  if (match(bytes, [0xcf, 0xfa, 0xed, 0xfe]) || match(bytes, [0xce, 0xfa, 0xed, 0xfe])
      || match(bytes, [0xfe, 0xed, 0xfa, 0xcf]) || match(bytes, [0xfe, 0xed, 0xfa, 0xce])) return result('macho');
  if (match(bytes, [0x00, 0x61, 0x73, 0x6d])) return result('wasm');
  if (ascii(bytes, 0, 5) === '%PDF-') return result('pdf');
  if (match(bytes, [0x50, 0x4b, 0x03, 0x04]) || match(bytes, [0x50, 0x4b, 0x05, 0x06])
      || match(bytes, [0x50, 0x4b, 0x07, 0x08])) return result('zip');
  if (match(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return result('png');
  if (match(bytes, [0xff, 0xd8, 0xff])) return result('jpeg');
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return result('gif');
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return result('webp');
  if (match(bytes, [0x49, 0x49, 0x2a, 0x00]) || match(bytes, [0x4d, 0x4d, 0x00, 0x2a])) return result('tiff');
  if (ascii(bytes, 0, 2) === 'BM') return result('bmp');
  if (match(bytes, [0x00, 0x00, 0x01, 0x00]) || match(bytes, [0x00, 0x00, 0x02, 0x00])) return result('ico');
  if (match(bytes, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00])
      || match(bytes, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00])) return result('rar');
  if (match(bytes, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return result('sevenZip');
  if (match(bytes, [0x1f, 0x8b])) return result('gzip');
  if (ascii(bytes, 0, 16) === 'SQLite format 3\0') return result('sqlite');

  const bomOffset = match(bytes, [0xef, 0xbb, 0xbf]) ? 3 : 0;
  if (ascii(bytes, bomOffset, 2) === '#!') {
    const firstLine = ascii(bytes, bomOffset, Math.min(160, bytes.length - bomOffset)).split(/[\r\n]/, 1)[0];
    if (/^#!\s*\/(?:usr\/bin\/env\s+|bin\/|usr\/bin\/)/.test(firstLine)) return result('script');
  }
  return null;
}

function extensionOf(filename = '') {
  const base = String(filename).split(/[\\/]/).pop() || '';
  const index = base.lastIndexOf('.');
  return index > 0 && index < base.length - 1 ? base.slice(index + 1).toLowerCase() : '';
}

function familyForExtension(extension) {
  if (!extension) return null;
  return Object.entries(FAMILY).find(([, info]) => info.extensions?.includes(extension))?.[0] || null;
}

function familyForMime(mimeType = '') {
  const mime = String(mimeType).split(';', 1)[0].trim().toLowerCase();
  if (!mime || mime === 'application/octet-stream') return null;
  for (const [family, info] of Object.entries(FAMILY)) {
    if (info.mimes?.some((candidate) => candidate.endsWith('/') ? mime.startsWith(candidate) : mime === candidate || mime.startsWith(candidate))) {
      return family;
    }
  }
  return null;
}

export function assessContentRisk(intake = {}) {
  const signature = detectContentSignature(intake.bytes);
  if (!signature) return { score: 0, level: 'none', warnings: [], signature: null };

  const extension = extensionOf(intake.filename);
  const extensionFamily = familyForExtension(extension);
  const mime = String(intake.mimeType || '').split(';', 1)[0].trim().toLowerCase();
  const mimeFamily = familyForMime(mime);
  const expectedExtensions = FAMILY[signature.family]?.extensions || [];
  const warnings = [];
  let score = 0;

  if (extensionFamily && extensionFamily !== signature.family) {
    warnings.push(`Extension .${extension} does not match the ${signature.label} byte signature.`);
    score = Math.max(score, signature.executable ? 90 : 45);
  }
  if (mimeFamily && mimeFamily !== signature.family) {
    warnings.push(`MIME type ${mime} does not match the ${signature.label} byte signature.`);
    score = Math.max(score, signature.executable ? 90 : 40);
  }

  if (signature.executable) {
    const expected = expectedExtensions.includes(extension);
    if (!expected && extension && !extensionFamily) {
      warnings.push(`Executable content is hidden behind the .${extension} filename extension.`);
      score = Math.max(score, ['bin', 'dat'].includes(extension) ? 55 : 85);
    } else if (!expected && !extension) {
      warnings.push('Executable content signature detected in a file with no extension.');
      score = Math.max(score, 35);
    } else if (expected && !warnings.length) {
      warnings.push('Executable content signature detected; the viewer inspects it without executing it.');
      score = Math.max(score, 25);
    }
  }

  score = Math.min(100, score);
  return {
    score,
    level: score >= 70 ? 'high' : score >= 20 ? 'caution' : 'none',
    warnings,
    signature,
  };
}

export const testExports = { FAMILY, extensionOf, familyForExtension, familyForMime };
