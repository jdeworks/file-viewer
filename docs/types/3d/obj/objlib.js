// Wavefront OBJ parser → triangle mesh for the shared mesh viewer. Reads `v` (vertices) and `vn`
// (normals); `f` faces (any of v, v/vt, v/vt/vn, v//vn; positive or negative indices); polygons
// are fan-triangulated. Per-face normals are taken from `vn` when present, else computed. Other
// directives (vt, groups, materials) are ignored. Pure JS, no dependency.
import { bounds } from '../../../core/meshview.js';

function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function vnorm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

export function parseOBJ(text) {
  const verts = [], normals = [];
  const tris = [];
  for (const raw of (text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line[0] === '#') continue;
    const parts = line.split(/\s+/);
    const tag = parts[0];
    if (tag === 'v') verts.push([+parts[1], +parts[2], +parts[3]]);
    else if (tag === 'vn') normals.push([+parts[1], +parts[2], +parts[3]]);
    else if (tag === 'f') {
      const refs = parts.slice(1).map((tok) => {
        const seg = tok.split('/');
        const vi = parseInt(seg[0], 10);
        const ni = seg[2] ? parseInt(seg[2], 10) : NaN;
        return {
          v: vi < 0 ? verts.length + vi : vi - 1,
          n: Number.isNaN(ni) ? -1 : (ni < 0 ? normals.length + ni : ni - 1),
        };
      }).filter((r) => verts[r.v]);
      // Fan-triangulate the polygon.
      for (let i = 1; i + 1 < refs.length; i++) {
        const a = verts[refs[0].v], b = verts[refs[i].v], c = verts[refs[i + 1].v];
        let n;
        const ni = refs[0].n;
        if (ni >= 0 && normals[ni]) n = vnorm(normals[ni]);
        else n = vnorm(vcross(vsub(b, a), vsub(c, a)));
        tris.push({ v: [a, b, c], n });
      }
    }
  }
  return { tris, vertexCount: verts.length, ...bounds(tris) };
}
