// Embedded Sokoban levels (ASCII, no assets), ordered by escalating difficulty.
// Glyphs: # wall · . goal · $ box · * box-on-goal · @ player · + player-on-goal · space floor.
// Level 1 is solvable in a single left-push (the smoke test relies on this). Rows are arrays joined
// with newlines so leading/trailing whitespace can never drift the parse.
export const LEVELS = [
  // 1 — one push left onto the goal
  ['#####',
   '#.$@#',
   '#####'].join('\n'),
  // 2 — two boxes, push each outward onto its goal
  ['#######',
   '#.$@$.#',
   '#######'].join('\n'),
  // 3 — symmetric room: step up, push left, then push right
  ['#######',
   '#.$ $.#',
   '#  @  #',
   '#######'].join('\n'),
  // 4 — navigate around the box to push it left onto the goal
  ['######',
   '#@   #',
   '# ## #',
   '#.$  #',
   '######'].join('\n'),
  // 5 — small maze: route to the box, push it right onto the goal
  ['######',
   '#@ # #',
   '#  # #',
   '## $.#',
   '######'].join('\n'),
];
