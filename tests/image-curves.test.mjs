// Unit tests for the pure tone-curve mapping (image/curves.js). No DOM needed.
import { buildCurveLUT, buildChannelLUTs, applyChannelLUTs } from '../docs/types/image/curves.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

// ── Identity: the diagonal (0,0)→(255,255) maps every value to itself ──
{
  const lut = buildCurveLUT([{ x: 0, y: 0 }, { x: 255, y: 255 }]);
  let identity = true;
  for (let i = 0; i < 256; i++) if (lut[i] !== i) { identity = false; break; }
  ok(identity, 'buildCurveLUT: the straight diagonal is the identity map');
  ok(lut instanceof Uint8ClampedArray && lut.length === 256, 'returns a 256-entry Uint8ClampedArray');
}

// ── A lifted midpoint brightens the midtones but keeps the endpoints pinned ──
{
  const lut = buildCurveLUT([{ x: 0, y: 0 }, { x: 128, y: 180 }, { x: 255, y: 255 }]);
  ok(lut[0] === 0 && lut[255] === 255, 'curve keeps the endpoints fixed (0→0, 255→255)');
  ok(lut[128] >= 178 && lut[128] <= 182, `lifted midpoint maps ~180 (${lut[128]})`);
  ok(lut[64] > 64, `below-mid value rides up with the lifted curve (${lut[64]} > 64)`);
}

// ── Monotone: a monotone set of handles never produces a decreasing LUT (no overshoot) ──
{
  const lut = buildCurveLUT([{ x: 0, y: 0 }, { x: 64, y: 20 }, { x: 192, y: 235 }, { x: 255, y: 255 }]);
  let monotone = true;
  for (let i = 1; i < 256; i++) if (lut[i] < lut[i - 1]) { monotone = false; break; }
  ok(monotone, 'monotone handles → non-decreasing LUT (Fritsch–Carlson, no overshoot)');
}

// ── An inverted curve (0,255)→(255,0) flips light and dark ──
{
  const lut = buildCurveLUT([{ x: 0, y: 255 }, { x: 255, y: 0 }]);
  ok(lut[0] === 255 && lut[255] === 0, 'inverted curve maps 0→255 and 255→0');
  ok(Math.abs(lut[128] - 127) <= 1, `inverted curve crosses near mid (${lut[128]})`);
}

// ── Robustness: unsorted / missing-endpoint / single-point input still yields a valid LUT ──
{
  const unsorted = buildCurveLUT([{ x: 255, y: 255 }, { x: 128, y: 100 }, { x: 0, y: 0 }]);
  ok(unsorted[128] >= 98 && unsorted[128] <= 102, `unsorted handles are sorted before mapping (${unsorted[128]})`);
  const clipped = buildCurveLUT([{ x: 64, y: 64 }, { x: 192, y: 128 }]);  // no 0 / 255 endpoints
  ok(clipped[0] === 64 && clipped[255] === 128, 'missing endpoints are extended flat from the nearest handle');
  const single = buildCurveLUT([{ x: 128, y: 50 }]);
  ok(single instanceof Uint8ClampedArray && single.length === 256, 'a single handle still returns a 256-entry LUT');
  const empty = buildCurveLUT([]);
  ok(empty[0] === 0 && empty[255] === 255, 'empty input falls back to the identity diagonal');
}

// ── Per-channel: buildChannelLUTs composes master ∘ channel; applyChannelLUTs maps R/G/B independently ──
{
  const idAll = buildChannelLUTs({ rgb: [], r: [], g: [], b: [] });
  let id = true;
  for (let i = 0; i < 256; i++) if (idAll.r[i] !== i || idAll.g[i] !== i || idAll.b[i] !== i) { id = false; break; }
  ok(id, 'buildChannelLUTs: all-identity channels → identity per channel');

  // Red channel lifted, green/blue identity → only R changes.
  const redUp = buildChannelLUTs({ rgb: [], r: [{ x: 0, y: 0 }, { x: 128, y: 200 }, { x: 255, y: 255 }], g: [], b: [] });
  ok(redUp.r[128] > 128 && redUp.g[128] === 128 && redUp.b[128] === 128, `red curve lifts only R (r=${redUp.r[128]}, g=${redUp.g[128]}, b=${redUp.b[128]})`);

  // Master inverts, channels identity → every composed channel inverts (master runs on top).
  const masterInv = buildChannelLUTs({ rgb: [{ x: 0, y: 255 }, { x: 255, y: 0 }], r: [], g: [], b: [] });
  ok(masterInv.r[0] === 255 && masterInv.g[255] === 0 && masterInv.b[0] === 255, 'master curve composes onto all channels (invert)');

  // applyChannelLUTs maps each channel through its own LUT, alpha untouched.
  const data = new Uint8ClampedArray([10, 20, 30, 123]);
  const luts = buildChannelLUTs({ rgb: [], r: [{ x: 0, y: 0 }, { x: 255, y: 255 }], g: [], b: [] });
  applyChannelLUTs(data, luts);
  ok(data[0] === luts.r[10] && data[1] === luts.g[20] && data[2] === luts.b[30], 'applyChannelLUTs: per-channel mapping');
  ok(data[3] === 123, 'applyChannelLUTs: leaves alpha unchanged');
}

console.log(failed ? `\n${failed} assertion(s) failed` : '\nall image-curves assertions passed');
process.exit(failed ? 1 : 0);
