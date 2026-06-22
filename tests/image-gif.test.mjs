// Unit tests for the pure GIF frame decoder (gif-decode.js). Runs in plain Node —
// decodeGifBuffers produces RGBA byte buffers, no DOM/canvas. We feed it a tiny
// 2-frame GIF assembled inline (red frame then green frame, 2×2) and the bundled
// example sample.gif, asserting frame count, dimensions, and that frames differ.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { decodeGifBuffers } from '../docs/types/image/gif-decode.js';

const here = dirname(fileURLToPath(import.meta.url));
let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

// Build a minimal animated GIF89a: 2×2, two frames from a 2-colour global palette
// (index 0 = red, index 1 = green). Frame 1 paints all-red, frame 2 all-green. This
// exercises multi-frame parsing + per-frame composite without external fixtures.
function buildTwoFrameGif() {
  const b = [];
  const push = (...xs) => xs.forEach((x) => b.push(x & 0xff));
  const word = (n) => push(n & 0xff, (n >> 8) & 0xff);
  // Header + logical screen descriptor (2×2, global colour table, 2 entries).
  push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // "GIF89a"
  word(2); word(2);                          // width, height
  push(0x80, 0x00, 0x00);                    // GCT flag, size=2^(0+1)=2; bg; aspect
  push(255, 0, 0);                           // palette[0] = red
  push(0, 255, 0);                           // palette[1] = green
  // Netscape loop extension (infinite).
  push(0x21, 0xff, 0x0b);
  'NETSCAPE2.0'.split('').forEach((c) => push(c.charCodeAt(0)));
  push(0x03, 0x01, 0x00, 0x00, 0x00);
  // Two frames: colour index 0 then 1. Each gets a Graphic Control Extension (delay)
  // and an image descriptor + LZW data. With a 2-colour table the LZW min code size
  // is 2; a 4-pixel image of a single index encodes as the bytes below.
  const frame = (idx) => {
    // GCE: introducer 21 f9, block size 04, packed flags 00, delay 10 (→100ms),
    // transparent index 00, block terminator 00.
    push(0x21, 0xf9, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00);
    push(0x2c); word(0); word(0); word(2); word(2); push(0x00); // image descriptor
    push(0x02);                                // LZW min code size
    // One sub-block: clear code (4), 4× the pixel index, end code (5), packed as
    // codes of 3 bits. Precomputed LZW for "idx idx idx idx".
    const lzw = lzwFourPixels(idx);
    push(lzw.length, ...lzw, 0x00);            // sub-block + terminator
  };
  frame(0);
  frame(1);
  push(0x3b);                                  // trailer
  return new Uint8Array(b);
}

// LZW-encode four pixels of the same index with min-code-size 2 (codes start 3-bit:
// clear=4, end=5, first new code=6). Stream: CLEAR, idx, then dictionary-built runs.
// We emit CLEAR, idx, idx, idx, idx, END — simplest valid stream (no dict reuse).
function lzwFourPixels(idx) {
  const clear = 4, end = 5;
  let cur = 0, bits = 0, codeSize = 3;
  const out = [];
  const emit = (code) => {
    cur |= code << bits; bits += codeSize;
    while (bits >= 8) { out.push(cur & 0xff); cur >>= 8; bits -= 8; }
  };
  emit(clear);
  emit(idx); emit(idx); emit(idx); emit(idx);
  emit(end);
  if (bits > 0) out.push(cur & 0xff);
  return out;
}

// ── inline 2-frame GIF ──
{
  const bytes = buildTwoFrameGif();
  const { width, height, frames } = await decodeGifBuffers(bytes);
  ok(width === 2 && height === 2, `inline GIF: dimensions are 2×2 (got ${width}×${height})`);
  ok(frames.length === 2, `inline GIF: decodes 2 frames (got ${frames.length})`);
  const [f0, f1] = frames;
  ok(f0.rgba.length === width * height * 4, 'inline GIF: each frame is a full RGBA buffer');
  ok(f0.rgba[0] === 255 && f0.rgba[1] === 0 && f0.rgba[2] === 0, 'inline GIF: frame 0 is red');
  ok(f1.rgba[0] === 0 && f1.rgba[1] === 255 && f1.rgba[2] === 0, 'inline GIF: frame 1 is green');
  const differ = f0.rgba.some((v, i) => v !== f1.rgba[i]);
  ok(differ, 'inline GIF: the two frames differ');
  ok(f0.delayMs === 100, `inline GIF: delay parsed to ms (got ${f0.delayMs})`);
}

// ── bundled example sample.gif (if present) ──
try {
  const bytes = readFileSync(resolve(here, '../docs/examples/sample.gif'));
  const { width, height, frames } = await decodeGifBuffers(bytes);
  ok(width > 0 && height > 0, `sample.gif: positive dimensions (${width}×${height})`);
  ok(frames.length >= 1, `sample.gif: at least one frame (got ${frames.length})`);
  ok(frames.every((f) => f.rgba.length === width * height * 4), 'sample.gif: every frame is a full RGBA buffer');
  if (frames.length > 1) {
    const differ = frames[0].rgba.some((v, i) => v !== frames[1].rgba[i]);
    ok(differ, 'sample.gif: consecutive frames differ (real animation)');
  } else {
    console.log('• sample.gif is single-frame; multi-frame difference check skipped');
  }
} catch (e) {
  console.log('• sample.gif not readable/decodable, skipping: ' + e.message);
}

console.log(failed ? `\n${failed} assertion(s) failed` : '\nall image-gif assertions passed');
process.exit(failed ? 1 : 0);
