# Stage 3 — 01: Grid Puzzle / Nonogram Genre Research

Reference research for the **Memory Grid** Stage 3 design. Developer-facing distillation
of the nonogram / Picross / narrative grid-puzzle lineage: how the genre structures difficulty,
generates unique puzzles algorithmically, uses narrative framing, and handles pacing over time.
Companion doc `stage3-02-our-game-design.md` maps this onto our Stage 3 implementation.

---

## A. The seminal games and what each contributed

| Game | Year / author | Core contribution we care about |
|------|---------------|---------------------------------|
| **Mario's Picross** | 1995, Nintendo | First major commercial nonogram. Established the core vocabulary: numbered row/column clues, fill-or-empty grid cells, hidden pixel art as reward. Introduced the "no error indication" mode for purists. |
| **Picross DS / S series** | 2007–ongoing, Jupiter Corp | **Accessibility and lesson design.** Tutorial mode that teaches constraint propagation incrementally. Hint system that highlights provably-deducible cells without solving. The S series refined the UI to near-perfection: left-click fills, right-click marks empty, clue numbers grey out when their run is confirmed. |
| **Nonogram Katana** | 2017, Ucdevs | **Large-grid competence.** Puzzles up to 25×25; timer; color nonograms. Key insight: beyond 15×15, the player *must* use cross-line deduction (not single-line logic) — the game escalates to this organically. |
| **Murder by Numbers** | 2020, Mediatonic | **Narrative wrapping.** Each nonogram solves a "clue" in a murder mystery; the picture revealed is evidence. Lesson: *the picture is the reward, but the reveal is also the story beat.* Puzzle and narrative progression are locked together — you can't advance the story without solving the puzzle. |
| **Return of the Obra Dinn** | 2018, Lucas Pope | **Puzzle mechanics AS narrative.** Reconstructing deaths via partial information is structurally a nonogram: accumulate constraints, deduce unknowns, commit when certain. The "Fate" system — commit only when 3+ deaths are deducible simultaneously — prevents guessing. Lesson: *defer commitment to avoid error cascade.* |
| **Piczle Lines DX** | 2017, Score Studios | **Spatial routing as constraint puzzle.** Each number must be connected to its pair by a path of that exact length. Different from nonogram but same family: fill a grid according to constraints. Lesson: *variant constraint types create distinct puzzle feels from the same grid concept.* |
| **A-Train** / **Lightyears** | various | **Time pressure in puzzles.** Countdown timers fundamentally change puzzle character — they force move-commitment before full analysis, creating different skill than timed-free solving. In our Stage 3, a corruption wave creates spatial time pressure without a literal countdown. |
| **Hexcells** | 2014, Matthew Brown | **Minimalism + emotional tone.** Grid with exactly enough cells. No art reward — the *solving itself* is the reward. Ambient soundtrack. Players describe solving as meditative. Lesson: *puzzles don't need to be large to be deep; density matters more than size.* |

---

## B. Core mechanics taxonomy

### 1. Nonogram fundamentals

A nonogram is a binary constraint satisfaction puzzle on a grid:

```
// A row clue is a list of "run lengths" — groups of consecutive filled cells:
// Row clue [3, 1, 2] means: a run of 3, a gap of ≥1, a run of 1, a gap of ≥1, a run of 2
// The total minimum length: 3 + 1 + 1 + 1 + 2 = 8 cells (for a row of width ≥8)

// Column clues work identically.
// The puzzle is solved when all rows AND columns satisfy their constraints.
```

**Canonical constraint deduction techniques:**
1. *Overlap analysis:* find the leftmost and rightmost valid placements of a run; cells in both placements are definitely filled.
2. *Edge anchoring:* if a clue touches the edge, anchor it.
3. *Isolation:* completed runs — separated by at least one confirmed empty — can be marked grey.
4. *Contradiction:* if placing a cell forces a column violation, that cell is empty.
5. *Cross-line deduction:* row constraints plus column constraints together force cells that neither alone can determine.

**Difficulty classification:**
| Level | Grid size | Technique required |
|-------|-----------|-------------------|
| Easy | 5×5 – 7×7 | Overlap analysis only |
| Medium | 8×10 – 12×12 | Edge anchoring + isolation |
| Hard | 15×15 | Cross-line deduction |
| Expert | 20×20 | Multi-line hypothesis + backtracking |

### 2. Uniqueness requirement

