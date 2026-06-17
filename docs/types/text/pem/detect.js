export function detect(intake) {
  const ext = intake.filename?.split('.').pop()?.toLowerCase();
  const PEM_EXTS = new Set(['pem', 'crt', 'cer', 'key', 'der', 'p7b', 'p7c']);

  // Strong signal: PEM header in text
  if (intake.textSample?.includes('-----BEGIN ')) return 0.95;

  // DER binary: starts with 0x30 (ASN.1 SEQUENCE tag) + known extension
  if (intake.bytes?.[0] === 0x30 && PEM_EXTS.has(ext)) return 0.85;

  // Extension only
  if (PEM_EXTS.has(ext)) return 0.6;

  return 0;
}
