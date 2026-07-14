// Shared dBASE/DBF validation and parsing. Detection, preview, and metadata must agree:
// arbitrary binary data must never become a table merely because byte 0 resembles a DBF version.

export const VERSION_NAMES = {
  0x02: 'dBASE II',
  0x03: 'dBASE III+',
  0x04: 'dBASE IV',
  0x05: 'dBASE V',
  0x07: 'Visual Objects',
  0x30: 'Visual FoxPro',
  0x31: 'Visual FoxPro (autoincrement)',
  0x32: 'Visual FoxPro (varchar)',
  0x7b: 'dBASE IV (SQL table)',
  0x82: 'dBASE III+ (memo)',
  0x83: 'dBASE III+ (memo)',
  0x8b: 'dBASE IV (memo)',
  0x8e: 'dBASE IV (SQL system)',
  0xcb: 'dBASE IV (SQL table memo)',
  0xf5: 'FoxPro (memo)',
};

export const FIELD_TYPE_NAMES = {
  C: 'Character', N: 'Numeric', F: 'Float', D: 'Date', L: 'Logical',
  M: 'Memo', G: 'General', P: 'Picture', Y: 'Currency', T: 'DateTime',
  I: 'Integer', O: 'Double', B: 'Binary', V: 'Varchar', X: 'Varbinary',
  '@': 'Timestamp', '=': 'Integer (8B)', '^': 'Autoincrement', '+': 'Autoincrement',
  0: 'Null flags', Q: 'Varbinary', W: 'Blob',
};

const SUPPORTED_VERSIONS = new Set(Object.keys(VERSION_NAMES).map(Number).filter((v) => v !== 0x02));
const VFP_VERSIONS = new Set([0x30, 0x31, 0x32]);
const FIELD_TYPES = new Set(Object.keys(FIELD_TYPE_NAMES));
const ASCII = new TextDecoder('ascii', { fatal: false });

function r16le(b, off) { return b[off] | (b[off + 1] << 8); }
function r32le(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}

function validDateParts(yearByte, month, day) {
  if (month === 0 && day === 0) return null;
  if (month < 1 || month > 12 || day < 1) return false;
  const year = 1900 + yearByte;
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= maxDay ? { year, month, day } : false;
}

export function formatDbfDate(parts) {
  if (!parts || parts === false) return 'Unknown';
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function fieldName(b, off) {
  let end = off;
  while (end < off + 11 && b[end] !== 0) end += 1;
  if (end === off) return null;
  for (let i = off; i < end; i++) {
    // dBASE identifiers are byte strings, but control bytes are never credible field names.
    if (b[i] < 0x20 || b[i] === 0x7f) return null;
  }
  return ASCII.decode(b.slice(off, end));
}

function failure(version, message, details = {}) {
  return {
    valid: false,
    supported: version !== 0x02,
    version,
    versionName: VERSION_NAMES[version] || null,
    error: message,
    fields: [],
    ...details,
  };
}

export function validateDbf(intake) {
  const b = intake?.bytes;
  if (!b || b.length < 12) return failure(null, 'The file is too short to contain a DBF header.');

  const version = b[0];
  const versionName = VERSION_NAMES[version] || null;
  if (!versionName) return failure(version, 'The first byte is not a recognized dBASE or FoxPro version.');
  if (version === 0x02) {
    return failure(version, 'dBASE II uses an older header layout that this viewer does not parse.', { supported: false });
  }
  if (!SUPPORTED_VERSIONS.has(version)) return failure(version, 'This DBF version is not supported.');
  if (b.length < 32) return failure(version, 'The DBF header is truncated.');

  const numRecords = r32le(b, 4);
  const headerSize = r16le(b, 8);
  const recordSize = r16le(b, 10);
  if (headerSize < 33) return failure(version, 'The declared DBF header is too small.');
  if (headerSize > b.length) {
    return failure(version, 'The declared DBF header extends beyond the available file data.', { headerSize, recordSize, numRecords });
  }
  if (recordSize < 1) return failure(version, 'The declared DBF record size is invalid.');

  const fields = [];
  let off = 32;
  let terminator = -1;
  while (off < headerSize) {
    if (b[off] === 0x0d) { terminator = off; break; }
    if (off + 32 > headerSize || off + 32 > b.length) {
      return failure(version, 'A DBF field descriptor is truncated.', { headerSize, recordSize, numRecords });
    }
    const name = fieldName(b, off);
    const type = String.fromCharCode(b[off + 11]);
    const length = b[off + 16];
    const decimals = b[off + 17];
    if (!name) return failure(version, 'A DBF field has an empty or non-printable name.', { headerSize, recordSize, numRecords });
    if (!FIELD_TYPES.has(type)) return failure(version, `DBF field ${name} has an unsupported type byte.`, { headerSize, recordSize, numRecords });
    if (length === 0 && type !== '0') return failure(version, `DBF field ${name} has zero length.`, { headerSize, recordSize, numRecords });
    if ((type === 'N' || type === 'F') && decimals > length) {
      return failure(version, `DBF field ${name} has an impossible decimal count.`, { headerSize, recordSize, numRecords });
    }
    fields.push({ name, type, length, decimals, flags: b[off + 18] });
    if (fields.length > 2048) return failure(version, 'The DBF header declares too many fields.');
    off += 32;
  }

  if (terminator < 0) return failure(version, 'The DBF field-descriptor terminator is missing.', { headerSize, recordSize, numRecords });
  const extraHeaderBytes = headerSize - (terminator + 1);
  if (!VFP_VERSIONS.has(version) && extraHeaderBytes !== 0) {
    return failure(version, 'The DBF header length does not match its field descriptors.', { headerSize, recordSize, numRecords });
  }
  // Visual FoxPro may append a 263-byte database-container backlink after the terminator.
  if (VFP_VERSIONS.has(version) && extraHeaderBytes !== 0 && extraHeaderBytes !== 263) {
    return failure(version, 'The Visual FoxPro header has an invalid backlink area.', { headerSize, recordSize, numRecords });
  }

  const fieldBytes = fields.reduce((sum, field) => sum + field.length, 0);
  const nullableCount = fields.filter((field) => (field.flags & 0x02) !== 0).length;
  const nullBitmapBytes = nullableCount ? Math.ceil(nullableCount / 8) : 0;
  const expectedRecordSize = 1 + fieldBytes + nullBitmapBytes;
  if (recordSize !== expectedRecordSize) {
    return failure(version, 'The DBF record size does not agree with its field definitions.', {
      headerSize, recordSize, numRecords, expectedRecordSize,
    });
  }

  if (!intake?.truncated) {
    const required = headerSize + numRecords * recordSize;
    if (!Number.isSafeInteger(required) || required > b.length) {
      return failure(version, 'The DBF record count extends beyond the end of the file.', {
        headerSize, recordSize, numRecords, expectedSize: required,
      });
    }
  }

  const date = validDateParts(b[1], b[2], b[3]);
  const warnings = [];
  if (date === false) warnings.push('The last-update date in the DBF header is invalid.');
  return {
    valid: true,
    supported: true,
    version,
    versionName,
    headerSize,
    recordSize,
    numRecords,
    expectedRecordSize,
    terminator,
    extraHeaderBytes,
    fields,
    date,
    lastUpdate: formatDbfDate(date),
    warnings,
  };
}