A well-formed nonogram has **exactly one solution**. Puzzles with multiple solutions create ambiguity that frustrates players ("I solved it — but wrong?"). 

**Generation approach for unique puzzles:**
```
1. Start with a target solution (a filled grid)
2. Compute row and column clues from the solution
3. Run a nonogram solver on the clues
4. If the solver finds exactly one solution: puzzle is valid
5. If multiple solutions: modify the target solution and try again
   (flip cells at "switch" locations to eliminate ambiguity)
6. If no solution (data error): regenerate target
```

The "elementary switch" is the simplest ambiguity: a 2×2 subgrid where both diagonals are valid — row clues are both `[1]` and column clues are both `[1]`. Preventing this requires ensuring that every 2×2 corner is resolved by cross-constraint.

### 3. Progressive reveal as narrative

The picture-reveal moment is the core reward loop in Picross-style games:

```
// Each solved row: some of the hidden image becomes visible
// Pattern: dark cells = filled, light cells = empty
// The image resolves incrementally as more rows/columns are solved
// Resolution order: determined by player's solving order (not fixed)
// Reward feel: the image "emerges" — discovery rather than revelation
```

In our Stage 3, the "picture" each puzzle reveals is a **memory fragment** — a piece of the entity's past. This ties the reveal to the narrative: solving a puzzle is literally recovering a memory. The picture is not art for its own sake; it is lore.

### 4. Working memory and puzzle selection

Some puzzle games give the player a choice of which puzzle to work on (e.g. across a world map). This creates a **meta-layer** above individual puzzles:

- Which puzzle to attempt next
- Whether to return to an unsolved puzzle (harder) or advance (less reward)
- Resource allocation if puzzles cost a currency to attempt

This meta-layer is essential for our Stage 3 — the player must manage a library of "retained fragments" that generate passive bonuses, select which to work on, and decide which to let decay.

### 5. Corruption / time pressure

