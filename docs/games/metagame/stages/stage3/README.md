# Stage 3 — Memory Grid

**Genre:** seeded nonogram / picross puzzle. **Theme:** you are reconstructing a
corrupting memory grid, cell by cell, before the leak erases it.

## How to play

- Solve each grid using the **row and column clues** — fill the cells that belong to
  the picture and mark the ones that don't.
- Some puzzles are **two-colour** (fill A and fill B) and some cells are **volatile**
  (they decay unless you **lock** them).
- Solving banks currency: **registers** (reg) and **fragments** (frag), spent on
  **boons** that ease later boards.
- The corruption ladder escalates each board. Keep restoring snapshots until
  **corruption peaks (8)** — only then is the boss reachable.

## Controls

- **Move cursor:** arrow keys or **WASD**.
- **Fill A:** `Space` / `F` / `1`, or **click** a cell.
- **Fill B:** `2`, or **Alt-click**.
- **Mark empty:** `X`, or **right-click**.
- **Lock a volatile cell:** `L`.

## The boss — The Memory Leak

The boss demands a **restoration key** that is never stored anywhere — it lives only
in the *difference* between three saved snapshots.

> **Un-cheat hint:** three memory logs (`memory_v1`, `memory_v2`, `memory_v3`) exist
> as real files. One chunk corrupts between each pair. Open them in the viewer and do
> a genuine **three-way diff** — read the chunks in corruption order — to recover the
> key. No single log read top-to-bottom gives the right answer.
