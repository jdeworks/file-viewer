// Offline Sokoban solver — push-based breadth-first search. Clean-room (see board.mjs header). BFS over
// canonical states (box multiset + player's reachable region) expanded by legal PUSHES, with dead-square
// pruning. BFS on pushes guarantees a push-optimal solution; the walk moves between pushes are filled in
// by shortest player paths at reconstruction time. Returns a U/D/L/R move string (replayable by the
// game's solve.js) or null if unsolved within the state budget.
import { DIRS, parse, step, liveSquares, reachable, walkPath } from './board.mjs';

const boxesKey = (boxes) => Int32Array.from(boxes).sort().join(',');

// Cell behind c relative to direction d (i.e. c - d) — where the player must stand to push a box at c
// in direction d. Returns -1 if off-grid.
function behind(b, c, d) {
  const x = c % b.w, y = (c / b.w) | 0;
  const px = x - d.dx, py = y - d.dy;
  if (px < 0 || py < 0 || px >= b.w || py >= b.h) return -1;
  return py * b.w + px;
}

function allOnGoals(b, boxes) {
  for (const i of boxes) if (!b.goals[i]) return false;
  return true;
}

export function solve(level, { maxStates = 3_000_000 } = {}) {
  const b = typeof level === 'string' ? parse(level) : level;
  if (b.player < 0 || b.boxes.size !== b.goalCount) return null;
  const live = liveSquares(b);

  const startBoxes = new Set(b.boxes);
  if (allOnGoals(b, startBoxes)) return '';
  const startNorm = reachable(b, startBoxes, b.player).norm;
  const startKey = boxesKey(startBoxes) + '|' + startNorm;

  const seen = new Map();                       // key -> { parentKey, bx, di } (push that produced it)
  seen.set(startKey, null);
  let frontier = [{ boxes: startBoxes, player: b.player, key: startKey }];
  let goalKey = null;

  outer:
  while (frontier.length && seen.size < maxStates) {
    const next = [];
    for (const node of frontier) {
      const region = reachable(b, node.boxes, node.player).seen;
      for (const bx of node.boxes) {
        for (let di = 0; di < 4; di++) {
          const d = DIRS[di];
          const stand = behind(b, bx, d);                 // player must stand here...
          if (stand < 0 || !region[stand]) continue;      // ...and be able to reach it
          const target = step(b, bx, d);                  // box would move here
          if (target < 0 || b.walls[target] || node.boxes.has(target)) continue;
          if (!live[target]) continue;                    // dead square → skip (deadlock)
          const boxes = new Set(node.boxes);
          boxes.delete(bx); boxes.add(target);
          const key = boxesKey(boxes) + '|' + reachable(b, boxes, bx).norm;
          if (seen.has(key)) continue;
          seen.set(key, { parentKey: node.key, bx, di });
          if (allOnGoals(b, boxes)) { goalKey = key; break outer; }
          next.push({ boxes, player: bx, key });
        }
      }
    }
    frontier = next;
  }
  if (goalKey == null) return null;

  // Reconstruct: collect the push chain (start → goal), then simulate to emit full moves.
  const pushes = [];
  for (let k = goalKey; seen.get(k); k = seen.get(k).parentKey) {
    const { bx, di } = seen.get(k);
    pushes.push({ bx, di });
  }
  pushes.reverse();

  let player = b.player;
  const boxes = new Set(b.boxes);
  let moves = '';
  for (const { bx, di } of pushes) {
    const d = DIRS[di];
    const stand = behind(b, bx, d);
    const walk = walkPath(b, boxes, player, stand);
    if (walk == null) return null;                        // should not happen if search was sound
    moves += walk + d.ch;                                 // walk to the stand cell, then the push
    boxes.delete(bx); boxes.add(step(b, bx, d));
    player = bx;                                           // player ends on the box's old cell
  }
  return moves;
}