Several puzzle games introduce time or space pressure:
- **Countdown timer** (Mario's Picross hard mode): pure speed pressure
- **Error limit** (Picross S): 5 errors → fail; forces careful deduction over guessing
- **Expanding threat** (our design): corruption spreads from center; player works inward against it

Our corruption mechanic is closer to Hexcells' "pressure through density" than to a countdown — the spreading gray doesn't prevent solving, it *reduces available information* (hiding clues as it covers them).

### 6. Clue degradation (our mechanic — no genre precedent)

When corruption covers a column, that column's clue becomes hidden. This is **not** a standard nonogram mechanic — standard nonograms always show all clues. We introduce it for thematic reasons:

- Memory decays → information degrades
- The player who falls behind loses *clue information*, not just time
- This creates pressure that accelerates exponentially (falling behind = less info = harder to catch up)
- Recovery requires the diff viewer (file viewer feature) to restore clues

This is our key design innovation for Stage 3.

### 7. Difficulty scaling across a session

For a 45–75 minute stage, puzzle difficulty must ramp across the session:

```
// Puzzle progression
Puzzles 1–4:   5×5 (easy, introduces rules)
Puzzles 5–10:  8×8 (medium, first cross-line deduction needed)
Puzzles 11–18: 12×12 (hard, clue degradation first appears)
Boss puzzle:   20×20 (expert, corruption active, time pressure)

// Average solve times (experienced puzzle players)
5×5:   1–3 minutes
8×8:   4–8 minutes
12×12: 8–15 minutes
20×20: 15–25 minutes (under pressure: 25–40 minutes)
```

---

## C. Standard formulas and algorithms

### Constraint propagation (line-by-line solver)
```js
function solveRow(cells, clue) {
  // Find leftmost valid placement (greedy left-push)
  const leftmost = placeLeft(clue, cells.length);
  // Find rightmost valid placement (greedy right-push)
  const rightmost = placeRight(clue, cells.length);
  // Cells in overlap = definitely FILLED
  for (let i = 0; i < cells.length; i++) {
    if (inBothPlacements(i, leftmost, rightmost, clue)) {
      cells[i] = FILLED;
    }
  }
  // Cells in neither placement and between runs = definitely EMPTY
  markDefiniteEmpties(cells, leftmost, rightmost, clue);
  return cells;
}

function propagate(grid, rowClues, colClues) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < grid.height; r++) {
      const before = grid.row(r).slice();
      solveRow(grid.row(r), rowClues[r]);
      if (!equal(before, grid.row(r))) changed = true;
    }
    for (let c = 0; c < grid.width; c++) {
      const before = grid.col(c).slice();
      solveRow(grid.col(c), colClues[c]);
      if (!equal(before, grid.col(c))) changed = true;
    }
  }
}
```

### Uniqueness verification
```js
function hasUniqueSolution(rowClues, colClues) {
  const solutions = [];
  solve(rowClues, colClues, grid => {
    solutions.push(grid);
    if (solutions.length > 1) return false; // early exit
  });
  return solutions.length === 1;
}
```

### Procedural puzzle generation (our approach)
```js
function generatePuzzle(size, density = 0.55) {
  // density: target fraction of filled cells (0.5–0.65 is visually interesting)
  let attempts = 0;
  while (attempts < 1000) {
    const solution = randomGrid(size, density);
    const clues = computeClues(solution);
    if (hasUniqueSolution(clues.rows, clues.cols)) {
      return { solution, clues };
    }
    attempts++;
  }
  // Fallback: use a hand-crafted puzzle from the pool
  return handCraftedPool.shift();
}
```

**Note on generation speed:** For 5×5 and 8×8, random generation finds unique puzzles quickly
(~1–10 attempts). For 12×12 and above, unique puzzles are rarer — use a pre-generated pool
(50–100 puzzles per size tier) to avoid in-game generation delays.

### Corruption spread
```js
// Corruption spreads from center outward, one cell per tick
function spreadCorruption(corruptionGrid, centerX, centerY, tickCount) {
  const radius = tickCount * CORRUPTION_SPEED; // e.g. 0.3 cells per second
  for (let r = 0; r < HEIGHT; r++) {
    for (let c = 0; c < WIDTH; c++) {
      const dist = Math.hypot(c - centerX, r - centerY);
      if (dist < radius) corruptionGrid[r][c] = true;
    }
  }
}
// When corruptionGrid[r][c] = true: that cell is visually corrupted (gray overlay)
// When a full column is corrupted: hide that column's clue
```

---

## D. UX patterns for puzzle games

- **Left-fill / right-mark:** Left click fills a cell; right click marks it empty (×). Standard across all Picross games.
- **Clue completion highlighting:** When a row/column's clue is satisfied by current state, grey out its clue numbers. *Never* auto-complete — the player must explicitly finish the row.
- **Error feedback options:**
  - Strict: no error indication (Picross purist mode)
  - Assisted: flash on error but allow correction
  - Guided: highlight the incorrect cell in red
  Our Stage 3: Assisted mode (flash but allow correction). Strict as optional setting.
- **Auto-mark empties:** When all filled cells in a row are placed, auto-mark remaining cells as empty. Controversial (some players prefer manual). Offer as toggle.
- **Zoom on large grids:** 20×20 at small cell size is unplayable on mobile. Pan + zoom essential for grids above 12×12.
- **Progress save:** Per-puzzle mid-solve state saves automatically. Returning to an unsolved puzzle restores exact state.

---

## E. Design pitfalls to avoid

1. **Non-unique solutions.** The cardinal sin. Every puzzle must be verified unique before shipping. Pre-generated pools are safer than real-time generation for large sizes.
2. **Ambiguous art.** The revealed picture should be readable even at low resolution. Avoid thin diagonals — they create ambiguous cells. Test: can a player identify what the picture is after solving?
3. **Clue overload on large grids.** A 20×20 grid with complex clues can have clue columns wider than the grid itself. Design clues to be readable by sizing cell width based on the longest clue.
4. **All-or-nothing reveal.** If the picture only makes sense when 100% complete, partial solvers feel no progress. Our fragment system (each puzzle reveals a piece of memory immediately) addresses this.
5. **Corruption that's too slow:** Players don't feel pressure. Corruption must reach a visible clue within the first 2 minutes of a puzzle — otherwise the mechanic is decorative.
6. **Corruption that's too fast:** Players feel robbed of information before they can analyze. Minimum grace period: 60 seconds before first clue is hidden.

---

## F. How this maps to Stage 3: Memory Grid (pointer)

Stage 3 borrows the **core nonogram mechanics** from Picross S, the **narrative picture-as-memory** approach from Murder by Numbers, and the **clue-degradation-as-time-pressure** from our own design innovation (no genre precedent). It adds a **fragment retention meta-layer** (which puzzles to hold active, which to let decay) and a **diff-viewer integration** as the file viewer feature. Full spec in `stage3-02-our-game-design.md`.
