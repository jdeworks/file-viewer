// STL (stereolithography) parser — binary and ASCII. Returns a flat triangle list with vertices
// and a normal per face (computed if the file's normal is missing/zero). Pure JS, no dependency.
import { bounds } from '../../core/meshview.js';

function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function vnorm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function faceNormal(v0, v1, v2) { return vnorm(vcross(vsub(v1, v0), vsub(v2, v0))); }

// Binary STL: 80-byte header, uint32 triangle count, then 50 bytes per triangle.
function isBinary(bytes) {
  if (bytes.length < 84) return false;
  const count = new DataView(bytes.buffer, bytes.byteOffset).getUint32(80, true);
  return bytes.length === 84 + count * 50;
}

function parseBinary(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset);
  const count = dv.getUint32(80, true);
  const tris = [];
  let o = 84;
  for (let i = 0; i < count; i++) {
    let n = [dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)];
    const v0 = [dv.getFloat32(o + 12, true), dv.getFloat32(o + 16, true), dv.getFloat32(o + 20, true)];
    const v1 = [dv.getFloat32(o + 24, true), dv.getFloat32(o + 28, true), dv.getFloat32(o + 32, true)];
    const v2 = [dv.getFloat32(o + 36, true), dv.getFloat32(o + 40, true), dv.getFloat32(o + 44, true)];
    if (!(n[0] || n[1] || n[2])) n = faceNormal(v0, v1, v2);
    tris.push({ v: [v0, v1, v2], n });
    o += 50;
  }
  return tris;
}

function parseAscii(text) {
  const tris = [];
  const nums = (s) => s.trim().split(/\s+/).slice(-3).map(Number);
  const facetRe = /facet\s+normal\s+([^\n]*)\n([\s\S]*?)endfacet/gi;
  let m;
  while ((m = facetRe.exec(text))) {
    const n0 = nums('x ' + m[1]);
    const verts = [...m[2].matchAll(/vertex\s+([^\n]*)/gi)].slice(0, 3).map((mm) => nums('x ' + mm[1]));
    if (verts.length !== 3) continue;
    let n = (n0[0] || n0[1] || n0[2]) ? vnorm(n0) : faceNormal(verts[0], verts[1], verts[2]);
    tris.push({ v: verts, n });
  }
  return tris;
}

export function parseSTL(intake) {
  const bytes = intake.bytes;
  let tris;
  if (!intake.isBinary && /^\s*solid/i.test(intake.text || '') && /facet/i.test(intake.text || '')) tris = parseAscii(intake.text);
  else if (isBinary(bytes)) tris = parseBinary(bytes);
  else tris = parseAscii(new TextDecoder().decode(bytes));   // last resort
  return { tris, ...bounds(tris) };
}
