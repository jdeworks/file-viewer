// Bounded DER inspection for Windows CNG/DPAPI-NG protected-secret blobs. This intentionally
// recognizes metadata only; it never exposes key material/ciphertext or attempts decryption.

const EXPECTED = new Set([
  '1.2.840.113549.1.7.3',       // CMS envelopedData
  '1.3.6.1.4.1.311.74.1',      // Microsoft protection descriptor attribute
  '1.3.6.1.4.1.311.74.1.8',    // descriptor value
  '2.16.840.1.101.3.4.1.45',   // AES-256 key wrap
  '2.16.840.1.101.3.4.1.46',   // AES-256 GCM
]);

function readLength(bytes, off, limit) {
  if (off >= limit) throw new Error('Truncated DER length');
  const first = bytes[off++];
  if (first < 0x80) return { length: first, next: off };
  const count = first & 0x7f;
  if (count === 0 || count > 4 || off + count > limit) throw new Error('Unsupported DER length');
  let length = 0;
  for (let i = 0; i < count; i++) length = length * 256 + bytes[off + i];
  if (!Number.isSafeInteger(length)) throw new Error('DER length overflow');
  return { length, next: off + count };
}

function readNode(bytes, off, limit) {
  if (off >= limit) throw new Error('Truncated DER node');
  const tag = bytes[off++];
  const parsed = readLength(bytes, off, limit);
  const start = parsed.next;
  const end = start + parsed.length;
  if (end > limit) throw new Error('DER node exceeds its container');
  return { tag, start, end, next: end, constructed: (tag & 0x20) !== 0 };
}

function decodeOid(bytes) {
  if (!bytes.length) return '';
  const parts = [Math.min(2, Math.floor(bytes[0] / 40)), 0];
  parts[1] = bytes[0] - parts[0] * 40;
  let value = 0;
  for (let i = 1; i < bytes.length; i++) {
    value = value * 128 + (bytes[i] & 0x7f);
    if (!Number.isSafeInteger(value)) return '';
    if ((bytes[i] & 0x80) === 0) { parts.push(value); value = 0; }
  }
  if (value !== 0) return '';
  return parts.join('.');
}

export function inspectProtectedData(bytes) {
  if (!bytes || bytes.length < 32 || bytes[0] !== 0x30) return null;
  try {
    const root = readNode(bytes, 0, bytes.length);
    if (root.tag !== 0x30) return null;
    const oids = new Set();
    const strings = [];
    let nodes = 0;

    function visit(start, end, depth) {
      if (depth > 16) throw new Error('DER nesting limit exceeded');
      let off = start;
      while (off < end) {
        if (++nodes > 2048) throw new Error('DER node limit exceeded');
        const node = readNode(bytes, off, end);
        if (node.tag === 0x06) {
          const oid = decodeOid(bytes.subarray(node.start, node.end));
          if (oid) oids.add(oid);
        } else if (node.tag === 0x0c && node.end - node.start <= 64) {
          const value = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(node.start, node.end));
          if (/^[\x20-\x7e]+$/.test(value)) strings.push(value);
        }
        if (node.constructed) visit(node.start, node.end, depth + 1);
        off = node.next;
      }
    }

    visit(root.start, root.end, 0);
    if (![...EXPECTED].every((oid) => oids.has(oid))) return null;
    const localIndex = strings.indexOf('LOCAL');
    const scopeValue = localIndex >= 0 ? strings[localIndex + 1] : null;
    if (!['user', 'machine'].includes(scopeValue)) return null;
    return {
      format: 'Windows protected secret (CNG/DPAPI-NG)',
      confidence: 'probable',
      protectionScope: `LOCAL=${scopeValue}`,
      keyEncryption: 'AES-256 key wrap',
      contentEncryption: 'AES-256-GCM',
      envelopeSize: root.end,
      appendedPayloadSize: Math.max(0, bytes.length - root.end),
      totalSize: bytes.length,
    };
  } catch {
    return null;
  }
}
