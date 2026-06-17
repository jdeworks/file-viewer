// PEM / DER certificate / key renderer
// Pure-JS ASN.1 DER parser — no external dependencies.

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ── ASN.1 tag constants ───────────────────────────────────────────────────────
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

// ── OID decoding ──────────────────────────────────────────────────────────────
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

// ── String decoding ───────────────────────────────────────────────────────────
function decodeString(tlv) {
  const tag = tlv.tag;
  const bytes = tlv.raw;
  if (tag === TAG.UTF8) {
    return new TextDecoder('utf-8').decode(bytes);
  }
  if (tag === TAG.IA5 || tag === TAG.PRINT) {
    return String.fromCharCode(...bytes);
  }
  if (tag === TAG.UTC) {
    return String.fromCharCode(...bytes);
  }
  if (tag === TAG.GEN) {
    return String.fromCharCode(...bytes);
  }
  return null;
}

// ── Time parsing ──────────────────────────────────────────────────────────────
function parseTime(tlv) {
  const s = String.fromCharCode(...tlv.raw);
  if (tlv.tag === TAG.UTC) {
    // YYMMDDHHMMSSZ
    let year = parseInt(s.slice(0, 2), 10);
    year = year < 50 ? 2000 + year : 1900 + year;
    const mo = s.slice(2, 4), dy = s.slice(4, 6);
    const hh = s.slice(6, 8), mm = s.slice(8, 10), ss = s.slice(10, 12);
    return new Date(`${year}-${mo}-${dy}T${hh}:${mm}:${ss}Z`);
  }
  if (tlv.tag === TAG.GEN) {
    // YYYYMMDDHHMMSSZ
    const year = s.slice(0, 4), mo = s.slice(4, 6), dy = s.slice(6, 8);
    const hh = s.slice(8, 10), mm = s.slice(10, 12), ss = s.slice(12, 14);
    return new Date(`${year}-${mo}-${dy}T${hh}:${mm}:${ss}Z`);
  }
  return null;
}

