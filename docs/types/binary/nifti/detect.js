// NIfTI-1: magic at offset 344 = "n+1\0" (single file) or "ni1\0" (header only)
//           sizeof_hdr (int32 LE at offset 0) must be 348
// NIfTI-2: sizeof_hdr (int32 LE at offset 0) must be 540
//           magic at offset 4 (8-byte field) = "n+2\0" or "ni2\0" (+ "\r\n\x1a\n")
// ANALYZE 7.5: sizeof_hdr = 348 but magic = "          " (no NIfTI magic)

export function detect(intake) {
  const { filename, bytes: b } = intake;
  const ext = filename ? filename.split('.').pop().toLowerCase() : '';
  const isNiftiExt = ext === 'nii' || ext === 'hdr' || ext === 'img';

  if (!b || b.length < 350) return isNiftiExt ? 0.5 : 0;

  // NIfTI-1: sizeof_hdr = 348
  const sizeofHdr = b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24);
  const isV1Hdr = sizeofHdr === 348;
  const magic1 = new TextDecoder('ascii', { fatal: false }).decode(b.slice(344, 348));
  const isV1Magic = magic1 === 'n+1\x00' || magic1 === 'ni1\x00';

  if (b.length >= 544) {
    const sizeofHdr2 = b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24);
    const magic2 = new TextDecoder('ascii', { fatal: false }).decode(b.slice(4, 8));
    const isV2 = sizeofHdr2 === 540 && (magic2 === 'n+2\x00' || magic2 === 'ni2\x00');
    if (isNiftiExt) return isV2 ? 0.99 : isV1Magic && isV1Hdr ? 0.99 : 0.65;
    return isV2 ? 0.97 : isV1Magic && isV1Hdr ? 0.97 : 0;
  }

  if (isNiftiExt) return isV1Magic && isV1Hdr ? 0.99 : 0.65;
  return isV1Magic && isV1Hdr ? 0.97 : 0;
}
