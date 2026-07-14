function u16le(b, o) { return b[o] | (b[o + 1] << 8); }
function u32le(b, o) { return (b[o] | (b[o+1]<<8) | (b[o+2]<<16) | (b[o+3]<<24)) >>> 0; }
function u16be(b, o) { return (b[o] << 8) | b[o+1]; }
function u32be(b, o) { return ((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3]) >>> 0; }
function hex(n) { return '0x' + n.toString(16); }
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[c]));
}

const VIRUSTOTAL_FILE_URL = 'https://www.virustotal.com/gui/file/';

export async function computeSha256Hex(bytes, subtle = globalThis.crypto?.subtle) {
  if (!bytes || typeof subtle?.digest !== 'function') return null;
  try {
    const digest = await subtle.digest('SHA-256', bytes);
    const digestBytes = new Uint8Array(digest);
    if (digestBytes.length !== 32) return null;
    return Array.from(digestBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

// ── ELF ──────────────────────────────────────────────────────────────────────
const ELF_CLASS = { 1: '32-bit', 2: '64-bit' };
const ELF_DATA  = { 1: 'Little-endian', 2: 'Big-endian' };
const ELF_TYPE  = { 1: 'Relocatable (object)', 2: 'Executable', 3: 'Shared library', 4: 'Core dump' };
const ELF_ABI   = { 0: 'System V', 3: 'Linux', 6: 'Solaris', 9: 'FreeBSD', 12: 'OpenBSD', 255: 'Standalone' };
const ELF_MACH  = {
  0x02: 'SPARC', 0x03: 'x86', 0x08: 'MIPS', 0x14: 'PowerPC',
  0x16: 'PowerPC64', 0x28: 'ARM', 0x32: 'IA-64', 0x3e: 'x86-64',
  0x75: 'AVR', 0xb7: 'AArch64 (ARM64)', 0xf3: 'RISC-V',
};

function parseElf(b) {
  const cls = b[4];
  const data = b[5];
  const abi  = b[7];
  const le = data === 1;
  const r16 = le ? (o) => u16le(b, o) : (o) => u16be(b, o);
  const r32 = le ? (o) => u32le(b, o) : (o) => u32be(b, o);
  const type = r16(16);
  const machine = r16(18);
  const entry = r32(24);  // simplified: only first 4 bytes for 64-bit
  const phnum = r16(cls === 2 ? 56 : 44);
  const shnum = r16(cls === 2 ? 60 : 48);
  return {
    format: 'ELF', cls: ELF_CLASS[cls] || cls,
    endian: ELF_DATA[data] || data,
    abi: ELF_ABI[abi] || hex(abi),
    type: ELF_TYPE[type] || hex(type),
    machine: ELF_MACH[machine] || hex(machine),
    entry: hex(entry), phnum, shnum,
  };
}

// ── PE ───────────────────────────────────────────────────────────────────────
const PE_MACHINE = {
  0x014c: 'x86 (i386)', 0x0200: 'IA-64', 0x8664: 'x86-64 (AMD64)',
  0xaa64: 'AArch64 (ARM64)', 0x01c4: 'ARM (Thumb-2)', 0x01c0: 'ARM LE',
};
const PE_SUBSYSTEM = {
  1: 'Native', 2: 'Windows GUI', 3: 'Windows console',
  5: 'OS/2 console', 7: 'POSIX', 9: 'Windows CE GUI',
  10: 'EFI Application', 14: 'Boot service driver', 16: 'Xbox',
};
const PE_DLL_FLAGS = [
  [0x0040, 'Dynamic base (ASLR)'], [0x0100, 'NX compatible (DEP)'],
  [0x0400, 'No isolation'], [0x0800, 'No SEH'],
  [0x1000, 'No bind'], [0x4000, 'Control flow guard (CFG)'],
  [0x8000, 'Terminal server aware'],
];

function parsePe(b) {
  if (b.length < 64) return { format: 'PE/COFF (MZ)', error: 'Too small to parse' };
  const peOff = u32le(b, 0x3c);
  if (peOff + 4 > b.length) return { format: 'PE/COFF (MZ)', error: 'PE header offset out of range' };
  const peSig = b[peOff]===0x50 && b[peOff+1]===0x45 && b[peOff+2]===0 && b[peOff+3]===0;
  if (!peSig) return { format: 'PE/COFF (MZ)', error: 'PE signature not found' };

  const coffOff = peOff + 4;
  const machine = u16le(b, coffOff);
  const numSections = u16le(b, coffOff + 2);
  const timestamp = u32le(b, coffOff + 4);
  const optSize = u16le(b, coffOff + 16);
  const chars = u16le(b, coffOff + 18);

  let subsystem = null, dllChars = 0, magic = null;
  if (optSize >= 2) {
    const optOff = coffOff + 20;
    magic = u16le(b, optOff);
    const is64 = magic === 0x020b;
    const subOff = optOff + (is64 ? 68 : 64);
    const dllOff = optOff + (is64 ? 70 : 66);
    if (subOff + 2 <= b.length) subsystem = u16le(b, subOff);
    if (dllOff + 2 <= b.length) dllChars = u16le(b, dllOff);
  }

  const date = timestamp ? new Date(timestamp * 1000).toISOString().slice(0, 10) : null;
  const isDll = !!(chars & 0x2000);
  const hardening = PE_DLL_FLAGS.filter(([flag]) => (dllChars & flag) === flag).map(([, name]) => name);

  return {
    format: `PE32${magic === 0x020b ? '+' : ''} (${isDll ? 'DLL' : 'EXE'})`,
    machine: PE_MACHINE[machine] || hex(machine),
    sections: numSections, timestamp: date,
    subsystem: PE_SUBSYSTEM[subsystem] || (subsystem ? hex(subsystem) : null),
    hardening,
  };
}

// ── Mach-O ───────────────────────────────────────────────────────────────────
const MACHO_CPU = {
  7: 'x86', 0x01000007: 'x86-64',
  12: 'ARM', 0x0100000c: 'AArch64 (Apple Silicon)',
  18: 'PowerPC', 0x01000012: 'PowerPC64',
};
const MACHO_FILETYPE = {
  1: 'Relocatable', 2: 'Executable', 3: 'Fixed VM shared lib',
  4: 'Core dump', 5: 'Preloaded executable', 6: 'Dylib', 7: 'Dylinker',
  8: 'Bundle', 0xb: 'dyld cache',
};

function parseMacho(b) {
  const magic = u32le(b, 0);
  const isFat = magic === 0xcafebabe || (b[0]===0xca && b[1]===0xfe && b[2]===0xba && b[3]===0xbe);
  const is64  = magic === 0xcffaedfe || (b[0]===0xcf && b[1]===0xfa);
  const isLE  = (b[0]===0xce||b[0]===0xcf);

  if (isFat) return { format: 'Mach-O Fat Binary', note: 'Universal binary (multiple architectures)' };

  const r32 = isLE ? (o) => u32le(b, o) : (o) => u32be(b, o);
  const cpu = r32(4) >>> 0;
  const ftype = r32(12);
  const ncmds = r32(16);
  return {
    format: `Mach-O ${is64 ? '64-bit' : '32-bit'}`,
    cpu: MACHO_CPU[cpu] || hex(cpu),
    fileType: MACHO_FILETYPE[ftype] || hex(ftype),
    loadCmds: ncmds,
    endian: isLE ? 'Little-endian' : 'Big-endian',
  };
}

function parseExe(b) {
  if (b[0]===0x7f && b[1]===0x45 && b[2]===0x4c && b[3]===0x46) return parseElf(b);
  if (b[0]===0x4d && b[1]===0x5a) return parsePe(b);
  return parseMacho(b);
}

function row(label, value) {
  if (value == null || value === '' || value === 'undefined') return '';
  return `<tr><td class="exe-key">${esc(label)}</td><td>${esc(value)}</td></tr>`;
}

function htmlRow(label, valueHtml) {
  if (!valueHtml) return '';
  return `<tr><td class="exe-key">${esc(label)}</td><td>${valueHtml}</td></tr>`;
}

function virusTotalUrl(sha256) {
  return sha256 ? `${VIRUSTOTAL_FILE_URL}${sha256}/detection` : null;
}

function lookupHtml(sha256, truncated) {
  if (sha256) {
    const href = virusTotalUrl(sha256);
    return `<div class="exe-vt">
      <a class="exe-vt-link" href="${href}" target="_blank" rel="noopener noreferrer">Look up on VirusTotal ↗</a>
      <p class="exe-vt-note">Opening VirusTotal sends the SHA-256 hash, not the file contents, to VirusTotal.</p>
      <p class="exe-vt-terms">VirusTotal’s free search is for non-commercial use.</p>
      <p class="exe-vt-status" role="status" aria-live="polite"></p>
    </div>`;
  }
  const message = truncated
    ? 'VirusTotal lookup unavailable: only part of this file was loaded, so a full-file SHA-256 cannot be calculated.'
    : 'VirusTotal lookup unavailable: SHA-256 is unavailable in this browser.';
  return `<p class="exe-vt-unavailable" role="note">${message}</p>`;
}

function wireVirusTotalLookup(parentNode) {
  const link = parentNode?.querySelector('.exe-vt-link');
  const status = parentNode?.querySelector('.exe-vt-status');
  if (!link || !status) return null;

  const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
  const syncAvailability = () => {
    if (isOffline()) {
      link.setAttribute('aria-disabled', 'true');
      status.textContent = 'Offline — lookup unavailable; no request was sent.';
    } else {
      link.removeAttribute('aria-disabled');
      if (/^Offline/.test(status.textContent)) status.textContent = '';
    }
  };
  const onClick = (event) => {
    if (isOffline()) {
      event.preventDefault();
      status.textContent = 'Offline — lookup unavailable; no request was sent.';
      return;
    }
    status.textContent = 'Opening in a new tab. If it does not load, check that tab’s connection or blocker; the viewer does not retry or send the file.';
  };
  link.addEventListener('click', onClick);
  globalThis.addEventListener?.('online', syncAvailability);
  globalThis.addEventListener?.('offline', syncAvailability);
  syncAvailability();
  return () => {
    link.removeEventListener('click', onClick);
    globalThis.removeEventListener?.('online', syncAvailability);
    globalThis.removeEventListener?.('offline', syncAvailability);
  };
}

function result(bodyHtml, sha256) {
  if (typeof document === 'undefined') return { bodyHtml };

  const template = document.createElement('template');
  template.innerHTML = bodyHtml.trim();
  const parentNode = template.content.firstElementChild;
  const staticLink = parentNode?.querySelector('.exe-vt-link');
  const href = virusTotalUrl(sha256);
  if (staticLink && href) {
    const link = document.createElement('a');
    link.className = 'exe-vt-link';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Look up on VirusTotal ↗';
    staticLink.replaceWith(link);
  }
  const destroy = wireVirusTotalLookup(parentNode);
  return { parentNode, bodyHtml, ...(destroy ? { destroy } : {}) };
}

export async function render(intake, { cryptoSubtle = globalThis.crypto?.subtle } = {}) {
  const b = intake.bytes;
  const incomplete = !!intake.truncated || !!intake.streamed
    || (Number.isFinite(intake.size) && intake.size > (b?.byteLength || 0));
  const sha256 = incomplete ? null : await computeSha256Hex(b, cryptoSubtle);
  const shaRow = sha256
    ? htmlRow('SHA-256', `<code class="exe-sha256">${sha256}</code>`)
    : '';
  const lookup = lookupHtml(sha256, incomplete);

  if (!b || b.length < 4) {
    const hashTable = shaRow ? `<table class="exe-table">${shaRow}</table>` : '';
    return result(`<div class="exe-preview"><p class="exe-note">Too small to parse.</p>${hashTable}${lookup}</div>`, sha256);
  }

  const info = parseExe(b);
  const { format, error, note } = info;

  const badge = `<span class="exe-badge">${esc(format.split(' ')[0])}</span>`;
  const subtitle = `<span class="exe-format">${esc(format)}</span>`;

  if (error) {
    const hashTable = shaRow ? `<table class="exe-table">${shaRow}</table>` : '';
    return result(`<div class="exe-preview"><div class="exe-header">${badge}${subtitle}</div><p class="exe-note">${esc(error)}</p>${hashTable}${lookup}</div>`, sha256);
  }

  const rows = [
    row('Format', info.format),
    row('Architecture', info.machine || info.cpu),
    row('Bit width', info.cls),
    row('Endian', info.endian),
    row('OS/ABI', info.abi),
    row('File Type', info.type || info.fileType),
    row('Subsystem', info.subsystem),
    row('Sections', info.sections != null ? String(info.sections) : null),
    row('Program Headers', info.phnum != null ? String(info.phnum) : null),
    row('Section Headers', info.shnum != null ? String(info.shnum) : null),
    row('Entry Point', info.entry),
    row('Load Commands', info.loadCmds != null ? String(info.loadCmds) : null),
    row('Compiled', info.timestamp),
    shaRow,
    note ? `<tr><td class="exe-key">Note</td><td>${esc(note)}</td></tr>` : '',
  ].filter(Boolean).join('');

  let hardeningHtml = '';
  if (info.hardening?.length) {
    hardeningHtml = `<div class="exe-hardening">
      <div class="exe-harden-label">Security Features</div>
      ${info.hardening.map((f) => `<span class="exe-harden-chip">${esc(f)}</span>`).join('')}
    </div>`;
  }

  const bodyHtml = `<div class="exe-preview">
  <div class="exe-header">${badge}${subtitle}</div>
  <table class="exe-table">${rows}</table>
  ${hardeningHtml}
  ${lookup}
</div>`;

  return result(bodyHtml, sha256);
}
