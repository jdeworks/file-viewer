// Apache Parquet file format reader
// Magic: 'PAR1' (4 bytes) at start and end
// File layout: [magic][row groups][footer][footer_len:int32LE][magic]
// Footer is Thrift-encoded FileMetaData; we decode it heuristically.

function r32le(b, off) {
  return ((b[off] | (b[off + 1] << 8) | (b[off + 2] << 16)) >>> 0) + b[off + 3] * 0x1000000;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Parquet Thrift type IDs for field types
const PARQUET_TYPES = {
  0: 'BOOLEAN', 1: 'INT32', 2: 'INT64', 3: 'INT96', 4: 'FLOAT', 5: 'DOUBLE',
  6: 'BYTE_ARRAY', 7: 'FIXED_LEN_BYTE_ARRAY',
};

const PARQUET_ENCODINGS = {
  0: 'PLAIN', 1: 'PLAIN_DICTIONARY', 2: 'RLE', 3: 'BIT_PACKED', 4: 'DELTA_BINARY_PACKED',
  5: 'DELTA_LENGTH_BYTE_ARRAY', 6: 'DELTA_BYTE_ARRAY', 7: 'RLE_DICTIONARY', 8: 'BYTE_STREAM_SPLIT',
};

const PARQUET_COMPRESSION = {
  0: 'UNCOMPRESSED', 1: 'SNAPPY', 2: 'GZIP', 3: 'LZO', 4: 'BROTLI', 5: 'LZ4', 6: 'ZSTD', 7: 'LZ4_RAW',
};

// Heuristic: scan Thrift-like binary for field name strings and integer field values
// Thrift binary protocol: field type (1 byte) + field id (2 bytes BE) + value
// String: type=0x0b, length:int32BE, bytes
// Int32: type=0x05, value:int32BE
// Int64: type=0x0a, value:int64BE (read as 2×int32)

function readThriftStrings(b, limit) {
  // Two scan modes:
  // 1. Field-prefixed string: 0x0b + 2-byte field ID + 4-byte BE length + bytes
  // 2. Length-prefixed string: 0x00 0x00 0x00 LEN + printable bytes (list elements)
  const strings = [];
  const end = Math.min(b.length - 4, limit);
  for (let i = 0; i < end; i++) {
    // Pattern 1: Thrift field string — 0x0b + field ID (2 bytes) + length (4 bytes)
    if (b[i] === 0x0b && i + 7 <= b.length) {
      const len = ((b[i + 3] << 24) | (b[i + 4] << 16) | (b[i + 5] << 8) | b[i + 6]) >>> 0;
      if (len >= 1 && len <= 256 && i + 7 + len <= b.length) {
        const s = new TextDecoder('utf-8', { fatal: false }).decode(b.slice(i + 7, i + 7 + len));
        if (/^[\x20-\x7e]+$/.test(s)) strings.push(s);
      }
    }
    // Pattern 2: BE int32 length followed by printable ASCII (handles list-embedded strings)
    if (b[i] === 0 && b[i + 1] === 0 && i + 4 < b.length) {
      const len = (b[i + 2] << 8) | b[i + 3];
      if (len >= 1 && len <= 64 && i + 4 + len <= b.length) {
        const s = new TextDecoder('utf-8', { fatal: false }).decode(b.slice(i + 4, i + 4 + len));
        if (/^[a-zA-Z_][a-zA-Z0-9_. -]*$/.test(s)) strings.push(s);
      }
    }
  }
  return strings;
}

function parseParquetFooter(b) {
  // Footer: last 4 bytes = 'PAR1', before that 4 bytes = footer_len (LE int32)
  const footerLen = r32le(b, b.length - 8);
  if (footerLen < 1 || footerLen > b.length - 12) return null;
  const footerOff = b.length - 8 - footerLen;
  if (footerOff < 4) return null;

  const footer = b.slice(footerOff, footerOff + footerLen);

  // Extract strings from footer (Thrift binary)
  const strings = readThriftStrings(footer, footerLen);

  // Extract integers: try to find num_rows at offset 0 (Thrift field 1, type int64)
  // Thrift binary: 0x0a (int64) + 0x00 0x01 (field 1) + 8 bytes BE int64
  let numRows = null;
  let numRowGroups = null;
  let version = null;

  // Scan for Thrift int64 fields (type 0x0a)
  for (let i = 0; i < Math.min(footer.length - 12, 200); i++) {
    if (footer[i] === 0x0a) {
      const fieldId = (footer[i + 1] << 8) | footer[i + 2];
      const hi = ((footer[i + 3] << 24) | (footer[i + 4] << 16) | (footer[i + 5] << 8) | footer[i + 6]) >>> 0;
      const lo = ((footer[i + 7] << 24) | (footer[i + 8] << 16) | (footer[i + 9] << 8) | footer[i + 10]) >>> 0;
      if (fieldId === 3 && hi === 0 && lo > 0 && lo < 1e12) {
        numRows = lo;
      }
    }
    if (footer[i] === 0x05) {
      const fieldId = (footer[i + 1] << 8) | footer[i + 2];
      const val = ((footer[i + 3] << 24) | (footer[i + 4] << 16) | (footer[i + 5] << 8) | footer[i + 6]) >>> 0;
      if (fieldId === 1 && val >= 1 && val <= 3) version = val;  // Parquet format version 1-3
    }
  }

  // Row groups: count by looking for row group markers in footer
  const rowGroupMarker = footer.indexOf(0x0c); // list start in Thrift
  if (rowGroupMarker >= 0) {
    // Rough count of struct lists
  }

  // Deduplicate and filter strings — column names tend to be repeated less than type info
  const seen = new Set();
  const colNames = strings.filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    // Filter out Thrift enum values that look like type names
    if (/^(BOOLEAN|INT32|INT64|FLOAT|DOUBLE|BYTE_ARRAY|UTF8|SNAPPY|GZIP|ZSTD|UNCOMPRESSED|REQUIRED|OPTIONAL|REPEATED|ROW_GROUP|COLUMN_CHUNK|DATA_PAGE|DICTIONARY_PAGE|RLE|PLAIN|DELTA)$/.test(s)) return false;
    return s.length >= 1 && s.length <= 128;
  });

  return { footerLen, strings, colNames, numRows, version };
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) {
    return { bodyHtml: '<p class="viewer-message">Not a valid Parquet file.</p>', hadUnsafe: false };
  }

  if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'PAR1') {
    return { bodyHtml: '<p class="viewer-message">Missing PAR1 magic bytes.</p>', hadUnsafe: false };
  }

  const parsed = parseParquetFooter(b);

  const metaRows = [
    ['Magic', 'PAR1'],
    ['File size', `${b.length.toLocaleString()} bytes`],
    parsed?.version != null ? ['Format version', `Parquet v${parsed.version}`] : null,
    parsed?.numRows != null ? ['Row count', parsed.numRows.toLocaleString()] : null,
    parsed?.footerLen != null ? ['Footer size', `${parsed.footerLen} bytes`] : null,
  ].filter(Boolean).map(([k, v]) => `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`).join('');

  let colHtml = '';
  if (parsed?.colNames?.length) {
    const pills = parsed.colNames.slice(0, 40).map((n) => `<span class="parq-col-pill">${esc(n)}</span>`).join(' ');
    const more = parsed.colNames.length > 40 ? ` <span class="viewer-note">+${parsed.colNames.length - 40} more</span>` : '';
    colHtml = `
      <div class="meta-section">
        <h4 class="meta-section-title">Detected Field Names</h4>
        <div class="parq-cols">${pills}${more}</div>
        <p class="viewer-note">Field names extracted heuristically from Thrift-encoded footer — schema types not fully decoded.</p>
      </div>`;
  }

  return {
    bodyHtml: `
      <style>
        .badge-parquet { background: #512da8; color: #fff; }
        .parq-cols { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.4rem; }
        .parq-col-pill { background: var(--bg2,#f0f0f0); color: var(--fg,#333); border-radius: 3px; padding: 0.15rem 0.45rem; font-family: monospace; font-size: 0.82rem; }
      </style>
      <div class="badge-row"><span class="badge badge-parquet">Parquet</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">File Info</h4>
        ${metaRows}
      </div>
      ${colHtml}
      <p class="viewer-note">Row data not loaded — use pandas, PyArrow, or DuckDB to query the full dataset.</p>`,
    hadUnsafe: false,
  };
}
