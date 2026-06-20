const FORMATS = { wOFF: 'WOFF', wOF2: 'WOFF2', OTTO: 'OpenType (CFF)', true: 'TrueType', ttcf: 'TrueType Collection' };

export function extract(intake) {
  const b = intake.bytes || new Uint8Array();
  let format = 'unknown';
  if (b.length >= 4) {
    const sig = String.fromCharCode(b[0], b[1], b[2], b[3]);
    if (FORMATS[sig]) format = FORMATS[sig];
    else if (b[0] === 0x00 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) format = 'TrueType';
  }
  const out = [
    { label: 'Format', value: format },
    { label: 'Size', value: (intake.size / 1024).toFixed(1) + ' KB' },
  ];
  const info = parseSfntInfo(b);
  if (info) {
    if (info.collectionCount) out.push({ label: 'Fonts in collection', value: String(info.collectionCount) });
    out.push({ label: 'Tables', value: String(info.tableCount) });
    if (info.family) out.push({ label: 'Family', value: info.family });
    if (info.subfamily) out.push({ label: 'Subfamily', value: info.subfamily });
    if (info.fullName) out.push({ label: 'Full name', value: info.fullName });
    if (info.version) out.push({ label: 'Font version', value: info.version });
    if (info.unitsPerEm) out.push({ label: 'Units per em', value: String(info.unitsPerEm) });
    if (info.glyphs != null) out.push({ label: 'Glyphs', value: info.glyphs.toLocaleString() });
    if (info.weightClass) out.push({ label: 'Weight class', value: String(info.weightClass) });
    if (info.widthClass) out.push({ label: 'Width class', value: String(info.widthClass) });
    if (info.designer) out.push({ label: 'Designer', value: info.designer });
    if (info.manufacturer) out.push({ label: 'Manufacturer', value: info.manufacturer });
    if (info.vendorUrl) out.push({ label: 'Vendor URL', value: info.vendorUrl });
    if (info.copyright) out.push({ label: 'Copyright', value: info.copyright.slice(0, 200) });
    if (info.license) out.push({ label: 'License', value: info.license.slice(0, 200) });
    if (info.licenseUrl) out.push({ label: 'License URL', value: info.licenseUrl });
  }
  return out;
}

function parseSfntInfo(bytes) {
  if (bytes.length < 12) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  let collectionCount = 0;
  const sig = tag(bytes, 0);
  if (sig === 'ttcf') {
    if (bytes.length < 16) return null;
    collectionCount = dv.getUint32(8, false);
    offset = dv.getUint32(12, false);
  }
  if (offset + 12 > bytes.length) return null;
  const tableCount = dv.getUint16(offset + 4, false);
  if (!tableCount || offset + 12 + tableCount * 16 > bytes.length) return null;
  const tables = new Map();
  for (let i = 0; i < tableCount; i++) {
    const p = offset + 12 + i * 16;
    const name = tag(bytes, p);
    const tableOffset = dv.getUint32(p + 8, false);
    const length = dv.getUint32(p + 12, false);
    if (tableOffset + length <= bytes.length) tables.set(name, { offset: tableOffset, length });
  }
  const info = { tableCount };
  if (collectionCount) info.collectionCount = collectionCount;
  readNames(bytes, dv, tables.get('name'), info);
  readHead(dv, tables.get('head'), info);
  readMaxp(dv, tables.get('maxp'), info);
  readOS2(dv, tables.get('OS/2'), info);
  return info;
}

function tag(bytes, offset) {
  if (offset + 4 > bytes.length) return '';
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function readNames(bytes, dv, table, info) {
  if (!table || table.length < 6) return;
  const base = table.offset;
  const count = dv.getUint16(base + 2, false);
  const strings = base + dv.getUint16(base + 4, false);
  const wanted = new Map([
    [0, 'copyright'], [1, 'family'], [2, 'subfamily'], [4, 'fullName'], [5, 'version'],
    [8, 'manufacturer'], [9, 'designer'], [11, 'vendorUrl'], [13, 'license'], [14, 'licenseUrl'],
  ]);
  for (let i = 0; i < count; i++) {
    const p = base + 6 + i * 12;
    if (p + 12 > base + table.length) break;
    const platform = dv.getUint16(p, false);
    const encoding = dv.getUint16(p + 2, false);
    const language = dv.getUint16(p + 4, false);
    const nameId = dv.getUint16(p + 6, false);
    const length = dv.getUint16(p + 8, false);
    const offset = strings + dv.getUint16(p + 10, false);
    const key = wanted.get(nameId);
    if (!key || info[key] || offset + length > base + table.length) continue;
    const value = decodeName(bytes.subarray(offset, offset + length), platform, encoding).trim();
    if (value && (language === 0x0409 || !info[key])) info[key] = value.slice(0, 500);
  }
}

function decodeName(bytes, platform, encoding) {
  const utf16 = platform === 0 || platform === 3 || (platform === 2 && encoding === 1);
  if (utf16) {
    let out = '';
    for (let i = 0; i + 1 < bytes.length; i += 2) out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    return out;
  }
  return new TextDecoder('latin1').decode(bytes);
}

function readHead(dv, table, info) {
  if (!table || table.length < 20) return;
  info.unitsPerEm = dv.getUint16(table.offset + 18, false);
}

function readMaxp(dv, table, info) {
  if (!table || table.length < 6) return;
  info.glyphs = dv.getUint16(table.offset + 4, false);
}

function readOS2(dv, table, info) {
  if (!table || table.length < 8) return;
  info.weightClass = dv.getUint16(table.offset + 4, false);
  info.widthClass = dv.getUint16(table.offset + 6, false);
}
