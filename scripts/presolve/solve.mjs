// Offline Sokoban solver — A* push search. Clean-room (see board.mjs header). Searches canonical states
// (box multiset + player's reachable region) expanded by legal PUSHES, ordered by f = g + W·h where g =
// pushes so far and h = Σ over boxes of the box's push-distance to its nearest goal (admissible lower
// bound, from board.goalDistances). With W=1 this is optimal in pushes; W>1 trades optimality for speed
// (we only need a VALID, replayable solution, not an optimal one). Dead-square + freeze pruning prune
// hopeless branches. Walk moves between pushes are filled by shortest player paths at reconstruction.
import { DIRS, parse, step, goalDistances, reachable, walkPath } from './board.mjs';
import { isFreezeDeadlock } from './deadlock.mjs';

const boxesKey = (boxes) => Int32Array.from(boxes).sort().join(',');

// Min-heap on `.f` (binary heap; ties arbitrary — fine, h is just a guide).
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(x) {
    const a = this.a; a.push(x); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

// Cell behind c relative to direction d (c - d) — where the player stands to push a box at c in dir d.
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

// Generator entry point: try increasingly greedy weights until solved within the per-attempt budget,
// returning the FIRST success (lowest weight ⇒ shortest solution we can afford). W=1 is push-optimal
// but slow on deep levels; higher W dives toward goals far faster. Returns null if all attempts fail.
export function solveBest(level, { weights = [1, 2, 3, 5, 8, 13], maxStates = 1_500_000 } = {}) {
  for (const weight of weights) {
    const moves = solve(level, { maxStates, weight });
    if (moves != null) return { moves, weight };
  }
  return null;
}

export function solve(level, { maxStates = 3_000_000, weight = 1 } = {}) {
  const b = typeof level === 'string' ? parse(level) : level;
  if (b.player < 0 || b.boxes.size !== b.goalCount) return null;
  const dist = goalDistances(b);                  // dist[c] < 0 ⇒ dead square
  const hOf = (boxes) => { let s = 0; for (const i of boxes) s += dist[i]; return s; };

  const startBoxes = new Set(b.boxes);
  if (allOnGoals(b, startBoxes)) return '';
  const startNorm = reachable(b, startBoxes, b.player).norm;
  const startKey = boxesKey(startBoxes) + '|' + startNorm;

  const came = new Map();                          // key -> { parentKey, bx, di, g }
  came.set(startKey, { parentKey: null, bx: -1, di: -1, g: 0 });
  const heap = new Heap();
  heap.push({ f: weight * hOf(startBoxes), g: 0, boxes: startBoxes, player: b.player, key: startKey });
  let goalKey = null;

  while (heap.size && came.size < maxStates) {
    const node = heap.pop();
    if (node.g > came.get(node.key).g) continue;   // stale heap entry (a better path was found)
    const region = reachable(b, node.boxes, node.player).seen;
    for (const bx of node.boxes) {
      for (let di = 0; di < 4; di++) {
        const d = DIRS[di];
        const stand = behind(b, bx, d);
        if (stand < 0 || !region[stand]) continue;
        const target = step(b, bx, d);
        if (target < 0 || b.walls[target] || node.boxes.has(target)) continue;
        if (dist[target] < 0) continue;            // dead square
        const boxes = new Set(node.boxes);
        boxes.delete(bx); boxes.add(target);
        if (isFreezeDeadlock(b, boxes, dist, target)) continue;
        const g = node.g + 1;
        const key = boxesKey(boxes) + '|' + reachable(b, boxes, bx).norm;
        const prev = came.get(key);
        if (prev && prev.g <= g) continue;
        came.set(key, { parentKey: node.key, bx, di, g });
        if (allOnGoals(b, boxes)) { goalKey = key; heap.a.length = 0; break; }
        heap.push({ f: g + weight * hOf(boxes), g, boxes, player: bx, key });
      }
      if (goalKey) break;
    }
    if (goalKey) break;
  }
  if (goalKey == null) return null;

  // Reconstruct: push chain (start → goal), then simulate to emit full U/D/L/R moves.
  const pushes = [];
  for (let k = goalKey; came.get(k).parentKey != null; k = came.get(k).parentKey) {
    const { bx, di } = came.get(k);
    pushes.push({ bx, di });
  }
  pushes.reverse();

  let player = b.player;
  const boxes = new Set(b.boxes);
  let moves = '';
  for (const { bx, di } of pushes) {
    const d = DIRS[di];
    const walk = walkPath(b, boxes, player, behind(b, bx, d));
    if (walk == null) return null;
    moves += walk + d.ch;
    boxes.delete(bx); boxes.add(step(b, bx, d));
    player = bx;
  }
  return moves;
}
