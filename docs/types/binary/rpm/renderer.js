function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// RPM tag IDs for the header section (most common metadata tags)
const TAGS = {
  1000: 'name', 1001: 'version', 1002: 'release', 1003: 'serial',
  1004: 'summary', 1005: 'description', 1006: 'buildTime', 1007: 'buildHost',
  1014: 'url', 1015: 'distributor', 1016: 'vendor', 1020: 'license',
  1021: 'packager', 1022: 'group', 1044: 'source', 1048: 'requireName',
  1049: 'requireVersion', 1054: 'conflictName', 1085: 'requireFlags',
  1000100: 'arch', 1000110: 'os', 1022: 'group',
  1033: 'fileNames', 1034: 'fileSizes',
  1064: 'rpmVersion',
  1124: 'sourceName',
  1106: 'epoch',
};

// RPM type codes
const TYPE_NAMES = { 0: 'NULL', 1: 'CHAR', 2: 'INT8', 3: 'INT16', 4: 'INT32', 5: 'INT64', 6: 'STRING', 7: 'BIN', 8: 'STRING_ARRAY', 9: 'I18NSTRING' };

function readUint32BE(b, off) {
  return ((b[off] << 24) | (b[off+1] << 16) | (b[off+2] << 8) | b[off+3]) >>> 0;
}

function readInt32BE(b, off) {
  return (b[off] << 24) | (b[off+1] << 16) | (b[off+2] << 8) | b[off+3];
}

function readString(b, off) {
  let end = off;
  while (end < b.length && b[end] !== 0) end++;
  return new TextDecoder('utf-8', { fatal: false }).decode(b.subarray(off, end));
}

