// dBASE DBF header format:
//   byte 0:        version byte
//   bytes 1-3:     last update (YY MM DD)
//   bytes 4-7:     number of records (LE int32)
//   bytes 8-9:     header size in bytes (LE int16)
//   bytes 10-11:   record size in bytes (LE int16)
//   bytes 12-31:   reserved
//   bytes 32+:     field descriptors, each 32 bytes:
//                    bytes 0-10:  field name (null-padded)
//                    byte 11:     field type (C,N,F,D,L,M,G,P,Y,T,I,O,B,V,X,@,=,^)
//                    bytes 12-15: reserved / field data address
//                    byte 16:     field length in bytes
//                    byte 17:     decimal count
//                    bytes 18-31: reserved
//   Terminator:    0x0D after last field descriptor

const VERSION_NAMES = {
  0x02: 'dBASE II',
  0x03: 'dBASE III+',
  0x04: 'dBASE IV',
  0x05: 'dBASE V',
  0x07: 'Visual Objects',
  0x30: 'Visual FoxPro',
  0x31: 'Visual FoxPro (autoincrement)',
  0x32: 'Visual FoxPro (varchar)',
  0x7b: 'dBASE IV (SQL table)',
  0x82: 'dBASE III+ (memo)',
  0x83: 'dBASE III+ (memo)',
  0x8b: 'dBASE IV (memo)',
  0x8e: 'dBASE IV (SQL system)',
  0xcb: 'dBASE IV (SQL table memo)',
  0xf5: 'FoxPro (memo)',
};

const FIELD_TYPE_NAMES = {
  C: 'Character', N: 'Numeric', F: 'Float', D: 'Date', L: 'Logical',
  M: 'Memo', G: 'General', P: 'Picture', Y: 'Currency', T: 'DateTime',
  I: 'Integer', O: 'Double', B: 'Binary', V: 'Varchar', X: 'Varbinary',
  '@': 'Timestamp', '=': 'Integer (8B)', '^': 'Autoincrement',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function r32le(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}

function r16le(b, off) {
  return b[off] | (b[off + 1] << 8);
}

function parseHeader(b) {
  const version = b[0];
  const year = b[1]; const month = b[2]; const day = b[3];
  const numRecords = r32le(b, 4);
  const headerSize = r16le(b, 8);
  const recordSize = r16le(b, 10);
  const lastUpdate = `${year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  return { version, lastUpdate, numRecords, headerSize, recordSize };
}

function parseFields(b, headerSize) {
  const fields = [];
  let off = 32;
  while (off + 32 <= headerSize && off + 32 <= b.length) {
    if (b[off] === 0x0d || b[off] === 0x00) break;
    let nameEnd = off;
    while (nameEnd < off + 11 && b[nameEnd] !== 0) nameEnd++;
    const name = new TextDecoder('ascii', { fatal: false }).decode(b.slice(off, nameEnd));
    const type = String.fromCharCode(b[off + 11]);
    const length = b[off + 16];
    const decimals = b[off + 17];
    fields.push({ name, type, length, decimals });
    off += 32;
    if (fields.length >= 100) break;
  }
  return fields;
}

function cleanText(raw) {
  return new TextDecoder('ascii', { fatal: false }).decode(raw).replace(/\0+$/g, '').trim();
}

function renderRows(b, header, fields) {
  const { headerSize, recordSize, numRecords } = header;
  const MAX_ROWS = 20;
  const rowsToRead = Math.min(numRecords, MAX_ROWS);
  const rows = [];
  for (let i = 0; i < rowsToRead; i++) {
    const rowOff = headerSize + i * recordSize;
    if (rowOff + recordSize > b.length) break;
    if (b[rowOff] === 0x2a) continue; // deleted record marker '*'
    const cells = [];
    let fieldOff = rowOff + 1; // skip deletion flag
    for (const f of fields) {
      const raw = b.slice(fieldOff, fieldOff + f.length);
      let val = cleanText(raw);
      if (f.type === 'L') val = val === 'T' || val === 'Y' ? 'true' : val === 'F' || val === 'N' ? 'false' : val;
      cells.push(val);
      fieldOff += f.length;
    }
    rows.push(cells);
  }
  return rows;
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 32) {
    return { bodyHtml: '<p class="viewer-message">Not a valid DBF file.</p>', hadUnsafe: false };
  }

  const header = parseHeader(b);
  const fields = parseFields(b, header.headerSize);
  const rows = renderRows(b, header, fields);
  const truncated = header.numRecords > 20;

  const versionName = VERSION_NAMES[header.version] || `Unknown (0x${header.version.toString(16)})`;

  const metaRows = [
    ['Format', `dBase / DBF`],
    ['Version', `${versionName}`],
    ['Last update', header.lastUpdate],
    ['Records', header.numRecords.toLocaleString()],
    ['Fields', String(fields.length)],
    ['Record size', `${header.recordSize} bytes`],
  ].map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  const fieldRows = fields.map((f) => {
    const typeName = FIELD_TYPE_NAMES[f.type] || f.type;
    const extra = f.type === 'N' || f.type === 'F' ? ` (${f.length}.${f.decimals})` : ` (${f.length})`;
    return `<tr><td class="dbf-fname">${esc(f.name)}</td><td class="dbf-ftype">${esc(f.type)}</td><td class="dbf-fdesc">${esc(typeName)}${esc(extra)}</td></tr>`;
  }).join('');

  const tableHead = fields.map((f) => `<th>${esc(f.name)}</th>`).join('');
  const tableBody = rows.map((row) =>
    `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`
  ).join('');

  const truncatedNotice = truncated
    ? `<div class="dbf-notice">Showing first 20 of ${header.numRecords.toLocaleString()} records</div>`
    : '';

  return {
    bodyHtml: `
      <style>
        .badge-dbf { background: #37474f; color: #fff; }
        .dbf-meta { margin-bottom: 12px; }
        .dbf-notice { background: #fff8e1; border-left: 3px solid #f9a825; padding: 6px 10px; margin: 8px 0; font-size: 0.82rem; border-radius: 2px; }
        .dbf-table { border-collapse: collapse; width: 100%; font-size: 0.84rem; margin: 8px 0; }
        .dbf-table th { background: #eceff1; text-align: left; padding: 4px 8px; border-bottom: 2px solid #cfd8dc; font-size: 0.8rem; }
        .dbf-table td { padding: 3px 8px; border-bottom: 1px solid #eceff1; }
        .dbf-table tr:hover td { background: #f5f5f5; }
        .dbf-fname { font-weight: 600; font-family: monospace; }
        .dbf-ftype { font-family: monospace; color: #1565c0; font-weight: 700; }
        .dbf-fdesc { color: #555; font-size: 0.8rem; }
        .dbf-scroll { overflow-x: auto; }
      </style>
      <div class="badge-row"><span class="badge badge-dbf">DBF</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">File Info</h4>
        ${metaRows}
      </div>
      ${fields.length ? `<div class="meta-section">
        <h4 class="meta-section-title">Field Definitions</h4>
        <div class="dbf-scroll"><table class="dbf-table">
          <thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead>
          <tbody>${fieldRows}</tbody>
        </table></div>
      </div>` : ''}
      ${rows.length ? `<div class="meta-section">
        <h4 class="meta-section-title">Records</h4>
        ${truncatedNotice}
        <div class="dbf-scroll"><table class="dbf-table">
          <thead><tr>${tableHead}</tr></thead>
          <tbody>${tableBody}</tbody>
        </table></div>
      </div>` : ''}`,
    hadUnsafe: false,
  };
}
