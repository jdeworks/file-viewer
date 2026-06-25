// Offline Sokoban solver — BACKWARD (pull) beam search. Clean-room (see board.mjs header). Forward
// beam search funnels packing levels like Microban #154 into a dead heuristic basin it can't escape
// (the true path needs intermediate states the matching heuristic ranks too poorly to keep). Searching
// BACKWARD from the goal sidesteps this: the goal is a tightly-packed configuration whose predecessors
// are highly constrained, so "un-stacking" by pulls is far more directed than the forward funnel.
//
// A backward step undoes a forward push. A forward push moved a box X→Y (Y=X+d) with the player ending
// on X. So given a state with a box at Y and the player able to reach X=Y-d, a valid predecessor has the
// box back at X and the player at stand=Y-2d (where it stood to push). We search predecessors until we
// reach the level's START box configuration with the start player position reachable, then emit the
// forward move string. Heuristic = min-cost matching of boxes to the START cells (guides toward start).
import { DIRS, parse, step, goalDistances, reachable, walkPath, gridDistanceMaps } from './board.mjs';
import { isFreezeDeadlock } from './deadlock.mjs';
import { matchingHeuristicFor } from './matching.mjs';
import { behind, allOnGoals, withPush } from './solve.mjs';
import { ShardedMap } from './shardedmap.mjs';

