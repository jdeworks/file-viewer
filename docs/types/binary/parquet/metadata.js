// Apache Parquet footer reader.
// Real-world Parquet writers (parquet-mr, parquet-cpp, Arrow, pandas/pyarrow, Spark, DuckDB)
// serialize the footer FileMetaData struct using the Thrift COMPACT protocol (not the
// Thrift binary protocol) — see the parquet-format spec: "All Thrift structures are
// serialized using the TCompactProtocol." This module implements a minimal compact-protocol
// reader capable of walking the FileMetaData struct, skipping fields/structs/lists/maps it
// doesn't need, and pulling out version / row count / schema column names / created-by.

function r32le(b, off) {
  return ((b[off] | (b[off + 1] << 8) | (b[off + 2] << 16)) >>> 0) + b[off + 3] * 0x1000000;
}

// Thrift compact-protocol wire types.
const CT = { BOOLEAN_TRUE: 1, BOOLEAN_FALSE: 2, BYTE: 3, I16: 4, I32: 5, I64: 6, DOUBLE: 7, BINARY: 8, LIST: 9, SET: 10, MAP: 11, STRUCT: 12 };

class CompactReader {
  constructor(b, off, end) { this.b = b; this.pos = off; this.end = end; }
  u8() {
    if (this.pos >= this.end) throw new Error('unexpected end of footer');
    return this.b[this.pos++];
  }
  varint() {
    let result = 0, shift = 0, byte;
    do {
      byte = this.u8();
      result |= (byte & 0x7f) << shift;
      shift += 7;
    } while (byte & 0x80);
    return result >>> 0;
  }
  varintBig() {
    let result = 0n, shift = 0n, byte;
    do {
      byte = this.u8();
      result |= BigInt(byte & 0x7f) << shift;
      shift += 7n;
    } while (byte & 0x80);
    return result;
  }
  binary() {
    const len = this.varint();
    if (len < 0 || this.pos + len > this.end) throw new Error('bad binary length');
    const bytes = this.b.slice(this.pos, this.pos + len);
    this.pos += len;
    return bytes;
  }
}
const zigzag32 = (v) => (v >>> 1) ^ -(v & 1);
const zigzagBig = (v) => (v >> 1n) ^ -(v & 1n);
const decodeUtf8 = (bytes) => new TextDecoder('utf-8', { fatal: false }).decode(bytes);

function readFieldHeader(r, lastId) {
  const b0 = r.u8();
  if (b0 === 0) return null; // STOP
  const type = b0 & 0x0f;
  const deltaId = (b0 >> 4) & 0x0f;
  const id = deltaId === 0 ? zigzag32(r.varint()) : lastId + deltaId;
  return { type, id };
}

// Skip over a value of the given compact-protocol wire type without interpreting it.
function skipValue(r, type) {
  switch (type) {
    case CT.BOOLEAN_TRUE:
    case CT.BOOLEAN_FALSE:
      return;
    case CT.BYTE:
      r.u8();
      return;
    case CT.I16:
    case CT.I32:
      r.varint();
      return;
    case CT.I64:
      r.varintBig();
      return;
    case CT.DOUBLE:
      r.pos += 8;
      return;
    case CT.BINARY: {
      const len = r.varint();
      r.pos += len;
      return;
    }
    case CT.LIST:
    case CT.SET: {
      const header = r.u8();
      let size = (header >> 4) & 0x0f;
      const elemType = header & 0x0f;
      if (size === 15) size = r.varint();
      for (let i = 0; i < size; i++) skipValue(r, elemType);
      return;
    }
    case CT.MAP: {
      const size = r.varint();
      if (size === 0) return;
      const kv = r.u8();
      const keyType = (kv >> 4) & 0x0f;
      const valType = kv & 0x0f;
      for (let i = 0; i < size; i++) { skipValue(r, keyType); skipValue(r, valType); }
      return;
    }
    case CT.STRUCT: {
      let lastId = 0;
      for (;;) {
        const fh = readFieldHeader(r, lastId);
        if (!fh) return;
        lastId = fh.id;
        skipValue(r, fh.type);
      }
    }
    default:
      throw new Error(`unknown compact-protocol type ${type}`);
  }
}

// Decode the FileMetaData struct: field 1=version(i32), field 2=schema(list<SchemaElement>),
// field 3=num_rows(i64), field 6=created_by(string). SchemaElement field 4=name(string).
// Every other field is skipped structurally (never guessed at byte level).
export function decodeFooter(b, footerOff, footerLen) {
  const r = new CompactReader(b, footerOff, footerOff + footerLen);
  let lastId = 0;
  let version = null;
  let numRows = null;
  let createdBy = null;
  const colNames = [];
  for (;;) {
    const fh = readFieldHeader(r, lastId);
    if (!fh) break;
    lastId = fh.id;
    if (fh.id === 1 && (fh.type === CT.I32 || fh.type === CT.I16)) {
      version = zigzag32(r.varint());
    } else if (fh.id === 2 && fh.type === CT.LIST) {
      const header = r.u8();
      let size = (header >> 4) & 0x0f;
      const elemType = header & 0x0f;
      if (size === 15) size = r.varint();
      for (let i = 0; i < size; i++) {
        if (elemType !== CT.STRUCT) { skipValue(r, elemType); continue; }
        let sLastId = 0;
        let name = null;
        for (;;) {
          const sfh = readFieldHeader(r, sLastId);
          if (!sfh) break;
          sLastId = sfh.id;
          if (sfh.id === 4 && sfh.type === CT.BINARY) name = decodeUtf8(r.binary());
          else skipValue(r, sfh.type);
        }
        if (name) colNames.push(name);
      }
    } else if (fh.id === 3 && fh.type === CT.I64) {
      numRows = zigzagBig(r.varintBig());
    } else if (fh.id === 6 && fh.type === CT.BINARY) {
      createdBy = decodeUtf8(r.binary());
    } else {
      skipValue(r, fh.type);
    }
  }
  return { version, numRows: numRows != null ? Number(numRows) : null, createdBy, colNames };
}

// Locate and decode the footer; returns null if the file isn't recognizable as Parquet,
// and falls back to positional facts only if the footer can't be structurally walked
// (corrupt file / unsupported encoding) rather than throwing.
export function readParquetFooter(b) {
  if (!b || b.length < 12) return null;
  if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'PAR1') return null;
  if (String.fromCharCode(...b.slice(b.length - 4)) !== 'PAR1') return null;
  const footerLen = r32le(b, b.length - 8);
  if (footerLen < 1 || footerLen > b.length - 12) return null;
  const footerOff = b.length - 8 - footerLen;
  try {
    return { footerLen, footerOff, ...decodeFooter(b, footerOff, footerLen) };
  } catch {
    return { footerLen, footerOff, version: null, numRows: null, createdBy: null, colNames: [] };
  }
}

export function extractMetadata(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) return {};
  const magic = String.fromCharCode(b[0], b[1], b[2], b[3]);
  if (magic !== 'PAR1') return {};
  const result = { Format: 'Apache Parquet', 'File Size': `${b.length} bytes` };
  const footer = readParquetFooter(b);
  if (footer) {
    result['Footer Size'] = `${footer.footerLen} bytes`;
    if (footer.version != null) result['Format Version'] = String(footer.version);
    if (footer.numRows != null) result['Row Count'] = String(footer.numRows);
    if (footer.createdBy) result['Created By'] = footer.createdBy;
    if (footer.colNames.length) result['Columns'] = String(footer.colNames.length);
  }
  return result;
}
