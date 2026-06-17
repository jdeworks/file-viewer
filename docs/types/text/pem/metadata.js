// metadata.js — extract structured metadata for PEM/DER files

// ── ASN.1 DER helpers (duplicated from renderer to keep modules independent) ──
const TAG = {
  BOOL: 0x01, INT: 0x02, BIT: 0x03, OCT: 0x04, NULL: 0x05,
  OID: 0x06, UTF8: 0x0C, SEQ: 0x30, SET: 0x31,
  PRINT: 0x13, IA5: 0x16, UTC: 0x17, GEN: 0x18,
  CTX0: 0xA0, CTX3: 0xA3,
};

function readLength(bytes, offset) {
  const first = bytes[offset++];
  if (first < 0x80) return { len: first, next: offset };
  const numBytes = first & 0x7F;
  let len = 0;
  for (let i = 0; i < numBytes; i++) len = (len << 8) | bytes[offset++];
  return { len, next: offset };
}

function readTLV(bytes, offset) {
  const tag = bytes[offset++];
  const { len, next } = readLength(bytes, offset);
  return { tag, len, start: next, end: next + len, raw: bytes.slice(next, next + len) };
}

function readSeqChildren(bytes, start, end) {
  const children = [];
  let pos = start;
  while (pos < end) {
    const tlv = readTLV(bytes, pos);
    children.push(tlv);
    pos = tlv.end;
  }
  return children;
}

const OID_NAMES = {
  '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST',
  '2.5.4.10': 'O', '2.5.4.11': 'OU', '2.5.4.5': 'serialNumber',
  '1.2.840.113549.1.1.1': 'RSA', '1.2.840.113549.1.1.11': 'SHA-256 with RSA',
  '1.2.840.113549.1.1.12': 'SHA-384 with RSA', '1.2.840.113549.1.1.13': 'SHA-512 with RSA',
  '1.2.840.10045.2.1': 'EC', '1.2.840.10045.4.3.2': 'SHA-256 with ECDSA',
  '1.2.840.10045.4.3.3': 'SHA-384 with ECDSA', '1.2.840.10045.4.3.4': 'SHA-512 with ECDSA',
  '1.2.840.10045.3.1.7': 'P-256', '1.2.840.10045.3.1.34': 'P-384',
  '1.2.840.10045.3.1.35': 'P-521', '1.3.101.110': 'X25519', '1.3.101.112': 'Ed25519',
  '2.5.29.17': 'subjectAltName', '2.5.29.19': 'basicConstraints',
  '2.5.29.15': 'keyUsage', '2.5.29.37': 'extKeyUsage',
};

function decodeOid(bytes) {
  if (!bytes || bytes.length === 0) return '';
  let result = '';
  let i = 0;
  const first = bytes[i++];
  result = Math.floor(first / 40) + '.' + (first % 40);
  let val = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    val = (val << 7) | (b & 0x7F);
    if (!(b & 0x80)) { result += '.' + val; val = 0; }
  }
  return result;
}

function oidName(bytes) {
  const dotted = decodeOid(bytes);
  return OID_NAMES[dotted] || dotted;
}

function decodeString(tlv) {
  const bytes = tlv.raw;
  if (tlv.tag === TAG.UTF8) return new TextDecoder('utf-8').decode(bytes);
  if (tlv.tag === TAG.IA5 || tlv.tag === TAG.PRINT) return String.fromCharCode(...bytes);
  return null;
}

