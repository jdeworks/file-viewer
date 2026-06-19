function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function readU16(b, off) { return b[off] | (b[off + 1] << 8); }
function readU32(b, off) { return (b[off] | (b[off+1]<<8) | (b[off+2]<<16) | (b[off+3]<<24)) >>> 0; }

function fmtTimestamp(t) {
  if (!t) return null;
  try { return new Date(t * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'; } catch { return null; }
}

function fmtDuration(ms) {
  if (!ms && ms !== 0) return null;
  const s = (ms / 1000).toFixed(1);
  return s + ' s';
}

const STREAM_NAMES = {
  0: 'Unused', 1: 'Reserved0', 2: 'Reserved1',
  3: 'ThreadList', 4: 'ModuleList', 5: 'MemoryList',
  6: 'Exception', 7: 'SystemInfo', 8: 'ThreadExList',
  9: 'Memory64List', 10: 'CommentA', 11: 'CommentW',
  12: 'HandleData', 13: 'FunctionTable', 14: 'UnloadedModuleList',
  15: 'MiscInfo', 16: 'MemoryInfoList', 17: 'ThreadInfoList',
  18: 'HandleOperationList', 19: 'Token', 20: 'JavaScriptData',
  21: 'SystemMemoryInfo', 22: 'ProcessVmCounters', 23: 'IptTrace',
  24: 'ThreadNames',
};

const ARCH_NAMES = {
  0: 'x86', 5: 'ARM', 6: 'IA-64', 9: 'x64 (AMD64)', 12: 'ARM64', 0xFFFF: 'Unknown',
};

const PRODUCT_TYPES = { 1: 'Workstation', 2: 'Domain Controller', 3: 'Server' };

const EXCEPTION_CODES = {
  0xC0000005: 'Access Violation (0xC0000005)',
  0xC0000094: 'Integer Divide by Zero (0xC0000094)',
  0xC0000096: 'Privileged Instruction (0xC0000096)',
  0xC00000FD: 'Stack Overflow (0xC00000FD)',
  0xC0000135: 'DLL Not Found (0xC0000135)',
  0xC0000142: 'DLL Init Failed (0xC0000142)',
  0x80000003: 'Breakpoint (0x80000003)',
  0x80000004: 'Single Step (0x80000004)',
  0xE06D7363: 'C++ Exception (0xE06D7363)',
  0xC0000409: 'Stack Buffer Overflow (0xC0000409)',
  0xC0000374: 'Heap Corruption (0xC0000374)',
};

const DUMP_TYPE_FLAGS = [
  [0x00000001, 'WithDataSegs'],
  [0x00000002, 'WithFullMemory'],
  [0x00000004, 'WithHandleData'],
  [0x00000020, 'WithUnloadedModules'],
  [0x00000100, 'WithProcessThreadData'],
  [0x00000200, 'WithPrivateReadWriteMemory'],
  [0x00000800, 'WithFullMemoryInfo'],
  [0x00001000, 'WithThreadInfo'],
];

function streamName(type) {
  return STREAM_NAMES[type] || `Stream_${type}`;
}

function readMiscInfo(b, rva, size) {
  if (rva + 24 > b.length) return null;
  const sizeOfInfo = readU32(b, rva);
  const flags1 = readU32(b, rva + 4);
  const info = {};
  if (flags1 & 0x01) info.processId = readU32(b, rva + 8);
  if (flags1 & 0x02) {
    info.processCreateTime = readU32(b, rva + 12);
    info.processUserTime   = readU32(b, rva + 16);
    info.processKernelTime = readU32(b, rva + 20);
  }
  return info;
}

function readSystemInfo(b, rva) {
  if (rva + 32 > b.length) return null;
  const info = {};
  info.arch         = readU16(b, rva);
  info.level        = readU16(b, rva + 2);
  info.revision     = readU16(b, rva + 4);
  info.numProcs     = b[rva + 6];
  info.productType  = b[rva + 7];
  info.majorVersion = readU32(b, rva + 8);
  info.minorVersion = readU32(b, rva + 12);
  info.buildNumber  = readU32(b, rva + 16);
  info.platformId   = readU32(b, rva + 20);

  // Intel/AMD vendor string from X86CpuInfo union at offset rva+32
  if ((info.arch === 0 || info.arch === 9) && rva + 44 <= b.length) {
    const dec = new TextDecoder('ascii', { fatal: false });
    info.vendorId = dec.decode(b.slice(rva + 32, rva + 44)).replace(/\0/g, '').trim();
  }
  return info;
}

function readExceptionStream(b, rva) {
  if (rva + 8 > b.length) return null;
  const threadId = readU32(b, rva);
  // ExceptionRecord at rva+8
  if (rva + 8 + 4 > b.length) return { threadId };
  const code = readU32(b, rva + 8);
  const addr = rva + 8 + 16; // ExceptionAddress is at offset 16 in EXCEPTION_RECORD
  let excAddr = null;
  if (addr + 8 <= b.length) {
    // 64-bit pointer, read low 32 bits as approximation
    excAddr = readU32(b, addr);
  }
  return { threadId, code, excAddr };
}

function winVersion(major, minor, build) {
  if (major === 10) {
    if (build >= 22000) return `Windows 11 (Build ${build})`;
    return `Windows 10 (Build ${build})`;
  }
  if (major === 6) {
    if (minor === 3) return `Windows 8.1 (Build ${build})`;
    if (minor === 2) return `Windows 8 (Build ${build})`;
    if (minor === 1) return `Windows 7 (Build ${build})`;
    if (minor === 0) return `Windows Vista (Build ${build})`;
  }
  if (major === 5) {
    if (minor === 2) return `Windows Server 2003 (Build ${build})`;
    if (minor === 1) return `Windows XP (Build ${build})`;
    if (minor === 0) return `Windows 2000 (Build ${build})`;
  }
  return `Windows ${major}.${minor} (Build ${build})`;
}

const STYLE = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;font-size:13px;color:var(--fg,#1a1a1a);background:var(--bg,#f5f5f5);padding:18px 16px}
.dmp-header{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px}
.badge{display:inline-block;font-weight:700;font-size:11px;letter-spacing:.07em;padding:3px 9px;border-radius:4px;border:1px solid transparent}
.badge-mdmp{background:#c0392b;color:#fff;font-size:13px;padding:4px 12px}
.badge-arch{background:#e8f0fe;color:#174ea6;border-color:#aecbfa}
.badge-os{background:#e6f4ea;color:#1a5c1a;border-color:#a8d8a8}
.badge-size{background:var(--bg2,#eee);color:var(--fg2,#555);border-color:var(--border,#d0d0d0)}
.sec{margin-bottom:20px}
.sec-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--fg2,#666);border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px;margin-bottom:8px}
.card{background:var(--panel,#fff);border:1px solid var(--border,#e0e0e0);border-radius:6px;overflow:hidden}
dl.kv{display:grid;grid-template-columns:160px 1fr;gap:1px}
dl.kv dt{background:var(--th-bg,#f9f9f9);padding:6px 12px;font-size:12px;font-weight:500;color:var(--fg2,#555)}
dl.kv dd{padding:6px 12px;word-break:break-all}
.tag-list{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px}
.tag{font-size:11px;padding:2px 8px;border-radius:3px;background:var(--bg2,#f0f0f0);border:1px solid var(--border,#ddd);color:var(--fg,#333)}
.exc-card{background:#fff8e1;border:1px solid #ffc107;border-radius:6px;padding:12px 14px}
.exc-title{font-size:12px;font-weight:600;color:#c17b00;margin-bottom:6px}
.exc-code{font-family:monospace;font-size:13px;font-weight:700;color:#c00}
.err{background:#fff3f3;border:1px solid #f5c6c6;border-radius:6px;padding:10px 14px;color:#b00020;font-size:12px}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:6px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--fg2,#777);background:var(--th-bg,#f9f9f9);border-bottom:1px solid var(--border,#e8e8e8)}
td{padding:5px 12px;border-bottom:1px solid var(--border,#f0f0f0)}
tr:last-child td{border-bottom:none}
.mono{font-family:monospace;font-size:12px}
.td-size{text-align:right;color:var(--fg2,#888)}
`;

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 32) {
    return { bodyHtml: `<style>${STYLE}</style><div class="err">File too short to be a valid minidump (${b?.length ?? 0} bytes).</div>` };
  }
  if (b[0] !== 0x4D || b[1] !== 0x44 || b[2] !== 0x4D || b[3] !== 0x50) {
    return { bodyHtml: `<style>${STYLE}</style><div class="err">Invalid signature — not a Windows Minidump file.</div>` };
  }

  const version    = readU32(b, 4);
  const numStreams = readU32(b, 8);
  const dirRva     = readU32(b, 12);
  const timestamp  = readU32(b, 20);
  const flagsLo    = readU32(b, 24);
  const flagsHi    = readU32(b, 28);

  // Parse stream directory
  const streams = [];
  for (let i = 0; i < numStreams && i < 64; i++) {
    const off = dirRva + i * 12;
    if (off + 12 > b.length) break;
    const type     = readU32(b, off);
    const dataSize = readU32(b, off + 4);
    const dataRva  = readU32(b, off + 8);
    streams.push({ type, dataSize, dataRva });
  }

  // Extract known streams
  let sysInfo = null;
  let miscInfo = null;
  let exception = null;

  for (const s of streams) {
    if (s.type === 7)  sysInfo   = readSystemInfo(b, s.dataRva);
    if (s.type === 15) miscInfo  = readMiscInfo(b, s.dataRva, s.dataSize);
    if (s.type === 6)  exception = readExceptionStream(b, s.dataRva);
  }

  const fmtBytes = (n) => {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  };

  let html = `<style>${STYLE}</style>`;

  // Header row
  const archLabel = sysInfo ? (ARCH_NAMES[sysInfo.arch] || 'Unknown arch') : null;
  const osLabel   = sysInfo ? winVersion(sysInfo.majorVersion, sysInfo.minorVersion, sysInfo.buildNumber) : null;

  html += `<div class="dmp-header">`;
  html += `<span class="badge badge-mdmp">MINIDUMP</span>`;
  if (archLabel) html += `<span class="badge badge-arch">${esc(archLabel)}</span>`;
  if (osLabel)   html += `<span class="badge badge-os">${esc(osLabel)}</span>`;
  html += `<span class="badge badge-size">${esc(fmtBytes(intake.size ?? b.length))}</span>`;
  html += `</div>`;

  // Exception (highlight if present)
  if (exception) {
    const codeHex = '0x' + (exception.code >>> 0).toString(16).toUpperCase().padStart(8, '0');
    const codeDesc = EXCEPTION_CODES[exception.code >>> 0] || codeHex;
    html += `<div class="exc-card"><div class="exc-title">Exception</div>`;
    html += `<div class="exc-code">${esc(codeDesc)}</div>`;
    if (exception.threadId != null) html += `<div style="margin-top:4px;font-size:12px;color:var(--fg2,#555)">Thread ID: ${exception.threadId}</div>`;
    html += `</div><br>`;
  }

  // Dump info section
  html += `<div class="sec"><div class="sec-title">Dump Info</div><div class="card"><dl class="kv">`;
  html += `<dt>Created</dt><dd>${esc(fmtTimestamp(timestamp) || '—')}</dd>`;
  html += `<dt>Streams</dt><dd>${numStreams}</dd>`;

  // Dump type from flags
  const dumpFlags = [];
  if (flagsLo === 0 && flagsHi === 0) {
    dumpFlags.push('MiniDumpNormal');
  } else {
    for (const [bit, name] of DUMP_TYPE_FLAGS) {
      if (flagsLo & bit) dumpFlags.push(name);
    }
  }
  html += `<dt>Dump type</dt><dd>${esc(dumpFlags.join(', ') || '0x' + flagsLo.toString(16))}</dd>`;
  html += `<dt>Version</dt><dd class="mono">${esc('0x' + version.toString(16).toUpperCase().padStart(8, '0'))}</dd>`;
  html += `</dl></div></div>`;

  // System info section
  if (sysInfo) {
    html += `<div class="sec"><div class="sec-title">System Info</div><div class="card"><dl class="kv">`;
    html += `<dt>OS</dt><dd>${esc(osLabel)}</dd>`;
    html += `<dt>Architecture</dt><dd>${esc(ARCH_NAMES[sysInfo.arch] || 'Unknown')}</dd>`;
    html += `<dt>Processors</dt><dd>${sysInfo.numProcs}</dd>`;
    if (PRODUCT_TYPES[sysInfo.productType]) html += `<dt>Product type</dt><dd>${esc(PRODUCT_TYPES[sysInfo.productType])}</dd>`;
    if (sysInfo.vendorId) html += `<dt>CPU vendor</dt><dd class="mono">${esc(sysInfo.vendorId)}</dd>`;
    html += `</dl></div></div>`;
  }

  // Process info from MiscInfo
  if (miscInfo) {
    html += `<div class="sec"><div class="sec-title">Process Info</div><div class="card"><dl class="kv">`;
    if (miscInfo.processId != null) html += `<dt>PID</dt><dd>${miscInfo.processId}</dd>`;
    if (miscInfo.processCreateTime) html += `<dt>Start time</dt><dd>${esc(fmtTimestamp(miscInfo.processCreateTime) || '—')}</dd>`;
    if (miscInfo.processUserTime != null) html += `<dt>User CPU time</dt><dd>${esc(fmtDuration(miscInfo.processUserTime) || '—')}</dd>`;
    if (miscInfo.processKernelTime != null) html += `<dt>Kernel CPU time</dt><dd>${esc(fmtDuration(miscInfo.processKernelTime) || '—')}</dd>`;
    html += `</dl></div></div>`;
  }

  // Streams table
  const meaningful = streams.filter((s) => s.type !== 0 && s.type !== 1 && s.type !== 2);
  html += `<div class="sec"><div class="sec-title">Streams (${meaningful.length})</div><div class="card">`;
  if (meaningful.length === 0) {
    html += `<div style="padding:10px 12px;color:var(--fg2);font-style:italic">No streams.</div>`;
  } else {
    html += `<table><thead><tr><th>Type</th><th style="text-align:right">Size</th></tr></thead><tbody>`;
    for (const s of meaningful) {
      html += `<tr><td>${esc(streamName(s.type))}</td><td class="td-size">${esc(fmtBytes(s.dataSize))}</td></tr>`;
    }
    html += `</tbody></table>`;
  }
  html += `</div></div>`;

  return { bodyHtml: html, hadUnsafe: false };
}
