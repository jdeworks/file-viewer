// Offline Sokoban solver — beam search. Clean-room (see board.mjs header). For the deepest levels, A*/
// best-first runs out of MEMORY (its open list + transposition table explode). Beam search keeps only
// the best `beamWidth` states at each layer (bounded memory ⇒ no overflow / no indefinite wait),
// expands all of them in parallel, and dedups via a visited map (loop detection). States are ranked by
// f = g + W·h (greedy when W is large), so it follows the heuristic gradient deep. It is incomplete —
// a too-narrow beam can miss the solution — so the driver widens the beam on failure.
import { DIRS, parse, step, goalDistances, reachable, walkPath } from './board.mjs';
import { isFreezeDeadlock, isCorralDeadlock } from './deadlock.mjs';
import { isPiCorralDeadlock } from './picorral.mjs';
import { matchingHeuristic } from './matching.mjs';
import { behind, allOnGoals, withPush } from './solve.mjs';

export function solveBeam(level, { beamWidth = 30000, maxLayers = 5000, weight = 3, maxVisited = 6_000_000, matching = false, corral = false, picorral = false } = {}) {
  const b = typeof level === 'string' ? parse(level) : level;
  if (b.player < 0 || b.boxes.size !== b.goalCount) return null;
  const N = b.w * b.h;
  const dist = goalDistances(b);                           // for dead-square + freeze pruning
  const goalCells = []; for (let i = 0; i < N; i++) if (b.goals[i]) goalCells.push(i);
  const sumH = (boxList) => { let s = 0; for (const i of boxList) s += dist[i]; return s; };
  const hOf = matching ? matchingHeuristic(b) : sumH;      // ranking heuristic (matching = packing-aware)
  const boxAt = new Uint8Array(N), seenScratch = new Uint8Array(N);

  // Compact transposition key: each cell index < N (≤ 65535 for any real board) fits in one UTF-16 code
  // unit, so the whole state (sorted box cells + player-region norm) packs into boxCount+1 chars instead
  // of a ~40-char "12,34,…|56" string — ~4× less key memory ⇒ a far wider beam fits in the same heap.
  const keyOf = (boxList, norm) => { let s = ''; for (let i = 0; i < boxList.length; i++) s += String.fromCharCode(boxList[i]); return s + String.fromCharCode(norm + 1); };

  const startBoxList = Int32Array.from(b.boxes).sort();
  if (allOnGoals(b, startBoxList)) return '';
  for (const i of startBoxList) boxAt[i] = 1;
  const startKey = keyOf(startBoxList, reachable(b, boxAt, b.player).norm);

  const came = new Map();                                  // key -> { parentKey, bx, di } (loop detection + reconstruction)
  came.set(startKey, null);
  let frontier = [{ boxList: startBoxList, player: b.player, key: startKey, g: 0 }];
  let goalKey = null;

  const DEBUG = typeof process !== 'undefined' && process.env && process.env.BEAM_DEBUG;
  let lastLayer = 0, bestH = Infinity;
  for (let layer = 0; layer < maxLayers && frontier.length && came.size < maxVisited; layer++) {
    lastLayer = layer;
    if (DEBUG && layer % 25 === 0) console.error(`layer ${layer} frontier ${frontier.length} visited ${came.size} bestH ${bestH}`);
    const succ = [];
    for (const node of frontier) {
      boxAt.fill(0); for (const i of node.boxList) boxAt[i] = 1;
      const region = reachable(b, boxAt, node.player).seen;
      for (const bx of node.boxList) {
        for (let di = 0; di < 4; di++) {
          const d = DIRS[di];
          const stand = behind(b, bx, d);
          if (stand < 0 || !region[stand]) continue;
          const target = step(b, bx, d);
          if (target < 0 || b.walls[target] || boxAt[target] || dist[target] < 0) continue;
          boxAt[bx] = 0; boxAt[target] = 1;
          let dead = isFreezeDeadlock(b, boxAt, dist, target), norm = -1;
          if (!dead) {
            const r = reachable(b, boxAt, bx, seenScratch);
            norm = r.norm;
            if (corral && isCorralDeadlock(b, boxAt, dist, r.seen, target)) dead = true;
            else if (picorral && isPiCorralDeadlock(b, boxAt, dist, r.seen, target, bx, picorral === true ? undefined : picorral)) dead = true;
          }
          boxAt[bx] = 1; boxAt[target] = 0;
          if (dead) continue;
          const boxList = withPush(node.boxList, bx, target);
          const key = keyOf(boxList, norm);
          if (came.has(key)) continue;                     // already seen — loop / transposition
          const g = node.g + 1;
          if (allOnGoals(b, boxList)) { came.set(key, { parentKey: node.key, bx, di }); goalKey = key; break; }
          const h = hOf(boxList);
          // matching infeasibility = bipartite/Hall deadlock: no box→goal assignment over REACHABLE pairs
          // exists (static maps ignore box-blocking, which only worsens reachability) ⇒ truly dead. Sound,
          // and free here because matching mode already computed h. (Sum mode never reaches UNREACH.)
          if (h >= 1e6) continue;
          came.set(key, { parentKey: node.key, bx, di });
          succ.push({ boxList, player: bx, key, g, f: g + weight * h });
        }
        if (goalKey) break;
      }
      if (goalKey) break;
    }
    if (goalKey) break;
    succ.sort((p, q) => p.f - q.f);                        // keep the best `beamWidth` for the next layer
    if (DEBUG && succ.length) bestH = Math.min(...succ.slice(0, 200).map(s => (s.f - s.g) / weight | 0));  // lowest h in beam
    frontier = succ.length > beamWidth ? succ.slice(0, beamWidth) : succ;
  }
  if (DEBUG) console.error(`STOP layer ${lastLayer} visited ${came.size} frontier ${frontier.length} goal ${goalKey != null} reason ${goalKey != null ? 'GOAL' : lastLayer + 1 >= maxLayers ? 'maxLayers' : came.size >= maxVisited ? 'maxVisited' : 'emptyFrontier'}`);
  if (goalKey == null) return null;

  const pushes = [];
  for (let k = goalKey; came.get(k); k = came.get(k).parentKey) { const { bx, di } = came.get(k); pushes.push({ bx, di }); }
  pushes.reverse();
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
