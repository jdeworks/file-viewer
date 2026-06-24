// Offline Sokoban solver — PI-corral (push-into-corral) deadlock test. Clean-room (see board.mjs
// header): this is the standard corral-deadlock technique (Junghanns & Schaeffer), implemented from
// the published description, never from any solver's source.
//
// A "corral" is a connected region of free cells the player CANNOT reach, sealed off by boxes. For a
// PI-corral — one where every boundary box can ONLY be pushed INTO the corral — any solution must
// eventually resolve the corral using just those boundary boxes, without disturbing the rest of the
// board. So we run a COMPLETE, bounded mini push-search over only the boundary boxes (every other box
// is frozen into a wall); if that search can NEVER resolve the corral (fill its goals, or let the
// player back in), the whole position is provably dead → prune.
//
// SOUNDNESS is everything here (we must never prune a solvable position):
//   • We declare deadlock ONLY when the bounded sub-search runs to EXHAUSTION without success. If it
//     hits the node cap (or the corral is too big to search), we return false (inconclusive) — so a
//     budget limit can never manufacture a false deadlock.
//   • The "resolved" test is generous (player gets back inside OR every corral goal is covered) so we
//     err toward "not dead".
//   • Fixing non-boundary boxes as walls is licensed only for a genuine PI-corral, so we verify the
//     PI condition (every currently-legal boundary push goes into the corral) before searching.
import { DIRS } from './board.mjs';
import { isFrozenBox } from './deadlock.mjs';

// Dev diagnostics (zero cost when unused): counts WHY the test exits, to tune caps. Reset before a run.
export const piStats = { calls: 0, noCorral: 0, tooBig: 0, notPI: 0, capBail: 0, fired: 0, resolved: 0 };

// Identify the sealed corral bordering the just-pushed box. Returns {cells, goalCells, boundary, corral}
// or null when the box does not border an unreachable, goal-bearing pocket. `region` = player's
// reachable mask in the CURRENT (post-push) state.
function findCorral(b, boxAt, region, pushed) {
  const { w, h, walls, goals } = b;
  const N = w * h;
  const px = pushed % w, py = (pushed / w) | 0;
  for (const sd of DIRS) {
    const sx = px + sd.dx, sy = py + sd.dy;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
    const seed = sy * w + sx;
    if (walls[seed] || boxAt[seed] || region[seed]) continue;     // only unreachable free pockets
    const corral = new Uint8Array(N);
    const cells = [], goalCells = [];
    const stack = [seed]; corral[seed] = 1;
    let touchesRegion = false;
    while (stack.length) {
      const c = stack.pop(); cells.push(c);
      if (goals[c]) goalCells.push(c);                            // corral cells are free ⇒ unfilled goals
      const x = c % w, y = (c / w) | 0;
      for (const d of DIRS) {
        const nx = x + d.dx, ny = y + d.dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (walls[ni] || boxAt[ni]) continue;                     // wall / box = pocket border
        if (region[ni]) { touchesRegion = true; continue; }       // connects to the player ⇒ not sealed
        if (!corral[ni]) { corral[ni] = 1; stack.push(ni); }
      }
    }
    if (touchesRegion || goalCells.length === 0) continue;        // not sealed, or nothing to resolve
    const boundary = [], isB = new Uint8Array(N);
    for (const c of cells) {
      const x = c % w, y = (c / w) | 0;
      for (const d of DIRS) {
        const nx = x + d.dx, ny = y + d.dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (boxAt[ni] && !isB[ni]) { isB[ni] = 1; boundary.push(ni); }
      }
    }
    return { cells, goalCells, boundary, corral };
  }
  return null;
}

