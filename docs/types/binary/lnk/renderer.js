function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function fmtBytes(n) {
  if (typeof n !== 'number' || n < 0) return '—';
  if (n === 0) return '0 B';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}

function fmtDate(d) {
  if (!d) return null;
  return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function filetimeToDate(lo, hi) {
  // FILETIME: 100-nanosecond intervals since 1601-01-01
  // JS epoch offset: 11644473600000 ms
  const ms = (hi * 4294967296 + lo) / 10000 - 11644473600000;
  if (ms <= 0 || !isFinite(ms)) return null;
  return new Date(ms);
}

const LF = {
  HasLinkTargetIDList: 1 << 0,
  HasLinkInfo:         1 << 1,
  HasName:             1 << 2,
  HasRelativePath:     1 << 3,
  HasWorkingDir:       1 << 4,
  HasArguments:        1 << 5,
  HasIconLocation:     1 << 6,
  IsUnicode:           1 << 7,
};

const FA = {
  'Read-only': 0x0001,
  Hidden:      0x0002,
  System:      0x0004,
  Directory:   0x0010,
  Archive:     0x0020,
  Normal:      0x0080,
  Temporary:   0x0100,
  Compressed:  0x0800,
  Encrypted:   0x4000,
};

const SHOW_CMD = { 1: 'Normal window', 3: 'Maximized', 7: 'Minimized' };

function readUint16LE(b, off) {
  return b[off] | (b[off + 1] << 8);
}
function readUint32LE(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}
function readInt32LE(b, off) {
  return b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24);
}

function readNullTermAscii(b, off) {
  let end = off;
  while (end < b.length && b[end] !== 0) end++;
  return new TextDecoder('ascii').decode(b.slice(off, end));
}

