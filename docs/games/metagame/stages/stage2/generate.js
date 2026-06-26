// Procedural dungeon generator — Binary Space Partitioning (BSP).
//
// Recursively split the interior into partitions until each is near `minLeaf`, fit a room that
// fills most of each leaf, then connect sibling subtrees bottom-up. Because every leaf gets a
// room sized to its partition, rooms scale to the available space (no tiny rooms lost in a sea
// of wall), and corridors are short, sensible links between neighbours rather than long L-runs
// across the whole map. Fully seeded so a floor regenerates identically from `${runSeed}:${floor}`.

import { decorateRoom } from "./structures.js";

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

// Carve a room in every leaf (filling ~70–95% of the partition), then connect sibling subtrees.
function carveAndConnect(node, grid, rng, rooms, minRoom, decor) {
  if (!node.left) {
    const maxW = Math.max(minRoom, node.w - 2);
    const maxH = Math.max(minRoom, node.h - 2);
    const rw = Math.min(maxW, Math.max(minRoom, rng.int(Math.floor(maxW * 0.7), maxW)));
    const rh = Math.min(maxH, Math.max(minRoom, rng.int(Math.floor(maxH * 0.7), maxH)));
    const rx = node.x + 1 + rng.int(0, Math.max(0, node.w - rw - 2));
    const ry = node.y + 1 + rng.int(0, Math.max(0, node.h - rh - 2));
    const room = { x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) };
    carveRoom(grid, room);
    for (const it of decorateRoom(grid, room, rng)) decor.push(it); // preset structures (+ loot)
    grid[room.cy][room.cx] = '.'; // keep the centre (corridor hookup + spawn point) clear
    rooms.push(room);
    node.room = room;
    return room;
  }
  const a = carveAndConnect(node.left, grid, rng, rooms, minRoom, decor);
  const b = carveAndConnect(node.right, grid, rng, rooms, minRoom, decor);
  if (a && b) connect(grid, a, b, rng);
  node.room = a || b;
  return node.room;
}

// Append a few HIDDEN rooms flush against existing rooms, separated by a single wall whose one
// cell is the "secret door" — no corridor: the hidden room aligns directly with its host so bumping
// the door steps straight into it. The reserved rectangle is solid wall already (we never carve it
// here), so the map's connectivity is exactly the no-hidden-room baseline — sealing it can isolate
// nothing, so no connectivity guard is needed. carveHiddenRoom opens the box + door on reveal.
function attachHiddenRooms(grid, rooms, rng) {
  const height = grid.length;
  const width = grid[0].length;
  const want = Math.min(4, 1 + Math.floor(rooms.length / 10));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const allWall = (x, y, w, h) => {
    if (x < 1 || y < 1 || x + w > width - 1 || y + h > height - 1) return false;
    for (let yy = y; yy < y + h; yy += 1) { const row = grid[yy]; for (let xx = x; xx < x + w; xx += 1) if (row[xx] !== '#') return false; }
    return true;
  };
  const overlaps = (b, list) => list.some((p) => b.x < p.x + p.w && b.x + b.w > p.x && b.y < p.y + p.h && b.y + b.h > p.y);
  const hidden = [];
  const reserved = [];
  for (const r of rng.shuffle(rooms.slice())) {
    if (hidden.length >= want) break;
    const hw = rng.int(5, 8);
    const hh = rng.int(5, 8);
    const side = rng.int(0, 3); // 0 N, 1 S, 2 W, 3 E
    let hx; let hy; let door; let inner;
    if (side === 2 || side === 3) { // shared vertical wall (west / east)
      hy = clamp(r.cy - (hh >> 1), 1, height - 1 - hh);
      const lo = Math.max(r.y, hy);
      const hi = Math.min(r.y + r.h - 1, hy + hh - 1);
      if (hi < lo) continue;
      const dy = (lo + hi) >> 1;
      if (side === 3) { hx = r.x + r.w + 1; door = { x: r.x + r.w, y: dy }; inner = { x: r.x + r.w - 1, y: dy }; }
      else { hx = r.x - hw - 1; door = { x: r.x - 1, y: dy }; inner = { x: r.x, y: dy }; }
    } else { // shared horizontal wall (north / south)
      hx = clamp(r.cx - (hw >> 1), 1, width - 1 - hw);
      const lo = Math.max(r.x, hx);
      const hi = Math.min(r.x + r.w - 1, hx + hw - 1);
      if (hi < lo) continue;
      const dx = (lo + hi) >> 1;
      if (side === 1) { hy = r.y + r.h + 1; door = { x: dx, y: r.y + r.h }; inner = { x: dx, y: r.y + r.h - 1 }; }
      else { hy = r.y - hh - 1; door = { x: dx, y: r.y - 1 }; inner = { x: dx, y: r.y }; }
    }
    const box = { x: hx, y: hy, w: hw, h: hh };
    if (!allWall(hx, hy, hw, hh) || overlaps(box, reserved)) continue;
    if (grid[door.y][door.x] !== '#' || grid[inner.y][inner.x] !== '.') continue; // door bumpable from host floor
    reserved.push(box);
    hidden.push({ x: hx, y: hy, w: hw, h: hh, entrance: door, type: rng.pick(['treasure', 'trap', 'teleport']), revealed: false });
  }
  return hidden;
}

// Carve a hidden room (+ its entrance) back to floor when the player opens it. Operates on the
// runtime string grid (rows are immutable strings, so affected rows are rebuilt).
export function carveHiddenRoom(grid, h) {
  for (let y = h.y; y < h.y + h.h && y < grid.length; y += 1) {
    let arr = null;
    const row = grid[y];
    for (let x = h.x; x < h.x + h.w && x < row.length; x += 1) if (row[x] !== '.') { arr = arr || row.split(''); arr[x] = '.'; }
    if (arr) grid[y] = arr.join('');
  }
  const e = h.entrance;
  if (grid[e.y] && grid[e.y][e.x] !== '.') grid[e.y] = grid[e.y].slice(0, e.x) + '.' + grid[e.y].slice(e.x + 1);
}

// Build a #/. grid of `width`×`height`; rooms scale to `minLeaf` partitions.
export function generate(rng, { width, height, minLeaf = 18, minRoom = 5 }) {
  const grid = Array.from({ length: height }, () => Array(width).fill('#'));
  const root = { x: 1, y: 1, w: width - 2, h: height - 2 };
  splitNode(root, rng, Math.max(minRoom + 2, minLeaf));
  const rooms = [];
  const decor = [];
  carveAndConnect(root, grid, rng, rooms, minRoom, decor);
  const hidden = attachHiddenRooms(grid, rooms, rng);
  return { grid: grid.map((row) => row.join('')), rooms, hidden, decor };
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
