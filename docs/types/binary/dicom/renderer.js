function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function readU16(b, off) { return b[off] | (b[off+1] << 8); }
function readU32(b, off) { return (b[off] | (b[off+1]<<8) | (b[off+2]<<16) | (b[off+3]<<24)) >>> 0; }

// DICOM Explicit VR Little Endian parser
// Returns a flat map of tag keys ("ggggeeee") to { vr, value }
function parseDicom(bytes) {
  if (bytes.length < 132) return null;

  const tags = {};
  let pos = 132; // skip 128-byte preamble + "DICM"

  // Long VRs use 4-byte length with 2 reserved bytes after VR
  const LONG_VRS = new Set(['OB','OD','OF','OL','OQ','OV','OW','SQ','UC','UN','UR','UT']);

  let maxTags = 200;
  while (pos + 4 <= bytes.length && maxTags-- > 0) {
    const group   = readU16(bytes, pos);
    const element = readU16(bytes, pos + 2);
    pos += 4;

    // Stop at Pixel Data (7FE0,0010) — can be huge
    if (group === 0x7FE0 && element === 0x0010) break;

    // VR (2 ASCII bytes) for Explicit VR
    if (pos + 2 > bytes.length) break;
    const vr = String.fromCharCode(bytes[pos], bytes[pos+1]);
    pos += 2;

    let len;
    if (LONG_VRS.has(vr)) {
      if (pos + 6 > bytes.length) break;
      pos += 2; // reserved
      len = readU32(bytes, pos);
      pos += 4;
    } else {
      if (pos + 2 > bytes.length) break;
      len = readU16(bytes, pos);
      pos += 2;
    }

    // Undefined length sequences (0xFFFFFFFF) — skip
    if (len === 0xFFFFFFFF) break;
    if (pos + len > bytes.length) break;

    const valueBytes = bytes.slice(pos, pos + len);
    pos += len;

    const key = group.toString(16).padStart(4, '0') + element.toString(16).padStart(4, '0');
    let value;
    try {
      // Decode text VRs as UTF-8; binary VRs as hex or numeric
      if (['CS','DA','DS','DT','IS','LO','LT','PN','SH','ST','TM','UI','UT','UC','UR','LT'].includes(vr)) {
        value = new TextDecoder('utf-8', { fatal: false }).decode(valueBytes).replace(/\0/g, '').trim();
      } else if (vr === 'US') {
        value = len >= 2 ? readU16(valueBytes, 0) : 0;
      } else if (vr === 'UL') {
        value = len >= 4 ? readU32(valueBytes, 0) : 0;
      } else if (vr === 'SS') {
        value = len >= 2 ? (valueBytes[0] | (valueBytes[1] << 8)) << 16 >> 16 : 0;
      } else {
        value = null;
      }
    } catch {
      value = null;
    }

    if (value !== null) tags[key] = { vr, value };
  }

  return tags;
}

function g(tags, key) {
  return tags[key]?.value ?? null;
}

const MODALITIES = {
  CT:'Computed Tomography', MR:'MRI', US:'Ultrasound', CR:'Computed Radiography',
  DX:'Digital Radiography', MG:'Mammography', PT:'PET', NM:'Nuclear Medicine',
  RF:'Fluoroscopy', DR:'Digital Radiography', SC:'Secondary Capture',
  OT:'Other', XA:'X-Ray Angiography', XC:'External Camera',
  PR:'Presentation State', SR:'Structured Report', KO:'Key Object Selection',
  SEG:'Segmentation', RTDOSE:'RT Dose', RTSTRUCT:'RT Structure Set',
};

const SOP_CLASSES = {
  '1.2.840.10008.5.1.4.1.1.2':   'CT Image',
  '1.2.840.10008.5.1.4.1.1.4':   'MR Image',
  '1.2.840.10008.5.1.4.1.1.128': 'PET Image',
  '1.2.840.10008.5.1.4.1.1.7':   'Secondary Capture',
  '1.2.840.10008.5.1.4.1.1.1':   'CR Image',
  '1.2.840.10008.5.1.4.1.1.1.1': 'DX Image',
  '1.2.840.10008.5.1.4.1.1.6.1': 'Ultrasound Image',
  '1.2.840.10008.5.1.4.1.1.12.1': 'XA Image',
};

