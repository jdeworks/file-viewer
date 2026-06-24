// Offline Sokoban solver — board model + static analysis. This is a DEV BUILD TOOL (Node only); it is
// NOT shipped to the browser (the game plays back precomputed move strings with zero runtime search).
// Clean-room implementation of standard, well-documented Sokoban-solving techniques (push-based search,
// dead-square pruning via goal pulls). No code is taken from any existing solver; the GPL-3.0 YASS
// solver was used only as inspiration for which techniques exist, never as a source of code.

// Cells are flat indices i = y*w + x. Directions are ordered U,D,L,R to match docs/games/sokoban.
export const DIRS = [
  { ch: 'U', dx: 0, dy: -1 },
  { ch: 'D', dx: 0, dy: 1 },
  { ch: 'L', dx: -1, dy: 0 },
  { ch: 'R', dx: 1, dy: 0 },
];

// Parse an ASCII level (rows separated by '\n'; glyphs #.$*@+ space) into a typed board.
export function parse(str) {
  const lines = str.replace(/\r/g, '').replace(/\n+$/, '').split('\n');
  const h = lines.length;
  const w = Math.max(...lines.map((l) => l.length));
  const walls = new Uint8Array(w * h);
  const goals = new Uint8Array(w * h);
  const boxes = new Set();
  let player = -1;
  let goalCount = 0;
  for (let y = 0; y < h; y++) {
    const line = lines[y];
    for (let x = 0; x < w; x++) {
      const ch = line[x] || ' ';
      const i = y * w + x;
      if (ch === '#') walls[i] = 1;
      if (ch === '.' || ch === '*' || ch === '+') { goals[i] = 1; goalCount++; }
      if (ch === '$' || ch === '*') boxes.add(i);
      if (ch === '@' || ch === '+') player = i;
    }
  }
  return { w, h, walls, goals, boxes, player, goalCount };
}

// In-bounds neighbour index for cell c in direction d, or -1 if it would leave the grid.
export function step(b, c, d) {
  const x = c % b.w, y = (c / b.w) | 0;
  const nx = x + d.dx, ny = y + d.dy;
  if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) return -1;
  return ny * b.w + nx;
}

// "Live" squares: a box on a live square can still (geometrically) be pushed to some goal. Computed by
// pulling a box backwards from every goal — a box can be pulled from cell c to neighbour n (in dir d)
// iff n and the cell beyond n (where the puller stands) are both non-wall. Any non-wall, non-live cell
// is a DEAD square: a box pushed there can never reach a goal, so that push is an immediate deadlock.
export function liveSquares(b) {
  const { w, h, walls, goals } = b;
  const live = new Uint8Array(w * h);
  const q = [];
  for (let i = 0; i < w * h; i++) if (goals[i]) { live[i] = 1; q.push(i); }
  while (q.length) {
    const c = q.pop();
    const x = c % w, y = (c / w) | 0;
    for (const d of DIRS) {
      const bx = x + d.dx, by = y + d.dy;          // cell the box would be pulled FROM
      const px = x + 2 * d.dx, py = y + 2 * d.dy;   // cell the puller stands on
      if (bx < 0 || by < 0 || bx >= w || by >= h) continue;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const bi = by * w + bx, pi = py * w + px;
      if (walls[bi] || walls[pi] || live[bi]) continue;
      live[bi] = 1; q.push(bi);
    }
  }
  return live;
}

// Per-cell push-distance to the NEAREST goal: the fewest pushes to move a lone box from that cell to
// some goal, ignoring other boxes and player reachability. Computed by a BFS of box pulls outward from
// all goals (a box can be pulled from c to neighbour n in dir d iff n and the cell beyond n are both
// non-wall). dist[c] = -1 means no goal is reachable (a dead square). This is an ADMISSIBLE lower bound
// per box, so Σ over boxes of dist[box] never overestimates the remaining pushes → safe for A*.
export function goalDistances(b) {
  const { w, h, walls, goals } = b;
  const dist = new Int32Array(w * h).fill(-1);
  const q = [];
  let head = 0;
  for (let i = 0; i < w * h; i++) if (goals[i]) { dist[i] = 0; q.push(i); }
  while (head < q.length) {
    const c = q[head++];
    const x = c % w, y = (c / w) | 0;
    for (const d of DIRS) {
      const bx = x + d.dx, by = y + d.dy;
      const px = x + 2 * d.dx, py = y + 2 * d.dy;
      if (bx < 0 || by < 0 || bx >= w || by >= h) continue;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const bi = by * w + bx, pi = py * w + px;
      if (walls[bi] || walls[pi] || dist[bi] >= 0) continue;
      dist[bi] = dist[c] + 1; q.push(bi);
    }
  }
  return dist;
}

