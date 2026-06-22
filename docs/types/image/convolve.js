// Pure 3×3 convolution for the Sharpen / Blur adjustment. No DOM — operates on the
// RGBA bytes from a canvas getImageData and returns a fresh Uint8ClampedArray (which
// clamps to 0–255 for free). Edges are clamped (nearest-pixel) so the border doesn't
// darken. `strength` ∈ [0,1] blends from identity (no-op) to the full effect, so the
// UI slider feels linear and 0 is always a guaranteed no-op.
//
//   blur   — blend identity → normalised Gaussian  [1 2 1; 2 4 2; 1 2 1]/16
//   sharpen— unsharp mask: identity + s·(identity − Gaussian), i.e. boost the
//            high-frequency detail the blur would remove.

const GAUSS = [1, 2, 1, 2, 4, 2, 1, 2, 1].map((v) => v / 16);
const IDENT = [0, 0, 0, 0, 1, 0, 0, 0, 0];

// Return a 3×3 row-major kernel (9 weights) for the given type + strength.
export function buildKernel(type, strength) {
  const s = Math.max(0, Math.min(1, +strength || 0));
  const out = new Array(9);
  if (type === 'sharpen') {
    for (let i = 0; i < 9; i++) out[i] = IDENT[i] + s * (IDENT[i] - GAUSS[i]);
  } else {
    for (let i = 0; i < 9; i++) out[i] = IDENT[i] * (1 - s) + GAUSS[i] * s;
  }
  return out;
}

// Apply a 3×3 kernel to RGBA `data` (w×h) with edge clamping; alpha is preserved.
export function applyConvolution(data, w, h, kernel) {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const di = (y * w + x) * 4;
      let r = 0, g = 0, b = 0, ki = 0;
      for (let ky = -1; ky <= 1; ky++) {
        const yy = y + ky < 0 ? 0 : y + ky >= h ? h - 1 : y + ky;
        for (let kx = -1; kx <= 1; kx++) {
          const xx = x + kx < 0 ? 0 : x + kx >= w ? w - 1 : x + kx;
          const si = (yy * w + xx) * 4;
          const wt = kernel[ki++];
          r += data[si] * wt; g += data[si + 1] * wt; b += data[si + 2] * wt;
        }
      }
      out[di] = r; out[di + 1] = g; out[di + 2] = b; out[di + 3] = data[di + 3];
    }
  }
  return out;
}
