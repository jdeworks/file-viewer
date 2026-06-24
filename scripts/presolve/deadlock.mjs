// Offline Sokoban solver — freeze-deadlock detection. Clean-room (see board.mjs header). A box is
// "frozen" when it can never move again (blocked on both the horizontal and vertical axis); a frozen
// box that is NOT on a goal makes the position unsolvable. This is the standard freeze rule documented
// on the Sokoban wiki — implemented here from the description, not from any solver's source.
//
// Soundness matters: we only ever PRUNE states that are genuinely dead, so the search never discards a
// solvable position. We test only the just-pushed box; that is sufficient for soundness (missing some
// deadlocks only costs time, never correctness).
import { DIRS } from './board.mjs';

// Is cell c blocked along one axis? horizontal=true checks L/R, false checks U/D.
//  1) a wall on either side blocks the axis;
//  2) both side cells being dead squares (a box there can't reach a goal) blocks it;
//  3) a box on either side that is itself frozen blocks it (recursive; the current box, held in
//     `visiting`, is treated as a wall to terminate mutual recursion).
// `dist` is board.goalDistances: dist[cell] < 0 marks a dead square (no goal reachable).
function blockedAxis(b, boxAt, dist, c, visiting, horizontal) {
  const d1 = horizontal ? DIRS[2] : DIRS[0];   // L or U
  const d2 = horizontal ? DIRS[3] : DIRS[1];   // R or D
  const x = c % b.w, y = (c / b.w) | 0;
  const s1x = x + d1.dx, s1y = y + d1.dy, s2x = x + d2.dx, s2y = y + d2.dy;
  const oob1 = s1x < 0 || s1y < 0 || s1x >= b.w || s1y >= b.h;
  const oob2 = s2x < 0 || s2y < 0 || s2x >= b.w || s2y >= b.h;
  const n1 = oob1 ? -1 : s1y * b.w + s1x;
  const n2 = oob2 ? -1 : s2y * b.w + s2x;
  // rule 1: wall (or off-grid) on either side
  if (n1 < 0 || b.walls[n1] || n2 < 0 || b.walls[n2]) return true;
  // rule 2: both sides are dead squares (a box could never be pushed out to a goal that way)
  if (dist[n1] < 0 && dist[n2] < 0) return true;
  // rule 3: a frozen box on either side
  for (const n of [n1, n2]) {
    if (visiting.has(n)) return true;                 // assumed-immovable (treated as wall)
    if (boxAt[n]) {
      visiting.add(c);
      const f = isFrozen(b, boxAt, dist, n, visiting);
      visiting.delete(c);
      if (f) return true;
    }
  }
  return false;
}

function isFrozen(b, boxAt, dist, c, visiting) {
  return blockedAxis(b, boxAt, dist, c, visiting, true) && blockedAxis(b, boxAt, dist, c, visiting, false);
}

// Does the box just pushed to cell `c` create a freeze deadlock? Frozen + off-goal ⇒ dead.
export function isFreezeDeadlock(b, boxAt, dist, c) {
  if (b.goals[c]) return false;                       // a box settled on a goal is fine even if frozen
  return isFrozen(b, boxAt, dist, c, new Set());
}

export const isFrozenBox = (b, boxAt, dist, c) => isFrozen(b, boxAt, dist, c, new Set());

// CORRAL deadlock (sound): an unfilled goal that the player can NOT reach, sitting in a floor pocket
// whose every bordering box is FROZEN, can never be filled — the player can't enter and no box can be
// pushed in (frozen boxes never move) ⇒ dead. `region` is the player's reachable mask for THIS state.
// Sound: it only fires when the seal is provably permanent (all boundary boxes immovable forever).
export function isCorralDeadlock(b, boxAt, dist, region, pushed) {
  const { w, h, walls, goals } = b;
  // A NEW seal must have the just-pushed box on its boundary, so only flood the pocket(s) that box borders
  // (cheap + sound — any pre-existing sealed pocket was caught when ITS sealing box was pushed).
  const px = pushed % w, py = (pushed / w) | 0;
  const seen = new Uint8Array(w * h);
  for (const sd of DIRS) {
    const sx = px + sd.dx, sy = py + sd.dy;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
    const seed = sy * w + sx;
    if (walls[seed] || boxAt[seed] || region[seed] || seen[seed]) continue;   // only unreachable floor pockets
    const stack = [seed]; seen[seed] = 1; const boundary = []; let touchesRegion = false, unfilledGoal = false;
    while (stack.length) {
      const c = stack.pop(), x = c % w, y = (c / w) | 0;
      if (goals[c] && !boxAt[c]) unfilledGoal = true;
      for (const d of DIRS) {
        const nx = x + d.dx, ny = y + d.dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (walls[ni]) continue;
        if (boxAt[ni]) { boundary.push(ni); continue; }
        if (region[ni]) { touchesRegion = true; continue; }   // pocket connects to the player → not sealed
        if (!seen[ni]) { seen[ni] = 1; stack.push(ni); }
      }
    }
    if (touchesRegion || !unfilledGoal || boundary.length === 0) continue;
    let allFrozen = true;
    for (const bx of boundary) if (!isFrozenBox(b, boxAt, dist, bx)) { allFrozen = false; break; }
    if (allFrozen) return true;                        // sealed pocket with an unfillable goal ⇒ deadlock
  }
  return false;
}