// Is the position dead because the corral bordering `pushed` can never be resolved? `region` = player's
// reachable mask, `playerFrom` = the player's cell (the just-pushed box's old square). Bounded by `cap`
// search nodes and `maxCorral` cells; over either, returns false (inconclusive ⇒ never a false prune).
export function isPiCorralDeadlock(b, boxAt, dist, region, pushed, playerFrom, { cap = 4000, maxCorral = 40, maxBoundary = 7 } = {}) {
  piStats.calls++;
  const info = findCorral(b, boxAt, region, pushed);
  if (!info) { piStats.noCorral++; return false; }
  const { cells, goalCells, boundary, corral } = info;
  if (boundary.length === 0 || boundary.length > maxBoundary || cells.length > maxCorral) { piStats.tooBig++; return false; }
  const { w, h, walls } = b;
  const N = w * h;

  // PI condition — the gate that makes pruning sound. For a prunable PI-corral, every boundary box must
  // be EITHER frozen (a permanent wall sealing the corral) OR currently pushable by the player with
  // EVERY legal push going INTO the corral. If a non-frozen boundary box the player can't reach now
  // exists, the player must do something ELSE first (e.g. move a non-boundary box for access) — so it
  // is NOT a PI-corral and freezing the other boxes would be UNSOUND ⇒ bail. Frozen boundary boxes are
  // demoted to walls; only the genuinely-pushable boxes are searched.
  const movable = [];
  for (const bx of boundary) {
    const x = bx % w, y = (bx / w) | 0;
    let legal = 0, outward = false;
    for (const d of DIRS) {
      if (x - d.dx < 0 || y - d.dy < 0 || x - d.dx >= w || y - d.dy >= h) continue;
      if (x + d.dx < 0 || y + d.dy < 0 || x + d.dx >= w || y + d.dy >= h) continue;
      const from = (y - d.dy) * w + (x - d.dx), to = (y + d.dy) * w + (x + d.dx);
      if (!region[from] || walls[to] || boxAt[to]) continue;     // not a currently-legal push
      legal++;
      if (!corral[to]) outward = true;                           // a push sends it out/along
    }
    if (legal === 0) {
      if (isFrozenBox(b, boxAt, dist, bx)) continue;             // permanent wall — leave it in `base`
      piStats.notPI++; return false;                             // inaccessible but not frozen ⇒ not PI
    }
    if (outward) { piStats.notPI++; return false; }              // can push out/along ⇒ not a PI-corral
    movable.push(bx);
  }

  // base = walls ∪ every box EXCEPT the movable boundary boxes (frozen / non-boundary boxes are walls).
  const base = Uint8Array.from(walls);
  for (let i = 0; i < N; i++) if (boxAt[i]) base[i] = 1;
  for (const bx of movable) base[bx] = 0;

  const occ = new Uint8Array(N), seen = new Uint8Array(N), scratch = new Uint8Array(N);
  // Flood the player's reach (over `base` walls + tracked-box occupancy `occ`) from `start` into `buf`;
  // returns the region's canonical norm.
  const flood = (start, buf) => {
    buf.fill(0); buf[start] = 1; let norm = start; const st = [start];
    while (st.length) {
      const c = st.pop(); if (c < norm) norm = c;
      const x = c % w, y = (c / w) | 0;
      for (const d of DIRS) {
        const nx = x + d.dx, ny = y + d.dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (buf[ni] || base[ni] || occ[ni]) continue;
        buf[ni] = 1; st.push(ni);
      }
    }
    return norm;
  };
  // With current region in `seen` and occupancy in `occ`: is the corral resolved? (player back inside,
  // or every corral goal covered) ⇒ not provably dead.
  const resolved = () => {
    for (const c of cells) if (seen[c]) return true;             // player got back in
    for (const g of goalCells) if (!occ[g]) return false;
    return true;                                                 // all corral goals covered
  };

  const start = Int32Array.from(movable).sort();               // only the pushable boundary boxes move
  const visited = new Set();
  const queue = [{ pos: start, player: playerFrom }];
  let nodes = 0;
  while (queue.length) {
    if (++nodes > cap) { piStats.capBail++; return false; }      // budget hit ⇒ inconclusive
    const cur = queue.pop();
    occ.fill(0); for (const p of cur.pos) occ[p] = 1;
    flood(cur.player, seen);                                     // current region → `seen` (stable below)
    if (resolved()) { piStats.resolved++; return false; }
    for (let bi = 0; bi < cur.pos.length; bi++) {
      const box = cur.pos[bi], x = box % w, y = (box / w) | 0;
      for (const d of DIRS) {
        if (x - d.dx < 0 || y - d.dy < 0 || x - d.dx >= w || y - d.dy >= h) continue;
        if (x + d.dx < 0 || y + d.dy < 0 || x + d.dx >= w || y + d.dy >= h) continue;
        const from = (y - d.dy) * w + (x - d.dx), to = (y + d.dy) * w + (x + d.dx);
        if (!seen[from] || base[to] || occ[to]) continue;        // player can't push, or blocked
        occ[box] = 0; occ[to] = 1;                               // child occupancy
        const np = Int32Array.from(cur.pos); np[bi] = to; np.sort();
        const norm = flood(box, scratch);                        // child norm into scratch (keeps `seen`)
        occ[to] = 0; occ[box] = 1;                               // restore cur occupancy
        const key = np.join(',') + '|' + norm;
        if (visited.has(key)) continue;
        visited.add(key);
        queue.push({ pos: np, player: box });
      }
    }
  }
  piStats.fired++;
  return true;                                                   // exhausted, never resolved ⇒ DEAD
}
