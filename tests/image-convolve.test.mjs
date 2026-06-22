// Unit tests for the pure Sharpen/Blur convolution (image/convolve.js). No DOM needed.
import { buildKernel, applyConvolution } from '../docs/types/image/convolve.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };
const sum = (k) => k.reduce((a, b) => a + b, 0);

// ── Strength 0 is a guaranteed no-op (identity kernel) for either type ──
{
  const blur0 = buildKernel('blur', 0), sharp0 = buildKernel('sharpen', 0);
  const ident = [0, 0, 0, 0, 1, 0, 0, 0, 0];
  ok(blur0.every((v, i) => Math.abs(v - ident[i]) < 1e-9), 'buildKernel blur@0 = identity');
  ok(sharp0.every((v, i) => Math.abs(v - ident[i]) < 1e-9), 'buildKernel sharpen@0 = identity');
}

// ── Kernels stay normalised (sum ≈ 1) so flat regions keep their brightness ──
{
  ok(Math.abs(sum(buildKernel('blur', 1)) - 1) < 1e-9, 'blur@1 kernel sums to 1');
  ok(Math.abs(sum(buildKernel('sharpen', 1)) - 1) < 1e-9, 'sharpen@1 kernel sums to 1');
  // Full Gaussian blur weights
  const g = buildKernel('blur', 1);
  ok(Math.abs(g[4] - 4 / 16) < 1e-9 && Math.abs(g[0] - 1 / 16) < 1e-9, 'blur@1 = Gaussian [1 2 1;2 4 2;1 2 1]/16');
}

// ── applyConvolution on a flat field is unchanged (normalised kernel, edge-clamped) ──
{
  const w = 3, h = 3;
  const data = new Uint8ClampedArray(w * h * 4).fill(120);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;   // opaque
  const out = applyConvolution(data, w, h, buildKernel('blur', 1));
  let flat = true;
  for (let i = 0; i < out.length; i += 4) if (Math.abs(out[i] - 120) > 1) { flat = false; break; }
  ok(flat, 'blur on a flat field keeps the value (edge clamp, no border darkening)');
  ok(out[3] === 255, 'convolution preserves alpha');
}

// ── Blur on a hot center pixel spreads it: center drops, neighbours rise ──
{
  const w = 3, h = 3;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  const ci = (1 * w + 1) * 4;
  data[ci] = data[ci + 1] = data[ci + 2] = 240;   // bright center on a black field
  const out = applyConvolution(data, w, h, buildKernel('blur', 1));
  ok(out[ci] < 240, `blur lowers the hot center (${out[ci]} < 240)`);
  const ni = (0 * w + 1) * 4;                      // top-middle neighbour
  ok(out[ni] > 0, `blur bleeds into a neighbour (${out[ni]} > 0)`);
  // Center weight is 4/16 of 240 plus clamped-edge contributions; verify it equals
  // the exact Gaussian result so the kernel math is pinned, not just "smaller".
  ok(out[ci] === Math.round(240 * 4 / 16), `blur center = Gaussian-exact (${out[ci]})`);
}

// ── Sharpen increases local contrast: a bright center gets brighter vs its surround ──
{
  const w = 3, h = 3;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  for (let i = 0; i < data.length; i += 4) { data[i] = data[i + 1] = data[i + 2] = 100; }
  const ci = (1 * w + 1) * 4;
  data[ci] = data[ci + 1] = data[ci + 2] = 160;   // a peak above the 100 surround
  const out = applyConvolution(data, w, h, buildKernel('sharpen', 1));
  ok(out[ci] > 160, `sharpen pushes the peak higher (${out[ci]} > 160)`);
}

console.log(failed ? `\n${failed} assertion(s) failed` : '\nall image-convolve assertions passed');
process.exit(failed ? 1 : 0);
