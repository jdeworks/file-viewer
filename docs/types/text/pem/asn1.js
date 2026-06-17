const TAG = {
  BOOL: 0x01, INT: 0x02, BIT: 0x03, OCT: 0x04, NULL: 0x05,
  OID: 0x06, UTF8: 0x0C, SEQ: 0x30, SET: 0x31,
  PRINT: 0x13, IA5: 0x16, UTC: 0x17, GEN: 0x18,
  CTX0: 0xA0, CTX1: 0xA1, CTX2: 0xA2, CTX3: 0xA3,
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
  if (offset >= bytes.length) throw new Error('Unexpected end of data at offset ' + offset);
  const tag = bytes[offset++];
  const { len, next } = readLength(bytes, offset);
  if (next + len > bytes.length) throw new Error('Length exceeds data at offset ' + offset);
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
  '2.5.29.15': 'keyUsage', '2.5.29.37': 'extKeyUsage', '2.5.29.14': 'subjectKeyIdentifier',
  '2.5.29.35': 'authorityKeyIdentifier', '2.5.29.31': 'cRLDistributionPoints',
  '1.3.6.1.5.5.7.3.1': 'TLS server auth', '1.3.6.1.5.5.7.3.2': 'TLS client auth',
  '1.3.6.1.5.5.7.3.3': 'code signing', '1.3.6.1.5.5.7.3.4': 'email protection',
  '1.3.6.1.4.1.11129.2.4.2': 'CT Precertificate SCTs',
  '1.3.6.1.5.5.7.1.1': 'authorityInfoAccess',
  '2.5.29.32': 'certificatePolicies',
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
  const tag = tlv.tag;
  const bytes = tlv.raw;
  if (tag === TAG.UTF8) return new TextDecoder('utf-8').decode(bytes);
  if (tag === TAG.IA5 || tag === TAG.PRINT) return String.fromCharCode(...bytes);
  if (tag === TAG.UTC) return String.fromCharCode(...bytes);
  if (tag === TAG.GEN) return String.fromCharCode(...bytes);
  return null;
}

function parseTime(tlv) {
  const s = String.fromCharCode(...tlv.raw);
  if (tlv.tag === TAG.UTC) {
    let year = parseInt(s.slice(0, 2), 10);
    year = year < 50 ? 2000 + year : 1900 + year;
    const mo = s.slice(2, 4), dy = s.slice(4, 6);
    const hh = s.slice(6, 8), mm = s.slice(8, 10), ss = s.slice(10, 12);
    return new Date(`${year}-${mo}-${dy}T${hh}:${mm}:${ss}Z`);
  }
  if (tlv.tag === TAG.GEN) {
    const year = s.slice(0, 4), mo = s.slice(4, 6), dy = s.slice(6, 8);
    const hh = s.slice(8, 10), mm = s.slice(10, 12), ss = s.slice(12, 14);
    return new Date(`${year}-${mo}-${dy}T${hh}:${mm}:${ss}Z`);
  }
  return null;
}

