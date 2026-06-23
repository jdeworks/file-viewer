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

// Corridors are carved 2 tiles wide. On big maps 1-wide L-corridors read as a confusing thicket
// of near-parallel hairlines; a 2-wide passage (and the merging of corridors that run one tile
// apart) makes the layout legible. The extra lane is clamped inside the border wall.
function carveH(grid, x1, x2, y) {
  const y2 = y + 1 < grid.length - 1 ? y + 1 : y;
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) { grid[y][x] = '.'; grid[y2][x] = '.'; }
}

function carveV(grid, y1, y2, x) {
  const x2 = x + 1 < grid[0].length - 1 ? x + 1 : x;
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) { grid[y][x] = '.'; grid[y][x2] = '.'; }
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

// BFS over floor cells from `start`. Uses flat typed arrays and a head pointer (NOT Array.shift,
// which is O(n) per dequeue and made big maps quadratic) so it stays O(cells) — ~10ms even on an
// 800×800 floor. Returns packed results: `dist` (Int32, -1 = wall/unreached, keyed y*width+x),
// `order` (cells in BFS order, same packed index), and `count` of reached cells.
export function floodDistances(gridRows, start) {
  const height = gridRows.length;
  const width = gridRows[0].length;
  const dist = new Int32Array(width * height).fill(-1);
  const order = new Int32Array(width * height);
  let count = 0;
  let head = 0;
  const si = start.y * width + start.x;
  dist[si] = 0;
  order[count++] = si;
  while (head < count) {
    const cur = order[head++];
    const cx = cur % width;
    const cy = (cur - cx) / width;
    const d = dist[cur];
    if (cy > 0 && dist[cur - width] === -1 && gridRows[cy - 1][cx] !== '#') { dist[cur - width] = d + 1; order[count++] = cur - width; }
    if (cy < height - 1 && dist[cur + width] === -1 && gridRows[cy + 1][cx] !== '#') { dist[cur + width] = d + 1; order[count++] = cur + width; }
    if (cx > 0 && dist[cur - 1] === -1 && gridRows[cy][cx - 1] !== '#') { dist[cur - 1] = d + 1; order[count++] = cur - 1; }
    if (cx < width - 1 && dist[cur + 1] === -1 && gridRows[cy][cx + 1] !== '#') { dist[cur + 1] = d + 1; order[count++] = cur + 1; }
  }
  return { width, height, dist, order, count };
}
