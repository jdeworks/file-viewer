# Stage 3 "Memory Grid" — Expansion Build Plan

Date: 2026-06-26  
Status: ACTIVE — core game shipped; this plan covers the ordered expansion.  
Audience: The implementer who will execute these increments one by one.

---

## Orientation

Stage 3 ships as a fully playable nonogram roguelite. The expansion adds **one new verb per corruption tier** so "deeper" always introduces a mechanic the player has never had to think about before — not just bigger grids.

The arc: Volatile Cells (corruption 2) → Linked Pairs / Alias (corruption 4) → Two-Colour Nonogram (corruption 6) → Three-Way Boss Diff (corruption 8 / boss).

Every increment is one discrete unit. Each is testable in isolation: a focused unit test plus `node tests/smoke-area.mjs games`. Never commit without both green.

---

## Priority Table — Do First

| # | Increment | Phase | Effort | Why first |
|---|-----------|-------|--------|-----------|
| 1 | Run pressure clock | 0 | S | Prerequisite for roguelite arc; without death/restart the expansion tiers feel optional |
| 3 | `volatile.js` — deterministic picker | A | S | First new module; validates the picker pattern before aliases and colour reuse it |
| 4 | Board: volatile reset-on-wrong-fill | A | S | Extends `setCell` — the core interaction primitive; wrong here cascades to alias/colour |
| 9 | `nonogram-colour.js` — colour solution + clue derivation | C | M | Start the colour engine early; #10–#13 all chain from it, and the solver is the highest-risk item |

Prerequisites by chain: `#1→#2`, `#3→#4→#5`, `#6→#7→#8`, `#9→#10→#11→#12→#13`, `#14→#15`. Phases A and B can run in parallel. Phase C must follow B (volatile + alias inform the colour design). Phase D can be done any time after Phase A.

---

## Phase 0 — Run Structure (2 increments)

The expansion tiers need a death/restart arc so each new mechanic raises actual stakes. Without this, reaching colour-tier is just an endless grind milestone rather than a victory condition.

---

### #1 — Run pressure clock S

**What:** Track wrong fills as run-level pressure. When pressure hits the limit, the run ends: meta-upgrades (registers / retained / shop) are preserved, but `state.run` resets (new seed, index 0, solvedCount 0). Pressure limit = `20 + corruption * 2` (harder tiers are inherently harder, so more forgiving).

**Files to edit:**
- `state.js`: add `run.pressure: 0` and `run.pressureLimit` to `freshFrom`; bump nothing in normalizeState (pressure resets with the run).
- `renderer.js`: in `applyCell`, when `setCell` returns `wrong=true` increment `state.run.pressure`; if `state.run.pressure >= pressureLimit` call `endRun()`. Add `endRun()` function: pushes "pressure critical — run terminated" log, calls `freshFrom` on the state meta to reset `state.run`, then calls `loadBoard()` + `paintHud()`. Add "PRESSURE X/Y" span to `s3-hud`.
- `messages.js`: add `pressureLimit(corruption)` helper or inline it in `renderer.js`.

**Do NOT add:** a visible countdown timer. Pressure is a counter shown in the HUD, not a time gate.

**Test:** Add `pressure.test.mjs` (or extend `board.test.mjs`): confirm `setCell` wrong-fill return value drives pressure; confirm run resets at threshold but meta survives. Then `node tests/smoke-area.mjs games`.

---

### #2 — Corruption-8 boss gate S

**What:** The "solve leak" button must require `corruptionForRun(state.run) >= 8` AND `state.boss.unlocked`. Currently only `unlocked` is checked. Add the corruption gate to `defeatMemoryLeak` and to the button's disabled state in `paintHud`.

**Why:** Makes reaching corruption 8 a real prerequisite — the player must survive 24 puzzles before the boss fight becomes accessible, giving the expansion tiers meaning.

**Files to edit:**
- `boss.js`: `defeatMemoryLeak(state)` — add guard `if (!state.boss.corruption8Reached) return false;`. The renderer sets `state.boss.corruption8Reached = true` the first time `corruptionForRun(state.run) >= 8`.
- `renderer.js`: in `onSolved`, detect `corruptionForRun(state.run) >= 8` first occurrence and set the flag; in `paintHud`, disable the "solve leak" button unless both conditions hold.
- `messages.js`: add a hint-ladder entry for "you must reach corruption 8 before the boss will engage."

