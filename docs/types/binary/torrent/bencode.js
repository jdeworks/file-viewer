const td = new TextDecoder();
// Preserve a leading UTF-8 BOM as U+FEFF so decoding and re-encoding a byte string is lossless.
const tdStrict = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const dictionaryEntries = new WeakMap();

const MAX_DEPTH = 64;
const MAX_ITEMS = 100000;

function compareBytes(a, b) {
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index++) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

function isDigit(value) {
  return value >= 0x30 && value <= 0x39;
}

export function isBencodeDictionary(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && !(value instanceof Uint8Array);
}

// Ordinary UTF-8 dictionary keys remain available as null-prototype object properties. Bencode
// also permits arbitrary byte-string keys (notably BEP 52 piece-layer roots), so retain every raw
// key separately without coercing attacker-controlled bytes into JavaScript property names.
export function bencodeDictionaryEntries(value) {
  return dictionaryEntries.get(value) || null;
}

// Strict, bounded decoder for untrusted metainfo. Besides avoiding unbounded scans on truncated
// input, strict dictionary ordering removes ambiguous encodings and lets the renderer hash the
// exact top-level info value instead of searching for a lookalike "4:info" byte sequence.
export function decodeBencode(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Bencode input must be bytes');
  let remainingItems = MAX_ITEMS;
  let infoRange = null;

  function consumeItem() {
    remainingItems--;
    if (remainingItems < 0) throw new Error(`Bencode exceeds ${MAX_ITEMS} items`);
  }

  function parseString(off, key = false) {
    consumeItem();
    if (off >= bytes.length || !isDigit(bytes[off])) throw new Error(`Expected byte string at offset ${off}`);
    let pos = off;
    let length = 0;
    while (pos < bytes.length && isDigit(bytes[pos])) {
      length = length * 10 + bytes[pos] - 0x30;
      if (!Number.isSafeInteger(length)) throw new Error('Byte string length exceeds safe integer range');
      pos++;
    }
    if (pos >= bytes.length || bytes[pos] !== 0x3a) throw new Error(`Unterminated byte string length at offset ${off}`);
    if (pos - off > 1 && bytes[off] === 0x30) throw new Error('Byte string length has a leading zero');
    const start = pos + 1;
    const end = start + length;
    if (!Number.isSafeInteger(end) || end > bytes.length) throw new Error('Byte string exceeds input bounds');
    const data = bytes.slice(start, end);
    if (key) {
      try { return { text: tdStrict.decode(data), raw: data, end }; }
      catch { return { text: null, raw: data, end }; }
    }
    try { return { value: tdStrict.decode(data), raw: data, end }; }
    catch { return { value: data, raw: data, end }; }
  }

  function parseValue(off, depth) {
    if (depth > MAX_DEPTH) throw new Error(`Bencode nesting exceeds ${MAX_DEPTH}`);
    if (off >= bytes.length) throw new Error('Unexpected end of bencode input');
    consumeItem();
    const marker = bytes[off];

    if (marker === 0x69) { // i
      let end = off + 1;
      while (end < bytes.length && bytes[end] !== 0x65) end++;
      if (end >= bytes.length) throw new Error(`Unterminated integer at offset ${off}`);
      const raw = td.decode(bytes.slice(off + 1, end));
      if (!/^(0|-?[1-9]\d*)$/.test(raw) || raw === '-0') throw new Error(`Invalid bencode integer ${raw || '(empty)'}`);
      if (raw.length > 20) throw new Error('Bencode integer exceeds safe integer range');
      const value = Number(raw);
      if (!Number.isSafeInteger(value)) throw new Error('Bencode integer exceeds safe integer range');
      return { value, end: end + 1 };
    }

    if (marker === 0x6c) { // l
      const value = [];
      let pos = off + 1;
      while (true) {
        if (pos >= bytes.length) throw new Error(`Unterminated list at offset ${off}`);
        if (bytes[pos] === 0x65) return { value, end: pos + 1 };
        const child = parseValue(pos, depth + 1);
        if (child.end <= pos) throw new Error('Bencode parser made no progress');
        value.push(child.value);
        pos = child.end;
      }
    }

    if (marker === 0x64) { // d
      const value = Object.create(null);
      const entries = [];
      let pos = off + 1;
      let previousKey = null;
      while (true) {
        if (pos >= bytes.length) throw new Error(`Unterminated dictionary at offset ${off}`);
        if (bytes[pos] === 0x65) {
          dictionaryEntries.set(value, Object.freeze(entries));
          return { value, end: pos + 1 };
        }
        const key = parseString(pos, true);
        if (previousKey && compareBytes(previousKey, key.raw) >= 0) {
          throw new Error('Dictionary keys are duplicated or not in canonical byte order');
        }
        previousKey = key.raw;
        pos = key.end;
        const valueStart = pos;
        const child = parseValue(pos, depth + 1);
        if (child.end <= pos) throw new Error('Bencode parser made no progress');
        const entry = Object.freeze({ key: key.raw, text: key.text, value: child.value });
        entries.push(entry);
        if (key.text !== null) value[key.text] = child.value;
        if (depth === 0 && key.text === 'info') infoRange = { start: valueStart, end: child.end };
        pos = child.end;
      }
    }

    if (isDigit(marker)) {
      // parseString accounts for the item itself, so undo parseValue's budget debit.
      remainingItems++;
      const parsed = parseString(off, false);
      return { value: parsed.value, end: parsed.end };
    }
    throw new Error(`Invalid bencode marker 0x${marker.toString(16)} at offset ${off}`);
  }

  const parsed = parseValue(0, 0);
  if (parsed.end !== bytes.length) throw new Error(`Trailing bytes after offset ${parsed.end}`);
  return { value: parsed.value, infoRange };
}
