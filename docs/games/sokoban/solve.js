// Shared Sokoban solver (no DOM). Used by the game's "Solve" demo and by the level-verification test.
// parseLevel() turns an ASCII level into sets; solve() runs BFS over (player, boxes) states with
// corner-deadlock pruning and a node cap, returning the SHORTEST move sequence ('U'/'D'/'L'/'R'),
// or 'cap' if the search budget is exhausted, or null if the level is provably unsolvable.
const key = (x, y) => x + ',' + y;

export function parseLevel(str) {
  const lines = str.replace(/\n+$/, '').split('\n');
  const w = Math.max(...lines.map((l) => l.length));
  const walls = new Set(), goals = new Set(), boxes = new Set();
  let player = { x: 0, y: 0 }, players = 0;
  lines.forEach((line, y) => {
    for (let x = 0; x < w; x++) {
      const ch = line[x] || ' ';
      if (ch === '#') walls.add(key(x, y));
      if (ch === '.' || ch === '*' || ch === '+') goals.add(key(x, y));
      if (ch === '$' || ch === '*') boxes.add(key(x, y));
      if (ch === '@' || ch === '+') { player = { x, y }; players++; }
    }
  });
  return { w, h: lines.length, walls, goals, boxes, player, players };
}

function cornerDead(bx, by, walls, goals) {
  if (goals.has(key(bx, by))) return false;
  const up = walls.has(key(bx, by - 1)), down = walls.has(key(bx, by + 1));
  const left = walls.has(key(bx - 1, by)), right = walls.has(key(bx + 1, by));
  return (up && left) || (up && right) || (down && left) || (down && right);
}
const skey = (px, py, boxes) => px + ',' + py + '|' + [...boxes].sort().join(';');

export function solve(strOrParsed, cap = 160000) {
  const { walls, goals, boxes, player } = typeof strOrParsed === 'string' ? parseLevel(strOrParsed) : strOrParsed;
  const won = (bs) => { for (const k of bs) if (!goals.has(k)) return false; return true; };
  const start = skey(player.x, player.y, boxes);
  if (won(boxes)) return [];
  const prev = new Map([[start, null]]);
  const q = [{ x: player.x, y: player.y, boxes, k: start }];
  let head = 0, nodes = 0;
  const dirs = [['U', 0, -1], ['D', 0, 1], ['L', -1, 0], ['R', 1, 0]];
  while (head < q.length) {
    if (++nodes > cap) return 'cap';
    const cur = q[head++];
    for (const [mv, dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy, nk = key(nx, ny);
      if (walls.has(nk)) continue;
      let boxes2 = cur.boxes;
      if (cur.boxes.has(nk)) {
        const bx = nx + dx, by = ny + dy, bk = key(bx, by);
        if (walls.has(bk) || cur.boxes.has(bk) || cornerDead(bx, by, walls, goals)) continue;
        boxes2 = new Set(cur.boxes); boxes2.delete(nk); boxes2.add(bk);
      }
      const sk = skey(nx, ny, boxes2);
      if (prev.has(sk)) continue;
      prev.set(sk, { from: cur.k, mv });
      if (won(boxes2)) {
        const moves = [];
        for (let k = sk; prev.get(k); k = prev.get(k).from) moves.push(prev.get(k).mv);
        return moves.reverse();
      }
      q.push({ x: nx, y: ny, boxes: boxes2, k: sk });
    }
  }
  return null;
}