// One push-distance map PER goal (vs goalDistances' nearest-goal collapse): maps[k][cell] = fewest
// pushes to move a lone box from cell to goalCells[k] (-1 = can't reach that goal). Feeds the min-cost
// box→goal matching heuristic, which ranks states by an actual one-box-per-goal assignment instead of
// letting every box claim the same nearest goal.
export function goalDistanceMaps(b) {
  const { w, h, walls, goals } = b;
  const goalCells = [];
  for (let i = 0; i < w * h; i++) if (goals[i]) goalCells.push(i);
  const maps = goalCells.map((g) => {
    const d = new Int32Array(w * h).fill(-1);
    const q = [g]; d[g] = 0; let head = 0;
    while (head < q.length) {
      const c = q[head++]; const x = c % w, y = (c / w) | 0;
      for (const dir of DIRS) {
        const bx = x + dir.dx, by = y + dir.dy, px = x + 2 * dir.dx, py = y + 2 * dir.dy;
        if (bx < 0 || by < 0 || bx >= w || by >= h || px < 0 || py < 0 || px >= w || py >= h) continue;
        const bi = by * w + bx, pi = py * w + px;
        if (walls[bi] || walls[pi] || d[bi] >= 0) continue;
        d[bi] = d[c] + 1; q.push(bi);
      }
    }
    return d;
  });
  return { goalCells, maps };
}

// Flood-fill the cells the player can currently reach (blocked by walls and boxes), starting at `start`.
// `boxAt` is a Uint8Array bitset (1 = box). Returns the reachable mask and `norm` = the smallest cell
// index in the region — a canonical id for the player's position (any two states with the same boxes and
// the same reachable region are equivalent). `seen` is an optional caller-supplied scratch Uint8Array
// (cleared here) to avoid per-call allocation in the hot loop.
export function reachable(b, boxAt, start, seen) {
  const { w, h, walls } = b;
  if (seen) seen.fill(0); else seen = new Uint8Array(w * h);
  const stack = [start];
  seen[start] = 1;
  let norm = start;
  while (stack.length) {
    const c = stack.pop();
    if (c < norm) norm = c;
    const x = c % w, y = (c / w) | 0;
    for (const d of DIRS) {
      const nx = x + d.dx, ny = y + d.dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (seen[ni] || walls[ni] || boxAt[ni]) continue;
      seen[ni] = 1; stack.push(ni);
    }
  }
  return { seen, norm };
}

// Shortest player walk (no pushing) from `start` to `target` over non-wall, non-box cells (`boxAt` =
// box bitset), returned as a U/D/L/R move string. Returns null if unreachable. Reconstruction only.
export function walkPath(b, boxAt, start, target) {
  if (start === target) return '';
  const { w, h, walls } = b;
  const prev = new Int32Array(w * h).fill(-1);
  const prevDir = new Int8Array(w * h).fill(-1);
  const seen = new Uint8Array(w * h);
  const q = [start]; seen[start] = 1;
  let head = 0;
  while (head < q.length) {
    const c = q[head++];
    const x = c % w, y = (c / w) | 0;
    for (let di = 0; di < 4; di++) {
      const d = DIRS[di];
      const nx = x + d.dx, ny = y + d.dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (seen[ni] || walls[ni] || boxAt[ni]) continue;
      seen[ni] = 1; prev[ni] = c; prevDir[ni] = di;
      if (ni === target) {
        const moves = [];
        for (let cur = target; cur !== start; cur = prev[cur]) moves.push(DIRS[prevDir[cur]].ch);
        return moves.reverse().join('');
      }
      q.push(ni);
    }
  }
  return null;
}