**Test:** Unit test in `boss.test.mjs` — `defeatMemoryLeak` returns false without the flag. `node tests/smoke-area.mjs games`.

---

## Phase A — Volatile Cells (3 increments)

**Tier:** Corruption 2, "Cache Pressure."  
**New verb:** A wrong fill on a volatile cell resets it to UNKNOWN (the fill disappears) instead of just incrementing the mistake counter. The player must be CERTAIN before filling a volatile cell.

---

### #3 — `volatile.js`: deterministic volatile cell picker S

**What:** New module that, given a puzzle and a per-puzzle seed, deterministically picks 2–4 cells to mark as volatile. The count scales with corruption: `Math.min(4, 2 + Math.floor(corruption / 2))`.

**Selection constraints (from the research):**
- Skip cells in lines with a single unique arrangement (pass-1 fully-forced lines). A volatile cell must require genuine deduction or the reset has no consequence.
- Skip cells where `solve(rowClues, colClues)` already determines the cell in its first solver pass. Use the solver's per-cell determination order — the `arrangements` function in `nonogram.js` exposes this implicitly: if at pass-1 the cell is already determined, skip it.
- Pick from the remaining cells using `makeRng(puzzle.seed + ':volatile')`.

**New file:** `volatile.js` (~80 LOC)

```js
// volatile.js — deterministic volatile cell picker for Stage 3 "Cache Pressure" tier.
// Returns a Set of "x,y" strings derived from the puzzle seed, never from Date.now/Math.random.
import { makeRng } from "./rng.js";
import { solve, UNKNOWN } from "./nonogram.js";

export function pickVolatileCells(puzzle, corruption) { ... }
```

**Exported:** `pickVolatileCells(puzzle, corruption): Set<string>` where strings are `"x,y"`.

**Test:** New `volatile.test.mjs` — same puzzle + corruption always returns same set; no cell is in a pass-1 forced line; count matches the formula; no cell appears twice. Then games smoke.

---

### #4 — Board: volatile reset-on-wrong-fill M

**What:** Extend `setCell` in `board.js` to accept an optional `volatileCells` Set. When a wrong fill lands on a volatile cell, reset it to UNKNOWN (undo the fill) instead of leaving it and counting a mistake. Return `{ wrong, volatileReset }`.

**Files to edit:**
- `board.js`: Change `setCell(board, x, y, mark)` signature to `setCell(board, x, y, mark, volatileCells)`. After placing a wrong fill, check `volatileCells?.has(`${x},${y}`)`. If volatile: set `board.marks[y][x] = UNKNOWN` (reset), set `volatileReset = true`, do NOT increment mistakes. If not volatile: keep existing behavior (wrong fill stays, `wrong = true`).
- `renderer.js`: Thread `volatileCells` (computed from `pickVolatileCells(puzzle, corruptionForRun(state.run))`) through `loadBoard` and `applyCell`. When `volatileReset` is true, push a log entry: `"volatile cell reset — re-examine before filling."`. Corruption gate: only pass `volatileCells` when `corruptionForRun(state.run) >= 2`.

**Note:** `volatileCells` is computed from the seed at board-load time. It is NOT stored in save state — it is always re-derived on board load (same seed → same cells). This is the same pattern as `puzzle` itself.

**Test:** `board.test.mjs` — wrong fill on a volatile cell resets to UNKNOWN; wrong fill on a non-volatile cell stays; correct fill on a volatile cell stays. Games smoke.

---

### #5 — Grid + shop: volatile cell visuals + ECC Write-Protect upgrade M

**What:** Mark volatile cells with a distinct glyph/class in the grid. Add the "ECC Write-Protect" shop upgrade that reduces the volatile cell count by 1 per level (min 0).

