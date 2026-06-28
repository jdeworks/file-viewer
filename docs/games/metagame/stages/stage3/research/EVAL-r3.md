# Stage 3 "Memory Grid" — Self-Evaluation Report (Round 3)

Date: 2026-06-27  
Evaluator: AI critic (read-only, no edits to game source)  
Test result: **8/8 suites PASS** (board, boss, nonogram, s3aliased, s3boons, s3decay, s3twocolor, s3volatile)

---

## Scores

| # | Dimension | Score | Summary |
|---|-----------|-------|---------|
| 1 | Genre fidelity | 8/10 | Correct nonogram engine + two-colour adjacency rule; roguelite boon draft is a genuine addition but run-death arc is absent |
| 2 | Fun / engagement | 7/10 | Volatile lock verb and two-colour are genuinely interesting; tier transitions are jarring and unannounced, decay gives real tension |
| 3 | Theme fit | 9/10 | Memory/corruption framing applied end-to-end; volatile cache, hot/cold, three-log leak boss are thematically coherent |
| 4 | Depth & length | 5/10 | 13-solve body targets ~25-35 min first run vs. 40-120 min spec; tier windows too narrow for learning; `retained` currency inert |
| 5 | Difficulty curve & onboarding | 5/10 | Correct tier ordering but timing is broken: volatile appears at solve 4, aliased at solve 5, decay at solve 7, two-colour at solve 10; no tier-arrival messages; alt-click for Color B broken |
| 6 | Polish / UX / readability | 7/10 | HUD is clean, volatile pulse animation is good, shop/draft panels are well-styled; boss status text is raw/mechanical; no milestone announcements |
| 7 | Determinism & correctness | 9/10 | All 8 test suites pass; no Date.now/Math.random; mulberry32 constants verified identical between source and bundle; ~17% of runs have identity slot order (probabilistic partial bypass) |
| 8 | Replayability | 6/10 | Seeded generator varies puzzles per run; boon draft gives run identity; but `retained` has no shop use, no run-death means no "new run" urgency |
| 9 | Technical health | 8/10 | 14 modular source files; all well under 500 LOC hard cap; renderer.js at 316 over the 300 soft cap (planned split not done); no dead code |
| 10 | Un-cheat discoverability | 7/10 | Three log buttons visible, hint ladder scaffolds well, boss gate is solid; but slot-order docs and corruption-order assembly rule require careful reading; identity-slot bypass in ~17% of runs |

**Weighted average: 7.1/10**

---

## Dimension Justifications

### 1. Genre Fidelity — 8/10

`nonogram.js` implements the correct line-solver (intersection/overlap, fixpoint, 2000-pass guard). Uniqueness is guaranteed by the Leiden criterion (line-solve-to-completion = unique), with no separate NP-hard check needed. `s3twocolor.js` implements the correct colour-adjacency rule (same-colour blocks need a gap, different-colour blocks may be adjacent) via `colorArrangements` and `colorLineSolve`. The roguelite loop (earn registers → permanent shop → escalating corruption) is structurally sound. What's absent is the run-death restart arc; the decay clock (`s3decay.js`) fails only the current snapshot and resets it, not the whole run. The buildplan explicitly made the run-pressure-clock a prerequisite (Phase 0, increment #1) because "without death/restart the expansion tiers feel optional." That prerequisite was not built.

### 2. Fun / Engagement — 7/10

Volatile cells with the explicit lock verb (`l`) create genuine per-cell tension. The fill-then-lock discipline is mechanically novel. The decay clock (snapshot-level instability meter, `s3decay.js`) prevents idle farming and makes wrong fills costly. The boon draft (`s3boons.js`) is a genuine run-identity system not in the original buildplan — three thematic picks per run (cache primer, oracle echo, pressure valve, etc.) that stack on top of permanent shop upgrades. Two-colour puzzles are the strongest mechanic: the adjacency rule changes solving logic in a real way. Against: transitions between tiers are silent (no "volatile cells are now active" announcement), so new mechanics land without context. The aliased-clue mechanic replaces the richer "linked cell pairs" design.

