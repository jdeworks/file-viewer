// Connected-wall generation for Snake. Pure helpers (no DOM, no closures) so they're independently
// testable: build random straight bar segments and verify the open area stays fully reachable under
// the board's wrap-around adjacency, guaranteeing walls can never seal off a region.
const WALL_MIN_LEN = 2, WALL_MAX_LEN = 5;             // connected wall segments span 2..5 cells
const rand = (n) => Math.floor(Math.random() * n);

// Random straight bars (2..WALL_MAX_LEN cells), interior only (1-cell border margin), each kept a
// 1-cell gap from the others so two bars never fuse into an enclosure. `spawnY`'s row (±1) is left
// clear for the snake's start. Returns the flat wall-cell list.
function buildSegments(grid, spawnY, count) {
  const occ = new Set();
  const out = [];
  const M = 1;                                        // border margin
  const span = grid - 2 * M;                          // usable interior width
  const inSpawnLane = (y) => Math.abs(y - spawnY) <= 1;
  let placed = 0, guard = 0;
  while (placed < count && guard < 300) {
    guard++;
    const horiz = Math.random() < 0.5;
    const maxLen = Math.max(WALL_MIN_LEN, Math.min(WALL_MAX_LEN, span - 1));
    const len = WALL_MIN_LEN + rand(maxLen - WALL_MIN_LEN + 1);
    const ax = horiz ? len : 1, ay = horiz ? 1 : len;
    if (span - ax < 0 || span - ay < 0) continue;
    const x0 = M + rand(span - ax + 1);
    const y0 = M + rand(span - ay + 1);
    const seg = [];
    let ok = true;
    for (let i = 0; i < len && ok; i++) {
      const x = x0 + (horiz ? i : 0), y = y0 + (horiz ? 0 : i);
      if (inSpawnLane(y)) { ok = false; break; }
      for (let dx = -1; dx <= 1 && ok; dx++)           // require a clear 1-cell ring around the bar
        for (let dy = -1; dy <= 1; dy++)
          if (occ.has((x + dx) + ',' + (y + dy))) { ok = false; break; }
      if (ok) seg.push({ x, y });
    }
    if (!ok) continue;
    seg.forEach((c) => occ.add(c.x + ',' + c.y));
    out.push(...seg);
    placed++;
  }
  return out;
}

// Flood-fill the open cells using the SAME wrap-around adjacency the snake moves with; the board is
// fully reachable iff every non-wall cell is visited. Guarantees no walled-off pockets.
export function allReachable(grid, wallCells) {
  const blocked = new Set(wallCells.map((w) => w.x + ',' + w.y));
  const total = grid * grid - blocked.size;
  let start = null;
  for (let y = 0; y < grid && !start; y++)
    for (let x = 0; x < grid; x++)
      if (!blocked.has(x + ',' + y)) { start = { x, y }; break; }
  if (!start) return false;
  const seen = new Set([start.x + ',' + start.y]);
  const stack = [start];
  while (stack.length) {
    const p = stack.pop();
    const nbrs = [
      { x: (p.x + 1) % grid, y: p.y }, { x: (p.x - 1 + grid) % grid, y: p.y },
      { x: p.x, y: (p.y + 1) % grid }, { x: p.x, y: (p.y - 1 + grid) % grid },
    ];
    for (const n of nbrs) {
      const k = n.x + ',' + n.y;
      if (blocked.has(k) || seen.has(k)) continue;
      seen.add(k); stack.push(n);
    }
  }
  return seen.size === total;
}

// Build connected walls and keep retrying until the open area is provably connected; give up
// gracefully with an open board (no walls) rather than risk a trap.
export function generateWalls(grid, spawnY, count) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const candidate = buildSegments(grid, spawnY, count);
    if (candidate.length && allReachable(grid, candidate)) return candidate;
  }
  return [];
}
