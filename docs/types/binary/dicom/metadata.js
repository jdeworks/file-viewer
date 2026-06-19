function readU16(b, off) { return b[off] | (b[off+1] << 8); }
function readU32(b, off) { return (b[off] | (b[off+1]<<8) | (b[off+2]<<16) | (b[off+3]<<24)) >>> 0; }

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
      if (key === '00080060') fields['Modality'] = value;
      if (key === '00280010') fields['Rows'] = value;
      if (key === '00280011') fields['Columns'] = value;
      if (key === '00080020') fields['Study Date'] = value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8);
      if (key === '00080080') fields['Institution'] = value;
    }
  }

  return fields;
}