function fmtDate(d) {
  if (!d || isNaN(d)) return 'unknown';
  return d.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

// ── RDN (Subject/Issuer) parsing ──────────────────────────────────────────────
function parseRDN(bytes, start, end) {
  const result = {};
  const rdns = readSeqChildren(bytes, start, end); // SEQUENCEs of SETs
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
  for (const k of ORDER) {
    if (obj[k]) parts.push(`${k}=${obj[k]}`);
  }
  for (const k of Object.keys(obj)) {
    if (!ORDER.includes(k)) parts.push(`${k}=${obj[k]}`);
  }
  return parts.join(', ');
}

// ── Hex encoding ──────────────────────────────────────────────────────────────
function toHex(bytes, maxBytes) {
  const limit = maxBytes ? Math.min(bytes.length, maxBytes) : bytes.length;
  let s = '';
  for (let i = 0; i < limit; i++) s += bytes[i].toString(16).padStart(2, '0');
  if (maxBytes && bytes.length > maxBytes) s += '…';
  return s;
}

// ── SubjectAltName parsing ────────────────────────────────────────────────────
function parseSAN(extValueBytes) {
  // extValueBytes is an OCTET STRING value containing the encoded SEQUENCE
  const outer = readTLV(extValueBytes, 0);
  if (outer.tag !== TAG.SEQ) return [];
  const sans = [];
  let pos = outer.start;
  while (pos < outer.end) {
    const item = readTLV(extValueBytes, pos);
    pos = item.end;
    const ctxTag = item.tag & 0x1F;
    if (ctxTag === 2) {
      // dNSName (tag 0x82 = context class, primitive, tag 2)
      sans.push(String.fromCharCode(...item.raw));
    } else if (ctxTag === 7) {
      // iPAddress (tag 0x87 = context class, primitive, tag 7)
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
      // rfc822Name (email)
      sans.push(String.fromCharCode(...item.raw));
    }
  }
  return sans;
}

// ── BasicConstraints parsing ──────────────────────────────────────────────────
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

// ── ExtKeyUsage parsing ───────────────────────────────────────────────────────
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

// ── Public key size detection ─────────────────────────────────────────────────
function getKeyInfo(spkiBytes, start, end) {
  try {
    // SEQUENCE { algorithmIdentifier, subjectPublicKey (BIT STRING) }
    const children = readSeqChildren(spkiBytes, start, end);
    if (children.length < 2) return null;
    const algId = children[0];
    const keyBit = children[1];

    if (algId.tag !== TAG.SEQ) return null;
    const algChildren = readSeqChildren(spkiBytes, algId.start, algId.end);
    if (!algChildren.length || algChildren[0].tag !== TAG.OID) return null;

    const algOidDotted = decodeOid(algChildren[0].raw);

    if (algOidDotted === '1.2.840.113549.1.1.1') {
      // RSA — parse bit string to get modulus length
      if (keyBit.tag !== TAG.BIT) return { type: 'RSA', bits: null };
      // BIT STRING: first byte is padding count, rest is content
      const rsaBytes = keyBit.raw.slice(1);
      try {
        const rsaSeq = readTLV(rsaBytes, 0);
        if (rsaSeq.tag !== TAG.SEQ) return { type: 'RSA', bits: null };
        const modTlv = readTLV(rsaBytes, rsaSeq.start);
        if (modTlv.tag !== TAG.INT) return { type: 'RSA', bits: null };
        // modulus may have a leading 0x00 padding byte
        const modLen = modTlv.raw[0] === 0x00 ? modTlv.raw.length - 1 : modTlv.raw.length;
        return { type: 'RSA', bits: modLen * 8 };
      } catch (_) {
        return { type: 'RSA', bits: null };
      }
    }

    if (algOidDotted === '1.2.840.10045.2.1') {
      // EC — get curve from parameters OID
      let curveName = null;
      if (algChildren.length > 1 && algChildren[1].tag === TAG.OID) {
        const curveOid = decodeOid(algChildren[1].raw);
        curveName = OID_NAMES[curveOid] || curveOid;
      }
      // Estimate bit size from key bytes (uncompressed point = 0x04 + 2*fieldLen)
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

// ── Extensions parsing ────────────────────────────────────────────────────────
function parseExtensions(bytes, start, end) {
  const result = { sans: [], isCA: null, ekus: [] };
  try {
    // Extensions are SEQUENCE OF Extension
    // Each Extension: SEQUENCE { OID, [BOOLEAN,] OCTET STRING }
    let pos = start;
    while (pos < end) {
      const extSeq = readTLV(bytes, pos);
      pos = extSeq.end;
      if (extSeq.tag !== TAG.SEQ) continue;
      const extChildren = readSeqChildren(bytes, extSeq.start, extSeq.end);
      if (!extChildren.length || extChildren[0].tag !== TAG.OID) continue;

      const oidDotted = decodeOid(extChildren[0].raw);
      // Value is the last OCTET STRING child
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
    // partial parse is fine
  }
  return result;
}

// ── PEM block stripping ───────────────────────────────────────────────────────
function decodePemBlock(text) {
  const match = text.match(/-----BEGIN ([^-]+)-----([^-]+)-----END [^-]+-----/);
  if (!match) return null;
  const type = match[1].trim();
  const b64 = match[2].replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { type, bytes };
}

function detectPemTypes(text) {
  const types = [];
  const re = /-----BEGIN ([^-]+)-----/g;
  let m;
  while ((m = re.exec(text)) !== null) types.push(m[1].trim());
  return types;
}

// ── X.509 certificate parsing ─────────────────────────────────────────────────
function parseCertificate(der) {
  // Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signature }
  const certSeq = readTLV(der, 0);
  if (certSeq.tag !== TAG.SEQ) throw new Error('Expected SEQUENCE at root');

  const [tbs, sigAlgTlv] = readSeqChildren(der, certSeq.start, certSeq.end);
  if (!tbs || tbs.tag !== TAG.SEQ) throw new Error('Expected TBSCertificate');

  const tbsChildren = readSeqChildren(der, tbs.start, tbs.end);
  let idx = 0;

  // Optional: [0] EXPLICIT version
  let version = 1;
  if (tbsChildren[idx] && tbsChildren[idx].tag === TAG.CTX0) {
    const vTlv = readTLV(der, tbsChildren[idx].start);
    version = (vTlv.raw[0] || 0) + 1;
    idx++;
  }

  // serialNumber INTEGER
  const serialTlv = tbsChildren[idx++];
  const serial = serialTlv ? toHex(serialTlv.raw) : '';

  // signature AlgorithmIdentifier
  const sigAlgIdTlv = tbsChildren[idx++];
  let sigAlgName = '';
  if (sigAlgIdTlv && sigAlgIdTlv.tag === TAG.SEQ) {
    const [algOidTlv] = readSeqChildren(der, sigAlgIdTlv.start, sigAlgIdTlv.end);
    if (algOidTlv && algOidTlv.tag === TAG.OID) sigAlgName = oidName(algOidTlv.raw);
  }

  // issuer Name
  const issuerTlv = tbsChildren[idx++];
  let issuer = {};
  if (issuerTlv && issuerTlv.tag === TAG.SEQ) {
    issuer = parseRDN(der, issuerTlv.start, issuerTlv.end);
  }

  // validity SEQUENCE { notBefore, notAfter }
  const validityTlv = tbsChildren[idx++];
  let notBefore = null, notAfter = null;
  if (validityTlv && validityTlv.tag === TAG.SEQ) {
    const vChildren = readSeqChildren(der, validityTlv.start, validityTlv.end);
    if (vChildren[0]) notBefore = parseTime(vChildren[0]);
    if (vChildren[1]) notAfter = parseTime(vChildren[1]);
  }

  // subject Name
  const subjectTlv = tbsChildren[idx++];
  let subject = {};
  if (subjectTlv && subjectTlv.tag === TAG.SEQ) {
    subject = parseRDN(der, subjectTlv.start, subjectTlv.end);
  }

  // subjectPublicKeyInfo
  const spkiTlv = tbsChildren[idx++];
  let keyInfo = null;
  if (spkiTlv && spkiTlv.tag === TAG.SEQ) {
    keyInfo = getKeyInfo(der, spkiTlv.start, spkiTlv.end);
  }

  // Optional extensions [3]
  let exts = { sans: [], isCA: null, ekus: [] };
  for (let i = idx; i < tbsChildren.length; i++) {
    if (tbsChildren[i].tag === TAG.CTX3) {
      // [3] EXPLICIT SEQUENCE OF Extension
      const innerSeq = readTLV(der, tbsChildren[i].start);
      if (innerSeq.tag === TAG.SEQ) {
        exts = parseExtensions(der, innerSeq.start, innerSeq.end);
      }
    }
  }

  return { version, serial, sigAlgName, issuer, notBefore, notAfter, subject, keyInfo, exts };
}

// ── Parse multiple PEM blocks ─────────────────────────────────────────────────
function parsePemFile(text) {
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

// ── HTML rendering helpers ────────────────────────────────────────────────────
const STYLES = `
<style>
  * { box-sizing: border-box; }
  body { font: 14px/1.5 system-ui, sans-serif; padding: 16px; max-width: 720px; margin: 0 auto; color: #1e293b; }
  .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:600; margin-right:4px; }
  .badge-cert { background:#dbeafe; color:#1e40af; }
  .badge-key { background:#fef3c7; color:#92400e; }
  .badge-csr { background:#f3e8ff; color:#7e22ce; }
  .badge-pkcs7 { background:#e0f2fe; color:#0369a1; }
  .badge-other { background:#f1f5f9; color:#475569; }
  .badge-expired { background:#fee2e2; color:#991b1b; }
  .badge-valid { background:#dcfce7; color:#166534; }
  .badge-expiring { background:#fef9c3; color:#854d0e; }
  .badge-ca { background:#ede9fe; color:#5b21b6; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 0 0 16px; }
  .card + .card { margin-top: 12px; }
  .card-title { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
  h2 { margin: 0; font-size: 15px; }
  .section { margin: 12px 0; }
  .section h3 { font-size:11px; text-transform:uppercase; color:#6b7280; letter-spacing:.06em; margin:0 0 6px; }
  .row { display:flex; gap:8px; margin:3px 0; font-size:13px; }
  .row .k { color:#6b7280; min-width:90px; flex-shrink:0; }
  .row .v { word-break:break-all; }
  .sans { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
  .san-tag { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:3px; padding:1px 6px; font-size:12px; font-family:monospace; }
  .mono { font-family:monospace; font-size:11px; color:#64748b; word-break:break-all; }
  .err { background:#fff1f2; border:1px solid #fecaca; border-radius:6px; padding:12px; color:#b91c1c; font-size:13px; }
  .raw-pem { font-family:monospace; font-size:11px; white-space:pre-wrap; word-break:break-all; background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:10px; margin-top:8px; color:#475569; max-height:300px; overflow:auto; }
  .multi-info { color:#6b7280; font-size:12px; margin-bottom:8px; }
</style>
`;

function badgeForType(pemType) {
  const t = pemType.toUpperCase();
  if (t.includes('CERTIFICATE REQUEST') || t.includes('NEW CERTIFICATE REQUEST')) return ['badge-csr', 'CSR'];
  if (t.includes('CERTIFICATE')) return ['badge-cert', 'Certificate'];
  if (t.includes('PRIVATE KEY')) return ['badge-key', 'Private Key'];
  if (t.includes('PUBLIC KEY')) return ['badge-key', 'Public Key'];
  if (t.includes('PKCS7') || t.includes('PKCS #7') || t === 'CMS') return ['badge-pkcs7', 'PKCS#7'];
  return ['badge-other', pemType];
}

function renderCertBlock(block) {
  const { type, bytes, error } = block;
  const [badgeClass, badgeLabel] = badgeForType(type);

  if (error || !bytes) {
    return `<div class="card">
  <div class="card-title"><span class="badge ${badgeClass}">${esc(badgeLabel)}</span><h2>${esc(type)}</h2></div>
  <div class="err">Could not parse: ${esc(error || 'Unknown error')}</div>
</div>`;
  }

  // Try to parse as certificate
  const isCert = type.includes('CERTIFICATE') && !type.includes('REQUEST');
  const isCSR = type.includes('CERTIFICATE REQUEST') || type.includes('NEW CERTIFICATE REQUEST');
  const isKey = type.includes('KEY');

  if (isKey) {
    return renderKeyBlock(block, badgeClass, badgeLabel);
  }

  if (!isCert && !isCSR) {
    return renderRawBlock(block, badgeClass, badgeLabel);
  }

  try {
    const cert = parseCertificate(bytes);
    return renderCertInfo(cert, type, block, badgeClass, badgeLabel, isCSR);
  } catch (e) {
    return `<div class="card">
  <div class="card-title"><span class="badge ${badgeClass}">${esc(badgeLabel)}</span><h2>${esc(type)}</h2></div>
  <div class="err">Could not parse certificate structure: ${esc(e.message)}</div>
  <div class="raw-pem">${esc(formatPemForDisplay(type, bytes))}</div>
</div>`;
  }
}

function formatPemForDisplay(type, bytes) {
  const b64 = btoa(String.fromCharCode(...bytes));
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----`;
}

function renderCertInfo(cert, type, block, badgeClass, badgeLabel, isCSR) {
  const now = Date.now();
  const expiredMs = cert.notAfter ? cert.notAfter.getTime() : null;
  const expiringSoonMs = expiredMs ? expiredMs - 30 * 24 * 60 * 60 * 1000 : null;

  let validityBadge = '';
  if (!isCSR && expiredMs !== null) {
    if (now > expiredMs) {
      validityBadge = '<span class="badge badge-expired">EXPIRED</span>';
    } else if (expiringSoonMs !== null && now > expiringSoonMs) {
      validityBadge = '<span class="badge badge-expiring">EXPIRING SOON</span>';
    } else {
      validityBadge = '<span class="badge badge-valid">Valid</span>';
    }
  }

  const caBadge = cert.exts.isCA === true ? '<span class="badge badge-ca">CA</span>' : '';

  const subjectStr = rdnToString(cert.subject);
  const issuerStr = rdnToString(cert.issuer);
  const isSelfSigned = subjectStr === issuerStr;

  let keyStr = '';
  if (cert.keyInfo) {
    if (cert.keyInfo.type === 'RSA' && cert.keyInfo.bits) {
      keyStr = `RSA ${cert.keyInfo.bits}-bit`;
    } else if (cert.keyInfo.type === 'EC') {
      keyStr = `EC${cert.keyInfo.curve ? ' (' + cert.keyInfo.curve + ')' : ''}${cert.keyInfo.bits ? ' ' + cert.keyInfo.bits + '-bit' : ''}`;
    } else {
      keyStr = cert.keyInfo.type || 'Unknown';
    }
  }

  const sans = cert.exts.sans;
  const sansHtml = sans.length > 0
    ? `<div class="section">
  <h3>Subject Alternative Names (${sans.length})</h3>
  <div class="sans">${sans.map((s) => `<span class="san-tag">${esc(s)}</span>`).join('')}</div>
</div>`
    : '';

  const ekusHtml = cert.exts.ekus.length > 0
    ? `<div class="row"><span class="k">Key Usage</span><span class="v">${esc(cert.exts.ekus.join(', '))}</span></div>`
    : '';

  return `<div class="card">
  <div class="card-title">
    <span class="badge ${badgeClass}">${esc(badgeLabel)}</span>
    ${caBadge}${validityBadge}
    <h2>${esc(cert.subject.CN || subjectStr || type)}</h2>
  </div>
  <div class="section">
    <h3>Subject</h3>
    <div class="row"><span class="k">Common Name</span><span class="v">${esc(cert.subject.CN || '—')}</span></div>
    ${cert.subject.O ? `<div class="row"><span class="k">Organization</span><span class="v">${esc(cert.subject.O)}</span></div>` : ''}
    ${cert.subject.C ? `<div class="row"><span class="k">Country</span><span class="v">${esc(cert.subject.C)}</span></div>` : ''}
    ${Object.entries(cert.subject).filter(([k]) => !['CN','O','C','OU','L','ST'].includes(k)).map(([k,v]) => `<div class="row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join('')}
  </div>
  ${!isCSR ? `<div class="section">
    <h3>Issuer</h3>
    <div class="row"><span class="k">Common Name</span><span class="v">${esc(cert.issuer.CN || rdnToString(cert.issuer) || '—')}</span></div>
    ${cert.issuer.O ? `<div class="row"><span class="k">Organization</span><span class="v">${esc(cert.issuer.O)}</span></div>` : ''}
    ${isSelfSigned ? '<div class="row"><span class="k"></span><span class="v" style="color:#6b7280;font-style:italic">Self-signed</span></div>' : ''}
  </div>` : ''}
  ${!isCSR ? `<div class="section">
    <h3>Validity</h3>
    <div class="row"><span class="k">Not Before</span><span class="v">${esc(fmtDate(cert.notBefore))}</span></div>
    <div class="row"><span class="k">Not After</span><span class="v">${esc(fmtDate(cert.notAfter))}</span></div>
  </div>` : ''}
  <div class="section">
    <h3>Details</h3>
    ${keyStr ? `<div class="row"><span class="k">Public Key</span><span class="v">${esc(keyStr)}</span></div>` : ''}
    ${cert.sigAlgName ? `<div class="row"><span class="k">Algorithm</span><span class="v">${esc(cert.sigAlgName)}</span></div>` : ''}
    ${!isCSR && cert.serial ? `<div class="row"><span class="k">Serial</span><span class="v mono">${esc(cert.serial)}</span></div>` : ''}
    ${!isCSR ? `<div class="row"><span class="k">Version</span><span class="v">v${cert.version}</span></div>` : ''}
    ${ekusHtml}
  </div>
  ${sansHtml}
</div>`;
}

function renderKeyBlock(block, badgeClass, badgeLabel) {
  const { type } = block;
  // Determine key type from header
  let keyTypeDesc = type;
  if (type.includes('RSA')) keyTypeDesc = 'RSA Private Key';
  else if (type.includes('EC')) keyTypeDesc = 'EC Private Key';
  else if (type === 'PRIVATE KEY') keyTypeDesc = 'Private Key (PKCS#8)';
  else if (type === 'PUBLIC KEY') keyTypeDesc = 'Public Key (PKCS#8)';
  else if (type === 'ENCRYPTED PRIVATE KEY') keyTypeDesc = 'Encrypted Private Key';

  const sizeInfo = block.bytes ? `${block.bytes.length} bytes DER` : '';

  return `<div class="card">
  <div class="card-title">
    <span class="badge ${badgeClass}">${esc(badgeLabel)}</span>
    <h2>${esc(keyTypeDesc)}</h2>
  </div>
  <div class="section">
    <div class="row"><span class="k">Type</span><span class="v">${esc(type)}</span></div>
    ${sizeInfo ? `<div class="row"><span class="k">Size</span><span class="v">${esc(sizeInfo)}</span></div>` : ''}
  </div>
  <p style="color:#6b7280;font-size:12px;margin:8px 0 0">Raw key material is not displayed for security.</p>
</div>`;
}

function renderRawBlock(block, badgeClass, badgeLabel) {
  const { type } = block;
  return `<div class="card">
  <div class="card-title">
    <span class="badge ${badgeClass}">${esc(badgeLabel)}</span>
    <h2>${esc(type)}</h2>
  </div>
  <div class="section">
    <div class="row"><span class="k">Type</span><span class="v">${esc(type)}</span></div>
    ${block.bytes ? `<div class="row"><span class="k">Size</span><span class="v">${block.bytes.length} bytes</span></div>` : ''}
  </div>
</div>`;
}

// ── Main render ───────────────────────────────────────────────────────────────
export async function render(intake) {
  const text = intake.text || '';
  const bytes = intake.bytes;

  try {
    // Check if it's PEM text
    const hasPemHeader = text.includes('-----BEGIN ');

    if (!hasPemHeader && bytes && bytes[0] === 0x30) {
      // Raw DER input — treat as single certificate
      const block = { type: 'CERTIFICATE', bytes };
      const cardsHtml = renderCertBlock(block);
      return { bodyHtml: STYLES + cardsHtml, hadUnsafe: false };
    }

    if (!hasPemHeader) {
      return {
        bodyHtml: STYLES + `<div class="err">Not a recognized PEM or DER file. No PEM headers found and data does not start with ASN.1 SEQUENCE.</div>`,
        hadUnsafe: false,
      };
    }

    const blocks = parsePemFile(text);
    if (blocks.length === 0) {
      return {
        bodyHtml: STYLES + `<div class="err">No PEM blocks found in file.</div>`,
        hadUnsafe: false,
      };
    }

    const multiInfo = blocks.length > 1
      ? `<div class="multi-info">${blocks.length} PEM blocks in this file</div>`
      : '';

    const cardsHtml = blocks.map(renderCertBlock).join('');
    return { bodyHtml: STYLES + multiInfo + cardsHtml, hadUnsafe: false };
  } catch (e) {
    return {
      bodyHtml: STYLES + `<div class="err">Render error: ${esc(e.message)}</div>`,
      hadUnsafe: false,
    };
  }
}
