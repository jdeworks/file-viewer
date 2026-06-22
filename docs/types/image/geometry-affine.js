// Pure affine descriptors for the geometry ops (rotate/flip/crop/resize/expand),
// in the BASE image's natural-pixel space. Each maps an OLD-natural point (x,y) to
// the corresponding NEW-natural point after the op, so the vector overlay (Adv Edit)
// can transform its objects by the same matrix and stay registered + editable —
// instead of being flattened (baked) into the base. See ADV_EDIT.md "geometry seam".
//
// Matrix form is Konva's: [a, b, c, d, e, f] with
//   x' = a*x + c*y + e ,  y' = b*x + d*y + f
// so it can be handed straight to `new Konva.Transform([...])` for composition.

// `w`,`h` = the OLD natural width/height; `p` carries op params (crop origin, resize
// target, expand pad). Unknown types fall back to identity.
export function affineForGeometry(type, w, h, p = {}) {
  switch (type) {
    case 'rotateCW':  return [0, 1, -1, 0, h, 0];          // (x,y) → (h - y, x)
    case 'rotateCCW': return [0, -1, 1, 0, 0, w];          // (x,y) → (y, w - x)
    case 'flipH':     return [-1, 0, 0, 1, w, 0];          // (x,y) → (w - x, y)
    case 'flipV':     return [1, 0, 0, -1, 0, h];          // (x,y) → (x, h - y)
    case 'crop':      return [1, 0, 0, 1, -(p.x1 || 0), -(p.y1 || 0)];   // shift origin to the crop corner
    case 'resize':    return [(p.tw || w) / w, 0, 0, (p.th || h) / h, 0, 0];
    case 'expand':    return [1, 0, 0, 1, p.pad || 0, p.pad || 0];       // content shifts in by the pad
    default:          return [1, 0, 0, 1, 0, 0];
  }
}

// Apply a [a,b,c,d,e,f] matrix to a point — used by the unit tests (and handy for
// callers that just need to move a single coordinate).
export function applyAffineToPoint(m, x, y) {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}