### 3. Theme Fit — 9/10

"Memory snapshot" = puzzle is thematically clean. "Volatile cache line" → fill-then-lock mechanic is well-mapped. "Instability meter" → decay clock resonates. "Hot/cold memory" → two-colour orange/teal is legible. "Three-log diff" → the boss capstone is the strongest theme-mechanic link in any stage. The `content.js` log generation (progressive sector corruption across v1/v2/v3) is narratively satisfying. Minor: achievement titles ("Flawless restore," "Reached corruption 4") are generic rather than thematically flavoured.

### 4. Depth & Length — 5/10

`BODY_SOLVES = 13` produces the following tier schedule:
- Solve 0-3: corruptions 0-1, 5x5-6x6 grids, zero special mechanics (tutorial)
- Solve 4: corruption 2, volatile cells appear (1 puzzle to learn)
- Solve 5: corruption 3, aliased clues appear on top of volatile (1 more puzzle)
- Solve 7-9: corruption 4-5, decay clock adds on top (3 puzzles)
- Solve 10-12: corruption 6-7, two-colour replaces mono (3 puzzles)
- Solve 13+: corruption 8, boss gate opens

Volatile has 1 solve in isolation before aliased stacks. Aliased has 2-3 solves before decay stacks. Two-colour has 3 solves before the boss gate. The research specified 3-5 puzzles of learning per mechanic; only decay and two-colour approach that floor. The total first-run playtime (5-8 minutes per puzzle × 13-15 solves) is 65-120 minutes in theory, but each puzzle at low corruption is 2-3 minutes for a nonogram-literate player, making early solves quick and the body feel compressed. The `retained` fragment counter (earns 1 per 4 solves) has no current shop use at all, which is a dead progression hook.

### 5. Difficulty Curve & Onboarding — 5/10

