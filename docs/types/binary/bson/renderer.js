// BSON type codes: https://bsonspec.org/spec.html
const BSON_TYPES = {
  0x01: 'Double',
  0x02: 'String',
  0x03: 'Document',
  0x04: 'Array',
  0x05: 'Binary',
  0x06: 'Undefined (deprecated)',
  0x07: 'ObjectId',
  0x08: 'Boolean',
  0x09: 'DateTime',
  0x0a: 'Null',
  0x0b: 'Regex',
  0x0c: 'DBPointer (deprecated)',
  0x0d: 'JavaScript',
  0x0e: 'Symbol (deprecated)',
  0x0f: 'JavaScript w/ scope',
  0x10: 'Int32',
  0x11: 'Timestamp',
  0x12: 'Int64',
  0x13: 'Decimal128',
  0xff: 'Min key',
  0x7f: 'Max key',
};

const MAX_DEPTH = 10;
const MAX_ITEMS = 200;
let itemCount = 0;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function r32le(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) | 0;
}

function r64le(b, off) {
  const lo = (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
  const hi = (b[off + 4] | (b[off + 5] << 8) | (b[off + 6] << 16) | (b[off + 7] << 24)) | 0;
  return hi * 0x100000000 + lo;
}

function readCStr(b, off) {
  let end = off;
  while (end < b.length && b[end] !== 0) end++;
  return { val: new TextDecoder('utf-8', { fatal: false }).decode(b.slice(off, end)), next: end + 1 };
}

function readStr(b, off) {
  const len = r32le(b, off); off += 4;
  const val = new TextDecoder('utf-8', { fatal: false }).decode(b.slice(off, off + len - 1));
  return { val, next: off + len };
}

function readDoc(b, off, depth) {
  if (depth >= MAX_DEPTH) return { val: '{…}', next: off + r32le(b, off) };
  const docEnd = off + r32le(b, off);
  off += 4;
  const fields = [];
  while (off < docEnd - 1) {
    if (++itemCount > MAX_ITEMS) { fields.push({ key: '…', val: `(truncated)`, type: 0 }); break; }
    const typeCode = b[off++];
    const { val: key, next: afterKey } = readCStr(b, off); off = afterKey;
    let val = null, next = off;
    try {
      switch (typeCode) {
        case 0x01: val = new DataView(b.buffer, b.byteOffset + off, 8).getFloat64(0, true); next = off + 8; break;
        case 0x02: { const r = readStr(b, off); val = r.val; next = r.next; break; }
        case 0x03: { const r = readDoc(b, off, depth + 1); val = r.val; next = r.next; break; }
        case 0x04: { const r = readDoc(b, off, depth + 1); val = r.val; next = r.next; break; }
        case 0x05: { const blen = r32le(b, off); val = `<binary ${blen}B sub=${b[off + 4]}>`; next = off + 5 + blen; break; }
        case 0x07: val = Array.from(b.slice(off, off + 12)).map((x) => x.toString(16).padStart(2, '0')).join(''); next = off + 12; break;
        case 0x08: val = b[off] !== 0; next = off + 1; break;
        case 0x09: val = `DateTime(${r64le(b, off)})`; next = off + 8; break;
        case 0x0a: val = null; next = off; break;
        case 0x0b: { const r1 = readCStr(b, off); const r2 = readCStr(b, r1.next); val = `/${r1.val}/${r2.val}`; next = r2.next; break; }
        case 0x10: val = r32le(b, off); next = off + 4; break;
        case 0x11: val = `Timestamp(${r64le(b, off)})`; next = off + 8; break;
        case 0x12: val = r64le(b, off); next = off + 8; break;
        case 0x13: val = '<Decimal128>'; next = off + 16; break;
        default: val = `<type 0x${typeCode.toString(16)}>`; next = docEnd - 1; break;
      }
    } catch (_) { val = `<parse error>`; next = docEnd - 1; }
    fields.push({ key, val, type: typeCode });
    off = next;
  }
  return { val: fields, next: docEnd };
}

function renderFieldVal(val, type) {
  if (val === null) return '<span class="bson-null">null</span>';
  if (typeof val === 'boolean') return `<span class="bson-bool">${val}</span>`;
  if (typeof val === 'number') return `<span class="bson-num">${esc(String(val))}</span>`;
  if (typeof val === 'string') {
    if (val.startsWith('<') && val.endsWith('>')) return `<span class="bson-special">${esc(val)}</span>`;
    if (type === 0x07) return `<span class="bson-oid">ObjectId("${esc(val)}")</span>`;
    return `<span class="bson-str">${esc(JSON.stringify(val))}</span>`;
  }
  if (Array.isArray(val)) {
    if (!val.length) return '{}';
    const rows = val.map((f) =>
      `<div class="bson-row"><span class="bson-key">${esc(JSON.stringify(f.key))}</span><span class="bson-colon">:</span>${renderFieldVal(f.val, f.type)}<span class="bson-type-hint"> (${esc(BSON_TYPES[f.type] || `0x${f.type.toString(16)}`)})</span></div>`
    ).join('');
    return `<div class="bson-doc">${rows}</div>`;
  }
  return esc(String(val));
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 5) {
    return { bodyHtml: '<p class="viewer-message">Not a valid BSON document.</p>', hadUnsafe: false };
  }

  const docLen = b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24);
  if (docLen < 5 || docLen > b.length || b[docLen - 1] !== 0x00) {
    return { bodyHtml: '<p class="viewer-message">Invalid BSON: document length or terminator mismatch.</p>', hadUnsafe: false };
  }

  itemCount = 0;
  let parsed;
  try {
    parsed = readDoc(b, 0, 0);
  } catch (e) {
    return { bodyHtml: `<p class="viewer-message">BSON parse error: ${esc(e.message)}</p>`, hadUnsafe: false };
  }

  const fields = parsed.val;
  const truncated = itemCount > MAX_ITEMS;
  const extra = b.length - docLen;

  return {
    bodyHtml: `
      <style>
        .badge-bson { background: #388e3c; color: #fff; }
        .bson-doc { margin-left: 1.2em; border-left: 2px solid #e0e0e0; padding-left: 0.6em; }
        .bson-row { padding: 2px 0; font-family: monospace; font-size: 0.88rem; line-height: 1.6; }
        .bson-key { color: #1565c0; font-weight: 600; }
        .bson-colon { margin: 0 0.3em; color: #777; }
        .bson-str { color: #2e7d32; }
        .bson-num { color: #e65100; }
        .bson-bool { color: #6a1a9a; font-weight: 600; }
        .bson-null { color: #999; font-style: italic; }
        .bson-oid { color: #795548; font-size: 0.85em; }
        .bson-special { color: #78909c; font-style: italic; }
        .bson-type-hint { color: #aaa; font-size: 0.78em; margin-left: 0.3em; }
        .bson-notice { background: #fff8e1; border-left: 3px solid #f9a825; padding: 6px 10px; margin: 8px 0; font-size: 0.82rem; border-radius: 2px; }
      </style>
      <div class="badge-row"><span class="badge badge-bson">BSON</span></div>
      <div class="meta-section">
        <div class="meta-row"><span class="meta-key">Format</span><span class="meta-val">BSON (Binary JSON)</span></div>
        <div class="meta-row"><span class="meta-key">Document size</span><span class="meta-val">${docLen.toLocaleString()} bytes</span></div>
        <div class="meta-row"><span class="meta-key">Fields</span><span class="meta-val">${Array.isArray(fields) ? fields.length : 0}</span></div>
        ${extra > 0 ? `<div class="meta-row"><span class="meta-key">Extra bytes</span><span class="meta-val">${extra} (multi-document stream)</span></div>` : ''}
      </div>
      ${truncated ? '<div class="bson-notice">Output truncated at ' + MAX_ITEMS + ' items</div>' : ''}
      <div class="meta-section">
        <h4 class="meta-section-title">Document</h4>
        ${renderFieldVal(fields, 0x03)}
      </div>`,
    hadUnsafe: false,
  };
}
