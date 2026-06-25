// Offline Sokoban solver — A* push search. Clean-room (see board.mjs header). Searches canonical states
// (box multiset + player's reachable region) expanded by legal PUSHES, ordered by f = g + W·h (or by h
// alone when greedy), where g = pushes so far and h = Σ over boxes of the box's push-distance to its
// nearest goal (admissible lower bound, board.goalDistances). W=1 is optimal in pushes; W>1 / greedy
// trade optimality for speed. Dead-square + freeze pruning cut hopeless branches; `upperBound` prunes
// any path that can't beat the best solution length found so far (used by the anytime driver below).
// State is a sorted Int32Array of box cells plus a reused box-bitset, so the hot loop allocates little.
import { DIRS, parse, step, goalDistances, reachable, walkPath } from './board.mjs';
import { isFreezeDeadlock } from './deadlock.mjs';
import { isPiCorralDeadlock } from './picorral.mjs';

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

export const behind = (b, c, d) => {       // cell the player stands on to push a box at c in dir d (c - d)
  const x = c % b.w, y = (c / b.w) | 0, px = x - d.dx, py = y - d.dy;
  return (px < 0 || py < 0 || px >= b.w || py >= b.h) ? -1 : py * b.w + px;
};
export const allOnGoals = (b, boxList) => { for (const i of boxList) if (!b.goals[i]) return false; return true; };

// boxList (sorted) with bx removed and target inserted, keeping it sorted — no Set, no full re-sort.
export function withPush(boxList, bx, target) {
  const out = new Int32Array(boxList.length);
  let j = 0, inserted = false;
  for (let i = 0; i < boxList.length; i++) {
    const v = boxList[i];
    if (v === bx) continue;
    if (!inserted && target < v) { out[j++] = target; inserted = true; }
    out[j++] = v;
  }
  if (!inserted) out[j] = target;
  return out;
}

// Anytime driver (the recommended entry point): a greedy dive finds ANY solution fast and seeds an
// upper bound, then progressively less-greedy A* passes tighten it, each pruned by the current bound,
// until the budget is spent. Returns the shortest solution found, or null.
export function solveAnytime(level, { maxStates = 2_000_000, weights = [3, 1] } = {}) {
  const b = typeof level === 'string' ? parse(level) : level;
  let best = solve(b, { maxStates, greedy: true, weight: 1 });   // fast dive for an initial bound
  for (const weight of weights) {
    if (best == null) { const g = solve(b, { maxStates, weight }); if (g) best = g; continue; }
    const tighter = solve(b, { maxStates, weight, upperBound: countPushes(b, best) });
    if (tighter && countPushes(b, tighter) < countPushes(b, best)) best = tighter;
  }
  return best;
}

// Pushes in a move string = moves where a box sits directly ahead of the player.
function countPushes(level, moves) {
  const b = typeof level === 'string' ? parse(level) : level;
  const boxAt = new Uint8Array(b.w * b.h); for (const i of b.boxes) boxAt[i] = 1;
  let p = b.player, n = 0;
  for (const ch of moves) {
    const d = DIRS.find((q) => q.ch === ch); const np = step(b, p, d);
    if (np >= 0 && boxAt[np]) { boxAt[np] = 0; boxAt[step(b, np, d)] = 1; n++; }
    p = np;
  }
  return n;
}

// Try increasingly greedy fixed weights until solved (kept for generation/back-compat).
export function solveBest(level, { weights = [1, 2, 3, 5, 8, 13], maxStates = 1_500_000 } = {}) {
  for (const weight of weights) {
    const moves = solve(level, { maxStates, weight });
    if (moves != null) return { moves, weight };
  }
  return null;
}

export function solve(level, { maxStates = 3_000_000, weight = 1, greedy = false, upperBound = Infinity, picorral = false } = {}) {
  const b = typeof level === 'string' ? parse(level) : level;
  if (b.player < 0 || b.boxes.size !== b.goalCount) return null;
  const N = b.w * b.h;
  const dist = goalDistances(b);                  // dist[c] < 0 ⇒ dead square
  const hOf = (boxList) => { let s = 0; for (const i of boxList) s += dist[i]; return s; };
  const prio = (g, h) => (greedy ? weight * h : g + weight * h);

  const startBoxList = Int32Array.from(b.boxes).sort();
  if (allOnGoals(b, startBoxList)) return '';
  const boxAt = new Uint8Array(N);                // scratch bitset, rebuilt per popped node
  const seenScratch = new Uint8Array(N);          // scratch for successor norm flood-fills
  for (const i of startBoxList) boxAt[i] = 1;
  const startKey = startBoxList.join(',') + '|' + reachable(b, boxAt, b.player).norm;

  const came = new Map();                          // key -> { parentKey, bx, di, g }
  came.set(startKey, { parentKey: null, bx: -1, di: -1, g: 0 });
  const heap = new Heap();
  heap.push({ f: prio(0, hOf(startBoxList)), g: 0, boxList: startBoxList, player: b.player, key: startKey });
  let goalKey = null;

  while (heap.size && came.size < maxStates) {
    const node = heap.pop();
    if (node.g > came.get(node.key).g) continue;   // stale heap entry
    boxAt.fill(0); for (const i of node.boxList) boxAt[i] = 1;
    const region = reachable(b, boxAt, node.player).seen;
    for (const bx of node.boxList) {
      for (let di = 0; di < 4; di++) {
        const d = DIRS[di];
        const stand = behind(b, bx, d);
        if (stand < 0 || !region[stand]) continue;
        const target = step(b, bx, d);
        if (target < 0 || b.walls[target] || boxAt[target]) continue;
        if (dist[target] < 0) continue;            // dead square
        const g = node.g + 1;
        if (g >= upperBound) continue;
        boxAt[bx] = 0; boxAt[target] = 1;           // mutate to the successor configuration…
        let dead = isFreezeDeadlock(b, boxAt, dist, target), norm = -1;
        if (!dead) {
          const r = reachable(b, boxAt, bx, seenScratch);
          norm = r.norm;
          if (picorral && isPiCorralDeadlock(b, boxAt, dist, r.seen, target, bx)) dead = true;
        }
        boxAt[bx] = 1; boxAt[target] = 0;           // …and revert
        if (dead) continue;
        const boxList = withPush(node.boxList, bx, target);
        const key = boxList.join(',') + '|' + norm;
        const prev = came.get(key);
        if (prev && prev.g <= g) continue;
        came.set(key, { parentKey: node.key, bx, di, g });
        if (allOnGoals(b, boxList)) { goalKey = key; heap.a.length = 0; break; }
        heap.push({ f: prio(g, hOf(boxList)), g, boxList, player: bx, key });
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
  boxAt.fill(0); for (const i of b.boxes) boxAt[i] = 1;
  let player = b.player;
  let moves = '';
  for (const { bx, di } of pushes) {
    const d = DIRS[di];
    const walk = walkPath(b, boxAt, player, behind(b, bx, d));
    if (walk == null) return null;
    moves += walk + d.ch;
    boxAt[bx] = 0; boxAt[step(b, bx, d)] = 1;
    player = bx;
  }
  return moves;
}
