// PLY (Polygon File Format) parser → triangle mesh for the shared mesh viewer. Supports ASCII and
// binary_little_endian (+ big_endian). Reads vertex x/y/z and the face vertex-index list (any
// extra properties like colors/normals are skipped but their byte sizes are accounted for in the
// binary path). Polygons are fan-triangulated; per-face normals are computed. Pure JS.
import { bounds } from '../../../core/meshview.js';

const TYPE_BYTES = { char: 1, uchar: 1, int8: 1, uint8: 1, short: 2, ushort: 2, int16: 2, uint16: 2, int: 4, uint: 4, int32: 4, uint32: 4, float: 4, float32: 4, double: 8, float64: 8 };
const READERS = {
  char: ['getInt8', 1], uchar: ['getUint8', 1], int8: ['getInt8', 1], uint8: ['getUint8', 1],
  short: ['getInt16', 2], ushort: ['getUint16', 2], int16: ['getInt16', 2], uint16: ['getUint16', 2],
  int: ['getInt32', 4], uint: ['getUint32', 4], int32: ['getInt32', 4], uint32: ['getUint32', 4],
  float: ['getFloat32', 4], float32: ['getFloat32', 4], double: ['getFloat64', 8], float64: ['getFloat64', 8],
};

function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function vnorm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function triangulate(verts, idx, tris) {
  for (let i = 1; i + 1 < idx.length; i++) {
    const a = verts[idx[0]], b = verts[idx[i]], c = verts[idx[i + 1]];
    if (a && b && c) tris.push({ v: [a, b, c], n: vnorm(vcross(vsub(b, a), vsub(c, a))) });
  }
}

function parseHeader(bytes) {
  // Header is ASCII up to and including a line "end_header\n".
  const text = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 65536)));
  const end = text.indexOf('end_header');
  if (end < 0) throw new Error('no PLY header');
  const headerEnd = text.indexOf('\n', end) + 1;
  const lines = text.slice(0, end).split(/\r?\n/);
  let format = 'ascii';
  const elements = [];
  const comments = [];
  for (const line of lines) {
    const p = line.trim().split(/\s+/);
    if (p[0] === 'format') format = p[1];
    else if (p[0] === 'comment') comments.push(line.trim().slice(8).trim());
    else if (p[0] === 'element') elements.push({ name: p[1], count: +p[2], props: [] });
    else if (p[0] === 'property' && elements.length) {
      const el = elements[elements.length - 1];
      if (p[1] === 'list') el.props.push({ list: true, countType: p[2], itemType: p[3], name: p[4] });
      else el.props.push({ type: p[1], name: p[2] });
    }
  }
  return { format, elements, comments, dataOffset: headerEnd };
}

function parseAsciiBody(bytes, header) {
  const text = new TextDecoder('latin1').decode(bytes);
  const toks = text.slice(header.dataOffset).trim().split(/\s+/);
  let t = 0;
  const next = () => +toks[t++];
  const verts = [];
  const tris = [];
  for (const el of header.elements) {
    const xi = el.props.findIndex((p) => p.name === 'x'), yi = el.props.findIndex((p) => p.name === 'y'), zi = el.props.findIndex((p) => p.name === 'z');
    for (let i = 0; i < el.count; i++) {
      if (el.name === 'vertex') {
        const row = el.props.map(() => next());
        verts.push([row[xi], row[yi], row[zi]]);
      } else if (el.name === 'face') {
        const listProp = el.props.find((p) => p.list);
        if (!listProp) { el.props.forEach(() => next()); continue; }
        const n = next(); const idx = []; for (let k = 0; k < n; k++) idx.push(next());
        triangulate(verts, idx, tris);
      } else {
        el.props.forEach((p) => { if (p.list) { const n = next(); for (let k = 0; k < n; k++) next(); } else next(); });
      }
    }
  }
  return tris;
}

function parseBinaryBody(bytes, header) {
  const le = header.format === 'binary_little_endian';
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let o = header.dataOffset;
  const rd = (type) => { const [fn, sz] = READERS[type]; const v = dv[fn](o, le); o += sz; return v; };
  const verts = [];
  const tris = [];
  for (const el of header.elements) {
    const names = el.props.map((p) => p.name);
    const xi = names.indexOf('x'), yi = names.indexOf('y'), zi = names.indexOf('z');
    for (let i = 0; i < el.count; i++) {
      if (el.name === 'vertex') {
        const row = el.props.map((p) => rd(p.type));
        verts.push([row[xi], row[yi], row[zi]]);
      } else if (el.name === 'face') {
        for (const p of el.props) {
          if (p.list) { const n = rd(p.countType); const idx = []; for (let k = 0; k < n; k++) idx.push(rd(p.itemType)); triangulate(verts, idx, tris); }
          else rd(p.type);
        }
      } else {
        for (const p of el.props) { if (p.list) { const n = rd(p.countType); for (let k = 0; k < n; k++) rd(p.itemType); } else rd(p.type); }
      }
    }
  }
  return tris;
}

export function parsePLY(intake) {
  const bytes = intake.bytes;
  const header = parseHeader(bytes);
  const tris = header.format === 'ascii' ? parseAsciiBody(bytes, header) : parseBinaryBody(bytes, header);
  const vertex = header.elements.find((e) => e.name === 'vertex');
  const face = header.elements.find((e) => e.name === 'face');
  return {
    tris,
    format: header.format,
    vertexCount: vertex ? vertex.count : 0,
    faceCount: face ? face.count : 0,
    elementCount: header.elements.length,
    commentCount: header.comments.length,
    comments: header.comments,
    ...bounds(tris),
  };
}
