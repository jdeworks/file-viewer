const MAX_ITEMS = 500;
const MAX_DEPTH = 12;
const MAX_STR_LEN = 200;

let itemCount = 0;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function decode(b, off, depth) {
  if (off >= b.length) throw new Error('Unexpected end');
  if (++itemCount > MAX_ITEMS) throw new Error('Too many items');
  const byte0 = b[off++];

  // positive fixint 0x00-0x7f
  if (byte0 <= 0x7f) return { val: byte0, next: off };
  // negative fixint 0xe0-0xff
  if (byte0 >= 0xe0) return { val: byte0 - 256, next: off };
  // fixmap 0x80-0x8f
  if (byte0 >= 0x80 && byte0 <= 0x8f) return decodeMap(b, off, byte0 & 0x0f, depth);
  // fixarray 0x90-0x9f
  if (byte0 >= 0x90 && byte0 <= 0x9f) return decodeArray(b, off, byte0 & 0x0f, depth);
  // fixstr 0xa0-0xbf
  if (byte0 >= 0xa0 && byte0 <= 0xbf) return decodeStr(b, off, byte0 & 0x1f);

  switch (byte0) {
    case 0xc0: return { val: null, next: off };
    case 0xc2: return { val: false, next: off };
    case 0xc3: return { val: true, next: off };
    case 0xc4: { const n = b[off++]; return { val: `<bin ${n}B>`, next: off + n }; }
    case 0xc5: { const n = r16(b, off); off += 2; return { val: `<bin ${n}B>`, next: off + n }; }
    case 0xc6: { const n = r32(b, off); off += 4; return { val: `<bin ${n}B>`, next: off + n }; }
    case 0xc7: { const n = b[off++]; const t = b[off++]; return { val: `<ext type=${t} ${n}B>`, next: off + n }; }
    case 0xc8: { const n = r16(b, off); off += 2; const t = b[off++]; return { val: `<ext type=${t} ${n}B>`, next: off + n }; }
    case 0xc9: { const n = r32(b, off); off += 4; const t = b[off++]; return { val: `<ext type=${t} ${n}B>`, next: off + n }; }
    case 0xca: { const v = readFloat32(b, off); return { val: v, next: off + 4 }; }
    case 0xcb: { const v = readFloat64(b, off); return { val: v, next: off + 8 }; }
    case 0xcc: return { val: b[off], next: off + 1 };
    case 0xcd: return { val: r16(b, off), next: off + 2 };
    case 0xce: return { val: r32(b, off), next: off + 4 };
    case 0xcf: return { val: r64(b, off), next: off + 8 };
    case 0xd0: return { val: b[off] > 127 ? b[off] - 256 : b[off], next: off + 1 };
    case 0xd1: { const v = r16(b, off); return { val: v > 32767 ? v - 65536 : v, next: off + 2 }; }
    case 0xd2: { const v = r32(b, off); return { val: v > 0x7fffffff ? v - 0x100000000 : v, next: off + 4 }; }
    case 0xd3: return { val: r64(b, off), next: off + 8 };
    case 0xd4: { const t = b[off++]; return { val: `<fixext1 type=${t}>`, next: off + 1 }; }
    case 0xd5: { const t = b[off++]; return { val: `<fixext2 type=${t}>`, next: off + 2 }; }
    case 0xd6: { const t = b[off++]; return { val: `<fixext4 type=${t}>`, next: off + 4 }; }
    case 0xd7: { const t = b[off++]; return { val: `<fixext8 type=${t}>`, next: off + 8 }; }
    case 0xd8: { const t = b[off++]; return { val: `<fixext16 type=${t}>`, next: off + 16 }; }
    case 0xd9: return decodeStr(b, off + 1, b[off]);
    case 0xda: { const n = r16(b, off); return decodeStr(b, off + 2, n); }
    case 0xdb: { const n = r32(b, off); return decodeStr(b, off + 4, n); }
    case 0xdc: { const n = r16(b, off); return decodeArray(b, off + 2, n, depth); }
    case 0xdd: { const n = r32(b, off); return decodeArray(b, off + 4, n, depth); }
    case 0xde: { const n = r16(b, off); return decodeMap(b, off + 2, n, depth); }
    case 0xdf: { const n = r32(b, off); return decodeMap(b, off + 4, n, depth); }
    default: throw new Error(`Unknown byte 0x${byte0.toString(16)}`);
  }
}

