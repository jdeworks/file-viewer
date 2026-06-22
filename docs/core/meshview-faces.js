// Face-level selection helpers for the shared mesh viewer (meshview.js). Pure geometry / no DOM:
//   • ptInTri2D  — 2D point-in-triangle sign test (screen-space picking).
//   • buildAdjacency — weld vertices by quantized position, map each undirected edge → triangle
//     indices, so triangles can be flood-filled across shared edges.
//   • coplanarRegion — flood-fill from a hit triangle to the connected set of coplanar neighbours
//     (a flat cube side = its 2 fan-triangles). Used by the default "Region" select mode.
// No dependency. Adjacency is computed once per model and cached by the caller.

export function ptInTri2D(px2, py2, [ax, ay], [bx, by], [pcx, pcy]) {
  const d1 = (px2 - bx) * (ay - by) - (ax - bx) * (py2 - by);
  const d2 = (px2 - pcx) * (by - pcy) - (bx - pcx) * (py2 - pcy);
  const d3 = (px2 - ax) * (pcy - ay) - (pcx - ax) * (py2 - ay);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

// Build welded-vertex edge adjacency for a triangle list. Vertices are welded by quantizing each
// coordinate to a grid sized from the model (~1e-5 of the largest dimension) so that fan-triangles
// of one quad share keys. Returns { edgeTris } where edgeTris maps an undirected-edge key to the
// list of triangle indices touching that edge.
export function buildAdjacency(model) {
  const maxDim = Math.max(model.size?.[0] || 0, model.size?.[1] || 0, model.size?.[2] || 0) || 1;
  const q = maxDim * 1e-5 || 1e-9;
  const keyOf = (p) => Math.round(p[0] / q) + ',' + Math.round(p[1] / q) + ',' + Math.round(p[2] / q);
  const edgeTris = new Map();
  const tris = model.tris;
  for (let ti = 0; ti < tris.length; ti++) {
    const k = tris[ti].v.map(keyOf);
    for (let e = 0; e < 3; e++) {
      const a = k[e], b = k[(e + 1) % 3];
      const ek = a < b ? a + '|' + b : b + '|' + a;
      let arr = edgeTris.get(ek);
      if (!arr) { arr = []; edgeTris.set(ek, arr); }
      arr.push(ti);
    }
    tris[ti]._ek = k; // cache vertex keys for reuse in the flood-fill
  }
  return { edgeTris, q, keyOf };
}

// Flood-fill from triIdx to all connected triangles that lie in the same plane as the hit triangle
// (same normal direction within ε, and same plane offset within a model-scaled tolerance). Returns
// an array of triangle indices (always includes triIdx). ε ≈ 1e-3 on the normal dot; the offset
// tolerance scales with the model so it's robust across unit scales.
export function coplanarRegion(model, adj, triIdx) {
  const tris = model.tris;
  const start = tris[triIdx];
  if (!start) return [triIdx];
  const maxDim = Math.max(model.size?.[0] || 0, model.size?.[1] || 0, model.size?.[2] || 0) || 1;
  const epsN = 1e-3;
  const epsD = maxDim * 1e-3 || 1e-6;
  const n0 = start.n;
  const off0 = n0[0] * start.v[0][0] + n0[1] * start.v[0][1] + n0[2] * start.v[0][2];
  const coplanar = (t) => {
    const dot = n0[0] * t.n[0] + n0[1] * t.n[1] + n0[2] * t.n[2];
    if (dot <= 1 - epsN) return false; // require same-facing normal (not just parallel)
    const off = n0[0] * t.v[0][0] + n0[1] * t.v[0][1] + n0[2] * t.v[0][2];
    return Math.abs(off - off0) <= epsD;
  };
  const seen = new Set([triIdx]);
  const out = [triIdx];
  const stack = [triIdx];
  while (stack.length) {
    const cur = stack.pop();
    const k = tris[cur]._ek || tris[cur].v.map(adj.keyOf);
    for (let e = 0; e < 3; e++) {
      const a = k[e], b = k[(e + 1) % 3];
      const ek = a < b ? a + '|' + b : b + '|' + a;
      const arr = adj.edgeTris.get(ek);
      if (!arr) continue;
      for (const nbr of arr) {
        if (seen.has(nbr)) continue;
        if (!coplanar(tris[nbr])) continue;
        seen.add(nbr);
        out.push(nbr);
        stack.push(nbr);
      }
    }
  }
  return out;
}
