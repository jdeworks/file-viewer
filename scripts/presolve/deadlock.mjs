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
function blockedAxis(b, boxes, live, c, visiting, horizontal) {
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
  // rule 2: both sides are dead squares
  if (!live[n1] && !live[n2]) return true;
  // rule 3: a frozen box on either side
  for (const n of [n1, n2]) {
    if (visiting.has(n)) return true;                 // assumed-immovable (treated as wall)
    if (boxes.has(n)) {
      visiting.add(c);
      const f = isFrozen(b, boxes, live, n, visiting);
      visiting.delete(c);
      if (f) return true;
    }
  }
  return false;
}

function isFrozen(b, boxes, live, c, visiting) {
  return blockedAxis(b, boxes, live, c, visiting, true) && blockedAxis(b, boxes, live, c, visiting, false);
}

// Does the box just pushed to cell `c` create a freeze deadlock? Frozen + off-goal ⇒ dead.
export function isFreezeDeadlock(b, boxes, live, c) {
  if (b.goals[c]) return false;                       // a box settled on a goal is fine even if frozen
  return isFrozen(b, boxes, live, c, new Set());
}
