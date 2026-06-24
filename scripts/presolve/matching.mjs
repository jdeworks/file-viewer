// Offline Sokoban solver — min-cost box→goal matching heuristic. Clean-room (see board.mjs header).
// h(boxes) = the cheapest one-box-per-goal assignment, cost(box,goal) = that box's push-distance to that
// goal (board.goalDistanceMaps). This is a far better ranking signal than summing each box's nearest-goal
// distance, because it forbids two boxes from claiming the same goal — which is exactly the packing
// structure deep levels hinge on. Solved with the Hungarian (Kuhn–Munkres) algorithm, O(n^3).
import { goalDistanceMaps } from './board.mjs';

const UNREACH = 1e7;   // a box that can't reach a given goal: huge finite cost (keeps the matrix square/solvable)

// Standard 1-indexed Hungarian for a square n×n cost matrix; returns the minimum assignment total.
function hungarian(cost) {
  const n = cost.length;
  if (n === 0) return 0;
  const u = new Float64Array(n + 1), v = new Float64Array(n + 1);
  const p = new Int32Array(n + 1), way = new Int32Array(n + 1);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0;
    const minv = new Float64Array(n + 1).fill(Infinity);
    const used = new Uint8Array(n + 1);
    do {
      used[j0] = 1; const i0 = p[j0]; let delta = Infinity, j1 = -1;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  let res = 0;
  for (let j = 1; j <= n; j++) res += cost[p[j] - 1][j - 1];
  return res;
}

// Generic matching heuristic over a set of target cells and their per-target distance maps
// (maps[j][cell] = box-move distance from `cell` to target j, < 0 = unreachable). Returns h(boxList) =
// cheapest one-box-per-target assignment. Used both forward (targets = goals) and backward (targets =
// the level's start box cells, so the pull-search is guided toward reconstructing the start config).
export function matchingHeuristicFor(targetCells, maps) {
  const n = targetCells.length;
  return (boxList) => {
    const cost = [];
    for (let i = 0; i < n; i++) {
      const row = new Array(n);
      const cell = boxList[i];
      for (let j = 0; j < n; j++) { const d = maps[j][cell]; row[j] = d < 0 ? UNREACH : d; }
      cost.push(row);
    }
    return hungarian(cost);
  };
}

// Build h(boxList) for a board's GOALS: returns a function that computes the matching cost for a set of boxes.
export function matchingHeuristic(b) {
  const { goalCells, maps } = goalDistanceMaps(b);
  return matchingHeuristicFor(goalCells, maps);
}