function r16(b, off) { return (b[off] << 8) | b[off + 1]; }
function r32(b, off) { return ((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0; }
function r64(b, off) {
  const hi = r32(b, off), lo = r32(b, off + 4);
  return hi * 0x100000000 + lo;
}

function readFloat32(b, off) {
  const buf = new ArrayBuffer(4);
  new Uint8Array(buf).set(b.slice(off, off + 4));
  return new DataView(buf).getFloat32(0, false);
}

function readFloat64(b, off) {
  const buf = new ArrayBuffer(8);
  new Uint8Array(buf).set(b.slice(off, off + 8));
  return new DataView(buf).getFloat64(0, false);
}

function decodeStr(b, off, len) {
  const slice = b.slice(off, off + len);
  const s = new TextDecoder('utf-8', { fatal: false }).decode(slice);
  return { val: s.length > MAX_STR_LEN ? s.slice(0, MAX_STR_LEN) + '…' : s, next: off + len };
}

function decodeArray(b, off, count, depth) {
  if (depth >= MAX_DEPTH) return { val: '[…]', next: off };
  const items = [];
  for (let i = 0; i < count; i++) {
    const r = decode(b, off, depth + 1);
    items.push(r.val);
    off = r.next;
  }
  return { val: items, next: off };
}

function decodeMap(b, off, count, depth) {
  if (depth >= MAX_DEPTH) return { val: '{…}', next: off };
  const map = {};
  for (let i = 0; i < count; i++) {
    const k = decode(b, off, depth + 1); off = k.next;
    const v = decode(b, off, depth + 1); off = v.next;
    map[String(k.val)] = v.val;
  }
  return { val: map, next: off };
}

function renderValue(v, depth) {
  if (v === null) return '<span class="msgp-null">nil</span>';
  if (v === true) return '<span class="msgp-bool">true</span>';
  if (v === false) return '<span class="msgp-bool">false</span>';
  if (typeof v === 'number') return `<span class="msgp-num">${esc(String(v))}</span>`;
  if (typeof v === 'string') {
    if (v.startsWith('<') && v.endsWith('>')) return `<span class="msgp-special">${esc(v)}</span>`;
    return `<span class="msgp-str">${esc(JSON.stringify(v))}</span>`;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    const items = v.map((item) => `<li>${renderValue(item, depth + 1)}</li>`).join('');
    return `<ul class="msgp-arr">${items}</ul>`;
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 0) return '{}';
    const rows = keys.map((k) =>
      `<div class="msgp-row"><span class="msgp-key">${esc(JSON.stringify(k))}</span><span class="msgp-colon">:</span>${renderValue(v[k], depth + 1)}</div>`
    ).join('');
    return `<div class="msgp-obj">${rows}</div>`;
  }
  return esc(String(v));
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length === 0) {
    return { bodyHtml: '<p class="viewer-message">Empty file.</p>', hadUnsafe: false };
  }

  itemCount = 0;
  let decoded, truncated = false;
  try {
    decoded = decode(b, 0, 0);
  } catch (e) {
    if (e.message === 'Too many items') {
      truncated = true;
    } else {
      return {
        bodyHtml: `<p class="viewer-message">Failed to decode MessagePack: ${esc(e.message)}</p>`,
        hadUnsafe: false,
      };
    }
  }

  const val = decoded ? decoded.val : null;
  const remaining = decoded && decoded.next < b.length ? b.length - decoded.next : 0;

  const typeLabel = Array.isArray(val)
    ? `Array (${val.length} items)`
    : val !== null && typeof val === 'object'
    ? `Map (${Object.keys(val).length} keys)`
    : typeof val === 'string'
    ? 'String'
    : typeof val === 'number'
    ? 'Number'
    : typeof val === 'boolean'
    ? 'Boolean'
    : val === null
    ? 'Nil'
    : 'Value';

  const truncatedNotice = truncated
    ? `<div class="msgp-notice">Output truncated at ${MAX_ITEMS} items</div>`
    : '';
  const remainingNotice = remaining > 0
    ? `<div class="msgp-notice">${remaining} bytes remaining after first value (multi-value stream)</div>`
    : '';

  return {
    bodyHtml: `
      <style>
        .badge-msgpack { background: #00796b; color: #fff; }
        .msgp-obj { margin-left: 1.2em; border-left: 2px solid #e0e0e0; padding-left: 0.6em; }
        .msgp-arr { margin: 0 0 0 1.2em; padding: 0; list-style: none; border-left: 2px solid #e8e8e8; padding-left: 0.6em; }
        .msgp-row { padding: 1px 0; }
        .msgp-key { color: #1565c0; font-weight: 600; margin-right: 0; }
        .msgp-colon { margin: 0 0.3em; color: #777; }
        .msgp-str { color: #2e7d32; }
        .msgp-num { color: #e65100; }
        .msgp-bool { color: #6a1a9a; font-weight: 600; }
        .msgp-null { color: #999; font-style: italic; }
        .msgp-special { color: #78909c; font-style: italic; }
        .msgp-notice { background: #fff8e1; border-left: 3px solid #f9a825; padding: 6px 10px; margin: 8px 0; font-size: 0.82rem; border-radius: 2px; }
        .msgp-root { font-family: monospace; font-size: 0.88rem; line-height: 1.7; }
        .msgp-type-label { font-size: 0.8rem; color: #555; margin: 4px 0 8px; }
      </style>
      <div class="badge-row"><span class="badge badge-msgpack">MessagePack</span></div>
      <div class="msgp-type-label">Root type: ${esc(typeLabel)} &nbsp;·&nbsp; ${b.length.toLocaleString()} bytes</div>
      ${truncatedNotice}${remainingNotice}
      <div class="msgp-root">${decoded ? renderValue(val, 0) : ''}</div>`,
    hadUnsafe: false,
  };
}
