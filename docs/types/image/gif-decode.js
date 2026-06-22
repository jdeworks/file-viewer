// Lazy GIF frame decoder. The browser can paint an animated GIF in an <img>, but
// it gives us no frame-level access — no scrubbing, no per-frame export. This wraps
// the vendored gifuct-js bundle to decode a GIF into full-frame RGBA buffers,
// compositing the frame-disposal model so each frame is a complete picture (gifuct
// hands back only the changed `patch` region per frame). The vendored bundle + this
// module load only when a GIF is actually animated or split — never on first paint.
//
// The decode→composite core is pure (operates on plain RGBA byte arrays) so it's
// unit-testable in Node with no DOM; canvas wrapping is a thin DOM layer on top.

let mod = null;   // memoised { parseGIF, decompressFrames }

async function loadGifuct() {
  if (!mod) mod = await import('../../vendor/gifuct/gifuct.esm.js');
  return mod;
}

// Compose one frame's patch onto the running RGBA buffer. gifuct's `patch` covers
// only `dims` and uses alpha 0 for transparent pixels, so we blend (copy non-
// transparent pixels) rather than overwrite, leaving prior pixels visible through
// transparent areas. For disposal 3 (restore-to-previous) we snapshot the whole
// buffer first and return it so applyDisposal can put it back afterwards.
function compositePatch(full, fullW, frame) {
  const { dims, patch, disposalType } = frame;
  const { top, left, width, height } = dims;
  const prev = disposalType === 3 ? full.slice() : null;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      if (patch[pi + 3] === 0) continue;          // transparent patch pixel → keep underlying
      const fi = ((top + y) * fullW + (left + x)) * 4;
      full[fi] = patch[pi];
      full[fi + 1] = patch[pi + 1];
      full[fi + 2] = patch[pi + 2];
      full[fi + 3] = patch[pi + 3];
    }
  }
  return prev;
}

// Apply post-frame disposal, producing the base buffer the NEXT frame builds on:
//   1/0/default: leave in place. 2: clear this frame's rect to transparent.
//   3: restore the pre-frame snapshot.
function applyDisposal(full, fullW, frame, prev) {
  const { dims, disposalType } = frame;
  const { top, left, width, height } = dims;
  if (disposalType === 2) {
    for (let y = 0; y < height; y++) {
      const row = ((top + y) * fullW + left) * 4;
      full.fill(0, row, row + width * 4);
    }
  } else if (disposalType === 3 && prev) {
    full.set(prev);
  }
}

// Pure decode: bytes -> { width, height, frames: [{ rgba: Uint8ClampedArray, delayMs }] }.
// `rgba` is a full width*height*4 buffer for each frame (a snapshot of the running
// composite). No DOM. Reused by decodeGifFrames (which wraps each rgba in a canvas)
// and by unit tests. Single-frame GIFs still yield one frame, so callers are uniform.
export async function decodeGifBuffers(bytes) {
  const { parseGIF, decompressFrames } = await loadGifuct();
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const gif = parseGIF(buf);
  const raw = decompressFrames(gif, true);        // build:true → ready RGBA patches
  const width = gif.lsd.width;
  const height = gif.lsd.height;

  const full = new Uint8ClampedArray(width * height * 4);   // running composite
  const frames = [];
  for (const frame of raw) {
    const prev = compositePatch(full, width, frame);
    frames.push({ rgba: full.slice(), delayMs: frame.delay || 100 });
    applyDisposal(full, width, frame, prev);
  }
  return { width, height, frames };
}

// Decode into canvas-backed frames for playback/export (DOM/Offscreen required).
//   -> { width, height, frames: [{ canvas, delayMs }] }
export async function decodeGifFrames(bytes) {
  const { width, height, frames } = await decodeGifBuffers(bytes);
  return {
    width,
    height,
    frames: frames.map(({ rgba, delayMs }) => {
      const canvas = makeCanvas(width, height);
      canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0);
      return { canvas, delayMs };
    }),
  };
}

// Prefer OffscreenCanvas (no DOM attach needed); fall back to a detached <canvas>.
function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Encode one decoded frame's canvas to a PNG Blob (download / open-as-image).
export async function frameToPngBlob(canvas) {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type: 'image/png' });
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