**Files to edit:**
- `grid.js`: `buildGrid(puzzle, handlers)` → `buildGrid(puzzle, handlers, volatileCells)`. In the cell-creation loop, if `volatileCells.has(`${x},${y}`)`, add class `s3-volatile` to the cell element. The `update(board)` function must not wipe `s3-volatile` when rebuilding className — store the volatile flag on the cell object (`cells[y][x].volatile = true`) and re-assert the class after each state update.
- `shop.js`: Add to `SHOP_UPGRADES`:
  ```js
  { id: "ecc", name: "ECC Write-Protect", desc: "-1 volatile cell per snapshot", max: 4 }
  ```
  Add to `BASE`: `ecc: 80`. Add to `GROWTH`: `ecc: 1.8`. Add `"ecc"` to `ACTIVE` set.
- `styles.css`: `.s3-volatile` — orange border or `⚡` pseudo-element; distinct from cursor/wrong.
- `board.js`: In `pickVolatileCells` call in `renderer.js` (or in a new `loadVolatiles` helper), subtract `upgradeLevel(state, "ecc")` from the count before picking (floor at 0).
- `renderer.js`: Thread the ECC level into the `pickVolatileCells` call.

**Test:** Games smoke. Visually confirm volatile cells show the marker. Confirm ECC level 1 reduces count by 1. Unit test: upgradeLevel-adjusted count matches expected.

---

## Phase B — Linked Pairs / Alias (3 increments)

**Tier:** Corruption 4, "Memory Alias."  
**New verb:** Cells sharing a marker (α, β, γ…) have identical solution values. Deducing one immediately reveals the other — a cross-grid constraint that breaks intra-line-only logic.

---

### #6 — `alias.js`: deterministic alias pair picker S

**What:** New module that picks 1–3 same-value cell pairs whose positions satisfy selection constraints.

**Selection constraints (from the research):**
- Both cells in a pair must have the SAME solution value (both FILLED or both EMPTY).
- No pair may have both cells in the same row OR same column (a within-line alias is already captured by the clue).
- Skip cells that are determined in solver pass 1 (the alias adds no deductive value over what the clue already gives).
- Prefer pairs where at least one cell is NOT determined until solver pass 3+ (mid-difficulty cells).
- Pair count: `Math.min(3, Math.max(1, Math.floor(corruption / 2) - 1))` — so corruption 4 → 1 pair, corruption 6 → 2 pairs, corruption 8 → 3 pairs (alias pairs stack with the colour mechanic).

**New file:** `alias.js` (~90 LOC)

```js
// alias.js — deterministic alias pair picker for Stage 3 "Memory Alias" tier.
import { makeRng } from "./rng.js";
import { solve, FILLED, UNKNOWN } from "./nonogram.js";

export function pickAliasPairs(puzzle, corruption) { ... }
// Returns Array<[{x,y},{x,y}]> — each sub-array is one linked pair.
```

**Test:** New `alias.test.mjs` — same seed always same pairs; no same-row or same-col pairs; both cells same solution value; count in range; no cell appears in two pairs. Games smoke.

---

### #7 — Board: alias mirror on setCell M

**What:** When the player fills one cell of an alias pair, the partner is automatically filled/cleared to match. Guard against cycles.

**Files to edit:**
- `board.js`: Change `setCell(board, x, y, mark, volatileCells, aliases)`. After updating `board.marks[y][x]`, check if the cell is in any alias pair (build a lookup map from `aliases`). If found and partner is not already at the new value, recursively call `setCell` on the partner with a `visited = new Set()` guard. Return `{ wrong, volatileReset, aliasMirrored: [{x,y}] }`.
- `renderer.js`: Thread `aliases` (from `pickAliasPairs(puzzle, corruptionForRun(state.run))`) through `loadBoard` and `applyCell`. When `aliasMirrored.length > 0`, push log: `"alias mirrored — ${n} cell(s) updated."`. Gate: only pass `aliases` when `corruptionForRun >= 4`.
- `alias.js`: Export `buildAliasLookup(aliases): Map<string, {x,y}>` mapping `"x,y"` → partner cell, for O(1) lookup in `setCell`.

**Save state note:** `aliases` are NOT stored. They are re-derived from the puzzle seed at board-load time, exactly like `volatileCells`.

