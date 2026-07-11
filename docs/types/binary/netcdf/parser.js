const NC_DIMENSION = 10;
const NC_VARIABLE = 11;
const NC_ATTRIBUTE = 12;
const MAX_DIMENSIONS = 1024;
const MAX_ATTRIBUTES = 1024;
const MAX_VARIABLES = 1024;
const MAX_VARIABLE_DIMENSIONS = 1024;
const MAX_NAME_BYTES = 1024 * 1024;
const MAX_DISPLAY_CHARS = 4096;

export const NC_TYPE_NAMES = { 1: 'byte', 2: 'char', 3: 'short', 4: 'int', 5: 'float', 6: 'double' };
const NC_TYPE_SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 4, 6: 8 };
const decoder = new TextDecoder();

function requireBytes(bytes, offset, length, label) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0
      || offset > bytes.length || length > bytes.length - offset) {
    throw new Error(`${label} exceeds NetCDF header bounds`);
  }
}

function readU32BE(bytes, offset, label = '32-bit value') {
  requireBytes(bytes, offset, 4, label);
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function readI16BE(bytes, offset) {
  requireBytes(bytes, offset, 2, 'NC_SHORT value');
  const value = bytes[offset] << 8 | bytes[offset + 1];
  return value & 0x8000 ? value - 0x10000 : value;
}

function readI32BE(bytes, offset) {
  requireBytes(bytes, offset, 4, 'NC_INT value');
  return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
}

function readFloat(bytes, offset, double) {
  requireBytes(bytes, offset, double ? 8 : 4, double ? 'NC_DOUBLE value' : 'NC_FLOAT value');
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, double ? 8 : 4);
  return double ? view.getFloat64(0, false) : view.getFloat32(0, false);
}

function paddedLength(length) {
  if (!Number.isSafeInteger(length) || length < 0) throw new Error('Invalid NetCDF padded length');
  return length + (4 - length % 4) % 4;
}

function checkedCount(count, maximum, label) {
  if (count > maximum) throw new Error(`${label} count ${count} exceeds preview limit ${maximum}`);
}

function parseName(bytes, offset) {
  const length = readU32BE(bytes, offset, 'name length');
  if (length > MAX_NAME_BYTES) throw new Error(`NetCDF name exceeds ${MAX_NAME_BYTES} bytes`);
  const start = offset + 4;
  const padded = paddedLength(length);
  requireBytes(bytes, start, padded, 'name');
  return { value: decoder.decode(bytes.slice(start, start + length)), end: start + padded };
}

function parseValues(bytes, offset, type, count) {
  const typeSize = NC_TYPE_SIZES[type];
  if (!typeSize) throw new Error(`Unknown NetCDF attribute type ${type}`);
  const totalBytes = count * typeSize;
  if (!Number.isSafeInteger(totalBytes)) throw new Error('NetCDF attribute byte count exceeds safe range');
  const padded = paddedLength(totalBytes);
  requireBytes(bytes, offset, padded, 'attribute value');

  if (type === 2) {
    const shown = Math.min(totalBytes, MAX_DISPLAY_CHARS);
    const value = decoder.decode(bytes.slice(offset, offset + shown)).replace(/\0/g, '').trim()
      + (totalBytes > shown ? '…' : '');
    return { value, end: offset + padded };
  }

  const values = [];
  for (let index = 0; index < Math.min(count, 8); index++) {
    const valueOffset = offset + index * typeSize;
    if (type === 1) values.push(bytes[valueOffset] & 0x80 ? bytes[valueOffset] - 0x100 : bytes[valueOffset]);
    else if (type === 3) values.push(readI16BE(bytes, valueOffset));
    else if (type === 4) values.push(readI32BE(bytes, valueOffset));
    else if (type === 5) values.push(readFloat(bytes, valueOffset, false));
    else if (type === 6) values.push(readFloat(bytes, valueOffset, true));
  }
  const value = values.map((entry) => Number(entry.toPrecision(6))).join(', ') + (count > 8 ? ', …' : '');
  return { value, end: offset + padded };
}

