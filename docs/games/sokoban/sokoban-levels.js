// Embedded Sokoban levels (ASCII, no assets), ordered by escalating difficulty. Every level is
// verified solvable by tests/sokoban-levels.test.mjs (a BFS solver) — do NOT add a level without
// that test passing. Glyphs: # wall · . goal · $ box · * box-on-goal · @ player · + player-on-goal ·
// space floor. Level 1 is solvable in a single left-push (the smoke test relies on this). Rows are
// arrays joined with newlines so leading/trailing whitespace can never drift the parse.
export const LEVELS = [
  // 1 — one push left
  ['#####', '#.$@#', '#####'].join('\n'),
  // 2 — two boxes, push each outward
  ['#######', '#.$@$.#', '#######'].join('\n'),
  // 3 — symmetric room
  ['#######', '#.$ $.#', '#  @  #', '#######'].join('\n'),
  // 4 — navigate around the box
  ['######', '#@   #', '# ## #', '#.$  #', '######'].join('\n'),
  // 5 — small maze, push right
  ['######', '#@ # #', '#  # #', '## $.#', '######'].join('\n'),
  // 6 — two boxes, two directions
  ['#######', '#@    #', '#.$   #', '#  $  #', '#  .  #', '#######'].join('\n'),
  // 7 — push two boxes up to the ceiling
  ['#######', '#.   .#', '#$   $#', '#  @  #', '#######'].join('\n'),
  // 8 — corner goals, route around
  ['######', '#@ . #', '# $  #', '# .$ #', '######'].join('\n'),
  // 9 — three boxes along a wall
  ['#######', '#@ $ .#', '#  $ .#', '#  $ .#', '#######'].join('\n'),
  // 10 — U-room with three goals
  ['#######', '#.$ $.#', '#  $  #', '#  .  #', '#  @  #', '#######'].join('\n'),
  // 11 — split chambers
  ['########', '#@ $  .#', '## ### #', '#  $  .#', '########'].join('\n'),
  // 12 — the "plus": push all four boxes outward to the rim goals
  ['#######', '#  .  #', '#  $  #', '#.$@$.#', '#  $  #', '#  .  #', '#######'].join('\n'),
];
