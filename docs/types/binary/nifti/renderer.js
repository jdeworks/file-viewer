// NIfTI-1 header layout (348 bytes):
//   [0-3]:   sizeof_hdr = 348
//   [4-7]:   data_type (unused, 10 chars)
//   [14-15]: extents (unused)
//   [38-39]: dim_info
//   [40-55]: dim[8]: dimensions (uint16 LE, dim[0] = ndim)
//   [56-59]: intent_p1 (float32)
//   [60-63]: intent_p2 (float32)
//   [64-67]: intent_p3 (float32)
//   [68-69]: intent_code (int16)
//   [70-71]: datatype (int16): 0=unknown,2=uint8,4=int16,8=int32,16=float32,32=complex64,64=float64,...
//   [72-73]: bitpix (int16)
//   [74-75]: slice_start
//   [76-107]: pixdim[8] (float32): pixel dimensions (pixdim[1..ndim])
//   [108-111]: vox_offset (float32): byte offset in .nii file
//   [112-115]: scl_slope
//   [116-119]: scl_inter
//   [120-121]: slice_end
//   [122]:   slice_code
//   [123]:   xyzt_units
//   [124-127]: cal_max (float32)
//   [128-131]: cal_min (float32)
//   [132-135]: slice_duration
//   [136-139]: toffset
//   [148-227]: descrip (80 chars)
//   [228-251]: aux_file (24 chars)
//   [252-253]: qform_code
//   [254-255]: sform_code
//   [344-347]: magic "n+1\0" or "ni1\0"

import { partialSupportHtml } from '../../../core/partial-support.js';

const CAPABILITY = 'Partial preview: the NIfTI-1 header, dimensions, voxel spacing, data type, intent, and selected description fields are shown. Voxel values, image volumes/slices, extensions, qform/sform orientation transforms, and overlays are not decoded or rendered.';

const DATATYPES = {
  0: 'unknown', 1: 'binary', 2: 'uint8', 4: 'int16', 8: 'int32',
  16: 'float32', 32: 'complex64', 64: 'float64', 128: 'RGB24',
  256: 'int8', 512: 'uint16', 768: 'uint32', 1024: 'int64', 1280: 'uint64',
  1536: 'float128', 1792: 'complex128', 2048: 'complex256', 2304: 'RGBA32',
};

const INTENT_CODES = {
  0: 'none', 2: 'correlation', 3: 't-test', 4: 'F-test', 5: 'z-score',
  6: 'chi-squared', 7: 'beta', 22: 'label', 23: 'neuronames_index',
  1001: 'estimate', 1002: 'label', 1003: 'neuronames', 1004: 'general matrix',
  1005: 'symmetric matrix', 1006: 'displacement field', 1007: 'vector',
  1008: 'pointset', 1009: 'triangle', 1010: 'quaternion',
  1011: 'dimensionless', 2001: 'time series', 2002: 'node index',
  2003: 'RGB vector', 2004: 'RGBA vector', 2005: 'shape',
};

const UNIT_CODES = {
  0x00: 'unknown', 0x01: 'meter', 0x02: 'mm', 0x03: 'μm',
  0x08: 'seconds', 0x10: 'ms', 0x18: 'μs', 0x20: 'Hz', 0x28: 'ppm', 0x30: 'radians/s',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function readF32le(b, off) {
  const buf = new ArrayBuffer(4);
  new Uint8Array(buf).set(b.slice(off, off + 4));
  return new DataView(buf).getFloat32(0, true);
}
function readI16le(b, off) {
  const v = b[off] | (b[off + 1] << 8);
  return v > 32767 ? v - 65536 : v;
}
function readU16le(b, off) {
  return b[off] | (b[off + 1] << 8);
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 348) {
    return { bodyHtml: partialSupportHtml(CAPABILITY) + '<p class="viewer-message">File too small for a NIfTI header.</p>', hadUnsafe: false };
  }

  const sizeofHdr = (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) | 0;
  const magic = new TextDecoder('ascii', { fatal: false }).decode(b.slice(344, 348));
  if (sizeofHdr !== 348 || (magic !== 'n+1\x00' && magic !== 'ni1\x00')) {
    return { bodyHtml: partialSupportHtml(CAPABILITY) + '<p class="viewer-message">Not a valid NIfTI-1 file.</p>', hadUnsafe: false };
  }

  const ndim = readU16le(b, 40);
  const dims = [];
  for (let i = 1; i <= ndim && i <= 7; i++) dims.push(readU16le(b, 40 + i * 2));

  const pixdims = [];
  for (let i = 1; i <= ndim && i <= 7; i++) pixdims.push(readF32le(b, 76 + i * 4).toFixed(4));

  const datatype = readI16le(b, 70);
  const bitpix = readI16le(b, 72);
  const intentCode = readI16le(b, 68);
  const xyztUnits = b[123];
  const spatialUnit = UNIT_CODES[xyztUnits & 0x07] || `0x${(xyztUnits & 0x07).toString(16)}`;
  const temporalUnit = UNIT_CODES[xyztUnits & 0x38] || `0x${(xyztUnits & 0x38).toString(16)}`;

  const descrip = new TextDecoder('ascii', { fatal: false }).decode(b.slice(148, 228)).replace(/\x00/g, '').trim();
  const auxFile = new TextDecoder('ascii', { fatal: false }).decode(b.slice(228, 252)).replace(/\x00/g, '').trim();

  const isNiiFile = magic === 'n+1\x00';

  const metaRows = [
    ['Format', 'NIfTI-1 Neuroimaging'],
    ['File type', isNiiFile ? 'Single .nii file' : 'Header-only (.hdr)'],
    ['Dimensions', `${ndim}D [${dims.join(' × ')}]`],
    pixdims.length ? ['Voxel size', `${pixdims.join(' × ')} ${spatialUnit}`] : null,
    ['Data type', `${DATATYPES[datatype] || `type${datatype}`} (${bitpix} bits/voxel)`],
    intentCode !== 0 ? ['Intent', INTENT_CODES[intentCode] || `code ${intentCode}`] : null,
    temporalUnit !== 'unknown' ? ['Time unit', temporalUnit] : null,
    descrip ? ['Description', descrip] : null,
    auxFile ? ['Aux file', auxFile] : null,
    ['File size', `${b.length.toLocaleString()} bytes`],
  ].filter(Boolean).map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  return {
    bodyHtml: `
      <style>
        .badge-nifti { background: #283593; color: #fff; }
      </style>
      <div class="badge-row"><span class="badge badge-nifti">NIfTI</span></div>
      ${partialSupportHtml(CAPABILITY)}
      <div class="meta-section">
        <h4 class="meta-section-title">Image Info</h4>
        ${metaRows}
      </div>
      <div class="meta-section">
        <h4 class="meta-section-title">About this format</h4>
        <p style="font-size:0.85rem;line-height:1.6;margin:0">
          NIfTI-1 is the standard format for neuroimaging data (fMRI, structural MRI, DTI).
          Full voxel rendering requires <strong>niivue</strong> or <strong>brainbrowser</strong>.
          Use FSL, FreeSurfer, or 3D Slicer to explore the image data.
        </p>
      </div>`,
    hadUnsafe: false,
  };
}