function parseLnk(bytes) {
  const result = {};

  if (bytes.length < 76) throw new Error('File too short for LNK header');

  // Verify magic
  if (bytes[0] !== 0x4C || bytes[1] !== 0x00 || bytes[2] !== 0x00 || bytes[3] !== 0x00) {
    throw new Error('Invalid LNK header magic');
  }

  // Parse header
  const linkFlags    = readUint32LE(bytes, 20);
  const fileAttrs    = readUint32LE(bytes, 24);
  const ctimeLo      = readUint32LE(bytes, 28);
  const ctimeHi      = readUint32LE(bytes, 32);
  const atimeLo      = readUint32LE(bytes, 36);
  const atimeHi      = readUint32LE(bytes, 40);
  const wtimeLo      = readUint32LE(bytes, 44);
  const wtimeHi      = readUint32LE(bytes, 48);
  const targetSize   = readUint32LE(bytes, 52);
  const iconIndex    = readInt32LE(bytes, 56);
  const showCommand  = readUint32LE(bytes, 60);
  const hotKey       = readUint16LE(bytes, 64);

  result.linkFlags   = linkFlags;
  result.fileAttrs   = fileAttrs;
  result.targetSize  = targetSize;
  result.iconIndex   = iconIndex;
  result.showCommand = showCommand;
  result.hotKey      = hotKey;
  result.created     = filetimeToDate(ctimeLo, ctimeHi);
  result.accessed    = filetimeToDate(atimeLo, atimeHi);
  result.modified    = filetimeToDate(wtimeLo, wtimeHi);

  let off = 76;

  // Skip LinkTargetIDList
  if (linkFlags & LF.HasLinkTargetIDList) {
    if (off + 2 > bytes.length) throw new Error('Truncated at IDList');
    const idListSize = readUint16LE(bytes, off);
    off += 2 + idListSize;
  }

  // Parse LinkInfo
  if (linkFlags & LF.HasLinkInfo) {
    if (off + 4 > bytes.length) throw new Error('Truncated at LinkInfo');
    const liSize       = readUint32LE(bytes, off);
    const liHeaderSize = readUint32LE(bytes, off + 4);
    const liFlags      = readUint32LE(bytes, off + 8);
    const volIDOff     = readUint32LE(bytes, off + 12);
    const localPathOff = readUint32LE(bytes, off + 16);

    // Check for Unicode extensions (header >= 36 bytes)
    let localPathOffUnicode = 0;
    if (liHeaderSize >= 36 && off + 36 <= bytes.length) {
      localPathOffUnicode = readUint32LE(bytes, off + 28);
    }

    if (liFlags & 0x01) { // VolumeIDAndLocalBasePath
      // Try Unicode path first, fall back to ASCII
      if (localPathOffUnicode > 0) {
        const absOff = off + localPathOffUnicode;
        // Read null-terminated UTF-16LE
        let end = absOff;
        while (end + 1 < bytes.length && (bytes[end] !== 0 || bytes[end + 1] !== 0)) end += 2;
        result.localPath = new TextDecoder('utf-16le').decode(bytes.slice(absOff, end));
      } else {
        result.localPath = readNullTermAscii(bytes, off + localPathOff);
      }

      // Parse VolumeID for drive label
      if (volIDOff > 0) {
        const vOff = off + volIDOff;
        if (vOff + 16 <= bytes.length) {
          const volLabelOff = readUint32LE(bytes, vOff + 12);
          if (volLabelOff < 0x10 && volLabelOff > 0) {
            // offset < 16 means Unicode label extension at offset 20
          } else {
            result.volumeLabel = readNullTermAscii(bytes, vOff + volLabelOff);
          }
          const driveType = readUint32LE(bytes, vOff + 4);
          const DRIVE_TYPES = ['Unknown', 'No root dir', 'Removable', 'Fixed', 'Remote', 'CD-ROM', 'RAM disk'];
          result.driveType = DRIVE_TYPES[driveType] || 'Unknown';
        }
      }
    }

    off += liSize;
  }

  // Parse StringData sections
  const isUnicode = !!(linkFlags & LF.IsUnicode);
  const charSize = isUnicode ? 2 : 1;

  function readStringData() {
    if (off + 2 > bytes.length) return null;
    const count = readUint16LE(bytes, off);
    off += 2;
    const byteLen = count * charSize;
    if (off + byteLen > bytes.length) return null;
    const slice = bytes.slice(off, off + byteLen);
    off += byteLen;
    if (isUnicode) return new TextDecoder('utf-16le').decode(slice);
    return new TextDecoder('ascii').decode(slice);
  }

  if (linkFlags & LF.HasName)         result.name         = readStringData();
  if (linkFlags & LF.HasRelativePath) result.relativePath = readStringData();
  if (linkFlags & LF.HasWorkingDir)   result.workingDir   = readStringData();
  if (linkFlags & LF.HasArguments)    result.arguments    = readStringData();
  if (linkFlags & LF.HasIconLocation) result.iconLocation = readStringData();

  return result;
}

function decodeHotKey(hk) {
  if (!hk) return null;
  const vk = hk & 0xFF;
  const mod = (hk >> 8) & 0xFF;
  const parts = [];
  if (mod & 0x04) parts.push('Ctrl');
  if (mod & 0x01) parts.push('Shift');
  if (mod & 0x02) parts.push('Alt');
  // Virtual key code to readable char
  let key;
  if (vk >= 0x30 && vk <= 0x39) key = String.fromCharCode(vk); // 0–9
  else if (vk >= 0x41 && vk <= 0x5A) key = String.fromCharCode(vk); // A–Z
  else if (vk >= 0x70 && vk <= 0x87) key = 'F' + (vk - 0x6F); // F1–F24
  else key = '0x' + vk.toString(16).toUpperCase().padStart(2, '0');
  parts.push(key);
  return parts.join('+');
}

const STYLE = `
body{font-family:system-ui,sans-serif;color:var(--fg);background:var(--bg);margin:0;padding:16px;font-size:13px}
.badge{display:inline-block;background:var(--accent,#4a90d9);color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;margin-bottom:14px;letter-spacing:.04em}
.sec{margin-bottom:20px}
.sec-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--fg2);border-bottom:1px solid var(--border);padding-bottom:4px;margin-bottom:8px}
dl{margin:0;display:grid;grid-template-columns:130px 1fr;gap:3px 12px}
dt{color:var(--fg2);font-size:12px;font-weight:500;padding-top:2px}
dd{margin:0;word-break:break-all}
.path{font-family:monospace;font-size:12px;color:var(--fg)}
.none{color:var(--fg2);font-style:italic}
.err{color:#c0392b;background:#fdf2f2;border:1px solid #e8b4b4;padding:8px 12px;border-radius:4px;font-size:12px;white-space:pre-wrap}
`;

