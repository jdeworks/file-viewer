// Unit tests for the pure image-fill helpers (extracted from image/renderer.js).
// No DOM / canvas needed — these operate on plain RGBA byte arrays.
import { hexToRgba, floodFill, bgFloodFill } from '../docs/types/image/fill.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

// ── hexToRgba ──
ok(JSON.stringify(hexToRgba('#ff0000')) === JSON.stringify([255, 0, 0, 255]), 'hexToRgba: parses #ff0000 → opaque red');
ok(JSON.stringify(hexToRgba('#000000')) === JSON.stringify([0, 0, 0, 255]), 'hexToRgba: parses black');
ok(JSON.stringify(hexToRgba('3366cc')) === JSON.stringify([51, 102, 204, 255]), 'hexToRgba: tolerates a missing leading #');
ok(JSON.stringify(hexToRgba()) === JSON.stringify([255, 0, 0, 255]), 'hexToRgba: defaults to red on no input');

// Build a w×h RGBA buffer from a per-pixel colour fn.
const buf = (w, h, px) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a] = px(x, y); const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a == null ? 255 : a;
  }
  return d;
};
const pixel = (d, w, x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };

// ── floodFill: a solid 3×3 white region fills entirely (count = 9), in place ──
{
  const w = 3, h = 3;
  const d = buf(w, h, () => [255, 255, 255]);
  const cnt = floodFill(d, w, h, 1, 1, [0, 128, 255, 255], 0, false);
  ok(cnt === 9, 'floodFill: exact-match fill spreads across a uniform region (all 9 px)');
  ok(JSON.stringify(pixel(d, w, 0, 0)) === JSON.stringify([0, 128, 255, 255]), 'floodFill: writes the fill colour into the buffer');
}

// ── floodFill: tolerance 0 stops at a colour boundary ──
{
  // left column black, rest white; seed in white region must NOT cross into black.
  const w = 3, h = 1;
  const d = buf(w, h, (x) => (x === 0 ? [0, 0, 0] : [255, 255, 255]));
  const cnt = floodFill(d, w, h, 2, 0, [255, 0, 0, 255], 0, false);
  ok(cnt === 2, 'floodFill: exact match stops at a hard colour edge (2 of 3 px)');
  ok(JSON.stringify(pixel(d, w, 0, 0)) === JSON.stringify([0, 0, 0, 255]), 'floodFill: leaves the out-of-region pixel untouched');
}

// ── floodFill: out-of-bounds seed is a no-op ──
ok(floodFill(buf(2, 2, () => [0, 0, 0]), 2, 2, 9, 9, [1, 2, 3, 255], 0, false) === 0, 'floodFill: out-of-bounds seed fills nothing');

// ── bgFloodFill: punches the seed region transparent, returns new bytes ──
{
  const w = 3, h = 1;
  const src = { data: buf(w, h, (x) => (x === 0 ? [10, 10, 10] : [250, 250, 250])) };
  const out = bgFloodFill(src, w, h, 2, 0, 5); // tol 5 → threshold ~22, white region only
  ok(out instanceof Uint8ClampedArray && out.length === w * h * 4, 'bgFloodFill: returns a fresh RGBA byte array');
  ok(out[2 * 4 + 3] === 0 && out[1 * 4 + 3] === 0, 'bgFloodFill: makes the matched (white) region transparent');
  ok(out[0 * 4 + 3] === 255, 'bgFloodFill: leaves the distinct (dark) pixel opaque');
  ok(src.data[2 * 4 + 3] === 255, 'bgFloodFill: does not mutate the source data');
}

console.log(failed ? `\n${failed} assertion(s) failed` : '\nall image-fill assertions passed');
process.exit(failed ? 1 : 0);