function parseAttributeList(bytes, offset) {
  const tag = readU32BE(bytes, offset, 'attribute-list tag');
  const count = readU32BE(bytes, offset + 4, 'attribute-list count');
  if (tag === 0) {
    if (count !== 0) throw new Error('Malformed absent NetCDF attribute list');
    return { value: [], end: offset + 8 };
  }
  if (tag !== NC_ATTRIBUTE) throw new Error(`Unexpected NetCDF attribute-list tag ${tag}`);
  checkedCount(count, MAX_ATTRIBUTES, 'Attribute');
  const value = [];
  let pos = offset + 8;
  for (let index = 0; index < count; index++) {
    const name = parseName(bytes, pos); pos = name.end;
    const type = readU32BE(bytes, pos, 'attribute type'); pos += 4;
    const values = readU32BE(bytes, pos, 'attribute value count'); pos += 4;
    const parsed = parseValues(bytes, pos, type, values); pos = parsed.end;
    value.push({ name: name.value, type: NC_TYPE_NAMES[type], value: parsed.value });
  }
  return { value, end: pos };
}

export function parseNetcdfHeader(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 8) throw new Error('File is too short for a NetCDF header');
  if (bytes[0] !== 0x43 || bytes[1] !== 0x44 || bytes[2] !== 0x46 || (bytes[3] !== 1 && bytes[3] !== 2)) {
    throw new Error('Not a NetCDF-3 classic/64-bit-offset header');
  }
  const rawNumRecs = readU32BE(bytes, 4, 'record count');
  const result = {
    version: bytes[3],
    numRecs: rawNumRecs === 0xffffffff ? null : rawNumRecs,
    streamingRecords: rawNumRecs === 0xffffffff,
    dimensions: [],
    globalAttrs: [],
    variables: [],
  };
  let pos = 8;

  const dimensionTag = readU32BE(bytes, pos, 'dimension-list tag');
  const dimensionCount = readU32BE(bytes, pos + 4, 'dimension-list count');
  pos += 8;
  if (dimensionTag === 0) {
    if (dimensionCount !== 0) throw new Error('Malformed absent NetCDF dimension list');
  } else {
    if (dimensionTag !== NC_DIMENSION) throw new Error(`Unexpected NetCDF dimension-list tag ${dimensionTag}`);
    checkedCount(dimensionCount, MAX_DIMENSIONS, 'Dimension');
    for (let index = 0; index < dimensionCount; index++) {
      const name = parseName(bytes, pos); pos = name.end;
      const size = readU32BE(bytes, pos, 'dimension size'); pos += 4;
      result.dimensions.push({ name: name.value, size: size === 0 ? 'UNLIMITED' : size });
    }
  }

  const attributes = parseAttributeList(bytes, pos);
  result.globalAttrs = attributes.value;
  pos = attributes.end;

  const variableTag = readU32BE(bytes, pos, 'variable-list tag');
  const variableCount = readU32BE(bytes, pos + 4, 'variable-list count');
  pos += 8;
  if (variableTag === 0) {
    if (variableCount !== 0) throw new Error('Malformed absent NetCDF variable list');
    return result;
  }
  if (variableTag !== NC_VARIABLE) throw new Error(`Unexpected NetCDF variable-list tag ${variableTag}`);
  checkedCount(variableCount, MAX_VARIABLES, 'Variable');
  for (let index = 0; index < variableCount; index++) {
    const name = parseName(bytes, pos); pos = name.end;
    const dimensionIdCount = readU32BE(bytes, pos, 'variable dimension count'); pos += 4;
    checkedCount(dimensionIdCount, MAX_VARIABLE_DIMENSIONS, 'Variable dimension');
    const dimensionIds = [];
    for (let dimIndex = 0; dimIndex < dimensionIdCount; dimIndex++) {
      const id = readU32BE(bytes, pos, 'variable dimension id'); pos += 4;
      if (id >= result.dimensions.length) throw new Error(`Variable references missing dimension ${id}`);
      dimensionIds.push(id);
    }
    const variableAttributes = parseAttributeList(bytes, pos); pos = variableAttributes.end;
    const type = readU32BE(bytes, pos, 'variable type'); pos += 4;
    if (!NC_TYPE_NAMES[type]) throw new Error(`Unknown NetCDF variable type ${type}`);
    const size = readU32BE(bytes, pos, 'variable size'); pos += 4;
    const beginBytes = result.version === 2 ? 8 : 4;
    requireBytes(bytes, pos, beginBytes, 'variable begin offset');
    pos += beginBytes;
    result.variables.push({
      name: name.value,
      type: NC_TYPE_NAMES[type],
      dims: dimensionIds.map((id) => result.dimensions[id].name),
      attrs: variableAttributes.value,
      size,
    });
  }
  return result;
}
