// Hand-designed interior structures — the cover/architecture scattered inside big rooms so they
// read as built spaces, not empty boxes. Each entry is a small grid of rows:
//   '#' = wall      '.' = floor (left open — shapes the gaps)
//   's' = sword spawn   'h' = heal-potion spawn   'g' = glyph spawn   (all stay floor)
// A handful carry an item tucked beside the walls. Rows in one structure are equal length.
// They're stamped at random (with repeats) by decorateRoom — these are deliberate forms, not
// the old fully-random pylon noise.
export const STRUCTURES = [
  ["##", "##"],                                   // solid pillar
  ["####"],                                       // horizontal bar
  ["#", "#", "#", "#"],                           // vertical bar
  ["#.", "#.", "##"],                             // L corner
  ["###", ".#."],                                 // T
  [".#.", "###", ".#."],                          // plus / cross
  ["#..", ".#.", "..#"],                          // diagonal
  ["#.#", "#.#", "###"],                          // U (open top)
  ["##..##", "#....#"],                           // brackets
  ["#.#", ".#.", "#.#"],                          // checker
  ["##.##", "##.##"],                             // twin pillars, central lane
  ["###", "#..", "#.."],                          // hooked corner
  ["..#..", ".###.", "#####"],                    // arrow / buttress
  ["#####", "#...#", "#...#", "##.##"],           // sub-room (empty cover)
  ["#####", "#.s.#", "##.##"],                    // sub-room guarding a sword
  ["#.#", ".h.", "#.#"],                          // potion between pillars
  ["#.#", "###", "#.#"],                          // H frame
  ["###", "#g#", "#.#"],                          // glyph nook (open below)
  ["##..", ".##.", "..##"],                       // zigzag
  ["##", "s#"]                                    // sword in a wall corner
];

// Item markers are deliberately rare so structures stay mostly cover, not a loot piñata (a glut of
// swords would trivialise the floor). Each marker rolls before it actually drops; weapons rarest.
const ITEM_CHANCE = { s: 0.22, h: 0.4, g: 0.5 };
const ITEM_KIND = { s: "weapon", h: "potion", g: "glyph" };

// Stamp 0..N structures into a room's interior, keeping a 2-tile margin so the room's perimeter
// (and a navigable border around every cluster) stays open. Structures don't touch each other
// (a 1-tile gap is enforced) or the room centre (spawn / corridor hookup). Walls are written into
// `grid`; item markers leave floor and are returned as {x,y,kind} spawn requests for buildFloor.
// Deterministic: consumes `rng` in a fixed order so attachGrid regenerates identical terrain.
export function decorateRoom(grid, room, rng) {
  const items = [];
  const innerW = room.w - 4;
  const innerH = room.h - 4;
  if (innerW < 2 || innerH < 2) return items;            // too small for a structure + margins
  const budget = Math.max(1, Math.floor((room.w * room.h) / 90));
  const placed = [];                                     // padded bounding boxes already used
  let attempts = budget * 5;
  while (placed.length < budget && attempts-- > 0) {
    const s = rng.pick(STRUCTURES);
    const sh = s.length;
    const sw = s[0].length;
    if (sw > innerW || sh > innerH) continue;
    const ox = room.x + 2 + rng.int(0, innerW - sw);
    const oy = room.y + 2 + rng.int(0, innerH - sh);
    const box = { x: ox - 1, y: oy - 1, w: sw + 2, h: sh + 2 };   // +1 gap on every side
    if (room.cx >= box.x && room.cx < box.x + box.w && room.cy >= box.y && room.cy < box.y + box.h) continue;
    if (placed.some((p) => box.x < p.x + p.w && box.x + box.w > p.x && box.y < p.y + p.h && box.y + box.h > p.y)) continue;
    for (let r = 0; r < sh; r += 1) {
      for (let c = 0; c < sw; c += 1) {
        const ch = s[r][c];
        const gx = ox + c;
        const gy = oy + r;
        if (ch === "#") grid[gy][gx] = "#";
        else if (ITEM_KIND[ch] && rng.chance(ITEM_CHANCE[ch])) items.push({ x: gx, y: gy, kind: ITEM_KIND[ch] });
      }
    }
    placed.push(box);
  }
  return items;
}