**Test:** `board.test.mjs` — filling one alias cell auto-fills partner; clearing one auto-clears partner; cycle guard prevents infinite recursion on a pair. Games smoke.

---

### #8 — Grid + shop: alias visuals + Alias Tracer upgrade M

**What:** Show shared marker glyphs on alias cells. Add "Alias Tracer" shop upgrade that pre-reveals N pairs (marks both cells of N pairs with a hint that shows their linked value).

**Files to edit:**
- `grid.js`: `buildGrid(puzzle, handlers, volatileCells, aliases)`. Build a Map from `"x,y"` → label (`"α"`, `"β"`, `"γ"`). In cell-creation, if cell is in an alias pair, store label in `cells[y][x].aliasLabel`. In `update(board)`, after setting textContent / className, append a `<sup>` or span with the alias label (or inject via CSS `data-alias` attribute + `::after` pseudo-element to avoid DOM thrash).
- `shop.js`: Add to `SHOP_UPGRADES`:
  ```js
  { id: "alias_tracer", name: "Alias Tracer", desc: "+1 alias pair pre-revealed per snapshot", max: 3 }
  ```
  BASE `alias_tracer: 100`, GROWTH `1.85`. Add to `ACTIVE`.
- `board.js`: Add `revealAliasPairs(board, aliases, n)` — fills the first `n` pairs' values into `board.marks` (both cells) if they are currently UNKNOWN. Used by `applyPrefetch`-style pre-fill at board load.
- `renderer.js`: After building `aliases` at board-load, call `revealAliasPairs(board, aliases, upgradeLevel(state, "alias_tracer"))`.
- `styles.css`: Alias label styling — small corner glyph, colour distinct from volatile marker.

**Test:** Games smoke. Visual check: alias label visible; buying Alias Tracer reveals correct pairs on a fresh board. Unit test `revealAliasPairs` fills both cells of revealed pairs.

---

## Phase C — Two-Colour Nonogram (5 increments)