export async function render(intake) {
  let parsed;
  let parseError = null;

  try {
    parsed = parseLnk(intake.bytes);
  } catch (e) {
    parseError = e.message;
    parsed = {};
  }

  let html = `<style>${STYLE}</style>`;
  html += `<div class="badge">Windows Shortcut (.lnk)</div>`;

  if (parseError) {
    html += `<div class="err">Parse error: ${esc(parseError)}</div>`;
    return { bodyHtml: html, hadUnsafe: false };
  }

  // Target section
  const hasTarget = parsed.localPath || parsed.relativePath || parsed.workingDir ||
                    parsed.arguments !== undefined || parsed.iconLocation;
  if (hasTarget) {
    html += `<div class="sec"><div class="sec-title">Target</div><dl>`;
    if (parsed.localPath) {
      html += `<dt>Path</dt><dd class="path">${esc(parsed.localPath)}</dd>`;
    }
    if (parsed.relativePath) {
      html += `<dt>Relative path</dt><dd class="path">${esc(parsed.relativePath)}</dd>`;
    }
    if (parsed.workingDir !== undefined) {
      html += `<dt>Working dir</dt><dd class="path">${parsed.workingDir ? esc(parsed.workingDir) : '<span class="none">(none)</span>'}</dd>`;
    }
    if (parsed.arguments !== undefined) {
      html += `<dt>Arguments</dt><dd>${parsed.arguments ? esc(parsed.arguments) : '<span class="none">(none)</span>'}</dd>`;
    }
    if (parsed.iconLocation && parsed.iconLocation !== parsed.localPath) {
      html += `<dt>Icon</dt><dd class="path">${esc(parsed.iconLocation)}</dd>`;
    }
    if (parsed.name) {
      html += `<dt>Description</dt><dd>${esc(parsed.name)}</dd>`;
    }
    html += `</dl></div>`;
  }

  // File info section
  html += `<div class="sec"><div class="sec-title">File Info</div><dl>`;
  const showCmd = SHOW_CMD[parsed.showCommand] || ('0x' + (parsed.showCommand || 0).toString(16));
  html += `<dt>Show</dt><dd>${esc(showCmd)}</dd>`;

  if (parsed.hotKey) {
    const hkStr = decodeHotKey(parsed.hotKey);
    html += `<dt>Hot key</dt><dd>${esc(hkStr || '0x' + parsed.hotKey.toString(16))}</dd>`;
  }

  if (parsed.targetSize > 0) {
    html += `<dt>Target size</dt><dd>${esc(fmtBytes(parsed.targetSize))} (${parsed.targetSize.toLocaleString()} bytes)</dd>`;
  }

  if (parsed.fileAttrs != null) {
    const attrs = Object.entries(FA)
      .filter(([, bit]) => parsed.fileAttrs & bit)
      .map(([name]) => name);
    html += `<dt>Attributes</dt><dd>${attrs.length ? esc(attrs.join(', ')) : '<span class="none">(none)</span>'}</dd>`;
  }

  if (parsed.driveType) {
    html += `<dt>Drive type</dt><dd>${esc(parsed.driveType)}</dd>`;
  }
  if (parsed.volumeLabel) {
    html += `<dt>Volume label</dt><dd>${esc(parsed.volumeLabel)}</dd>`;
  }

  html += `</dl></div>`;

  // Timestamps section
  const hasTimes = parsed.created || parsed.accessed || parsed.modified;
  if (hasTimes) {
    html += `<div class="sec"><div class="sec-title">Timestamps</div><dl>`;
    if (parsed.created)  html += `<dt>Created</dt><dd>${esc(fmtDate(parsed.created))}</dd>`;
    if (parsed.accessed) html += `<dt>Accessed</dt><dd>${esc(fmtDate(parsed.accessed))}</dd>`;
    if (parsed.modified) html += `<dt>Modified</dt><dd>${esc(fmtDate(parsed.modified))}</dd>`;
    html += `</dl></div>`;
  }

  return { bodyHtml: html, hadUnsafe: false };
}
