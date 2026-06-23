// Shared Sokoban helpers (no DOM, no search). parseLevel() turns an ASCII level into sets; replay()
// applies a move string (U/D/L/R) and reports whether it solves the level. The actual solving is done
// OFFLINE (a push-based BFS in scripts/presolve) and the move strings are stored in sokoban-solutions.js,
// so the game's "Solve" demo plays them back with zero runtime search and the test just replays them.
const key = (x, y) => x + ',' + y;
const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

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

// Replay a move string from the level's start; returns true iff every box ends on a goal.
export function replay(strOrParsed, moves) {
  const lvl = typeof strOrParsed === 'string' ? parseLevel(strOrParsed) : strOrParsed;
  const { walls, goals } = lvl;
  const boxes = new Set(lvl.boxes);
  let p = { ...lvl.player };
  for (const m of moves) {
    const d = DIRS[m]; if (!d) return false;
    const nx = p.x + d[0], ny = p.y + d[1], nk = key(nx, ny);
    if (walls.has(nk)) return false;
    if (boxes.has(nk)) { const bk = key(nx + d[0], ny + d[1]); if (walls.has(bk) || boxes.has(bk)) return false; boxes.delete(nk); boxes.add(bk); }
    p = { x: nx, y: ny };
  }
  for (const k of boxes) if (!goals.has(k)) return false;
  return true;
}
