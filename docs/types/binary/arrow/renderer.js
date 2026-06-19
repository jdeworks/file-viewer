// Apache Arrow IPC file format reader
// Magic: 'ARROW1\0\0' (8 bytes) at start and end
// FlatBuffers schema in footer; we parse only what we need without a full FlatBuffers lib.

function r32le(b, off) {
  return ((b[off] | (b[off + 1] << 8) | (b[off + 2] << 16)) >>> 0) + b[off + 3] * 0x1000000;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function ascii(b, off, len) {
  return String.fromCharCode(...b.slice(off, off + len));
}

// Feather v1 is a simpler format we can partially parse
function parseFeatherV1(b) {
  if (b.length < 12) return null;
  // bytes 0-3: FEA1, 4-7: num_rows (int32 LE), 8-11: num_cols (int32 LE)
  const numRows = r32le(b, 4);
  const numCols = r32le(b, 8);
  return { format: 'Feather v1', numRows, numCols, columns: [] };
}

// Arrow IPC file: 'ARROW1\0\0' magic, FlatBuffers footer at end
// Footer: last 4 bytes before magic = footer length (LE int32)
//         then `footer_len` bytes = FlatBuffers Schema message
// We scan for column name strings heuristically rather than full FlatBuffers decode
function extractColumnNamesHeuristic(footerBytes) {
  // Column names are UTF-8 strings inside FlatBuffers. Scan for printable ASCII strings >=2 chars
  const names = [];
  let i = 0;
  while (i < footerBytes.length - 2) {
    // FlatBuffers string: 4-byte length prefix + bytes
    if (i + 4 <= footerBytes.length) {
      const len = r32le(footerBytes, i);
      if (len >= 1 && len <= 256 && i + 4 + len <= footerBytes.length) {
        const chars = footerBytes.slice(i + 4, i + 4 + len);
        let valid = true;
        for (const c of chars) {
          if (c < 0x20 || c > 0x7e) { valid = false; break; }
        }
        if (valid && len >= 1) {
          names.push(new TextDecoder().decode(chars));
          i += 4 + len;
          continue;
        }
      }
    }
    i++;
  }
  // Deduplicate, filter out likely non-names (very short, all-digit, etc.)
  const seen = new Set();
  return names.filter((n) => {
    if (seen.has(n)) return false;
    seen.add(n);
    return n.length >= 1 && n.length <= 100;
  }).slice(0, 50);
}

function parseArrowIpc(b) {
  if (b.length < 16) return null;
  const magic = ascii(b, 0, 6);
  if (magic !== 'ARROW1') return null;

  // Footer is at the end: last 8 bytes = 'ARROW1\0\0' magic
  // Before that: 4 bytes = footer FlatBuffers length (LE int32)
  // Before that: footer_len bytes = FlatBuffers Footer table
  const footerMagicOff = b.length - 8;
  if (ascii(b, footerMagicOff, 6) !== 'ARROW1') return { format: 'Arrow IPC', note: 'Missing end magic' };

  const footerLen = r32le(b, footerMagicOff - 4);
  const footerOff = footerMagicOff - 4 - footerLen;

  if (footerLen < 1 || footerLen > b.length - 16 || footerOff < 8) {
    return { format: 'Arrow IPC', note: 'Unreadable footer' };
  }

  const footerBytes = b.slice(footerOff, footerOff + footerLen);

  // FlatBuffers Footer: offset 0 = table root offset (LE int32)
  // We parse heuristically for column names
  const colNames = extractColumnNamesHeuristic(footerBytes);

  return { format: 'Arrow IPC File', footerLen, colNames };
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) {
    return { bodyHtml: '<p class="viewer-message">Not a valid Arrow/Feather file.</p>', hadUnsafe: false };
  }

  const magic = ascii(b, 0, 4);
  let info;

  if (magic === 'FEA1') {
    info = parseFeatherV1(b);
  } else {
    info = parseArrowIpc(b);
  }

  if (!info) {
    return { bodyHtml: '<p class="viewer-message">Unrecognized Arrow/Feather format.</p>', hadUnsafe: false };
  }

  const badge = info.format === 'Feather v1' ? 'Feather v1' : 'Arrow IPC';

  const metaRows = [
    ['Format', info.format],
    info.numRows != null ? ['Rows', info.numRows.toLocaleString()] : null,
    info.numCols != null ? ['Columns', String(info.numCols)] : null,
    info.footerLen != null ? ['Footer size', `${info.footerLen} bytes`] : null,
    ['File size', `${b.length.toLocaleString()} bytes`],
    info.note ? ['Note', info.note] : null,
  ].filter(Boolean).map(([k, v]) => `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`).join('');

  let colHtml = '';
  if (info.colNames && info.colNames.length > 0) {
    const pills = info.colNames.slice(0, 40).map((n) => `<span class="arrow-col-pill">${esc(n)}</span>`).join(' ');
    const more = info.colNames.length > 40 ? ` <span class="viewer-note">+${info.colNames.length - 40} more</span>` : '';
    colHtml = `
      <div class="meta-section">
        <h4 class="meta-section-title">Detected Field Names</h4>
        <div class="arrow-cols">${pills}${more}</div>
        <p class="viewer-note">Field names extracted heuristically from FlatBuffers footer — schema types not decoded.</p>
      </div>`;
  }

  return {
    bodyHtml: `
      <style>
        .badge-arrow { background: #ef6c00; color: #fff; }
        .arrow-cols { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.4rem; }
        .arrow-col-pill { background: var(--bg2,#f0f0f0); color: var(--fg,#333); border-radius: 3px; padding: 0.15rem 0.45rem; font-family: monospace; font-size: 0.82rem; }
      </style>
      <div class="badge-row"><span class="badge badge-arrow">Apache Arrow</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">File Info</h4>
        ${metaRows}
      </div>
      ${colHtml}
      <p class="viewer-note">Data rows are not loaded — use pandas or PyArrow to read the full dataset.</p>`,
    hadUnsafe: false,
  };
}
