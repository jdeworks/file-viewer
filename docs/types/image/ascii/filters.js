// Image-processing passes applied BEFORE ASCII conversion.
//
// Two tiers:
//  1. buildFilterString() — brightness/contrast/saturation/hue/grayscale/sepia/
//     invert are done with the browser's native canvas `ctx.filter` at draw time.
//     This is GPU-accelerated and cheap enough for live webcam frames.
//  2. JS passes — threshold, sharpen, edge-detect operate on the resulting
//     ImageData because no CSS-filter equivalent exists. Each is a no-op at its
//     neutral setting so the fast path stays fast when they're unused.
//
// Pure functions over ImageData — no DOM, no module state.

import { clamp, luminance709 } from './charsets.js';

// Native canvas filter string from the colour options. Neutral options → 'none'.
export function buildFilterString(o) {
  const parts = [];
  if (o.brightness !== 1) parts.push(`brightness(${o.brightness})`);
  if (o.contrast !== 1) parts.push(`contrast(${o.contrast})`);
  if (o.saturation !== 1) parts.push(`saturate(${o.saturation})`);
  if (o.hue) parts.push(`hue-rotate(${o.hue}deg)`);
  if (o.grayscale) parts.push(`grayscale(${o.grayscale})`);
  if (o.sepia) parts.push(`sepia(${o.sepia})`);
  if (o.invertColors) parts.push(`invert(${o.invertColors})`);
  return parts.length ? parts.join(' ') : 'none';
}

// Hard luminance threshold → pure black/white. Mutates in place.
export function applyThreshold(imageData, threshold) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = luminance709(d[i], d[i + 1], d[i + 2]) >= threshold ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  return imageData;
}

// Generic 3×3 convolution producing a fresh Uint8ClampedArray (alpha preserved).
function convolve3x3(src, w, h, kernel) {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        const yy = clamp(y + ky, 0, h - 1);
        for (let kx = -1; kx <= 1; kx++) {
          const xx = clamp(x + kx, 0, w - 1);
          const k = kernel[(ky + 1) * 3 + (kx + 1)];
          const o = (yy * w + xx) * 4;
          r += src[o] * k; g += src[o + 1] * k; b += src[o + 2] * k;
        }
      }
      const o = (y * w + x) * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = src[o + 3];
    }
  }
  return out;
}

const SHARPEN = [0, -1, 0, -1, 5, -1, 0, -1, 0];

// Sharpen, strength 0–10. Blends original↔sharpened by strength/10 so 0 is a
// true no-op and 10 is the full kernel.
export function applySharpen(imageData, strength) {
  if (!strength) return imageData;
  const t = clamp(strength / 10, 0, 1);
  const { data, width, height } = imageData;
  const sharp = convolve3x3(data, width, height, SHARPEN);
  for (let i = 0; i < data.length; i++) {
    if ((i & 3) === 3) continue; // skip alpha
    data[i] = data[i] + (sharp[i] - data[i]) * t;
  }
  return imageData;
}

const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

// Sobel edge magnitude, strength 0–10. Blends the processed image with a
// grayscale edge map by strength/10.
export function applyEdgeDetect(imageData, strength) {
  if (!strength) return imageData;
  const t = clamp(strength / 10, 0, 1);
  const { data, width: w, height: h } = imageData;
  const gx = convolve3x3(data, w, h, SOBEL_X);
  const gy = convolve3x3(data, w, h, SOBEL_Y);
  for (let i = 0; i < data.length; i += 4) {
    const ex = luminance709(gx[i], gx[i + 1], gx[i + 2]);
    const ey = luminance709(gy[i], gy[i + 1], gy[i + 2]);
    const mag = clamp(Math.hypot(ex, ey), 0, 255);
    data[i] = data[i] + (mag - data[i]) * t;
    data[i + 1] = data[i + 1] + (mag - data[i + 1]) * t;
    data[i + 2] = data[i + 2] + (mag - data[i + 2]) * t;
  }
  return imageData;
}
