export function detect(intake) {
  const { filename, bytes: b } = intake;
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';
  const isBsonExt = ext === 'bson';

  if (!b || b.length < 5) return isBsonExt ? 0.6 : 0;

  // BSON document: first 4 bytes = LE int32 document length (includes itself),
  // last byte of the stated length must be 0x00 (document terminator).
  const docLen = b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24);
  const validLen = docLen >= 5 && docLen <= b.length;
  const terminator = validLen && b[docLen - 1] === 0x00;
  const structural = validLen && terminator;

  if (isBsonExt) return structural ? 0.97 : 0.65;
  return structural ? 0.75 : 0;
}
