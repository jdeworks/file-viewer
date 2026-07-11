function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function fmtBytes(n) {
  if (typeof n !== 'number' || n < 0) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}

function parseNpyHeader(bytes) {
  if (bytes[0] !== 0x93) throw new Error('Not a NumPy file');
  const major = bytes[6];
  const minor = bytes[7];
  let headerLen, dataOffset;
  if (major === 1) {
    headerLen = bytes[8] | (bytes[9] << 8);
    dataOffset = 10 + headerLen;
  } else if (major === 2) {
    headerLen = bytes[8] | (bytes[9] << 8) | (bytes[10] << 16) | (bytes[11] << 24);
    dataOffset = 12 + headerLen;
  } else {
    throw new Error(`Unknown NumPy format version ${major}.${minor}`);
  }

  const headerStart = major === 1 ? 10 : 12;
  const headerStr = new TextDecoder('ascii').decode(bytes.slice(headerStart, dataOffset));

  const descrMatch = headerStr.match(/'descr'\s*:\s*'([^']+)'/);
  const shapeMatch = headerStr.match(/'shape'\s*:\s*\(([^)]*)\)/);
  const fortranMatch = headerStr.match(/'fortran_order'\s*:\s*(True|False)/);

  const descr = descrMatch ? descrMatch[1] : '<f8';
  const shapeStr = shapeMatch ? shapeMatch[1] : '';
  const shape = shapeStr.trim() === '' ? [] : shapeStr.split(',').map(s => s.trim()).filter(Boolean).map(Number);
  const fortranOrder = fortranMatch ? fortranMatch[1] === 'True' : false;

  return { major, minor, descr, shape, fortranOrder, dataOffset };
}

function decodeDtype(descr) {
  const endian = descr[0]; // '<' LE, '>' BE, '|' N/A
  const kind = descr[1];   // 'f' float, 'i' int, 'u' uint, 'b' bool, 'c' complex, 'U' unicode, 'S' bytes
  const itemsize = parseInt(descr.slice(2)) || 1;

  const endianName = endian === '<' ? 'little-endian' : endian === '>' ? 'big-endian' : '';
  const kindNames = { f: 'float', i: 'int', u: 'uint', b: 'bool', c: 'complex', U: 'unicode', S: 'bytes', V: 'void' };
  const bits = itemsize * 8;

  return `${endianName ? endianName + ' ' : ''}${kindNames[kind] || kind}${bits > 0 ? bits : ''}`;
}

function readValues(bytes, dataOffset, descr, shape, maxCount = 100) {
  const total = shape.length === 0 ? 1 : shape.reduce((a, b) => a * b, 1);
  const count = Math.min(total, maxCount);
  const data = bytes.slice(dataOffset);
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const le = descr[0] !== '>'; // little-endian?
  const kind = descr[1];
  const itemsize = parseInt(descr.slice(2)) || 1;

  const values = [];
  for (let i = 0; i < count; i++) {
    const offset = i * itemsize;
    if (offset + itemsize > data.length) break;
    try {
      if (kind === 'f' && itemsize === 2) values.push(readFloat16(dv, offset, le).toPrecision(4));
      else if (kind === 'f' && itemsize === 4) values.push(dv.getFloat32(offset, le).toPrecision(6));
      else if (kind === 'f' && itemsize === 8) values.push(dv.getFloat64(offset, le).toPrecision(10));
      else if (kind === 'i' && itemsize === 1) values.push(dv.getInt8(offset));
      else if (kind === 'i' && itemsize === 2) values.push(dv.getInt16(offset, le));
      else if (kind === 'i' && itemsize === 4) values.push(dv.getInt32(offset, le));
      else if (kind === 'i' && itemsize === 8) values.push(readInt64(dv, offset, le));
      else if (kind === 'u' && itemsize === 1) values.push(dv.getUint8(offset));
      else if (kind === 'u' && itemsize === 2) values.push(dv.getUint16(offset, le));
      else if (kind === 'u' && itemsize === 4) values.push(dv.getUint32(offset, le));
      else if (kind === 'u' && itemsize === 8) values.push(readUint64(dv, offset, le));
      else if (kind === 'b' && itemsize === 1) values.push(data[offset] ? 'True' : 'False');
      else values.push(`[${itemsize}B]`);
    } catch { break; }
  }
  return { values, total, shown: values.length };
}

function readFloat16(dv, offset, le) {
  const h = dv.getUint16(offset, le);
  const sign = (h >> 15) ? -1 : 1;
  const exp = (h >> 10) & 0x1F;
  const frac = h & 0x3FF;
  if (exp === 0) return sign * Math.pow(2, -14) * (frac / 1024);
  if (exp === 31) return frac ? NaN : sign * Infinity;
  return sign * Math.pow(2, exp - 15) * (1 + frac / 1024);
}