function parseTime(tlv) {
  const s = String.fromCharCode(...tlv.raw);
  if (tlv.tag === TAG.UTC) {
    let year = parseInt(s.slice(0, 2), 10);
    year = year < 50 ? 2000 + year : 1900 + year;
    return new Date(`${year}-${s.slice(2,4)}-${s.slice(4,6)}T${s.slice(6,8)}:${s.slice(8,10)}:${s.slice(10,12)}Z`);
  }
  if (tlv.tag === TAG.GEN) {
    return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:${s.slice(12,14)}Z`);
  }
  return null;
}

function parseRDN(bytes, start, end) {
  const result = {};
  const rdns = readSeqChildren(bytes, start, end);
  for (const rdn of rdns) {
    if (rdn.tag !== TAG.SET) continue;
    const attrSeqs = readSeqChildren(bytes, rdn.start, rdn.end);
    for (const attrSeq of attrSeqs) {
      if (attrSeq.tag !== TAG.SEQ) continue;
      const [oidTlv, valTlv] = readSeqChildren(bytes, attrSeq.start, attrSeq.end);
      if (!oidTlv || !valTlv) continue;
      const name = oidName(oidTlv.raw);
      const val = decodeString(valTlv) || '?';
      result[name] = val;
    }
  }
  return result;
}

function rdnToString(obj) {
  const ORDER = ['CN', 'O', 'OU', 'C', 'L', 'ST'];
  const parts = [];
  for (const k of ORDER) { if (obj[k]) parts.push(`${k}=${obj[k]}`); }
  for (const k of Object.keys(obj)) { if (!ORDER.includes(k)) parts.push(`${k}=${obj[k]}`); }
  return parts.join(', ');
}

function toHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

function parseSAN(extValueBytes) {
  try {
    const outer = readTLV(extValueBytes, 0);
    if (outer.tag !== TAG.SEQ) return [];
    const sans = [];
    let pos = outer.start;
    while (pos < outer.end) {
      const item = readTLV(extValueBytes, pos);
      pos = item.end;
      const ctxTag = item.tag & 0x1F;
      if (ctxTag === 2) sans.push(String.fromCharCode(...item.raw));
      else if (ctxTag === 7 && item.raw.length === 4) sans.push(item.raw.join('.'));
    }
    return sans;
  } catch (_) { return []; }
}

function getKeyInfo(der, start, end) {
  try {
    const children = readSeqChildren(der, start, end);
    if (children.length < 2) return null;
    const algId = children[0];
    const keyBit = children[1];
    if (algId.tag !== TAG.SEQ) return null;
    const algChildren = readSeqChildren(der, algId.start, algId.end);
    if (!algChildren.length || algChildren[0].tag !== TAG.OID) return null;
    const algOidDotted = decodeOid(algChildren[0].raw);
    if (algOidDotted === '1.2.840.113549.1.1.1') {
      if (keyBit.tag !== TAG.BIT) return { type: 'RSA', bits: null };
      const rsaBytes = keyBit.raw.slice(1);
      try {
        const rsaSeq = readTLV(rsaBytes, 0);
        if (rsaSeq.tag !== TAG.SEQ) return { type: 'RSA', bits: null };
        const modTlv = readTLV(rsaBytes, rsaSeq.start);
        if (modTlv.tag !== TAG.INT) return { type: 'RSA', bits: null };
        const modLen = modTlv.raw[0] === 0x00 ? modTlv.raw.length - 1 : modTlv.raw.length;
        return { type: 'RSA', bits: modLen * 8 };
      } catch (_) { return { type: 'RSA', bits: null }; }
    }
    if (algOidDotted === '1.2.840.10045.2.1') {
      let curveName = null;
      if (algChildren.length > 1 && algChildren[1].tag === TAG.OID) {
        curveName = OID_NAMES[decodeOid(algChildren[1].raw)] || null;
      }
      return { type: 'EC', curve: curveName, bits: null };
    }
    return { type: OID_NAMES[algOidDotted] || algOidDotted, bits: null };
  } catch (_) { return null; }
}

function parseCertMeta(bytes) {
  const certSeq = readTLV(bytes, 0);
  if (certSeq.tag !== TAG.SEQ) throw new Error('Not a certificate');
  const [tbs, sigAlgTlv] = readSeqChildren(bytes, certSeq.start, certSeq.end);
  if (!tbs || tbs.tag !== TAG.SEQ) throw new Error('Missing TBS');

  const tbsChildren = readSeqChildren(bytes, tbs.start, tbs.end);
  let idx = 0;

  if (tbsChildren[idx] && tbsChildren[idx].tag === TAG.CTX0) idx++;
  const serialTlv = tbsChildren[idx++];
  const serial = serialTlv ? toHex(serialTlv.raw) : '';

  const sigAlgIdTlv = tbsChildren[idx++];
  let sigAlgName = '';
  if (sigAlgIdTlv && sigAlgIdTlv.tag === TAG.SEQ) {
    const [algOidTlv] = readSeqChildren(bytes, sigAlgIdTlv.start, sigAlgIdTlv.end);
    if (algOidTlv && algOidTlv.tag === TAG.OID) sigAlgName = oidName(algOidTlv.raw);
  }

  const issuerTlv = tbsChildren[idx++];
  let issuer = {};
  if (issuerTlv && issuerTlv.tag === TAG.SEQ) issuer = parseRDN(bytes, issuerTlv.start, issuerTlv.end);

  const validityTlv = tbsChildren[idx++];
  let notBefore = null, notAfter = null;
  if (validityTlv && validityTlv.tag === TAG.SEQ) {
    const vChildren = readSeqChildren(bytes, validityTlv.start, validityTlv.end);
    if (vChildren[0]) notBefore = parseTime(vChildren[0]);
    if (vChildren[1]) notAfter = parseTime(vChildren[1]);
  }

  const subjectTlv = tbsChildren[idx++];
  let subject = {};
  if (subjectTlv && subjectTlv.tag === TAG.SEQ) subject = parseRDN(bytes, subjectTlv.start, subjectTlv.end);

  const spkiTlv = tbsChildren[idx++];
  let keyInfo = null;
  if (spkiTlv && spkiTlv.tag === TAG.SEQ) keyInfo = getKeyInfo(bytes, spkiTlv.start, spkiTlv.end);

  let isCA = false, sans = [];
  for (let i = idx; i < tbsChildren.length; i++) {
    if (tbsChildren[i].tag === TAG.CTX3) {
      try {
        const innerSeq = readTLV(bytes, tbsChildren[i].start);
        if (innerSeq.tag === TAG.SEQ) {
          let pos = innerSeq.start;
          while (pos < innerSeq.end) {
            const extSeq = readTLV(bytes, pos);
            pos = extSeq.end;
            if (extSeq.tag !== TAG.SEQ) continue;
            const extChildren = readSeqChildren(bytes, extSeq.start, extSeq.end);
            if (!extChildren.length || extChildren[0].tag !== TAG.OID) continue;
            const oidDotted = decodeOid(extChildren[0].raw);
            const valTlv = extChildren[extChildren.length - 1];
            if (!valTlv || valTlv.tag !== TAG.OCT) continue;
            if (oidDotted === '2.5.29.17') sans = parseSAN(valTlv.raw);
            if (oidDotted === '2.5.29.19') {
              try {
                const outer = readTLV(valTlv.raw, 0);
                if (outer.tag === TAG.SEQ && outer.len > 0) {
                  const boolTlv = readTLV(valTlv.raw, outer.start);
                  if (boolTlv.tag === TAG.BOOL) isCA = boolTlv.raw[0] !== 0x00;
                }
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
    }
  }

  let keyType = '';
  if (keyInfo) {
    if (keyInfo.type === 'RSA' && keyInfo.bits) keyType = `RSA ${keyInfo.bits}`;
    else if (keyInfo.type === 'EC' && keyInfo.curve) keyType = `EC (${keyInfo.curve})`;
    else keyType = keyInfo.type || '';
  }

  return {
    type: 'X.509 Certificate',
    subject: rdnToString(subject),
    issuer: rdnToString(issuer),
    validFrom: notBefore ? notBefore.toISOString() : null,
    validTo: notAfter ? notAfter.toISOString() : null,
    expired: notAfter ? Date.now() > notAfter.getTime() : null,
    serialNumber: serial,
    algorithm: sigAlgName,
    keyType,
    sans,
    isCA,
  };
}

function decodePemBlock(text, type) {
  const re = new RegExp(`-----BEGIN ${type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-----([^-]+)-----END ${type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-----`);
  const m = text.match(re);
  if (!m) return null;
  const b64 = m[1].replace(/\s+/g, '');
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch (_) { return null; }
}

export async function extractMetadata(intake) {
  const text = intake.text || '';

  // Find all PEM block types
  const types = [];
  const re = /-----BEGIN ([^-]+)-----/g;
  let m;
  while ((m = re.exec(text)) !== null) types.push(m[1].trim());

  if (types.length === 0) {
    // Try raw DER
    const bytes = intake.bytes;
    if (bytes && bytes[0] === 0x30) {
      try {
        return parseCertMeta(bytes);
      } catch (_) {}
    }
    return { type: 'PEM/DER (unrecognized)' };
  }

  // For a single certificate, return full metadata
  const certType = types.find((t) => t.includes('CERTIFICATE') && !t.includes('REQUEST'));
  if (certType) {
    const derBytes = decodePemBlock(text, certType);
    if (derBytes) {
      try {
        return parseCertMeta(derBytes);
      } catch (_) {}
    }
  }

  // For CSR
  const csrType = types.find((t) => t.includes('CERTIFICATE REQUEST'));
  if (csrType && types.length === 1) {
    return { type: 'Certificate Signing Request (CSR)', blockTypes: types };
  }

  // For keys
  const keyType = types.find((t) => t.includes('KEY'));
  if (keyType && types.length === 1) {
    const isPrivate = keyType.includes('PRIVATE');
    return { type: isPrivate ? 'Private Key' : 'Public Key', keyHeader: keyType };
  }

  // Multi-block or unrecognized
  return {
    type: types.length > 1 ? 'PEM Bundle' : types[0],
    blockCount: types.length,
    blockTypes: types,
  };
}
