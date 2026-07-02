function readU16(b, off) { return b[off] | (b[off+1] << 8); }
function readU32(b, off) { return (b[off] | (b[off+1]<<8) | (b[off+2]<<16) | (b[off+3]<<24)) >>> 0; }

const MODALITIES = {
  CT:'Computed Tomography', MR:'MRI', US:'Ultrasound', CR:'Computed Radiography',
  DX:'Digital Radiography', MG:'Mammography', PT:'PET', NM:'Nuclear Medicine',
  RF:'Fluoroscopy', DR:'Digital Radiography', SC:'Secondary Capture',
};

const SOP_CLASSES = {
  '1.2.840.10008.5.1.4.1.1.2': 'CT Image',
  '1.2.840.10008.5.1.4.1.1.4': 'MR Image',
  '1.2.840.10008.5.1.4.1.1.7': 'Secondary Capture',
  '1.2.840.10008.5.1.4.1.1.1': 'CR Image',
};

const TRANSFER_SYNTAXES = {
  '1.2.840.10008.1.2': 'Implicit VR LE',
  '1.2.840.10008.1.2.1': 'Explicit VR LE (uncompressed)',
  '1.2.840.10008.1.2.2': 'Explicit VR BE',
  '1.2.840.10008.1.2.4.50': 'JPEG Baseline',
  '1.2.840.10008.1.2.4.90': 'JPEG 2000 Lossless',
  '1.2.840.10008.1.2.4.91': 'JPEG 2000 Lossy',
};

function fmtDate(value) {
  if (!value || value.length < 8) return value;
  return value.slice(0,4) + '-' + value.slice(4,6) + '-' + value.slice(6,8);
}

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 132) return {};
  if (b[128] !== 0x44 || b[129] !== 0x49 || b[130] !== 0x43 || b[131] !== 0x4D) return {};

  const fields = {};
  const LONG_VRS = new Set(['OB','OD','OF','OL','OQ','OV','OW','SQ','UC','UN','UR','UT']);
  let pos = 132;
  let maxTags = 80;

  while (pos + 4 <= b.length && maxTags-- > 0) {
    const group   = readU16(b, pos);
    const element = readU16(b, pos + 2);
    pos += 4;
    if (group === 0x7FE0 && element === 0x0010) break;
    if (pos + 2 > b.length) break;
    const vr = String.fromCharCode(b[pos], b[pos+1]);
    pos += 2;
    let len;
    if (LONG_VRS.has(vr)) { if (pos + 6 > b.length) break; pos += 2; len = readU32(b, pos); pos += 4; }
    else { if (pos + 2 > b.length) break; len = readU16(b, pos); pos += 2; }
    if (len === 0xFFFFFFFF || pos + len > b.length) break;
    const vb = b.slice(pos, pos + len);
    pos += len;

    const key = group.toString(16).padStart(4,'0') + element.toString(16).padStart(4,'0');
    let value = null;
    if (['CS','DA','DS','LO','PN','SH','ST','TM','UI','UT'].includes(vr)) {
      try { value = new TextDecoder().decode(vb).replace(/\0/g,'').trim(); } catch {}
    } else if (vr === 'US' && len >= 2) {
      value = String(readU16(vb, 0));
    }

    if (value) {
      if (key === '00020002') fields['SOP class'] = SOP_CLASSES[value] || value;
      if (key === '00020010') fields['Transfer syntax'] = TRANSFER_SYNTAXES[value] || value;
      if (key === '00080060') fields['Modality'] = MODALITIES[value] ? `${value} - ${MODALITIES[value]}` : value;
      if (key === '00280010') fields['Rows'] = value;
      if (key === '00280011') fields['Columns'] = value;
      if (key === '00280100') fields['Bits allocated'] = value;
      if (key === '00280101') fields['Bits stored'] = value;
      if (key === '00080020') fields['Study Date'] = fmtDate(value);
      if (key === '00080080') fields['Institution'] = value;
      if (key === '00080070') fields['Manufacturer'] = value;
      if (key === '00081090') fields['Model'] = value;
      if (key === '00100010') fields['Patient name present'] = 'yes';
      if (key === '00100020') fields['Patient ID present'] = 'yes';
    }
  }

  return {
    Format: 'DICOM',
    ...fields,
    ...(fields.Rows && fields.Columns ? { Dimensions: `${fields.Columns} x ${fields.Rows}` } : {}),
  };
}
