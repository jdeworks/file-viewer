// Unit tests for the pure image-fill helpers (extracted from image/renderer.js).
// No DOM / canvas needed — these operate on plain RGBA byte arrays.
import { hexToRgba, floodFill, bgFloodFill, computeRegionMask, clipToBase } from '../docs/types/image/fill.js';

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

// ── floodFill region (Sobel edge-stop) mode: stops at a luminance edge ──
{
  // 8×8 split: left 4 cols dark, right 4 cols light → a sharp vertical edge at x=3/4.
  const w = 8, h = 8;
  const d = buf(w, h, (x) => (x < 4 ? [60, 60, 60] : [190, 190, 190]));
  // Region mode ignores colour; seeded in the dark half it must not leak into the
  // light half's interior. tol low → even a soft edge halts the spread.
  const cnt = floodFill(d, w, h, 1, 4, [255, 0, 0, 255], 4, { mode: 'region' });
  ok(cnt > 1 && cnt < w * h, `floodFill region: fills a bounded area, not 1px and not all (${cnt})`);
  ok(JSON.stringify(pixel(d, w, 6, 4)) === JSON.stringify([190, 190, 190, 255]), 'floodFill region: does not cross the edge into the light interior');
}

// ── floodFill perceptual: a pure-grey difference matches the plain-RGB result ──
{
  // grey gradient row: neighbours differ by 10 each. With tol=15, both metrics must
  // agree on greys (perceptual is normalised to the RGB scale for neutral colours).
  const w = 6, h = 1;
  const grey = (x) => [x * 10, x * 10, x * 10];
  const a = buf(w, h, grey), b = buf(w, h, grey);
  const ca = floodFill(a, w, h, 0, 0, [255, 0, 0, 255], 15, { mode: 'shade', perceptual: false });
  const cb = floodFill(b, w, h, 0, 0, [255, 0, 0, 255], 15, { mode: 'shade', perceptual: true });
  ok(ca === cb, `floodFill perceptual: neutral-grey fill matches RGB scale (${ca} vs ${cb})`);
}

// ── floodFill feather: a 1px fill leaves a partial (anti-aliased) halo outside ──
{
  // single white pixel centre, black surround; tol 0 fills only the centre. With
  // feather, the centre is fully filled and its neighbours get a partial blend.
  const w = 3, h = 3;
  const d = buf(w, h, (x, y) => (x === 1 && y === 1 ? [255, 255, 255] : [0, 0, 0]));
  const cnt = floodFill(d, w, h, 1, 1, [200, 0, 0, 255], 0, { feather: true });
  ok(cnt === 1, 'floodFill feather: still fills exactly the one matched pixel');
  ok(JSON.stringify(pixel(d, w, 1, 1)) === JSON.stringify([200, 0, 0, 255]), 'floodFill feather: the filled pixel is fully opaque fill colour (interior not hollowed)');
  const halo = pixel(d, w, 0, 1);   // an edge neighbour of the centre
  ok(halo[0] > 0 && halo[0] < 200, `floodFill feather: neighbour gets a partial halo (r=${halo[0]})`);
}

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

// ── computeRegionMask (magic-wand): same region the bucket would fill, as a mask ──
{
  // left column black, rest white; seed in white → mask covers the 2 white pixels only.
  const w = 3, h = 1;
  const d = buf(w, h, (x) => (x === 0 ? [0, 0, 0] : [255, 255, 255]));
  const m = computeRegionMask(d, w, h, 2, 0, 0, { mode: 'seed' });
  ok(m instanceof Uint8Array && m.length === w * h, 'computeRegionMask: returns a per-pixel Uint8Array mask');
  ok(m[0] === 0 && m[1] === 1 && m[2] === 1, 'computeRegionMask: marks the connected same-colour region (not across the edge)');
  ok(computeRegionMask(d, w, h, 9, 9, 0) === null, 'computeRegionMask: out-of-bounds seed → null');
  // The mask is exactly the set floodFill would paint (same walk).
  const painted = buf(w, h, (x) => (x === 0 ? [0, 0, 0] : [255, 255, 255]));
  const cnt = floodFill(painted, w, h, 2, 0, [1, 2, 3, 255], 0, { mode: 'seed' });
  ok(cnt === m.reduce((a, v) => a + v, 0), 'computeRegionMask: mask popcount equals floodFill count (shared walk)');
}

// ── clipToBase: restores out-of-mask pixels from the base (selection constraint) ──
{
  const w = 2, h = 1;
  const edited = buf(w, h, () => [9, 9, 9, 9]);    // both pixels "edited"
  const base = buf(w, h, () => [40, 50, 60, 255]); // original
  const mask = new Uint8Array([1, 0]);             // only pixel 0 is selected
  clipToBase(edited, base, mask);
  ok(JSON.stringify(pixel(edited, w, 0, 0)) === JSON.stringify([9, 9, 9, 9]), 'clipToBase: keeps the edited value inside the mask');
  ok(JSON.stringify(pixel(edited, w, 1, 0)) === JSON.stringify([40, 50, 60, 255]), 'clipToBase: restores the base value outside the mask');
}

console.log(failed ? `\n${failed} assertion(s) failed` : '\nall image-fill assertions passed');
process.exit(failed ? 1 : 0);
