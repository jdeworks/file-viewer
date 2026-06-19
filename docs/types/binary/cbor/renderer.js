// CBOR decoder — RFC 7049 / RFC 8949
// Major types: 0=uint, 1=negint, 2=bytes, 3=text, 4=array, 5=map, 6=tag, 7=float/simple
const MAX_DEPTH = 12;
const MAX_ITEMS = 500;

let itemCount = 0;

function readVarLen(b, off, info) {
  if (info <= 23) return { len: info, next: off };
  if (info === 24) return { len: b[off], next: off + 1 };
  if (info === 25) return { len: (b[off] << 8) | b[off + 1], next: off + 2 };
  if (info === 26) return { len: ((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0, next: off + 4 };
  if (info === 27) {
    // 64-bit — read as two 32-bit halves (safe for lengths up to 2^32)
    const hi = ((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0;
    const lo = ((b[off + 4] << 24) | (b[off + 5] << 16) | (b[off + 6] << 8) | b[off + 7]) >>> 0;
    return { len: hi * 0x100000000 + lo, next: off + 8 };
  }
  return { len: -1, next: off }; // indefinite (31) or reserved
}

function decodeF16(b, off) {
  const h = (b[off] << 8) | b[off + 1];
  const exp = (h >> 10) & 0x1f;
  const mant = h & 0x3ff;
  const sign = h >> 15 ? -1 : 1;
  if (exp === 0) return sign * Math.pow(2, -14) * (mant / 1024);
  if (exp === 31) return mant ? NaN : sign * Infinity;
  return sign * Math.pow(2, exp - 15) * (1 + mant / 1024);
}

function decode(b, off, depth) {
  if (off >= b.length) throw new Error('Unexpected end');
  if (++itemCount > MAX_ITEMS) throw new Error('Too many items');
  const byte0 = b[off++];
  const major = byte0 >> 5;
  const info = byte0 & 0x1f;

  if (major === 0) { // unsigned int
    const { len, next } = readVarLen(b, off, info);
    return { val: len, next, type: 'uint' };
  }
  if (major === 1) { // negative int
    const { len, next } = readVarLen(b, off, info);
    return { val: -1 - len, next, type: 'negint' };
  }
  if (major === 2) { // byte string
    if (info === 31) {
      let parts = [], cur = off;
      while (b[cur] !== 0xff) { const { val, next: n } = decode(b, cur, depth); parts.push(...val); cur = n; }
      return { val: new Uint8Array(parts), next: cur + 1, type: 'bytes' };
    }
    const { len, next } = readVarLen(b, off, info);
    return { val: b.slice(next, next + len), next: next + len, type: 'bytes' };
  }
  if (major === 3) { // text string
    if (info === 31) {
      let parts = [], cur = off;
      while (b[cur] !== 0xff) { const { val, next: n } = decode(b, cur, depth); parts.push(val); cur = n; }
      return { val: parts.join(''), next: cur + 1, type: 'text' };
    }
    const { len, next } = readVarLen(b, off, info);
    return { val: new TextDecoder().decode(b.slice(next, next + len)), next: next + len, type: 'text' };
  }
  if (major === 4) { // array
    if (depth >= MAX_DEPTH) return { val: ['…'], next: off, type: 'array' };
    if (info === 31) {
      const items = []; let cur = off;
      while (b[cur] !== 0xff) { const r = decode(b, cur, depth + 1); items.push(r.val); cur = r.next; }
      return { val: items, next: cur + 1, type: 'array' };
    }
    const { len, next } = readVarLen(b, off, info);
    const items = []; let cur = next;
    for (let i = 0; i < len; i++) { const r = decode(b, cur, depth + 1); items.push(r.val); cur = r.next; }
    return { val: items, next: cur, type: 'array' };
  }
  if (major === 5) { // map
    if (depth >= MAX_DEPTH) return { val: {}, next: off, type: 'map' };
    if (info === 31) {
      const map = {}; let cur = off;
      while (b[cur] !== 0xff) {
        const k = decode(b, cur, depth + 1); cur = k.next;
        const v = decode(b, cur, depth + 1); cur = v.next;
        map[String(k.val)] = v.val;
      }
      return { val: map, next: cur + 1, type: 'map' };
    }
    const { len, next } = readVarLen(b, off, info);
    const map = {}; let cur = next;
    for (let i = 0; i < len; i++) {
      const k = decode(b, cur, depth + 1); cur = k.next;
      const v = decode(b, cur, depth + 1); cur = v.next;
      map[String(k.val)] = v.val;
    }
    return { val: map, next: cur, type: 'map' };
  }
  if (major === 6) { // tagged
    const { len: tag, next } = readVarLen(b, off, info);
    const inner = decode(b, next, depth);
    return { val: inner.val, next: inner.next, type: 'tagged', tag };
  }
  if (major === 7) {
    if (info === 20) return { val: false, next: off, type: 'bool' };
    if (info === 21) return { val: true, next: off, type: 'bool' };
    if (info === 22) return { val: null, next: off, type: 'null' };
    if (info === 23) return { val: undefined, next: off, type: 'undefined' };
    if (info === 25) { const v = decodeF16(b, off); return { val: v, next: off + 2, type: 'float' }; }
    if (info === 26) {
      const dv = new DataView(b.buffer, b.byteOffset + off, 4);
      return { val: dv.getFloat32(0, false), next: off + 4, type: 'float' };
    }
    if (info === 27) {
      const dv = new DataView(b.buffer, b.byteOffset + off, 8);
      return { val: dv.getFloat64(0, false), next: off + 8, type: 'float' };
    }
    if (info === 31) return { val: undefined, next: off, type: 'break' };
    return { val: `simple(${info})`, next: info <= 23 ? off : off + 1, type: 'simple' };
  }
  throw new Error(`Unknown major type: ${major}`);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function typeTag(val) {
  if (val === null) return '<span class="cbor-null">null</span>';
  if (val === undefined) return '<span class="cbor-null">undefined</span>';
  if (typeof val === 'boolean') return `<span class="cbor-bool">${val}</span>`;
  if (typeof val === 'number') return `<span class="cbor-num">${esc(String(val))}</span>`;
  if (typeof val === 'string') return `<span class="cbor-str">"${esc(val.slice(0, 80))}${val.length > 80 ? '…' : ''}"</span>`;
  if (val instanceof Uint8Array) return `<span class="cbor-bytes">bytes(${val.length})</span>`;
  if (Array.isArray(val)) return `<span class="cbor-type">array[${val.length}]</span>`;
  if (typeof val === 'object') return `<span class="cbor-type">map{${Object.keys(val).length}}</span>`;
  return `<span class="cbor-type">${esc(String(val))}</span>`;
}

function renderValue(val, depth) {
  if (depth > 4) return typeTag(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return '<span class="cbor-type">[]</span>';
    const items = val.slice(0, 20).map((v) => `<li>${renderValue(v, depth + 1)}</li>`).join('');
    const more = val.length > 20 ? `<li class="cbor-more">…${val.length - 20} more</li>` : '';
    return `<ul class="cbor-list">${items}${more}</ul>`;
  }
  if (val !== null && typeof val === 'object' && !(val instanceof Uint8Array)) {
    const keys = Object.keys(val);
    if (keys.length === 0) return '<span class="cbor-type">{}</span>';
    const rows = keys.slice(0, 20).map((k) =>
      `<li><span class="cbor-key">${esc(k)}</span>: ${renderValue(val[k], depth + 1)}</li>`
    ).join('');
    const more = keys.length > 20 ? `<li class="cbor-more">…${keys.length - 20} more keys</li>` : '';
    return `<ul class="cbor-list">${rows}${more}</ul>`;
  }
  return typeTag(val);
}

function detectShape(val) {
  if (Array.isArray(val)) return `Array[${val.length}]`;
  if (val !== null && typeof val === 'object' && !(val instanceof Uint8Array)) {
    const keys = Object.keys(val);
    return `Map{${keys.length} key${keys.length === 1 ? '' : 's'}}`;
  }
  if (val instanceof Uint8Array) return `Bytes(${val.length})`;
  if (typeof val === 'string') return `Text`;
  if (typeof val === 'number') return `Number`;
  if (typeof val === 'boolean') return `Boolean`;
  if (val === null) return 'null';
  return typeof val;
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length === 0) {
    return { bodyHtml: '<p class="viewer-message">Empty CBOR file.</p>', hadUnsafe: false };
  }

  itemCount = 0;
  let decoded;
  let error = null;
  try {
    decoded = decode(b, 0, 0);
  } catch (e) {
    error = e.message;
  }

  const shape = decoded ? detectShape(decoded.val) : 'Unknown';
  const consumed = decoded ? decoded.next : 0;
  const remaining = b.length - consumed;

  const statRows = [
    ['Size', `${b.length} bytes`],
    ['Top-level type', shape],
    consumed ? ['Decoded bytes', `${consumed} / ${b.length}`] : null,
    remaining > 0 && !error ? ['Trailing bytes', `${remaining} (ignored)`] : null,
  ].filter(Boolean).map(([k, v]) => `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`).join('');

  const treeHtml = error
    ? `<div class="cbor-error">Parse error: ${esc(error)}</div>`
    : `<div class="cbor-tree">${renderValue(decoded.val, 0)}</div>`;

  return {
    bodyHtml: `
      <style>
        .badge-cbor { background: #9c27b0; color: #fff; }
        .cbor-tree { font-family: monospace; font-size: 0.82rem; line-height: 1.6; overflow: auto; }
        .cbor-list { list-style: none; margin: 0 0 0 1.2rem; padding: 0; }
        .cbor-key { color: var(--accent, #1976d2); font-weight: 600; }
        .cbor-str { color: #2e7d32; }
        .cbor-num { color: #e65100; }
        .cbor-bool { color: #6a1b9a; }
        .cbor-null { color: #888; font-style: italic; }
        .cbor-bytes { color: #455a64; font-style: italic; }
        .cbor-type { color: #607d8b; }
        .cbor-more { color: #999; font-style: italic; }
        .cbor-error { color: #c62828; background: #ffebee; padding: 0.75rem; border-radius: 4px; margin: 0.5rem 0; }
      </style>
      <div class="badge-row"><span class="badge badge-cbor">CBOR</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">Overview</h4>
        ${statRows}
      </div>
      <div class="meta-section">
        <h4 class="meta-section-title">Data</h4>
        ${treeHtml}
      </div>`,
    hadUnsafe: false,
  };
}