export function fmtDate(d) {
  if (!d || isNaN(d)) return 'unknown';
  return d.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
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

export function rdnToString(obj) {
  const ORDER = ['CN', 'O', 'OU', 'C', 'L', 'ST'];
  const parts = [];
  for (const k of ORDER) {
    if (obj[k]) parts.push(`${k}=${obj[k]}`);
  }
  for (const k of Object.keys(obj)) {
    if (!ORDER.includes(k)) parts.push(`${k}=${obj[k]}`);
  }
  return parts.join(', ');
}

function toHex(bytes, maxBytes) {
  const limit = maxBytes ? Math.min(bytes.length, maxBytes) : bytes.length;
  let s = '';
  for (let i = 0; i < limit; i++) s += bytes[i].toString(16).padStart(2, '0');
  if (maxBytes && bytes.length > maxBytes) s += '…';
  return s;
}

function parseSAN(extValueBytes) {
  const outer = readTLV(extValueBytes, 0);
  if (outer.tag !== TAG.SEQ) return [];
  const sans = [];
  let pos = outer.start;
  while (pos < outer.end) {
    const item = readTLV(extValueBytes, pos);
    pos = item.end;
    const ctxTag = item.tag & 0x1F;
    if (ctxTag === 2) {
      sans.push(String.fromCharCode(...item.raw));
    } else if (ctxTag === 7) {
      if (item.raw.length === 4) {
        sans.push(item.raw.join('.'));
      } else if (item.raw.length === 16) {
        const parts = [];
        for (let i = 0; i < 16; i += 2) {
          parts.push(((item.raw[i] << 8) | item.raw[i + 1]).toString(16));
        }
        sans.push(parts.join(':'));
      }
    } else if (ctxTag === 1) {
      sans.push(String.fromCharCode(...item.raw));
    }
  }
  return sans;
}

function parseBasicConstraints(extValueBytes) {
  try {
    const outer = readTLV(extValueBytes, 0);
    if (outer.tag !== TAG.SEQ) return { isCA: false };
    if (outer.len === 0) return { isCA: false };
    const boolTlv = readTLV(extValueBytes, outer.start);
    if (boolTlv.tag === TAG.BOOL) {
      return { isCA: boolTlv.raw[0] !== 0x00 };
    }
    return { isCA: false };
  } catch (_) {
    return { isCA: false };
  }
}

function parseExtKeyUsage(extValueBytes) {
  try {
    const outer = readTLV(extValueBytes, 0);
    if (outer.tag !== TAG.SEQ) return [];
    const ekus = [];
    let pos = outer.start;
    while (pos < outer.end) {
      const oidTlv = readTLV(extValueBytes, pos);
      pos = oidTlv.end;
      if (oidTlv.tag === TAG.OID) {
        ekus.push(oidName(oidTlv.raw));
      }
    }
    return ekus;
  } catch (_) {
    return [];
  }
}

function getKeyInfo(spkiBytes, start, end) {
  try {
    const children = readSeqChildren(spkiBytes, start, end);
    if (children.length < 2) return null;
    const algId = children[0];
    const keyBit = children[1];

    if (algId.tag !== TAG.SEQ) return null;
    const algChildren = readSeqChildren(spkiBytes, algId.start, algId.end);
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
      } catch (_) {
        return { type: 'RSA', bits: null };
      }
    }

    if (algOidDotted === '1.2.840.10045.2.1') {
      let curveName = null;
      if (algChildren.length > 1 && algChildren[1].tag === TAG.OID) {
        const curveOid = decodeOid(algChildren[1].raw);
        curveName = OID_NAMES[curveOid] || curveOid;
      }
      let bits = null;
      if (keyBit.tag === TAG.BIT) {
        const ecBytes = keyBit.raw.slice(1);
        if (ecBytes[0] === 0x04) {
          bits = ((ecBytes.length - 1) / 2) * 8;
        }
      }
      return { type: 'EC', curve: curveName, bits };
    }

    const algName = OID_NAMES[algOidDotted] || algOidDotted;
    return { type: algName, bits: null };
  } catch (_) {
    return null;
  }
}

function parseExtensions(bytes, start, end) {
  const result = { sans: [], isCA: null, ekus: [] };
  try {
    let pos = start;
    while (pos < end) {
      const extSeq = readTLV(bytes, pos);
      pos = extSeq.end;
      if (extSeq.tag !== TAG.SEQ) continue;
      const extChildren = readSeqChildren(bytes, extSeq.start, extSeq.end);
      if (!extChildren.length || extChildren[0].tag !== TAG.OID) continue;

      const oidDotted = decodeOid(extChildren[0].raw);
      const valTlv = extChildren[extChildren.length - 1];
      if (!valTlv || valTlv.tag !== TAG.OCT) continue;

      if (oidDotted === '2.5.29.17') {
        result.sans = parseSAN(valTlv.raw);
      } else if (oidDotted === '2.5.29.19') {
        const bc = parseBasicConstraints(valTlv.raw);
        result.isCA = bc.isCA;
      } else if (oidDotted === '2.5.29.37') {
        result.ekus = parseExtKeyUsage(valTlv.raw);
      }
    }
  } catch (_) {
  }
  return result;
}