export function solveBackward(level, { beamWidth = 30000, maxLayers = 5000, weight = 3, maxVisited = 30_000_000, lazyVisited = true } = {}) {
  const b = typeof level === 'string' ? parse(level) : level;
  if (b.player < 0 || b.boxes.size !== b.goalCount) return null;
  const N = b.w * b.h, { w, walls } = b;
  const dist = goalDistances(b);                                  // for freeze pruning (sound backward too)
  const startBoxList = Int32Array.from(b.boxes).sort();
  if (allOnGoals(b, startBoxList)) return '';
  const startKeyBoxes = startBoxList.join(',');                   // box-config match test (player handled separately)
  const hOf = matchingHeuristicFor(startBoxList, gridDistanceMaps(b, Array.from(startBoxList)));  // guide toward start
  const boxAt = new Uint8Array(N), seenScratch = new Uint8Array(N);
  const keyOf = (boxList, norm) => { let s = ''; for (let i = 0; i < boxList.length; i++) s += String.fromCharCode(boxList[i]); return s + String.fromCharCode(norm + 1); };

  // Seed: the goal config (boxes on all goals), one state per distinct player region.
  const goalBoxList = Int32Array.from(b.goals.reduce((a, g, i) => (g ? (a.push(i), a) : a), [])).sort();
  for (const i of goalBoxList) boxAt[i] = 1;
  const came = new ShardedMap(16);                                // key -> { parentKey, bx, di } (toward goal) | null at seeds
  let frontier = [];
  const seedSeen = new Uint8Array(N);
  for (let c = 0; c < N; c++) {
    if (walls[c] || boxAt[c] || seedSeen[c]) continue;
    const r = reachable(b, boxAt, c, seenScratch);
    for (let i = 0; i < N; i++) if (r.seen[i]) seedSeen[i] = 1;   // mark this whole region done
    const key = keyOf(goalBoxList, r.norm);
    if (came.has(key)) continue;
    came.set(key, null);
    frontier.push({ boxList: goalBoxList, player: c, key, g: 0 });
  }

  let goalKey = null;                                             // (here "goal" = a state matching the START config)
  const DEBUG = typeof process !== 'undefined' && process.env && process.env.BEAM_DEBUG;
  let lastLayer = 0, bestH = Infinity;
  for (let layer = 0; layer < maxLayers && frontier.length && came.size < maxVisited; layer++) {
    lastLayer = layer;
    if (DEBUG && layer % 25 === 0) console.error(`b-layer ${layer} frontier ${frontier.length} visited ${came.size} bestH ${bestH}`);
    const succ = [];
    const layerSeen = lazyVisited ? new Set() : null;
    for (const node of frontier) {
      boxAt.fill(0); for (const i of node.boxList) boxAt[i] = 1;
      const region = reachable(b, boxAt, node.player).seen;       // fresh array — seenScratch is reused below
      for (const Y of node.boxList) {
        const yx = Y % w, yy = (Y / w) | 0;
        for (let di = 0; di < 4; di++) {
          const d = DIRS[di];
          const Xx = yx - d.dx, Xy = yy - d.dy;                  // box moves here in the predecessor (forward push origin)
          const sx = yx - 2 * d.dx, sy = yy - 2 * d.dy;          // player stands here in the predecessor
          if (Xx < 0 || Xy < 0 || Xx >= w || Xy >= b.h || sx < 0 || sy < 0 || sx >= w || sy >= b.h) continue;
          const X = Xy * w + Xx, stand = sy * w + sx;
          if (walls[X] || boxAt[X] || !region[X]) continue;      // X must be free AND reachable by the player now
          if (walls[stand] || boxAt[stand]) continue;            // player's predecessor cell must be free
          boxAt[Y] = 0; boxAt[X] = 1;                            // step to the predecessor configuration…
          let dead = isFreezeDeadlock(b, boxAt, dist, X), norm = -1;
          if (!dead) norm = reachable(b, boxAt, stand, seenScratch).norm;
          boxAt[Y] = 1; boxAt[X] = 0;                            // …and revert
          if (dead) continue;
          const predBoxList = withPush(node.boxList, Y, X);      // remove Y, insert X (sorted)
          const key = keyOf(predBoxList, norm);
          if (came.has(key)) continue;
          if (lazyVisited) { if (layerSeen.has(key)) continue; layerSeen.add(key); }
          // Reached the start? Box config matches AND the start player cell is reachable from `stand`.
          if (predBoxList.join(',') === startKeyBoxes) {
            boxAt[Y] = 0; boxAt[X] = 1;
            const reach = reachable(b, boxAt, stand, seenScratch).seen[b.player];
            boxAt[Y] = 1; boxAt[X] = 0;
            if (reach) { came.set(key, { parentKey: node.key, bx: X, di }); goalKey = key; break; }
          }
          const hh = hOf(predBoxList);
          if (hh >= 1e6) continue;
          if (!lazyVisited) came.set(key, { parentKey: node.key, bx: X, di });
          succ.push({ boxList: predBoxList, player: stand, key, g: node.g + 1, f: (node.g + 1) + weight * hh, pk: node.key, pbx: X, pdi: di });
        }
        if (goalKey) break;
      }
      if (goalKey) break;
    }
    if (goalKey) break;
    succ.sort((p, q) => p.f - q.f);
    if (DEBUG && succ.length) bestH = Math.min(...succ.slice(0, 200).map(s => (s.f - s.g) / weight | 0));
    frontier = succ.length > beamWidth ? succ.slice(0, beamWidth) : succ;
    if (lazyVisited) for (const s of frontier) if (!came.has(s.key)) came.set(s.key, { parentKey: s.pk, bx: s.pbx, di: s.pdi });
  }
  if (DEBUG) console.error(`B-STOP layer ${lastLayer} visited ${came.size} frontier ${frontier.length} found ${goalKey != null} reason ${goalKey != null ? 'START' : lastLayer + 1 >= maxLayers ? 'maxLayers' : came.size >= maxVisited ? 'maxVisited' : 'emptyFrontier'}`);
  if (goalKey == null) return null;

  // came chains START → … → goal seed (parentKey points goal-ward), so the recorded pushes are already in
  // FORWARD order. Each entry's {bx, di} is a forward push (box at bx pushed in dir di).
  const pushes = [];
  for (let k = goalKey; came.get(k); k = came.get(k).parentKey) { const { bx, di } = came.get(k); pushes.push({ bx, di }); }
  boxAt.fill(0); for (const i of b.boxes) boxAt[i] = 1;
  let player = b.player, moves = '';
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
