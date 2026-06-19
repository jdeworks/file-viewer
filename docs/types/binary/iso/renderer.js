function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function readStr(b, off, len) {
  let s = '';
  for (let i = 0; i < len; i++) {
    const c = b[off + i];
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.trim();
}

function u16le(b, o) { return b[o] | (b[o+1] << 8); }
function u32le(b, o) { return (b[o] | (b[o+1]<<8) | (b[o+2]<<16) | (b[o+3]<<24)) >>> 0; }

// ISO 9660 date: 7-byte binary format
function isoDate(b, o) {
  if (!b[o]) return null;
  const year = 1900 + b[o];
  const month = b[o+1];
  const day = b[o+2];
  if (!year || !month || !day) return null;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

// Descriptor type names
const VD_TYPE = { 0: 'Boot Record', 1: 'Primary Volume', 2: 'Supplementary Volume', 255: 'Volume Descriptor Set Terminator' };

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 32776) {
    return { bodyHtml: '<div class="iso-preview"><p class="iso-note">File too small for ISO 9660 parsing (need at least 32 KB).</p></div>' };
  }

  // Scan volume descriptors starting at sector 16
  const SECTOR = 2048;
  const descriptors = [];
  let pvd = null;

  for (let sector = 16; sector < Math.min(32, Math.floor(b.length / SECTOR)); sector++) {
    const off = sector * SECTOR;
    if (off + 5 > b.length) break;
    const type = b[off];
    const magic = String.fromCharCode(b[off+1], b[off+2], b[off+3], b[off+4], b[off+5]);
    if (magic !== 'CD001') break;
    descriptors.push(VD_TYPE[type] || `Type ${type}`);
    if (type === 1 && !pvd) pvd = off;
    if (type === 255) break;
  }

  if (!pvd) {
    return { bodyHtml: '<div class="iso-preview"><p class="iso-note">ISO 9660 Primary Volume Descriptor not found.</p></div>' };
  }

  // PVD layout (offsets relative to sector start)
  const volumeId     = readStr(b, pvd + 40, 32);   // D-characters
  const sysId        = readStr(b, pvd + 8, 32);    // a-characters
  const publisher    = readStr(b, pvd + 318, 128);
  const preparer     = readStr(b, pvd + 446, 128);
  const appId        = readStr(b, pvd + 574, 128);
  const volSetId     = readStr(b, pvd + 190, 128);
  const sectorSize   = u16le(b, pvd + 128);
  const totalSectors = u32le(b, pvd + 80);
  const totalBytes   = sectorSize * totalSectors;
  const rootDate     = isoDate(b, pvd + 156 + 18); // root dir record date
  const creationDate = readStr(b, pvd + 813, 16);  // "YYYYMMDDHHmmsscc"
  const creationFmt  = creationDate.length >= 8
    ? `${creationDate.slice(0,4)}-${creationDate.slice(4,6)}-${creationDate.slice(6,8)}`
    : null;

  function mb(bytes) {
    const mb = bytes / 1024 / 1024;
    return mb > 1000 ? `${(mb/1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
  }

  function row(label, value) {
    if (!value) return '';
    return `<tr><td class="iso-key">${esc(label)}</td><td>${esc(value)}</td></tr>`;
  }

  const rows = [
    row('Volume ID', volumeId),
    row('System ID', sysId),
    row('Publisher', publisher),
    row('Application', appId),
    row('Volume Set', volSetId),
    row('Sector size', sectorSize ? `${sectorSize} bytes` : null),
    row('Total sectors', totalSectors ? totalSectors.toLocaleString() : null),
    row('Total size', totalBytes > 0 ? mb(totalBytes) : null),
    row('Created', creationFmt),
    row('Root date', rootDate),
  ].filter(Boolean).join('');

  const vdChips = descriptors.map((d) => `<span class="iso-chip">${esc(d)}</span>`).join('');

  return { bodyHtml: `<div class="iso-preview">
  <div class="iso-header"><span class="iso-badge">ISO</span><span class="iso-title">${esc(volumeId || 'ISO 9660')}</span></div>
  <table class="iso-table">${rows}</table>
  <div class="iso-section"><div class="iso-label">Volume Descriptors</div><div class="iso-chips">${vdChips}</div></div>
</div>` };
}