**Tier:** Corruption 6, "Hot/Cold Memory."  
**New verb:** Cells are BLUE (cold) or ORANGE (hot), not just filled/empty. Each line has two sub-clue sequences. Same-colour blocks need a gap; different-colour blocks may be adjacent.  
**This is the largest phase.** Start with the engine (#9–#11) before touching board/grid.

---

### #9 — `nonogram-colour.js`: colour solution generation + clue derivation M

**What:** New module for the colour engine. First, just the solution generator and clue derivation.

**Cell states for colour:** `EMPTY = 0`, `BLUE = 2`, `ORANGE = 3`. (Keep `FILLED = 1` for B&W backward compat.)

**New file:** `nonogram-colour.js` (~200 LOC target across #9–#11)

```js
// nonogram-colour.js — two-colour nonogram engine for Stage 3 corruption-6 tier.
// BLUE (cold) and ORANGE (hot) cells. Same-colour blocks need a gap; different-colour may be adjacent.
export const BLUE = 2;
export const ORANGE = 3;

export function colourRunLengths(line, colour) { ... }
// Returns run lengths for `colour` in a line (EMPTY cells are gaps; the other colour is also a gap
// for same-colour counting but NOT for adjacency counting).

export function colourCluesOf(solution, width, height) { ... }
// Returns { rowCluesBlue, rowCluesOrange, colCluesBlue, colCluesOrange }.

export function colourSolution(seed, width, height) { ... }
// Returns a 2D array of EMPTY/BLUE/ORANGE values, using makeRng(seed + ':colour').
// Density: BLUE ~0.28, ORANGE ~0.22, EMPTY ~0.50 (adjust to balance uniqueness find rate).
```

**Clue derivation rule:** For `colourRunLengths(line, colour)`: walk the line; a run of `colour` cells is counted; any other cell (EMPTY or the other colour) ends the run. Two same-colour blocks separated only by the other colour ARE counted as separate runs (the other-colour block counts as a separator). This correctly implements the "different-colour may be adjacent — no gap" rule.

**Test:** `nonogram-colour.test.mjs` — `colourRunLengths([BLUE,BLUE,ORANGE,BLUE], BLUE)` → `[2,1]`; `colourRunLengths([BLUE,ORANGE,BLUE,EMPTY,ORANGE], ORANGE)` → `[1,1]`; clue sums match cell counts per colour. Games smoke.

---

### #10 — `nonogram-colour.js`: colour line-solver M

**What:** Add `colourLineSolve(cells, blueClues, orangeClues)` to `nonogram-colour.js`. Enumerate valid arrangements for both colour channels simultaneously; intersect to force cells.

**Cell states in the solver:** `UNKNOWN = -1`, `EMPTY = 0`, `BLUE = 2`, `ORANGE = 3`.

**Arrangement semantics:** A colour arrangement is a sequence of `(colour, startPos)` block placements for all blue and orange clues combined, respecting:
- Same-colour blocks separated by ≥ 1 EMPTY or other-colour cell.
- Different-colour blocks may be immediately adjacent.
- All cells not covered by any block are EMPTY.

**Implementation strategy:** Generate all placements for blue clues then all placements for orange clues; combine pairs and check consistency with current cell state. Intersect (AND/OR) to force cells. Cache per `(n, blueClues, orangeClues)` key.

**Also add:** `colourSolve(rowCluesBlue, rowCluesOrange, colCluesBlue, colCluesOrange)` — iterates the colour line-solver over all rows/cols to fixpoint. Returns `{ grid, solved, passes }` using the same pattern as `solve()` in `nonogram.js`.

**Test:** `nonogram-colour.test.mjs` — forced placements for trivial colour clues; adjacency rule: `[BLUE, ORANGE]` blocks can be adjacent; contradiction returns null; passes count is > 0. Games smoke.

---

### #11 — `nonogram-colour.js`: colour puzzle generator M

**What:** Add `makePuzzleColour(seed, { width, height, hard })` to `nonogram-colour.js`.

**Same pattern as `makePuzzle`:** walk density variants, attempt N candidates (`want = 1 + hard * 5`), keep the hardest (most solver passes), accept only if `colourSolve` fully determines the grid. Same fallback: horizontal-stripes-like pattern if random search fails.

**Grid size cap:** Colour grids are capped at 10×10 max (smaller than B&W's 12+Overclock) because colour puzzles at 12×12 are significantly harder to generate (lower uniqueness rate) and harder for the player. The `sizeForRun` function needs a branch when `corruptionForRun >= 6`.

**Return shape:**
```js
{
  width, height,
  type: 'colour',          // distinguishes from B&W puzzles
  solution,                // 2D EMPTY/BLUE/ORANGE
  rowCluesBlue, rowCluesOrange,
  colCluesBlue, colCluesOrange,
  seed, difficulty
}
```

**Test:** `nonogram-colour.test.mjs` — `makePuzzleColour` generates uniquely-solvable puzzles (re-running `colourSolve` on the returned clues produces exact solution); determinism; `hard` yields higher difficulty; no fallback for 5×5..8×8. Games smoke.

---

### #12 — Board: colour marks + persistence L

**What:** Extend the board model to hold BLUE/ORANGE marks. Colour marks are the player's work-in-progress and MUST persist in save state.

**Files to edit:**
- `board.js`:
  - Add `colourMarks: string[]` field to the board object (parallel to `marks`). Each string is a row of characters: `"B"` = BLUE, `"O"` = ORANGE, `"."` = UNKNOWN colour.
  - `encodeColourMarks(colourMarks)` → `string[]`. `decodeColourMarks(rows, width, height)` → 2D or null.
  - New `setColourMark(board, x, y, colour)`: set `colourMarks[y][x]` to BLUE or ORANGE (toggle: setting same colour again clears to UNKNOWN). Only valid on cells the player has already filled (`marks[y][x] === FILLED`). For a colour puzzle, `isSolved` checks BOTH `marks` (filled vs empty) AND `colourMarks` (blue vs orange for filled cells).
  - `isSolvedColour(puzzle, marks, colourMarks)` — checks solution values (BLUE/ORANGE/EMPTY) against the player's fills and colour marks simultaneously.
  - `createBoard` variant: when `puzzle.type === 'colour'`, initialise `colourMarks` from saved state or all-UNKNOWN.
- `state.js`:
  - Bump `version` to 3.
  - Add `state.run.colourMarks: null | string[]` (parallel to `state.run.marks`).
  - `normalizeState`: migrate v2 → v3 cleanly (no colourMarks = start fresh colour marks for the current board).
- `renderer.js`:
  - Save `state.run.colourMarks = encodeColourMarks(board.colourMarks)` alongside `state.run.marks` in `applyCell`.
  - Dispatch: when `corruptionForRun >= 6`, use `makePuzzleColour` + `isSolvedColour`.

**LOC note:** `board.js` will approach 220 LOC. Stay under 300; split only if adding a third distinct concern.

**Test:** `board.test.mjs` — colour marks encode/decode round-trip; `isSolvedColour` only fires when fills AND colours both match; v2 → v3 migration leaves other fields intact. Games smoke.

---

### #13 — Grid + shop: colour grid renderer + Thermal Scanner / Spectrum Filter L

**What:** Render the colour grid (double-clue per line, blue/orange cells), add two new shop upgrades, and dispatch colour mode in the renderer.

**This increment will push `renderer.js` past 300 LOC. Split it here.**

**Renderer split:**
- `renderer.js` (~180 LOC after split): layout bootstrap, `paintHud`, log, top-level event router (click/key dispatch), `toggleShop`.
- `renderer-play.js` (~200 LOC): `loadBoard`, `applyCell`, `onSolved`, `useHint`, `useCheck`, `loadVolatiles`, `loadAliases`. Exported as named functions, imported by `renderer.js`.

**Files to edit:**
- `grid.js`: `buildGrid(puzzle, handlers, volatileCells, aliases)` gains a colour mode branch when `puzzle.type === 'colour'`. In colour mode:
  - Double clue display: each column/row has a blue sub-row and an orange sub-row of clue numbers. Add one extra `gridTemplateRows`/`gridTemplateColumns` repeat for each colour. Lay blue clues above orange clues (or left-of-right for rows).
  - Cells have three states: empty (`.`), blue filled (`B` glyph in blue class), orange filled (`O` glyph in orange class). The cursor and volatile/alias markers still apply.
  - Right-click (mark mode) in colour mode cycles colour: UNKNOWN → BLUE → ORANGE → UNKNOWN on already-filled cells (or a dedicated `c` key).
  - `update(board)` reads both `board.marks` and `board.colourMarks` to pick the right glyph.
- `shop.js`: Add to `SHOP_UPGRADES`:
  ```js
  { id: "thermal", name: "Thermal Scanner", desc: "+2 cells revealed with correct colour per snapshot", max: 4 },
  { id: "spectrum", name: "Spectrum Filter", desc: "+1 volatile colour cell pre-coloured per snapshot", max: 3 }
  ```
  BASE `thermal: 140`, `spectrum: 160`. GROWTH `1.9`, `1.9`. Add both to `ACTIVE`.
- `renderer-play.js`: At board-load in colour mode, apply Thermal Scanner (pre-colour N cells by calling `setColourMark` on the first N FILLED solution cells). Apply Spectrum Filter (pre-colour volatile cells' colour — show the colour even though fill is unknown).
- `styles.css`: `.s3-cell-blue`, `.s3-cell-orange`, `.s3-clue-blue`, `.s3-clue-orange` (tinted label colours). Double-clue row layout additions.
- `board.js` / `sizeForRun`: cap at 10 when `corruption >= 6`.

**Test:** Games smoke. Visually verify: blue/orange glyphs show; double-clue rows render; Thermal Scanner pre-colours cells on a fresh board. Unit test `isSolvedColour` fires only when colours correct.

---

## Phase D — Three-Way Boss Diff (2 increments)

**Tier:** Boss fight upgrade (corruption 8).  
**New verb:** Three files must be compared (not two). Each file shows only one of the three key chunks. A two-file comparison is insufficient.

---

### #14 — `content.js`: three-way piece arrangement + `memoryV3Text` M

**What this changes:** Currently `memoryV1Text` carries all three chunks; `memoryV2Text` strips all to `[missing]`. After this increment: each file carries exactly ONE chunk, and two different corruption-noise placeholders in the other two slots, so no single file (nor any single pair of files) reveals all three chunks.

**Exact file layout after this increment:**

```
v1 (backup):       sector 02: restoration chunk ${pieces[0]}
                   sector 04: restoration chunk [overwritten]
                   sector 06: restoration chunk [missing]

v2 (corrupted):    sector 02: restoration chunk [missing]
                   sector 04: restoration chunk ${pieces[1]}
                   sector 06: restoration chunk [leaked]

v3 (fragmented):   sector 02: restoration chunk [corrupted]
                   sector 04: restoration chunk [fragmented]
                   sector 06: restoration chunk ${pieces[2]}
```

The player opens all three, sees one intact chunk per file at different sector positions, and assembles the key in sector order: `pieces[0]` (from v1 sector 02), `pieces[1]` (from v2 sector 04), `pieces[2]` (from v3 sector 06). Key = `pieces.join("")` — unchanged.

**Why this is non-bypassable:** No single file or pair of files contains all three chunks. The player cannot read v1 alone to get the full key (as they could before). The key is still seed-derived and checked by `tryRestoreDiffKey` — the flow is unchanged, only the information-gathering step requires all three files.

**Files to edit:**
- `content.js`: Rewrite `memoryV1Text`, `memoryV2Text`; add `memoryV3Text(state)`.
- `messages.js`: Add `MEMORY_V3_PATH = '/docs/examples/metagame/stage3/memory_v3.log'`.
- `state.js`: No structural change needed. `makePieces` returns the same three chunks; their arrangement in the files now changes.
- `boss.js`: In `tryRestoreDiffKey`, update `actions.setAction` to include `'memory_v3.log'` in the files array.
- `tests/boss.test.mjs`: **Must update.** The existing assertion `v1.includes(a) && v1.includes(b) && v1.includes(c)` becomes false. Replace with:
  - `v1.includes(a) && !v1.includes(b) && !v1.includes(c)` (v1 has only chunk 0)
  - `v2.includes(b) && !v2.includes(a)` (v2 has only chunk 1)
  - `memoryV3Text(state).includes(c) && !memoryV3Text(state).includes(a)` (v3 has only chunk 2)
  - All three together yield the correct 9-char key.

**Test:** Updated `boss.test.mjs`. Games smoke.

---

### #15 — Boss panel: third file button + updated hints S

**What:** Add the "open memory_v3.log" button to the boss panel. Update hint ladder and unlock message.

**Files to edit:**
- `renderer.js`: In the boss controls HTML, add:
  ```html
  <button type="button" data-action="v3">open memory_v3.log</button>
  ```
  In the click handler: `if (action === "v3") viewer?.openFile?.(MEMORY_V3_PATH, { text: memoryV3Text(state), source: "stage3" })`.
- `messages.js`: Update `lockedHintLadder` last entry: `"compare all three memory logs. each reveals one chunk in order."`. Update `bellMessages.unlock`: `"three-way diff restored the missing key."`.

**Test:** Games smoke. Verify v3 button opens the correct text. Manually confirm: entering the 9-char key recovered from all three files succeeds; entering a key from only v1+v2 (which now only gives 2 of 3 chunks) fails.

---

## Phase E — Polish (3 increments)

---

### #16 — Corruption-tier milestone messages S

**What:** When the player first crosses a corruption threshold (2, 4, 6, 8), push a distinctive log entry that names the new mechanic and thematic framing. Record milestones-shown in `state.run.milestonesShown = {}` (reset per run). Show each only once.

**Files to edit:**
- `renderer.js` (or new `milestones.js` ~60 LOC): In `onSolved`, check previous vs new corruption. If crossing 2 → push `"CACHE PRESSURE: volatile memory cells activated — wrong fills may now reset."`. Similarly for 4 (`"MEMORY ALIAS: linked cell pairs detected."`), 6 (`"HOT/COLD MEMORY: two-colour grid active. different colours may be adjacent."`), 8 (`"WARNING: Memory Leak at critical stage. boss fight accessible."`).

**Test:** Games smoke. Unit test: milestone fires once and only once per threshold crossing.

---

### #17 — New achievements: Cold Logic + Alias Breaker S

**What:** Two new achievements rewarding mastery of the new tiers:
- `"cold_logic"` — "Cold Logic" — clear a corruption-6 colour puzzle without buying Thermal Scanner.
- `"alias_breaker"` — "Alias Breaker" — clear a corruption-4 puzzle with ≥ 3 alias pairs without buying Alias Tracer.

**Files to edit:**
- `renderer.js` / `onSolved`: Check conditions after the solve; call `award(id, title)`.
- `messages.js`: Add the two achievement IDs and titles as constants.

**Test:** Unit test both conditions; games smoke.

---

### #18 — Final polish: LOC gate + bundle regeneration + CSS cleanup S

**What:** The post-expansion cleanup gate.

**Checklist:**
1. Run `./scripts/loc-check.sh` — confirm no module exceeds 500 LOC (hard cap) and flag any over 300 (soft cap).
2. Resolve any soft-cap violations: expected candidates are `renderer.js` (already split at #13), `nonogram-colour.js` (target ~200 LOC across all additions), `board.js` (target ~220 LOC).
3. Run `node scripts/gen-metagame-bundles.mjs` — must succeed with no new unexpected external imports.
4. `git add docs/games/metagame/stages/stage3/stage.generated.js`.
5. Run `node tests/smoke-area.mjs games` — must be green.
6. Optionally add smoke assertions for the new tiers to `tests/areas/games.mjs` (volatile cell visual, colour grid double-clue presence, v3 button).
7. CSS audit: `styles.css` should stay under 300 LOC; split `.s3-colour-*.css` if needed.

---

## File Map Summary

| File | Status | Changed in | Notes |
|------|--------|-----------|-------|
| `board.js` | EDIT | #4, #7, #12 | Extend `setCell` signature three times; target ~220 LOC |
| `nonogram.js` | READ-ONLY | — | Do not touch; colour engine is a sibling module |
| `nonogram-colour.js` | CREATE | #9–#11 | New ~200 LOC colour engine |
| `volatile.js` | CREATE | #3 | ~80 LOC volatile picker |
| `alias.js` | CREATE | #6 | ~90 LOC alias picker |
| `grid.js` | EDIT | #5, #8, #13 | Add volatileCells/aliases/colour args; target ~200 LOC |
| `renderer.js` | EDIT | #1, #4, #5, #7, #13 | SPLIT at #13 into renderer.js + renderer-play.js |
| `renderer-play.js` | CREATE | #13 | ~200 LOC: loadBoard, applyCell, onSolved, hints |
| `shop.js` | EDIT | #5, #8, #13 | +4 upgrades; stays ~130 LOC |
| `state.js` | EDIT | #1, #12 | pressure field (#1); version v3 + colourMarks (#12) |
| `content.js` | EDIT | #14 | Rewrite v1/v2; add memoryV3Text |
| `messages.js` | EDIT | #2, #15, #17 | Gate hint + v3 path + achievements |
| `boss.js` | EDIT | #2, #14 | corruption-8 gate; files list update |
| `styles.css` | EDIT | #5, #8, #13, #18 | volatile + alias + colour classes |
| `tests/boss.test.mjs` | EDIT | #14 | Update chunk assertions for 3-way split |
| `tests/volatile.test.mjs` | CREATE | #3 | |
| `tests/alias.test.mjs` | CREATE | #6 | |
| `tests/nonogram-colour.test.mjs` | CREATE | #9 | |

---

## Guardrail Checklist (per increment)

- [ ] No `Date.now()` or `Math.random()` — use `makeRng(seed + ':suffix')`.
- [ ] All per-puzzle data derived from seed at board-load; only player work (`marks`, `colourMarks`) in save state.
- [ ] No module exceeds 500 LOC (hard); warn above 300 (soft).
- [ ] `node scripts/gen-metagame-bundles.mjs` after any source change.
- [ ] `node tests/smoke-area.mjs games` green before commit.
- [ ] Stage.generated.js staged before commit.
- [ ] State version bumped only when save-state schema changes (#12).
