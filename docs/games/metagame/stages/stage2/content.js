// The boss arena is hand-authored, so rows drift a few chars short of the right wall.
// rect() pads every row to the block's max width — interior rows keep their trailing
// border char and pad with '.', solid walls pad with '#'. This guarantees a clean,
// truly-monospace right edge (the <pre> renders ragged rows otherwise). Edit the art
// freely; rect() re-squares it. (Exploration floors are procedurally generated — see
// generate.js — so only the fixed boss arena lives here now.)
function rect(rows) {
  const width = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => {
    if (r.length >= width) return r;
    if (/^#+$/.test(r)) return r.padEnd(width, '#');
    const last = r[r.length - 1];
    return r.slice(0, -1).padEnd(width - 1, '.') + last;
  });
}

export const bossArenaLocked = rect([
  "##############################",
  "#............##............#",
  "#............##............#",
  "#....O.......##.......O....#",
  "#............##............#",
  "#..........................#",
  "#..........................#",
  "#..........????????........#",
  "#..........????????........#",
  "#..........????????........#",
  "#..........????????........#",
  "#..........................#",
  "#..........................#",
  "#....O................O....#",
  "#............##............#",
  "#............##............#",
  "#............##............#",
  "#............##............#",
  "#............@.............#",
  "##############################"
]);

export const bossArenaUnlocked = rect([
  "##############################",
  "#............[]............#",
  "#............[]............#",
  "#....O.......[].......O....#",
  "#............[]............#",
  "#............  ............#",
  "#............  ............#",
  "#..........????????........#",
  "#..........????????........#",
  "#..........????????........#",
  "#..........????????........#",
  "#............  ............#",
  "#............  ............#",
  "#....O.......  .......O....#",
  "#............  ............#",
  "#............  ............#",
  "#............  ............#",
  "#............  ............#",
  "#............@.............#",
  "##############################"
]);