The ordering is correct (simpler → harder). But two problems compound each other. First, tier-introduction timing is too compressed (see §4). Second, new mechanics arrive with no announcement: the HUD gains a "volatile X/Y locked" note and a new cell decoration, but there is no log entry explaining the new rule when corruption first crosses each threshold. A first-time player filling a volatile cell will see it flash and the log reads "volatile cells decayed — lock fills with l." without prior context about what volatile cells are or why they decay. The planned milestone messages (buildplan increment #16) would fix this but were not implemented. Separately: the view.js help text says "2 fill B (alt-click)" but `grid.js:77` passes only `(x, y, mark)` to `handlers.onCell`, never a fourth colorB argument. Mouse users hitting two-colour puzzles cannot fill Color B via clicking; only keyboard (g/G/2 keys) works. This is a hard blocker for mouse-primary players on the game's highest-complexity tier.

### 6. Polish / UX / Readability — 7/10

The monospace grid with per-cell state tracking, cursor highlighting, and clue auto-strikethrough is clean. The volatile pulse animation (CSS `@keyframes s3-pulse`) and locked teal ring are visually distinct. The shop and boon draft panels share a consistent card layout. Weaknesses: the boss-status field displays raw machine-language ("LOCKED / columns missing / corruption accelerated") rather than evocative text. The log (6 lines max) can be crowded when both solve rewards and volatility events fire simultaneously. The help text is dense and shows mechanics that aren't yet active (alt-click Color B at corruption 0). The boon draft button (`data-field="draftBtn"`) is hidden until a draft fires — good — but lights up with a yellow pulse and the text "boon draft •" which is arresting without being well-explained.

### 7. Determinism & Correctness — 9/10

No `Date.now` or `Math.random` in any game-logic file (confirmed by grep). The mulberry32 constant (`0x6d2b79f5`) matches its decimal form in the bundle (`1831565813`, verified by `node -e`). The seed chain `${run.seed}:${run.index}` is consistent throughout. State v3 with correct normalisation. One weakness: `makeSlots` picks a random permutation of [0,1,2] for sector display order, but there are 6 permutations and 1 of them is the identity [0,1,2]. Empirically, ~17% of runs (181/1000 sampled) have identity slot ordering. When this happens, reading v1 sectors top-to-bottom yields the three chunks in key order, allowing the player to enter the correct key without doing a real 3-way diff. This is not a code bug (the permutation is seeded and deterministic), but it is a probabilistic partial bypass of the un-cheat.

### 8. Replayability — 6/10

The seeded generator (`${run.seed}:${run.index}`) produces genuinely distinct puzzles per run, and new puzzles appear in subsequent runs (different `runCount` → different `run.seed`). The boon draft gives 3 picks from 6 boons per run with genuine trade-offs (oracle echo vs pressure valve, e.g.), providing build identity. The permanent shop provides inter-run progression. Against: the `retained` counter accrues (1 per 4 solves) but has no shop use — it appears in the HUD but cannot be spent. This is the most visible "dead end" in the economy. Without run death, there is no "start a new run" moment — the player just keeps solving. Multiple runs are possible but not compelled.

### 9. Technical Health — 8/10

Source file count: 14 `.js` files + 1 `.css`. LOC counts:
- renderer.js: 316 (soft cap 300, hard cap 500 — over soft, within hard)
- All other files: within soft cap
The planned renderer split into `renderer.js + renderer-play.js` (buildplan increment #13) was not executed. No dead exports found. Bundle regeneration (stage.generated.js) is in sync with source. `s3volatile.js:43` picks volatile cells by shuffling all filled solution cells and slicing — this skips the buildplan requirement to exclude pass-1 fully-forced cells (lines where a single arrangement is the only option). A volatile cell on a trivially-forced cell (e.g., an entire row that must be all-filled because the clue is the full width) carries no pedagogical value for "certainty gating" and may feel arbitrary.

### 10. Un-Cheat Discoverability — 7/10

The three log-file buttons are visible in the boss panel from the start (correctly not gated behind the boss unlock). The hint ladder in `messages.js` progresses from cryptic ("the grid remembers less") through explicit ("compare memory_v1.log, memory_v2.log and memory_v3.log — read the three chunks in corruption order"). The `bodyHint` prevents the key from even being checked until corruption peaks, providing clear direction. The `tryRestoreDiffKey` gate is enforced at the code level. The key structure (corruption-order reconstruction: piece lost v1→v2, then v2→v3, then v3 survivor) is correct and well-implemented. Two concerns: (1) the hint says "read the three chunks in corruption order" — this means key order (pieces[0]+[1]+[2]), not display order (sectors 02/04/06). The connection between "corruption order" and "key order" requires inference that an inexperienced player might miss. (2) The ~17% identity-slot bypass (see §7) means roughly 1 in 6 runs is trivially unlockable by reading v1 top-to-bottom.

---

## Top Issues (prioritized)

### BLOCKER

**1. Alt-click for Color B not implemented**  
Location: `grid.js:77`, `view.js:28`  
The mousedown handler calls `handlers.onCell(x, y, mark)` — three arguments. The renderer's `onCell` handler signature is `(x, y, mark, colorB)`, so `colorB` is always `undefined`, mapping to `FILLED` (Color A). The help text says "2 fill B (alt-click)" but clicking never produces Color B. Mouse-only players on two-colour puzzles (the hardest tier, corruption 6+) cannot fill Color B at all.  
Fix: In `grid.js:77`, change to `handlers.onCell(x, y, e.button === 2 || e.shiftKey, e.altKey)`. No other changes needed — renderer already routes `colorB ? COLOR_B : FILLED`.

### MAJOR

**2. Run pressure clock not built**  
Location: missing from `state.js`, `renderer.js`  
The buildplan (Phase 0, increment #1) called run-death a prerequisite because "without death/restart the expansion tiers feel optional." The decay clock (`s3decay.js`) resets only the current snapshot, not the run. There is no cumulative wrong-fill counter across snapshots, no run-level failure, and no "start a fresh run" moment. The roguelite arc is missing its tension driver.  
Fix: Add `run.pressure` counter to `freshFrom`; increment per wrong fill across all snapshots (not reset on snapshot reset, only on run reset); when pressure hits `20 + corruption * 2`, reset `state.run` via `freshFrom` while keeping meta (registers, shop, retained). This is increment #1 from the buildplan and is small (state.js + renderer.js only).

**3. Mechanical tier windows too compressed; no tier announcements**  
Location: `board.js:21` (`BODY_SOLVES = 13`), `renderer.js` (no milestone log entries)  
Volatile appears at solve 4 with 1 solo puzzle; aliased clues stack at solve 5; decay at solve 7; two-colour at solve 10. The research specified 3-5 puzzles per mechanic for learning. Additionally, no log message fires when each tier activates, so mechanics appear silently.  
Fix: Increase `BODY_SOLVES` to 18-20 to give each mechanic 2-4 solo puzzles before the next stacks. Add milestone log entries in `renderer.js:onSolved` tracking first threshold crossing (corruption 2→"CACHE PRESSURE: volatile memory cells activated", 4→"DECAY CLOCK: instability meter engaged", 6→"HOT/COLD MEMORY: two-colour grid active").

**4. Aliased mechanic diverges from designed cross-grid linked-pairs verb**  
Location: `s3aliased.js`  
The research and buildplan (Phase B, increments #6-#8) specified "linked cell pairs" — cells α and β sharing the same solution value, marked with Greek letters. Deducing one immediately tells you the other across grid boundaries, adding a genuine cross-grid constraint type. What was built instead is "hidden row/col clues displayed as ?" — a line-suppression mechanic (the whole clue number is hidden, deducible from crossing lines). This is a valid nonogram mechanic and the fairness guarantee (`solveWithHidden`) is rigorous, but it is a different cognitive verb. The cross-grid "fill one → know a distant cell" moment was never implemented.  
Impact: The "Memory Alias" tier description in the HUD shows "? aliased — deduce from crossing lines" which is accurate for what's built but different from what the research described. Not an immediate bug, but a design debt if the linked-pairs concept was considered important.

**5. Volatile cell picker omits pass-1 forced-cell filtering**  
Location: `s3volatile.js:43`  
The buildplan requires: skip cells that the line-solver fully determines in its first pass (single-arrangement lines). The implementation just shuffles all filled cells and slices the first `n`. This can produce volatile cells on trivially-forced positions (e.g., a clue [5] in a width-5 row forces all 5 cells in pass 1 — any of them could be marked volatile, but the player "knows" them confidently and the decay is an arbitrary tax, not a deduction challenge).  
Fix: Before shuffling, run the solver once and collect cells whose value is set in pass 1; exclude them from the volatile candidate set. (~15 LOC addition to `s3volatile.js`.)

### MINOR

**6. ~17% of runs have identity slot ordering in the 3-way diff**  
Location: `state.js:makeSlots`, `content.js:presentIn`  
`makeSlots` picks a random permutation of [0,1,2]. The identity permutation [0,1,2] occurs in ~1/6 of runs. When this happens, v1 sectors appear in key order (pieces[0] in sector 02, pieces[1] in sector 04, pieces[2] in sector 06), so reading v1 top-to-bottom gives the correct key without diffing.  
Fix: In `makeSlots`, after `shuffle([0,1,2])`, check if `[0,1,2]` (identity) and re-shuffle if so. This is guaranteed to terminate in at most 2 tries for a 1/6 chance.

**7. renderer.js at 316 LOC exceeds soft cap**  
Location: `renderer.js`  
The buildplan scheduled the renderer split at increment #13. It was not done. At 316 LOC it is over the 300 soft cap (hard cap 500). `renderer.js` handles layout bootstrap, HUD painting, event routing, board load, cell application, hint/check, shop/draft overlays, and the keyboard handler — too many concerns for one file.  
Fix: Extract `loadBoard`, `applyCell`, `onSolved`, `useHint`, `useCheck`, `failSnapshot`, `lockUnderCursor` into `renderer-play.js` as named exports. `renderer.js` retains layout, `paintHud`, event routing, `toggleShop/Draft`. Both resulting files stay well under 200 LOC.

**8. `retained` counter has no shop use**  
Location: `state.js`, `shop.js`  
The `retained` fragment counter (earns 1 per 4 solves) is displayed in the HUD but cannot be spent anywhere. The shop has no item gated on `retained`. This is a visible dead progression hook.  
Fix: Add at least one shop item that costs `retained` instead of registers (e.g., a "Crystallize" upgrade that permanently raises `BODY_SOLVES` cap or unlocks a prestige colour for the next run), or at minimum hide the `retained` field until it has a purpose.

---

## Top Opportunities

**O1. Extend BODY_SOLVES + add tier-arrival log messages** (raises dimension 4 and 5)  
Increase `BODY_SOLVES` from 13 to 18-20 and fire a distinctive one-time log entry when each corruption threshold is first crossed. This single change most directly addresses the two lowest-scoring dimensions and requires edits only to `board.js` (constant) and `renderer.js` (4 milestone checks in `onSolved`). It would bring the playtime target within the 40-120 min range and make each mechanic legible.

**O2. Fix alt-click for Color B** (raises dimension 5 — a blocker)  
One-line fix in `grid.js:77`: pass `e.altKey` as fourth argument to `handlers.onCell`. Eliminates a mouse-player dead-end on the game's hardest tier.

**O3. Implement run pressure clock** (raises dimension 2 and 8)  
The buildplan's Phase 0 prerequisite. Adds run-level stakes: cumulative wrong fills across snapshots → run collapse → fresh run with meta preserved. ~40 LOC across state.js and renderer.js. Makes the roguelite arc feel like one.

**O4. Add pass-1 cell filtering to volatile picker** (raises dimension 5 and 7)  
Run the solver once and exclude pass-1-determined cells from the volatile candidate set. Ensures volatile cells land on deduction-interesting positions, not trivially-forced rows. ~15 LOC in s3volatile.js.

**O5. Activate the `retained` currency** (raises dimension 8)  
Add at least one `retained`-gated item or prestige path in `shop.js`. The counter is already tracked; giving it a sink removes a visible dead-end in the economy and adds a second meta-progression loop that resists shop-exhaustion.

---

## Overall Verdict

**7.1/10** — Stage 3 delivers a genuinely full-featured nonogram roguelite with four distinct mechanical tiers (volatile decay, aliased clues, move-pressure clock, two-colour puzzles) and a non-trivial 3-way boss diff with per-run seed-derived keys. The engine is technically solid: all 8 test suites pass, the uniqueness guarantee is rigorous, the two-colour solver correctly handles adjacent-colour placement, and the entire system is deterministic. The boon draft is a nice roguelite addition that was not in the original spec.

The central weakness is compression. `BODY_SOLVES = 13` gives each new mechanic 1-3 puzzles before the next stacks on top, which is insufficient for player comprehension. The absence of tier-arrival log messages compounds this — mechanics appear silently. The missing run pressure clock (the buildplan's Phase 0 prerequisite) means the game has snapshot-level stakes but no run-level arc, keeping the "roguelite" framing aspirational rather than real.

**The single most important round-4 action: extend `BODY_SOLVES` to 18-20 and add per-tier milestone log messages.** This directly addresses the two lowest-scoring dimensions (depth/length at 5, difficulty curve at 5), requires the fewest files, and unlocks the learning arc that every other mechanic depends on to land correctly.