const TRANSFER_SYNTAXES = {
  '1.2.840.10008.1.2':    'Implicit VR LE',
  '1.2.840.10008.1.2.1':  'Explicit VR LE (uncompressed)',
  '1.2.840.10008.1.2.2':  'Explicit VR BE',
  '1.2.840.10008.1.2.4.50': 'JPEG Baseline',
  '1.2.840.10008.1.2.4.51': 'JPEG Extended',
  '1.2.840.10008.1.2.4.57': 'JPEG Lossless',
  '1.2.840.10008.1.2.4.70': 'JPEG Lossless Pred.',
  '1.2.840.10008.1.2.4.90': 'JPEG 2000 Lossless',
  '1.2.840.10008.1.2.4.91': 'JPEG 2000 Lossy',
  '1.2.840.10008.1.2.5':   'RLE Lossless',
};

function fmtDate(s) {
  if (!s || s.length < 8) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function fmtTime(s) {
  if (!s || s.length < 6) return s;
  return `${s.slice(0, 2)}:${s.slice(2, 4)}:${s.slice(4, 6)}`;
}

const STYLE = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;font-size:13px;color:var(--fg,#1a1a1a);background:var(--bg,#f5f5f5);padding:18px 16px}
.dcm-header{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px}
.badge{display:inline-block;font-weight:700;font-size:11px;letter-spacing:.06em;padding:3px 9px;border-radius:4px;border:1px solid transparent}
.badge-dcm{background:#00838f;color:#fff;font-size:13px;padding:4px 12px}
.badge-mod{background:#e0f7fa;color:#004d56;border-color:#80deea}
.badge-size{background:var(--bg2,#eee);color:var(--fg2,#555);border-color:var(--border,#d0d0d0)}
.phi-warning{background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#5d4037}
.sec{margin-bottom:20px}
.sec-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--fg2,#666);border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px;margin-bottom:8px}
.card{background:var(--panel,#fff);border:1px solid var(--border,#e0e0e0);border-radius:6px;overflow:hidden}
dl.kv{display:grid;grid-template-columns:160px 1fr;gap:1px}
dl.kv dt{background:var(--th-bg,#f9f9f9);padding:6px 12px;font-size:12px;font-weight:500;color:var(--fg2,#555)}
dl.kv dd{padding:6px 12px;word-break:break-all}
.empty{padding:10px 12px;color:var(--fg2,#999);font-style:italic}
.err{background:#fff3f3;border:1px solid #f5c6c6;border-radius:6px;padding:10px 14px;color:#b00020;font-size:12px}
.no-px{font-size:12px;color:var(--fg2,#777);padding:8px 0}
`;

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 132) {
    return { bodyHtml: `<style>${STYLE}</style><div class="err">File too small to be DICOM (${b?.length ?? 0} bytes).</div>` };
  }

  if (b[128] !== 0x44 || b[129] !== 0x49 || b[130] !== 0x43 || b[131] !== 0x4D) {
    return { bodyHtml: `<style>${STYLE}</style><div class="err">Missing DICM signature at offset 128. File may be pre-DICOM ACR-NEMA format.</div>` };
  }

  const tags = parseDicom(b);
  if (!tags) {
    return { bodyHtml: `<style>${STYLE}</style><div class="err">Could not parse DICOM tags.</div>` };
  }

  const fmtBytes = (n) => {
    if (!n) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  };

  // Key fields
  const modality    = g(tags, '00080060');
  const studyDate   = g(tags, '00080020');
  const studyTime   = g(tags, '00080030');
  const institution = g(tags, '00080080');
  const manufacturer = g(tags, '00080070');
  const modelName   = g(tags, '00081090');
  const patientName = g(tags, '00100010');
  const patientId   = g(tags, '00100020');
  const patientDob  = g(tags, '00100030');
  const patientSex  = g(tags, '00100040');
  const rows        = g(tags, '00280010');
  const cols        = g(tags, '00280011');
  const bitsAlloc   = g(tags, '00280100');
  const bitsStored  = g(tags, '00280101');
  const pixelSpacing = g(tags, '00280030');
  const sliceThick  = g(tags, '00500004') ?? g(tags, '00180050');
  const kvp         = g(tags, '00180060');
  const seriesDesc  = g(tags, '0008103e');
  const studyDesc   = g(tags, '00081030');
  const sopClassUID = g(tags, '00020002') ?? g(tags, '00080016');
  const transferSyntax = g(tags, '00020010');

  const modalityLabel = modality ? (MODALITIES[modality] ? `${modality} — ${MODALITIES[modality]}` : modality) : null;
  const sopClass = sopClassUID ? (SOP_CLASSES[sopClassUID] || sopClassUID) : null;
  const ts = transferSyntax ? (TRANSFER_SYNTAXES[transferSyntax] || transferSyntax) : null;

  let html = `<style>${STYLE}</style>`;

  // Header
  html += `<div class="dcm-header">`;
  html += `<span class="badge badge-dcm">DICOM</span>`;
  if (modalityLabel) html += `<span class="badge badge-mod">${esc(modalityLabel)}</span>`;
  html += `<span class="badge badge-size">${esc(fmtBytes(intake.size ?? b.length))}</span>`;
  html += `</div>`;

  // PHI warning if patient data present
  if (patientName || patientId || patientDob) {
    html += `<div class="phi-warning">⚠ This file may contain Protected Health Information (PHI). Handle according to your data protection requirements.</div>`;
  }

  // Study / scan info
  const hasStudyInfo = studyDate || studyDesc || seriesDesc || institution || kvp;
  if (hasStudyInfo) {
    html += `<div class="sec"><div class="sec-title">Study</div><div class="card"><dl class="kv">`;
    if (studyDate) html += `<dt>Study date</dt><dd>${esc(fmtDate(studyDate))}${studyTime ? ' ' + esc(fmtTime(studyTime)) : ''}</dd>`;
    if (studyDesc) html += `<dt>Study description</dt><dd>${esc(studyDesc)}</dd>`;
    if (seriesDesc) html += `<dt>Series description</dt><dd>${esc(seriesDesc)}</dd>`;
    if (institution) html += `<dt>Institution</dt><dd>${esc(institution)}</dd>`;
    if (kvp) html += `<dt>kVp</dt><dd>${esc(String(kvp))}</dd>`;
    if (sopClass) html += `<dt>SOP class</dt><dd>${esc(sopClass)}</dd>`;
    if (ts) html += `<dt>Transfer syntax</dt><dd>${esc(ts)}</dd>`;
    html += `</dl></div></div>`;
  }

  // Patient info
  const hasPatient = patientName || patientId || patientDob || patientSex;
  if (hasPatient) {
    html += `<div class="sec"><div class="sec-title">Patient</div><div class="card"><dl class="kv">`;
    if (patientName) html += `<dt>Name</dt><dd>${esc(patientName)}</dd>`;
    if (patientId) html += `<dt>Patient ID</dt><dd>${esc(patientId)}</dd>`;
    if (patientDob) html += `<dt>Date of birth</dt><dd>${esc(fmtDate(patientDob))}</dd>`;
    if (patientSex) html += `<dt>Sex</dt><dd>${esc(patientSex === 'M' ? 'Male' : patientSex === 'F' ? 'Female' : patientSex)}</dd>`;
    html += `</dl></div></div>`;
  }

  // Equipment
  const hasEquip = manufacturer || modelName;
  if (hasEquip) {
    html += `<div class="sec"><div class="sec-title">Equipment</div><div class="card"><dl class="kv">`;
    if (manufacturer) html += `<dt>Manufacturer</dt><dd>${esc(manufacturer)}</dd>`;
    if (modelName) html += `<dt>Model</dt><dd>${esc(modelName)}</dd>`;
    html += `</dl></div></div>`;
  }

  // Image parameters
  const hasImage = rows || cols || bitsAlloc;
  if (hasImage) {
    html += `<div class="sec"><div class="sec-title">Image</div><div class="card"><dl class="kv">`;
    if (rows && cols) html += `<dt>Dimensions</dt><dd>${rows} × ${cols} pixels</dd>`;
    if (bitsAlloc) html += `<dt>Bit depth</dt><dd>${bitsAlloc}-bit${bitsStored ? ` (${bitsStored} stored)` : ''}</dd>`;
    if (pixelSpacing) html += `<dt>Pixel spacing</dt><dd>${esc(String(pixelSpacing))} mm</dd>`;
    if (sliceThick) html += `<dt>Slice thickness</dt><dd>${esc(String(sliceThick))} mm</dd>`;
    html += `</dl></div></div>`;
  }

  const noPixel = !b.slice(132).some((_, i, a) => {
    const off = i;
    return a[off] === 0xE0 && a[off+1] === 0x7F;
  });
  if (rows && cols) {
    html += `<div class="no-px">Image pixel data not rendered — use a dedicated DICOM viewer (e.g. RadiAnt, OsiriX, 3D Slicer) to view the actual image.</div>`;
  }

  return { bodyHtml: html, hadUnsafe: false };
}
