import { FIELD_TYPE_NAMES, validateDbf } from './validate.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function cleanText(raw) {
  return new TextDecoder('ascii', { fatal: false }).decode(raw).replace(/\0+$/g, '').trim();
}

function renderRows(b, header) {
  const rows = [];
  const rowsToRead = Math.min(header.numRecords, 20);
  for (let i = 0; i < rowsToRead; i++) {
    const rowOff = header.headerSize + i * header.recordSize;
    if (rowOff + header.recordSize > b.length) break;
    if (b[rowOff] === 0x2a) continue;
    const cells = [];
    let fieldOff = rowOff + 1;
    for (const field of header.fields) {
      let value = cleanText(b.slice(fieldOff, fieldOff + field.length));
      if (field.type === 'L') value = /^(T|Y)$/i.test(value) ? 'true' : /^(F|N)$/i.test(value) ? 'false' : value;
      cells.push(value);
      fieldOff += field.length;
    }
    rows.push(cells);
  }
  return rows;
}

function diagnostic(result) {
  const version = result.versionName
    ? `<div class="meta-row"><span class="meta-key">Recognized version</span><span class="meta-val">${esc(result.versionName)}</span></div>`
    : '';
  return {
    bodyHtml: `<div class="badge-row"><span class="badge badge-dbf">DBF?</span></div>
      <div class="meta-section"><h4 class="meta-section-title">Invalid or unsupported DBF</h4>
      ${version}<p class="viewer-message">${esc(result.error)}</p>
      <p class="viewer-message">No fields, dates, or records were decoded from this file.</p></div>`,
    hadUnsafe: false,
  };
}

export function render(intake) {
  const header = validateDbf(intake);
  if (!header.valid) return diagnostic(header);
  const rows = renderRows(intake.bytes, header);
  const metaRows = [
    ['Format', 'dBase / DBF'],
    ['Version', header.versionName],
    ['Last update', header.lastUpdate],
    ['Records', header.numRecords.toLocaleString()],
    ['Fields', String(header.fields.length)],
    ['Record size', `${header.recordSize} bytes`],
  ].map(([key, value]) => `<div class="meta-row"><span class="meta-key">${esc(key)}</span><span class="meta-val">${esc(value)}</span></div>`).join('');
  const fieldRows = header.fields.map((field) => {
    const extra = field.type === 'N' || field.type === 'F' ? ` (${field.length}.${field.decimals})` : ` (${field.length})`;
    return `<tr><td class="dbf-fname">${esc(field.name)}</td><td class="dbf-ftype">${esc(field.type)}</td><td class="dbf-fdesc">${esc(FIELD_TYPE_NAMES[field.type] || field.type)}${esc(extra)}</td></tr>`;
  }).join('');
  const tableHead = header.fields.map((field) => `<th>${esc(field.name)}</th>`).join('');
  const tableBody = rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
  const warning = header.warnings.length ? `<div class="dbf-notice">${esc(header.warnings.join(' '))}</div>` : '';
  const truncatedNotice = header.numRecords > 20 ? `<div class="dbf-notice">Showing first 20 of ${header.numRecords.toLocaleString()} records</div>` : '';
  return {
    bodyHtml: `<style>
      .badge-dbf{background:#37474f;color:#fff}.dbf-notice{background:#fff8e1;border-left:3px solid #f9a825;padding:6px 10px;margin:8px 0;font-size:.82rem;border-radius:2px}
      .dbf-table{border-collapse:collapse;width:100%;font-size:.84rem;margin:8px 0}.dbf-table th{background:#eceff1;text-align:left;padding:4px 8px;border-bottom:2px solid #cfd8dc;font-size:.8rem}
      .dbf-table td{padding:3px 8px;border-bottom:1px solid #eceff1}.dbf-table tr:hover td{background:#f5f5f5}.dbf-fname{font-weight:600;font-family:monospace}
      .dbf-ftype{font-family:monospace;color:#1565c0;font-weight:700}.dbf-fdesc{color:#555;font-size:.8rem}.dbf-scroll{overflow-x:auto}
    </style><div class="badge-row"><span class="badge badge-dbf">DBF</span></div>${warning}
      <div class="meta-section"><h4 class="meta-section-title">File Info</h4>${metaRows}</div>
      ${header.fields.length ? `<div class="meta-section"><h4 class="meta-section-title">Field Definitions</h4><div class="dbf-scroll"><table class="dbf-table"><thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead><tbody>${fieldRows}</tbody></table></div></div>` : ''}
      ${rows.length ? `<div class="meta-section"><h4 class="meta-section-title">Records</h4>${truncatedNotice}<div class="dbf-scroll"><table class="dbf-table"><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table></div></div>` : ''}`,
    hadUnsafe: false,
  };
}
