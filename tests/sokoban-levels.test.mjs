// Verifies every embedded Sokoban level is actually SOLVABLE (BFS over (player, boxes) states with
// corner-deadlock pruning + a node cap). Authoring Sokoban by hand is error-prone; this is the
// safety net so an unsolvable level can never ship. Cheap: levels are small.
import { LEVELS } from '../docs/games/sokoban/sokoban-levels.js';

const key = (x, y) => x + ',' + y;

function parse(str) {
  const lines = str.replace(/\n+$/, '').split('\n');
  const walls = new Set(), goals = new Set(), boxes = new Set();
  let player = null;
  lines.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      const ch = line[x];
      if (ch === '#') walls.add(key(x, y));
      if (ch === '.' || ch === '*' || ch === '+') goals.add(key(x, y));
      if (ch === '$' || ch === '*') boxes.add(key(x, y));
      if (ch === '@' || ch === '+') player = { x, y };
    }
  });
  return { walls, goals, boxes, player };
}

// A box on a non-goal cell wedged into a wall corner can never move again → dead state.
function cornerDead(bx, by, walls, goals) {
  if (goals.has(key(bx, by))) return false;
  const up = walls.has(key(bx, by - 1)), down = walls.has(key(bx, by + 1));
  const left = walls.has(key(bx - 1, by)), right = walls.has(key(bx + 1, by));
  return (up && left) || (up && right) || (down && left) || (down && right);
}

function stateKey(p, boxes) { return p.x + ',' + p.y + '|' + [...boxes].sort().join(';'); }

function solve(level, cap = 400000) {
  const { walls, goals, boxes, player } = parse(level);
  if (!player) return { ok: false, reason: 'no player' };
  const won = (bs) => [...bs].every((k) => goals.has(k));
  if (won(boxes)) return { ok: true, len: 0 };
  const start = { p: player, boxes, depth: 0 };
  const seen = new Set([stateKey(player, boxes)]);
  const q = [start];
  let nodes = 0;
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  while (q.length) {
    if (++nodes > cap) return { ok: false, reason: 'node cap' };
    const cur = q.shift();
    for (const [dx, dy] of dirs) {
      const nx = cur.p.x + dx, ny = cur.p.y + dy, nk = key(nx, ny);
      if (walls.has(nk)) continue;
      let boxes2 = cur.boxes;
      if (cur.boxes.has(nk)) {
        const bx = nx + dx, by = ny + dy, bk = key(bx, by);
        if (walls.has(bk) || cur.boxes.has(bk)) continue;
        if (cornerDead(bx, by, walls, goals)) continue;
        boxes2 = new Set(cur.boxes); boxes2.delete(nk); boxes2.add(bk);
      }
      const sk = stateKey({ x: nx, y: ny }, boxes2);
      if (seen.has(sk)) continue;
      seen.add(sk);
      if (won(boxes2)) return { ok: true, len: cur.depth + 1 };
      q.push({ p: { x: nx, y: ny }, boxes: boxes2, depth: cur.depth + 1 });
    }
  }
  return { ok: false, reason: 'exhausted' };
}

let failures = 0;
LEVELS.forEach((lvl, i) => {
  const r = solve(lvl);
  if (r.ok) console.log('  Level ' + (i + 1) + ': solvable (≈' + r.len + ' moves)');
  else { console.error('  Level ' + (i + 1) + ': UNSOLVABLE — ' + r.reason); failures++; }
});
if (failures) { console.error('FAIL: ' + failures + ' unsolvable level(s)'); process.exit(1); }
console.log('✓ all ' + LEVELS.length + ' sokoban levels solvable');