function parseHeader(b, offset) {
  // Header magic: 8e ad e8 01 00 00 00 00
  if (b[offset] !== 0x8e || b[offset+1] !== 0xad || b[offset+2] !== 0xe8 || b[offset+3] !== 0x01) {
    return null;
  }
  const nindex = readUint32BE(b, offset + 8);
  const hsize  = readUint32BE(b, offset + 12);
  const indexOff = offset + 16;
  const storeOff = indexOff + nindex * 16;

  const tags = {};
  for (let i = 0; i < nindex; i++) {
    const tag  = readInt32BE(b, indexOff + i * 16);
    const type = readInt32BE(b, indexOff + i * 16 + 4);
    const valOff = readInt32BE(b, indexOff + i * 16 + 8);
    const count = readInt32BE(b, indexOff + i * 16 + 12);
    const absOff = storeOff + valOff;

    const name = TAGS[tag];
    if (!name) continue;

    try {
      if (type === 6 || type === 9) { // STRING / I18NSTRING
        tags[name] = readString(b, absOff);
      } else if (type === 8) { // STRING_ARRAY
        const arr = [];
        let p = absOff;
        for (let c = 0; c < Math.min(count, 30); c++) {
          const s = readString(b, p);
          arr.push(s);
          p += s.length + 1;
        }
        tags[name] = arr;
      } else if (type === 4) { // INT32
        tags[name] = readUint32BE(b, absOff);
      }
    } catch {}
  }
  return { tags, headerEnd: storeOff + hsize };
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 96) {
    return { bodyHtml: '<p style="color:#90a4ae">File too small to parse RPM header.</p>', hadUnsafe: false };
  }

  // RPM lead: 96 bytes
  // [0-3]: magic ED AB EE DB
  // [4]: major, [5]: minor
  // [6-7]: type (0=binary, 1=source)
  // [8-9]: arch
  // [10-75]: name (65 chars, null-terminated)
  // [76-77]: os
  // [78-79]: signature type
  const major = b[4], minor = b[5];
  const rpmType = ((b[6] << 8) | b[7]);
  const arch = ((b[8] << 8) | b[9]);
  const leadName = readString(b, 10).slice(0, 65);
  const osNum = ((b[76] << 8) | b[77]);

  // After lead: signature section (header magic)
  // Signature at offset 96
  const sigHeader = parseHeader(b, 96);
  if (!sigHeader) {
    // Fall back to just showing lead info
    return {
      bodyHtml: `<div class="badge-row"><span class="badge badge-rpm">RPM</span></div>
        <div class="meta-section"><h4 class="meta-section-title">RPM Lead</h4>
        <div class="meta-row"><span class="meta-key">Name</span><span class="meta-val">${esc(leadName)}</span></div>
        <div class="meta-row"><span class="meta-key">Version</span><span class="meta-val">${major}.${minor}</span></div>
        <div class="meta-row"><span class="meta-key">Type</span><span class="meta-val">${rpmType === 1 ? 'Source RPM' : 'Binary RPM'}</span></div>
        </div>`,
      hadUnsafe: false,
    };
  }

  // Header section starts after the signature + padding to 8-byte boundary
  // Signature size = 16 (magic+nindex+hsize) + nindex*16 + hsize, rounded up to 8
  const nindex = readUint32BE(b, 96 + 8);
  const hsize  = readUint32BE(b, 96 + 12);
  const sigSize = 16 + nindex * 16 + hsize;
  const paddedSigEnd = 96 + Math.ceil(sigSize / 8) * 8;

  const mainHeader = parseHeader(b, paddedSigEnd);
  const tags = mainHeader?.tags || {};

  const name     = tags.name     || leadName || '—';
  const version  = tags.version  || '—';
  const release  = tags.release  || '';
  const arch_str = tags.arch     || (arch === 1 ? 'i386' : arch === 2 ? 'alpha' : arch === 14 ? 'x86_64' : `arch${arch}`);
  const os_str   = tags.os       || (osNum === 1 ? 'Linux' : `os${osNum}`);
  const summary  = tags.summary  || '';
  const description = tags.description || '';
  const license  = tags.license  || '';
  const group    = tags.group    || '';
  const vendor   = tags.vendor   || '';
  const url      = tags.url      || '';
  const packager = tags.packager || '';
  const isSrpm   = rpmType === 1;

  const requires = Array.isArray(tags.requireName) ? tags.requireName.slice(0, 15) : [];

  const metaRows = [
    ['Package', name],
    ['Version', version + (release ? '-' + release : '')],
    ['Architecture', arch_str],
    ['OS', os_str],
    isSrpm ? ['Type', 'Source RPM'] : null,
    license ? ['License', license] : null,
    group ? ['Group', group] : null,
    vendor ? ['Vendor', vendor] : null,
    url ? ['URL', url] : null,
    packager ? ['Packager', packager] : null,
  ].filter(Boolean);

  const overviewHtml = metaRows.map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(String(v))}</span></div>`
  ).join('');

  const summaryHtml = summary
    ? `<div class="meta-section"><h4 class="meta-section-title">Summary</h4><p style="color:#37474f">${esc(summary)}</p></div>`
    : '';

  const reqHtml = requires.length
    ? `<div class="meta-section"><h4 class="meta-section-title">Requires (${requires.length}${requires.length >= 15 ? '+' : ''})</h4>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${requires.map(r => `<span class="rpm-req">${esc(r)}</span>`).join('')}
        </div></div>`
    : '';

  return {
    bodyHtml: `
      <style>
        .badge-rpm { background: #c62828; color: #fff; }
        .rpm-req { display:inline-block; background:#fce4ec; color:#880e4f; border-radius:3px; padding:1px 7px; font-size:0.8rem; }
      </style>
      <div class="badge-row">
        <span class="badge badge-rpm">${isSrpm ? 'SRPM' : 'RPM'}</span>
        <span class="badge" style="background:#37474f;color:#fff;margin-left:4px">${esc(arch_str)}</span>
      </div>
      <div class="meta-section">
        <h4 class="meta-section-title">Package Info</h4>
        ${overviewHtml}
      </div>
      ${summaryHtml}
      ${reqHtml}
    `,
    hadUnsafe: false,
  };
}
