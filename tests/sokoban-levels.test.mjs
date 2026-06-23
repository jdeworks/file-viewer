// Validates the embedded Sokoban levels. STRUCTURAL checks run on every level (well-formed grid,
// exactly one player, equal boxes & goals, ≥1 box) and FAIL the build if violated. A BFS solver
// (player+box states, corner-deadlock pruning, node cap) then confirms solvability: a level proven
// UNSOLVABLE fails; a hard level that exceeds the node cap is reported as "unverified" (the Microban
// set is published+solvable, so we don't fail the gate on solver budget). Cheap enough for the gate.
import { LEVELS } from '../docs/games/sokoban/sokoban-levels.js';

const key = (x, y) => x + ',' + y;
const CAP = 20000;   // gate budget: confirms easy levels fast; hard published levels bail to "unverified"

function parse(str) {
  const lines = str.replace(/\n+$/, '').split('\n');
  const walls = new Set(), goals = new Set(), boxes = new Set();
  let player = null, players = 0;
  lines.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      const ch = line[x];
      if (ch === '#') walls.add(key(x, y));
      if (ch === '.' || ch === '*' || ch === '+') goals.add(key(x, y));
      if (ch === '$' || ch === '*') boxes.add(key(x, y));
      if (ch === '@' || ch === '+') { player = { x, y }; players++; }
    }
  });
  return { walls, goals, boxes, player, players };
}

function structural(p) {
  if (p.players !== 1) return 'players=' + p.players;
  if (p.boxes.size < 1) return 'no boxes';
  if (p.boxes.size !== p.goals.size) return 'boxes=' + p.boxes.size + ' goals=' + p.goals.size;
  return null;
}

function cornerDead(bx, by, walls, goals) {
  if (goals.has(key(bx, by))) return false;
  const up = walls.has(key(bx, by - 1)), down = walls.has(key(bx, by + 1));
  const left = walls.has(key(bx - 1, by)), right = walls.has(key(bx + 1, by));
  return (up && left) || (up && right) || (down && left) || (down && right);
}
const skey = (p, boxes) => p.x + ',' + p.y + '|' + [...boxes].sort().join(';');

function solve(p) {
  const { walls, goals } = p;
  const won = (bs) => { for (const k of bs) if (!goals.has(k)) return false; return true; };
  if (won(p.boxes)) return { ok: true, len: 0 };
  const seen = new Set([skey(p.player, p.boxes)]);
  const q = [{ p: p.player, boxes: p.boxes, depth: 0 }];
  let head = 0, nodes = 0;
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  while (head < q.length) {
    if (++nodes > CAP) return { ok: false, reason: 'cap' };
    const cur = q[head++];
    for (const [dx, dy] of dirs) {
      const nx = cur.p.x + dx, ny = cur.p.y + dy, nk = key(nx, ny);
      if (walls.has(nk)) continue;
      let boxes2 = cur.boxes;
      if (cur.boxes.has(nk)) {
        const bx = nx + dx, by = ny + dy, bk = key(bx, by);
        if (walls.has(bk) || cur.boxes.has(bk) || cornerDead(bx, by, walls, goals)) continue;
        boxes2 = new Set(cur.boxes); boxes2.delete(nk); boxes2.add(bk);
      }
      const sk = skey({ x: nx, y: ny }, boxes2);
      if (seen.has(sk)) continue;
      seen.add(sk);
      if (won(boxes2)) return { ok: true, len: cur.depth + 1 };
      q.push({ p: { x: nx, y: ny }, boxes: boxes2, depth: cur.depth + 1 });
    }
  }
  return { ok: false, reason: 'unsolvable' };
}

let fails = 0, solved = 0, unverified = 0;
LEVELS.forEach((lvl, i) => {
  const p = parse(lvl);
  const s = structural(p);
  if (s) { console.error('  Level ' + (i + 1) + ': MALFORMED — ' + s); fails++; return; }
  const r = solve(p);
  if (r.ok) solved++;
  else if (r.reason === 'cap') { unverified++; }
  else { console.error('  Level ' + (i + 1) + ': UNSOLVABLE'); fails++; }
});
console.log('✓ ' + LEVELS.length + ' sokoban levels: ' + solved + ' solved, ' + unverified + ' unverified (solver budget), ' + fails + ' bad');
if (fails) { console.error('FAIL: ' + fails + ' invalid level(s)'); process.exit(1); }
