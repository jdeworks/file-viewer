// Unit tests for the pure geometry affine descriptors (image/geometry-affine.js) —
// the OLD-natural → NEW-natural point maps the Adv-Edit overlay uses to ride a
// rotate/flip/crop/resize/expand without baking. No DOM/Konva needed.
import { affineForGeometry, applyAffineToPoint } from '../docs/types/image/geometry-affine.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };
const eq = (p, x, y) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6;

const W = 100, H = 60;
const map = (type, x, y, p) => applyAffineToPoint(affineForGeometry(type, W, H, p), x, y);

// ── Rotate 90° CW: (x,y) → (H - y, x); new dims (H, W) ──
ok(eq(map('rotateCW', 0, 0), H, 0), 'rotateCW: top-left → top-right corner');
ok(eq(map('rotateCW', W, 0), H, W), 'rotateCW: top-right → bottom-right corner');
ok(eq(map('rotateCW', 10, 20), H - 20, 10), 'rotateCW: interior point maps (H-y, x)');

// ── Rotate 90° CCW: (x,y) → (y, W - x) ──
ok(eq(map('rotateCCW', 0, 0), 0, W), 'rotateCCW: top-left → bottom-left corner');
ok(eq(map('rotateCCW', 10, 20), 20, W - 10), 'rotateCCW: interior point maps (y, W-x)');

// CW then CCW returns to the original point (inverse pair).
{
  const a = affineForGeometry('rotateCW', W, H);
  const cw = applyAffineToPoint(a, 10, 20);            // into (H,W) space
  const back = applyAffineToPoint(affineForGeometry('rotateCCW', H, W), cw.x, cw.y);
  ok(eq(back, 10, 20), 'rotateCW then rotateCCW round-trips to the original point');
}

// ── Flips: mirror one axis, dims unchanged ──
ok(eq(map('flipH', 10, 20), W - 10, 20), 'flipH: mirrors x about the width');
ok(eq(map('flipV', 10, 20), 10, H - 20), 'flipV: mirrors y about the height');
ok(eq(map('flipH', W / 2, 20), W / 2, 20), 'flipH: the centre column is fixed');

// ── Crop: shift the origin to the crop corner ──
ok(eq(map('crop', 30, 25, { x1: 20, y1: 10 }), 10, 15), 'crop: subtracts the crop origin');

// ── Resize: scale toward the target dims ──
ok(eq(map('resize', 10, 20, { tw: 50, th: 120 }), 5, 40), 'resize: scales x by tw/W and y by th/H');

// ── Expand: content shifts in by the pad on every side ──
ok(eq(map('expand', 10, 20, { pad: 15 }), 25, 35), 'expand: adds the pad to both axes');

// ── Unknown type → identity ──
ok(eq(map('nope', 7, 9), 7, 9), 'unknown op → identity (point unchanged)');

console.log(failed ? `\n${failed} assertion(s) failed` : '\nall image-geometry assertions passed');
process.exit(failed ? 1 : 0);
