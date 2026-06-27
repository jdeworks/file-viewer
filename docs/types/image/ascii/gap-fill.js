// Fill ENCLOSED transparent gaps in the ASCII cell grid — interior holes surrounded by
// content — while leaving the genuine, border-connected transparent background empty. Used
// when the "Fill enclosed gaps" option is on. Operates on the small cols×rows cell grid (a
// few thousand entries), so it's cheap even at high column counts.
//
// 1. Flood-fill from every border cell through EMPTY cells (alpha < cutoff) → those reachable
//    cells are the true background and stay transparent.
// 2. Every empty cell NOT reached is an interior hole. Dilate inward from filled neighbours,
//    giving each hole cell the mean luminance + colour of its non-empty 8-neighbours.

import { luminanceToChar } from './charsets.js';

export function fillEnclosedGaps(cells, columns, rows, ramp, invertRamp, cutoff) {
  if (rows < 3 || columns < 3) return;                 // nothing to enclose
  const empty = (c) => c.a < cutoff;
  // Mark background: BFS from the border through connected empty cells.
  const bg = new Uint8Array(columns * rows);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= columns || y >= rows) return;
    const k = y * columns + x;
    if (bg[k] || !empty(cells[y][x])) return;
    bg[k] = 1; stack.push(k);
  };
  for (let x = 0; x < columns; x++) { push(x, 0); push(x, rows - 1); }
  for (let y = 0; y < rows; y++) { push(0, y); push(columns - 1, y); }
  while (stack.length) {
    const k = stack.pop(), x = k % columns, y = (k / columns) | 0;
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
  }
  // Collect interior holes (empty, not background).
  let holes = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    if (empty(cells[y][x]) && !bg[y * columns + x]) holes.push([x, y]);
  }
  // Dilate inward: each pass fills holes touching at least one non-empty neighbour with the
  // neighbour mean, then repeats on what's left. Bounded by the grid (guards infinite loops).
  for (let guard = 0; holes.length && guard < columns + rows; guard++) {
    const next = [];
    for (const [x, y] of holes) {
      let r = 0, g = 0, b = 0, L = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= columns || ny >= rows) continue;
        const c = cells[ny][nx];
        if (empty(c)) continue;
        r += c.r; g += c.g; b += c.b; L += c.luminance; n++;
      }
      if (!n) { next.push([x, y]); continue; }         // no filled neighbour yet — try next pass
      const cell = cells[y][x];
      cell.r = r / n; cell.g = g / n; cell.b = b / n;
      cell.luminance = L / n;
      cell.a = 255;                                     // now opaque so it renders
      cell.ch = luminanceToChar(cell.luminance, ramp, invertRamp);
    }
    if (next.length === holes.length) break;            // stagnated — remaining holes are unreachable
    holes = next;
  }
}
