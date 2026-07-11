// metadata.js — extract structured metadata for PEM/DER files
import { parseCertificate, parsePemFile, rdnToString } from './asn1.js';

function certificateMetadata(bytes) {
  const cert = parseCertificate(bytes);
  const notBeforeMs = cert.notBefore?.getTime();
  const notAfterMs = cert.notAfter?.getTime();
  const validWindow = Number.isFinite(notBeforeMs) && Number.isFinite(notAfterMs)
    && notBeforeMs <= notAfterMs;

  let keyType = '';
  if (cert.keyInfo) {
    if (cert.keyInfo.type === 'RSA' && cert.keyInfo.bits) keyType = `RSA ${cert.keyInfo.bits}`;
    else if (cert.keyInfo.type === 'EC' && cert.keyInfo.curve) keyType = `EC (${cert.keyInfo.curve})`;
    else keyType = cert.keyInfo.type || '';
  }

  return {
    type: 'X.509 Certificate',
    subject: rdnToString(cert.subject),
    issuer: rdnToString(cert.issuer),
    validFrom: Number.isFinite(notBeforeMs) ? cert.notBefore.toISOString() : null,
    validTo: Number.isFinite(notAfterMs) ? cert.notAfter.toISOString() : null,
    expired: validWindow ? Date.now() > notAfterMs : null,
    serialNumber: cert.serial,
    algorithm: cert.sigAlgName,
    keyType,
    sans: cert.exts.sans,
    isCA: cert.exts.isCA === true,
  };
}

export async function extractMetadata(intake) {
  const text = intake.text || '';
  const blocks = parsePemFile(text);

  if (blocks.length === 0) {
    const bytes = intake.bytes;
    if (bytes?.[0] === 0x30) {
      try {
        return certificateMetadata(bytes);
      } catch (_) {
        // Fall through to the bounded unrecognized result.
      }
    }
    return { type: 'PEM/DER (unrecognized)' };
  }

  const types = blocks.map(({ type }) => type);
  const certBlock = blocks.find(({ type }) => type.includes('CERTIFICATE') && !type.includes('REQUEST'));
  if (certBlock?.bytes) {
    try {
      return certificateMetadata(certBlock.bytes);
    } catch (_) {
      // Preserve bundle/type metadata when the certificate structure is malformed.
    }
  }

  const csrType = types.find((type) => type.includes('CERTIFICATE REQUEST'));
  if (csrType && types.length === 1) {
    return { type: 'Certificate Signing Request (CSR)', blockTypes: types };
  }

  const keyType = types.find((type) => type.includes('KEY'));
  if (keyType && types.length === 1) {
    return { type: keyType.includes('PRIVATE') ? 'Private Key' : 'Public Key', keyHeader: keyType };
  }

  return {
    type: types.length > 1 ? 'PEM Bundle' : types[0],
    blockCount: types.length,
    blockTypes: types,
  };
}