function readInt64(dv, offset, le) {
  try {
    return Number(dv.getBigInt64(offset, le));
  } catch { return '?'; }
}

function readUint64(dv, offset, le) {
  try {
    return Number(dv.getBigUint64(offset, le));
  } catch { return '?'; }
}

function listZipFiles(bytes) {
  // Find EOCD signature: 0x06054B50
  let eocdPos = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (bytes[i] === 0x50 && bytes[i+1] === 0x4B && bytes[i+2] === 0x05 && bytes[i+3] === 0x06) {
      eocdPos = i; break;
    }
  }
  if (eocdPos < 0) return [];

  const dv = new DataView(bytes.buffer, bytes.byteOffset);
  const cdOffset = dv.getUint32(eocdPos + 16, true);
  const cdCount = dv.getUint16(eocdPos + 8, true);

  const files = [];
  let pos = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (dv.getUint32(pos, true) !== 0x02014B50) break;
    const compressionMethod = dv.getUint16(pos + 10, true);
    const compressedSize = dv.getUint32(pos + 20, true);
    const uncompressedSize = dv.getUint32(pos + 24, true);
    const nameLen = dv.getUint16(pos + 28, true);
    const extraLen = dv.getUint16(pos + 30, true);
    const commentLen = dv.getUint16(pos + 32, true);
    const localHeaderOffset = dv.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(bytes.slice(pos + 46, pos + 46 + nameLen));
    files.push({ name, compressedSize, uncompressedSize, localHeaderOffset, compressionMethod });
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

function readLocalFileData(bytes, localHeaderOffset) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset);
  const nameLen = dv.getUint16(localHeaderOffset + 26, true);
  const extraLen = dv.getUint16(localHeaderOffset + 28, true);
  const dataOffset = localHeaderOffset + 30 + nameLen + extraLen;
  return bytes.slice(dataOffset);
}

function fmtShape(shape) {
  if (shape.length === 0) return '()  scalar';
  return shape.join(' × ');
}

function fmtElements(total) {
  if (total >= 1000000) return (total / 1000000).toFixed(2) + 'M';
  if (total >= 1000) return (total / 1000).toFixed(1) + 'K';
  return String(total);
}

const MAX_PREVIEW = 100;
const MAX_NPZ_ARRAY_PREVIEW = 20;

