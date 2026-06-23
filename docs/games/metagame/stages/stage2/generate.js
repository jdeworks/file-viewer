// Procedural dungeon generator — Binary Space Partitioning (BSP).
//
// Recursively split the interior into partitions until each is near `minLeaf`, fit a room that
// fills most of each leaf, then connect sibling subtrees bottom-up. Because every leaf gets a
// room sized to its partition, rooms scale to the available space (no tiny rooms lost in a sea
// of wall), and corridors are short, sensible links between neighbours rather than long L-runs
// across the whole map. Fully seeded so a floor regenerates identically from `${runSeed}:${floor}`.

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

// Recursively split a partition until both axes are below 2×minLeaf. Splits the longer axis
// (with a little randomness when square-ish) so partitions stay reasonably square.
function splitNode(node, rng, minLeaf) {
  const canV = node.w >= 2 * minLeaf; // can split into left/right
  const canH = node.h >= 2 * minLeaf; // can split into top/bottom
  if (!canV && !canH) return; // leaf
  let vertical;
  if (canV && canH) vertical = node.w > node.h * 1.25 ? true : node.h > node.w * 1.25 ? false : rng.chance(0.5);
  else vertical = canV;
  if (vertical) {
    const cut = rng.int(minLeaf, node.w - minLeaf);
    node.left = { x: node.x, y: node.y, w: cut, h: node.h };
    node.right = { x: node.x + cut, y: node.y, w: node.w - cut, h: node.h };
  } else {
    const cut = rng.int(minLeaf, node.h - minLeaf);
    node.left = { x: node.x, y: node.y, w: node.w, h: cut };
    node.right = { x: node.x, y: node.y + cut, w: node.w, h: node.h - cut };
  }
  splitNode(node.left, rng, minLeaf);
  splitNode(node.right, rng, minLeaf);
}

// Scatter isolated wall pylons inside a room so big rooms aren't empty boxes. Confined to a 2-tile
// interior margin, so the room's perimeter stays open and the room is always navigable.
function addPylons(grid, room, rng) {
  if (room.w < 9 || room.h < 9) return;
  const count = Math.floor((room.w * room.h) / 50);
  for (let i = 0; i < count; i += 1) {
    const pw = rng.chance(0.4) ? 2 : 1;
    const ph = rng.chance(0.4) ? 2 : 1;
    const px = rng.int(room.x + 2, room.x + room.w - 2 - pw);
    const py = rng.int(room.y + 2, room.y + room.h - 2 - ph);
    for (let yy = py; yy < py + ph; yy += 1) for (let xx = px; xx < px + pw; xx += 1) grid[yy][xx] = '#';
  }
}

// Carve a room in every leaf (filling ~70–95% of the partition), then connect sibling subtrees.
function carveAndConnect(node, grid, rng, rooms, minRoom) {
  if (!node.left) {
    const maxW = Math.max(minRoom, node.w - 2);
    const maxH = Math.max(minRoom, node.h - 2);
    const rw = Math.min(maxW, Math.max(minRoom, rng.int(Math.floor(maxW * 0.7), maxW)));
    const rh = Math.min(maxH, Math.max(minRoom, rng.int(Math.floor(maxH * 0.7), maxH)));
    const rx = node.x + 1 + rng.int(0, Math.max(0, node.w - rw - 2));
    const ry = node.y + 1 + rng.int(0, Math.max(0, node.h - rh - 2));
    const room = { x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) };
    carveRoom(grid, room);
    addPylons(grid, room, rng);
    grid[room.cy][room.cx] = '.'; // keep the centre (corridor hookup + spawn point) clear of pylons
    rooms.push(room);
    node.room = room;
    return room;
  }
  const a = carveAndConnect(node.left, grid, rng, rooms, minRoom);
  const b = carveAndConnect(node.right, grid, rng, rooms, minRoom);
  if (a && b) connect(grid, a, b, rng);
  node.room = a || b;
  return node.room;
}

// Build a #/. grid of `width`×`height`; rooms scale to `minLeaf` partitions.
export function generate(rng, { width, height, minLeaf = 18, minRoom = 5 }) {
  const grid = Array.from({ length: height }, () => Array(width).fill('#'));
  const root = { x: 1, y: 1, w: width - 2, h: height - 2 };
  splitNode(root, rng, Math.max(minRoom + 2, minLeaf));
  const rooms = [];
  carveAndConnect(root, grid, rng, rooms, minRoom);
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
