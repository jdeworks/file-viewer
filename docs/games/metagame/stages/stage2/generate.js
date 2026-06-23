// Procedural dungeon generator — classic "rooms and corridors" (the Rogue method).
//
// Place non-overlapping rectangular rooms, carve each to floor, then connect every new
// room to the previous one with an L-shaped corridor. Connecting room i→i-1 for all i
// yields a connected chain, so every floor cell (and the stairs) is reachable from spawn —
// no flood-fill repair needed. Driven entirely by a seeded RNG (see rng.js) so a floor
// regenerates identically from `${runSeed}:${floor}`.

function carveRoom(grid, room) {
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) grid[y][x] = '.';
  }
}

function carveH(grid, x1, x2, y) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) grid[y][x] = '.';
}

function carveV(grid, y1, y2, x) {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) grid[y][x] = '.';
}

// L-corridor between two room centres; corner order is random for variety.
function connect(grid, a, b, rng) {
  if (rng.chance(0.5)) {
    carveH(grid, a.cx, b.cx, a.cy);
    carveV(grid, a.cy, b.cy, b.cx);
  } else {
    carveV(grid, a.cy, b.cy, a.cx);
    carveH(grid, a.cx, b.cx, b.cy);
  }
}

function overlaps(a, b, margin) {
  return (
    a.x - margin < b.x + b.w &&
    a.x + a.w + margin > b.x &&
    a.y - margin < b.y + b.h &&
    a.y + a.h + margin > b.y
  );
}

// Build a #/. grid of `width`×`height` with up to `maxRooms` rooms.
export function generate(rng, { width, height, maxRooms, minRoom, maxRoom }) {
  const grid = Array.from({ length: height }, () => Array(width).fill('#'));
  const rooms = [];
  const attempts = maxRooms * 4;
  for (let i = 0; i < attempts && rooms.length < maxRooms; i += 1) {
    const w = rng.int(minRoom, maxRoom);
    const h = rng.int(minRoom, maxRoom);
    const x = rng.int(1, Math.max(1, width - w - 2));
    const y = rng.int(1, Math.max(1, height - h - 2));
    const room = { x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) };
    if (rooms.some((r) => overlaps(r, room, 1))) continue;
    carveRoom(grid, room);
    if (rooms.length > 0) connect(grid, rooms[rooms.length - 1], room, rng);
    rooms.push(room);
  }
  // Extra corridors between random rooms create loops (less tree-like, more explorable).
  const extraLoops = Math.min(rooms.length - 1, 2 + Math.floor(rooms.length / 3));
  for (let i = 0; i < extraLoops; i += 1) {
    const a = rng.pick(rooms);
    const b = rng.pick(rooms);
    if (a !== b) connect(grid, a, b, rng);
  }
  return { grid: grid.map((row) => row.join('')), rooms };
}

// BFS over floor cells from `start`; returns a distance map keyed "x,y" and the cell list.
export function floodDistances(gridRows, start) {
  const width = gridRows[0].length;
  const height = gridRows.length;
  const dist = new Map();
  const key = (x, y) => `${x},${y}`;
  dist.set(key(start.x, start.y), 0);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    const d = dist.get(key(cur.x, cur.y));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (gridRows[ny][nx] === '#') continue;
      const k = key(nx, ny);
      if (dist.has(k)) continue;
      dist.set(k, d + 1);
      queue.push({ x: nx, y: ny });
    }
  }
  return dist;
}
