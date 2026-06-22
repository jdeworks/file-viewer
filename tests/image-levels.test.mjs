// Unit tests for the pure Levels tone-mapping (image/levels.js). No DOM needed.
import { buildLevelsLUT, applyLevels } from '../docs/types/image/levels.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

// ── Identity: black=0, white=255, gamma=1 → no change ──
{
  const lut = buildLevelsLUT(0, 255, 1);
  let identity = true;
  for (let i = 0; i < 256; i++) if (lut[i] !== i) { identity = false; break; }
  ok(identity, 'buildLevelsLUT: 0/255/1.0 is the identity map');
}

// ── Black/white point: clamps below black to 0, above white to 255, stretches between ──
{
  const lut = buildLevelsLUT(64, 192, 1);
  ok(lut[0] === 0 && lut[64] === 0, 'levels: values at/under the black point → 0');
  ok(lut[192] === 255 && lut[255] === 255, 'levels: values at/over the white point → 255');
  ok(lut[128] === 127 || lut[128] === 128, `levels: midpoint stretches to ~mid (${lut[128]})`);
}

// ── Gamma > 1 lifts midtones (brighter); gamma < 1 darkens them ──
{
  const up = buildLevelsLUT(0, 255, 2.0);
  const down = buildLevelsLUT(0, 255, 0.5);
  ok(up[128] > 128, `gamma 2.0 lifts the midtone (${up[128]} > 128)`);
  ok(down[128] < 128, `gamma 0.5 deepens the midtone (${down[128]} < 128)`);
  ok(up[0] === 0 && up[255] === 255, 'gamma keeps the endpoints fixed');
}

// ── Guards: white <= black is corrected; gamma <= 0 falls back to 1 ──
{
  const lut = buildLevelsLUT(200, 100, 0);   // white forced to black+1, gamma→1
  ok(lut instanceof Uint8ClampedArray && lut.length === 256, 'levels: returns a 256-entry LUT even with bad input');
  ok(lut[255] === 255, 'levels: degenerate range still maps the top to white');
}

// ── applyLevels: maps R/G/B in place, leaves alpha untouched ──
{
  const lut = buildLevelsLUT(0, 255, 2.0);
  const data = new Uint8ClampedArray([128, 128, 128, 200]);
  applyLevels(data, lut);
  ok(data[0] === lut[128] && data[1] === lut[128] && data[2] === lut[128], 'applyLevels: remaps R/G/B through the LUT');
  ok(data[3] === 200, 'applyLevels: leaves alpha unchanged');
}

console.log(failed ? `\n${failed} assertion(s) failed` : '\nall image-levels assertions passed');
process.exit(failed ? 1 : 0);