export function parseCertificate(der) {
  const certSeq = readTLV(der, 0);
  if (certSeq.tag !== TAG.SEQ) throw new Error('Expected SEQUENCE at root');

  const [tbs, sigAlgTlv] = readSeqChildren(der, certSeq.start, certSeq.end);
  if (!tbs || tbs.tag !== TAG.SEQ) throw new Error('Expected TBSCertificate');

  const tbsChildren = readSeqChildren(der, tbs.start, tbs.end);
  let idx = 0;

  let version = 1;
  if (tbsChildren[idx] && tbsChildren[idx].tag === TAG.CTX0) {
    const vTlv = readTLV(der, tbsChildren[idx].start);
    version = (vTlv.raw[0] || 0) + 1;
    idx++;
  }

  const serialTlv = tbsChildren[idx++];
  const serial = serialTlv ? toHex(serialTlv.raw) : '';

  const sigAlgIdTlv = tbsChildren[idx++];
  let sigAlgName = '';
  if (sigAlgIdTlv && sigAlgIdTlv.tag === TAG.SEQ) {
    const [algOidTlv] = readSeqChildren(der, sigAlgIdTlv.start, sigAlgIdTlv.end);
    if (algOidTlv && algOidTlv.tag === TAG.OID) sigAlgName = oidName(algOidTlv.raw);
  }

  const issuerTlv = tbsChildren[idx++];
  let issuer = {};
  if (issuerTlv && issuerTlv.tag === TAG.SEQ) {
    issuer = parseRDN(der, issuerTlv.start, issuerTlv.end);
  }

  const validityTlv = tbsChildren[idx++];
  let notBefore = null, notAfter = null;
  if (validityTlv && validityTlv.tag === TAG.SEQ) {
    const vChildren = readSeqChildren(der, validityTlv.start, validityTlv.end);
    if (vChildren[0]) notBefore = parseTime(vChildren[0]);
    if (vChildren[1]) notAfter = parseTime(vChildren[1]);
  }

  const subjectTlv = tbsChildren[idx++];
  let subject = {};
  if (subjectTlv && subjectTlv.tag === TAG.SEQ) {
    subject = parseRDN(der, subjectTlv.start, subjectTlv.end);
  }

  const spkiTlv = tbsChildren[idx++];
  let keyInfo = null;
  if (spkiTlv && spkiTlv.tag === TAG.SEQ) {
    keyInfo = getKeyInfo(der, spkiTlv.start, spkiTlv.end);
  }

  let exts = { sans: [], isCA: null, ekus: [] };
  for (let i = idx; i < tbsChildren.length; i++) {
    if (tbsChildren[i].tag === TAG.CTX3) {
      const innerSeq = readTLV(der, tbsChildren[i].start);
      if (innerSeq.tag === TAG.SEQ) {
        exts = parseExtensions(der, innerSeq.start, innerSeq.end);
      }
    }
  }

  return { version, serial, sigAlgName, issuer, notBefore, notAfter, subject, keyInfo, exts };
}

export function parsePemFile(text) {
  const blocks = [];
  const re = /-----BEGIN ([^-]+)-----([^-]+?)-----END [^-]+-----/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const type = m[1].trim();
    const b64 = m[2].replace(/\s+/g, '');
    try {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      blocks.push({ type, bytes });
    } catch (_) {
      blocks.push({ type, bytes: null, error: 'Base64 decode failed' });
    }
  }
  return blocks;
}