const STYLE = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--fg, #1a1a1a);
  background: var(--bg, #f5f5f5);
  padding: 20px 16px;
}
.header-card {
  background: var(--panel, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.badge {
  display: inline-block;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.08em;
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid var(--border, #e0e0e0);
  background: var(--badge-bg, #f0f0f0);
  color: var(--fg, #1a1a1a);
}
.badge-main {
  background: #3864b0;
  border-color: #2a50a0;
  color: #fff;
  font-size: 13px;
}
.badge-dtype {
  background: var(--badge-bg, #e8f0fc);
  border-color: #9ab2e8;
  color: #1a3a8a;
}
.badge-shape {
  background: var(--badge-bg, #e8fce8);
  border-color: #8bc48b;
  color: #1a5a1a;
}
.badge-size {
  background: var(--badge-bg, #f0f0f0);
  border-color: var(--border, #d0d0d0);
  color: var(--fg2, #555);
}
.section-block {
  margin-bottom: 20px;
}
.section-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg2, #666);
  margin-bottom: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
  background: var(--panel, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  overflow: hidden;
}
th {
  text-align: left;
  padding: 7px 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--fg2, #777);
  background: var(--th-bg, #f9f9f9);
  border-bottom: 1px solid var(--border, #e8e8e8);
}
td {
  padding: 6px 12px;
  border-bottom: 1px solid var(--border, #f0f0f0);
  color: var(--fg, #1a1a1a);
  word-break: break-all;
}
tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--hover, #fafafa); }
.td-right { text-align: right; white-space: nowrap; color: var(--fg2, #888); }
.info-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
  background: var(--panel, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  padding: 12px 16px;
}
.info-label { color: var(--fg2, #666); font-size: 12px; white-space: nowrap; }
.info-value { font-weight: 600; }
.values-block {
  background: var(--panel, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  padding: 12px 16px;
  overflow-x: auto;
}
.values-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-bottom: 4px;
}
.val {
  display: inline-block;
  min-width: 90px;
  text-align: right;
  color: #1a4a8a;
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--val-bg, #f0f5ff);
}
.val-bool-true  { color: #1a6b1a; background: var(--val-bg, #f0fff0); }
.val-bool-false { color: #8a3a1a; background: var(--val-bg, #fff5f0); }
.truncation-note {
  color: var(--fg2, #888);
  font-size: 12px;
  font-style: italic;
  margin-top: 8px;
}
.error-box {
  margin-top: 16px;
  padding: 10px 14px;
  background: var(--err-bg, #fff3f3);
  border: 1px solid var(--err-border, #f5c6c6);
  border-radius: 6px;
  color: var(--err-fg, #b00020);
  font-size: 12px;
}
.empty-note { color: var(--fg2, #999); font-style: italic; padding: 8px 12px; }
.array-name { color: #1a4a8a; font-weight: 600; }
.inline-vals { color: var(--fg2, #555); font-size: 11px; margin-top: 2px; }
body.fv-dark {
  --fg: #e6e6e6;
  --fg2: #aeb7c2;
  --bg: #1e1e1e;
  --panel: #252526;
  --border: #45464a;
  --th-bg: #2d2d30;
  --hover: #333438;
  --badge-bg: #2d2d30;
  --val-bg: #172b46;
  --err-bg: #35171a;
  --err-border: #7d3439;
  --err-fg: #ff938a;
}
body.fv-dark .badge-dtype { background: #172b46; border-color: #365f8f; color: #a9d1ff; }
body.fv-dark .badge-shape { background: #193821; border-color: #477854; color: #b9e6c3; }
body.fv-dark .val, body.fv-dark .array-name { color: #9dccff; }
body.fv-dark .val-bool-true { background: #193821; color: #b9e6c3; }
body.fv-dark .val-bool-false { background: #452219; color: #ffb39d; }
@media (max-width: 520px) {
  body { padding: 14px 12px; }
  .header-card { padding: 12px; margin-bottom: 16px; }
  .info-grid { grid-template-columns: minmax(80px, max-content) minmax(0, 1fr); padding: 10px 12px; }
  .info-value { min-width: 0; overflow-wrap: anywhere; }
}
`;

function renderNpy(intake) {
  const b = intake.bytes;
  let parseError = null;
  let info = null;
  let valResult = null;

  try {
    info = parseNpyHeader(b);
    valResult = readValues(b, info.dataOffset, info.descr, info.shape, MAX_PREVIEW);
  } catch (e) {
    parseError = String(e);
  }

  let html = `<style>${STYLE}</style>`;

  // Header card
  const dtype = info ? decodeDtype(info.descr) : '?';
  const shape = info ? fmtShape(info.shape) : '?';
  const total = info
    ? (info.shape.length === 0 ? 1 : info.shape.reduce((a, b) => a * b, 1))
    : 0;

  html += `<div class="header-card">`;
  html += `<span class="badge badge-main">NumPy Array</span>`;
  if (info) {
    html += `<span class="badge badge-dtype">${esc(dtype)}</span>`;
    html += `<span class="badge badge-shape">${esc(shape)}</span>`;
    if (total > 0) html += `<span class="badge">${esc(fmtElements(total))} elements</span>`;
  }
  html += `<span class="badge badge-size">${esc(fmtBytes(intake.size))}</span>`;
  html += `</div>`;

  if (info) {
    // Info grid
    html += `<div class="section-block">`;
    html += `<div class="section-title">Array Info</div>`;
    html += `<div class="info-grid">`;
    html += `<span class="info-label">Shape</span><span class="info-value">${esc(info.shape.length === 0 ? '() — scalar' : '(' + info.shape.join(', ') + ')')}</span>`;
    html += `<span class="info-label">dtype</span><span class="info-value">${esc(info.descr)} — ${esc(dtype)}</span>`;
    html += `<span class="info-label">Version</span><span class="info-value">${esc(info.major)}.${esc(info.minor)}</span>`;
    html += `<span class="info-label">Fortran order</span><span class="info-value">${info.fortranOrder ? 'Yes' : 'No'}</span>`;
    html += `<span class="info-label">File size</span><span class="info-value">${esc(fmtBytes(intake.size))}</span>`;
    html += `</div>`;
    html += `</div>`;
  }

  // Values preview
  if (valResult && valResult.values.length > 0) {
    html += `<div class="section-block">`;
    const heading = valResult.total > valResult.shown
      ? `Data Preview (first ${valResult.shown} of ${fmtElements(valResult.total)} elements)`
      : `Data (${valResult.total} element${valResult.total !== 1 ? 's' : ''})`;
    html += `<div class="section-title">${esc(heading)}</div>`;
    html += `<div class="values-block">`;

    const cols = info && info.shape.length >= 2 ? info.shape[info.shape.length - 1] : valResult.shown;
    const vals = valResult.values;
    const kind = info ? info.descr[1] : 'f';

    for (let row = 0; row < vals.length; row += cols) {
      const rowVals = vals.slice(row, Math.min(row + cols, vals.length));
      html += `<div class="values-row">`;
      for (const v of rowVals) {
        const cls = kind === 'b'
          ? (v === 'True' ? 'val val-bool-true' : 'val val-bool-false')
          : 'val';
        html += `<span class="${cls}">${esc(String(v))}</span>`;
      }
      html += `</div>`;
    }

    if (valResult.total > valResult.shown) {
      html += `<div class="truncation-note">... and ${fmtElements(valResult.total - valResult.shown)} more elements</div>`;
    }
    html += `</div>`;
    html += `</div>`;
  }

  if (parseError) {
    html += `<div class="error-box">Parse error: ${esc(parseError)}</div>`;
  }

  return html;
}

function renderNpz(intake) {
  const b = intake.bytes;
  let parseError = null;
  let files = [];
  let arrays = [];

  try {
    files = listZipFiles(b);
    arrays = files.filter(f => f.name.endsWith('.npy'));
  } catch (e) {
    parseError = String(e);
  }

  let html = `<style>${STYLE}</style>`;

  html += `<div class="header-card">`;
  html += `<span class="badge badge-main">NumPy Archive (.npz)</span>`;
  html += `<span class="badge badge-shape">${esc(arrays.length)} array${arrays.length !== 1 ? 's' : ''}</span>`;
  html += `<span class="badge badge-size">${esc(fmtBytes(intake.size))}</span>`;
  html += `</div>`;

  if (arrays.length === 0 && !parseError) {
    html += `<div class="empty-note">No .npy arrays found in this archive.</div>`;
  } else if (arrays.length > 0) {
    html += `<div class="section-block">`;
    html += `<div class="section-title">Arrays (${arrays.length})</div>`;
    html += `<table><thead><tr><th>Name</th><th>Shape</th><th>dtype</th><th style="text-align:right">Compressed</th><th style="text-align:right">Uncompressed</th><th>Preview</th></tr></thead><tbody>`;

    for (const entry of arrays) {
      const arrName = entry.name.replace(/\.npy$/, '');
      let shape = '?';
      let dtype = '?';
      let previewStr = '';

      if (entry.compressionMethod === 0) {
        // Uncompressed — parse directly
        try {
          const data = readLocalFileData(b, entry.localHeaderOffset);
          const hdr = parseNpyHeader(data);
          shape = hdr.shape.length === 0 ? '()' : '(' + hdr.shape.join(', ') + ')';
          dtype = hdr.descr + ' — ' + decodeDtype(hdr.descr);
          const vr = readValues(data, hdr.dataOffset, hdr.descr, hdr.shape, MAX_NPZ_ARRAY_PREVIEW);
          if (vr.values.length > 0) {
            previewStr = vr.values.slice(0, 5).join(', ');
            if (vr.total > 5) previewStr += ', …';
          }
        } catch {
          // leave as '?'
        }
      } else {
        shape = '(compressed)';
      }

      html += `<tr>`;
      html += `<td class="array-name">${esc(arrName)}</td>`;
      html += `<td>${esc(shape)}</td>`;
      html += `<td>${esc(dtype)}</td>`;
      html += `<td class="td-right">${esc(fmtBytes(entry.compressedSize))}</td>`;
      html += `<td class="td-right">${esc(fmtBytes(entry.uncompressedSize))}</td>`;
      html += `<td><span class="inline-vals">${esc(previewStr)}</span></td>`;
      html += `</tr>`;
    }

    html += `</tbody></table>`;
    html += `</div>`;
  }

  if (parseError) {
    html += `<div class="error-box">Parse error: ${esc(parseError)}</div>`;
  }

  return html;
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 6) {
    return {
      bodyHtml: `<style>${STYLE}</style><div class="error-box">File too small or empty (${b ? b.length : 0} bytes).</div>`,
      hadUnsafe: false
    };
  }

  const isNpy = b[0] === 0x93 && b[1] === 0x4E && b[2] === 0x55 &&
                b[3] === 0x4D && b[4] === 0x50 && b[5] === 0x59;
  const ext = intake.filename?.split('.').pop()?.toLowerCase();
  const isNpz = ext === 'npz' || (b[0] === 0x50 && b[1] === 0x4B);

  let bodyHtml;
  if (isNpy) {
    bodyHtml = renderNpy(intake);
  } else if (isNpz) {
    bodyHtml = renderNpz(intake);
  } else {
    // Fallback: try npy, then npz
    try {
      bodyHtml = renderNpy(intake);
    } catch {
      bodyHtml = renderNpz(intake);
    }
  }

  return { bodyHtml, hadUnsafe: false };
}
