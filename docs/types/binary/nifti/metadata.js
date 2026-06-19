export function metadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 348) return {};

  const sizeofHdr = (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) | 0;
  const magic = new TextDecoder('ascii', { fatal: false }).decode(b.slice(344, 348));
  if (sizeofHdr !== 348 || (magic !== 'n+1\x00' && magic !== 'ni1\x00')) return {};

  const ndim = b[40] | (b[41] << 8);
  const dims = [];
  for (let i = 1; i <= ndim && i <= 7; i++) dims.push(b[40 + i * 2] | (b[40 + i * 2 + 1] << 8));

  return {
    format: 'NIfTI-1 Neuroimaging',
    dimensions: `${ndim}D [${dims.join(' × ')}]`,
    fileType: magic === 'n+1\x00' ? 'Single .nii file' : 'Header-only (.hdr)',
  };
}
