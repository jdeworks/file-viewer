# Stage 3 design — Memory Grid

Memory Grid is a seeded nonogram campaign with mono and two-colour boards, volatile cells, locks,
corruption pressure, registers, fragments, upgrades, and per-run boon drafts.

The stage body is the boss gate. Solving snapshots raises corruption until it reaches 8; only that
transition exposes the Memory Leak. Once exposed, the player resolves it directly from the grid
screen. There is no second credential or reconstruction step.

The core test contract is:

- a fresh run cannot reach or defeat the boss;
- normal solves advance every tier, including aliasing and two-colour boards;
- corruption 8 reveals the boss control immediately;
- the boss completion persists and advances the campaign.
