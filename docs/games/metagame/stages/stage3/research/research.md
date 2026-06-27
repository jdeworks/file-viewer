# Stage 3 "Memory Grid" — Research & Expansion Design

Date: 2026-06-26  
Status: SHIPPED core game. This document targets the stretch-backlog expansion.  
Scope: Genre anchoring, existing-loop analysis, ordered new-mechanic-per-tier arc, retention model, caveats.

---

## 1. GENRE — What Defines Nonogram/Picross + Roguelite

### Nonogram core definition

A nonogram (Picross, Hanjie, Griddlers) is a logic puzzle on a 2D grid. Clues on each row and column give the lengths of consecutive filled blocks in that line. The player must deduce which cells are filled and which are empty. Two mechanical axioms govern all nonogram design:

- **Same-colour blocks within a line must be separated by at least one empty cell.**
- **Different-colour blocks (in multicolour variants) may be immediately adjacent — no gap required.** This single rule change transforms the deductive space entirely.

Solving is NP-complete in the general case, but puzzles designed for human play are almost always uniquely solvable by pure line logic (no guessing). The webpbn community formalises several solver tiers: Tier-1 (overlap/forcing — most common), Tier-2 (edge logic, two-way, summing, smile logic), Tier-3+ (contradiction/lookahead). Our generator uses Tier-1 and partial Tier-2; the `difficulty` field counts solver passes, which is the Leiden difficulty metric.

Sources: [webpbn Advanced Solving](https://webpbn.com/solving.html), [Wikipedia Nonogram](https://en.wikipedia.org/wiki/Nonogram), [Ninjapuzzles Strategies](https://ninjapuzzles.com/strategies/nonogram/).

### Roguelite core definition

A roguelite retains SOME permanent progress between runs (unlike a roguelike which is fully reset). The defining loop: run → resource bank → meta-upgrade → deeper run → repeat. Risk-reward lives in the tension between spending resources for short-run gains vs. banking for long-run upgrades.

### The 3–5 best reference games and what makes them work

**1. Picross S series (Jupiter / Nintendo Switch) — the canonical reference**

The series ships 200–400 B&W puzzles per entry plus a "Color Picross" mode. Three specific design decisions make it the definitive entry:

- **Auto-cross-out of completed lines.** Satisfied clues are struck through. This removes bookkeeping from the player's head and lets them focus on deduction. Our grid already does this.
- **No-mistake mode vs. Timed mode.** The mode split teaches an important lesson: time pressure and logic are orthogonal. Forcing time pressure on a logic puzzle is widely disliked; making it optional keeps both audiences. Our game is deliberately untimed.
- **Color Picross.** Introduced in Picross S3, it is described as "easily making these the most complicated and challenging puzzles the series has offered." The different-colour-blocks-may-be-adjacent rule adds a genuinely new deduction axis rather than just more numbers. Players report it "clicks" after one or two puzzles and then feels deeply satisfying.

Sources: [Nintendo Life Picross S3 Review](https://www.nintendolife.com/reviews/switch-eshop/picross_s3), [WayTooManyGames Picross S7 Review](https://waytoomany.games/2022/01/11/review-picross-s7/).

**2. CiniCross (Altego, 2025/2026) — the closest roguelite reference**

CiniCross is a dark-fantasy roguelite where nonogram puzzles replace combat. Key mechanics:

- **Branching dungeon map.** Paths split into risky (harder puzzles, better loot) and safe (easier, less reward). Forces a strategic decision every floor.
- **Artifact system (relic stacking).** After each solve, a slot-machine grants relics. Duplicates stack to percentage improvements. Examples: an orb that reveals a random wrong cell after N completions; a crystal spear with a 3% chance to auto-fill an entire column. The per-artifact variance is what creates build identity across runs.
- **Boss modifiers.** End-of-floor bosses impose a special rule: hidden solutions, damage-on-timeout tiles, entire rows resetting on a single mistake. Each modifier forces a new solve strategy.
- **Timer + HP hybrid tension.** The core "mistake or rush?" tension: solving carefully avoids HP loss but the descending timer is also a threat. Hitting zero doesn't end the run immediately, but sustained drain does. This is the main retention driver — not puzzle difficulty alone.
- **Critical flaw documented.** The game lacks a save system (must complete in one sitting) and has boss balance inconsistencies. Our stage avoids both: state is saved per-cell, and the boss has a single, fully deterministic unlock gate.

Sources: [PC Gamer review](https://www.pcgamer.com/games/puzzle/i-can-now-say-ive-been-killed-by-a-nonogram-thanks-to-this-roguelike-that-turns-picross-into-a-dungeon-crawler/), [So Many Games review](https://somanygames.co.uk/review/cinicross/), [Ctrlr.net review](https://www.ctrlr.net/cinicross-has-done-the-unthinkable-made-nonograms-of-all-things-a-dementedly-addictive-roguelite-hook/).

**3. Murder by Numbers (Mediatonic / 2020) — narrative integration**

A visual-novel murder mystery where each puzzle solution IS a piece of evidence. The lesson: nonograms benefit enormously from being embedded in a narrative frame. The solved image is always relevant (a weapon, a face, a clue). Applied to our stage: the boss-tier puzzle solution should spell a word or reveal a glyph meaningful to the Memory Leak boss fight, not just random pixels.

Source: [ComicBook.com Picross list](https://comicbook.com/gaming/list/6-best-picross-puzzle-games-that-you-have-to-play/).

**4. The Leiden Line-Solve Uniqueness Method — the design paper behind our generator**

The key insight that shapes our generator: a puzzle a pure line-solver can finish from clues alone is, by definition, uniquely solvable. No separate NP-hard uniqueness check is needed. The difficulty metric (solver pass count) is a proxy for human difficulty because each solver pass corresponds to a "realisation step" a human would need to make. This is why our `difficulty` field is meaningful for gating corruption tiers.

Source: [webpbn survey](https://webpbn.com/solving.html), [Nonogram complexity paper (RU Groningen)](https://fse.studenttheses.ub.rug.nl/15287/1/Master_Educatie_2017_RAOosterman.pdf).

**5. Colour Nonogram rules (webpbn / clarity-media / Picross wiki)**

The adjacency rule for multi-colour nonograms: two different-colour blocks may be immediately adjacent (no gap cell needed). This creates a new solving technique: when two candidate blocks of different colours could pack tightly or have a gap, cross-referencing the other axis resolves the ambiguity. This is the key new verb that makes colour nonograms feel genuinely different, not just "harder."

Sources: [clarity-media colour nonogram rules](http://www.clarity-media.co.uk/puzzle-strategy/what-is-the-difference-colour-hanjie), [webpbn colour solver dissertation](https://webpbn.com/survey/dissert_solving_colored_nonograms.pdf).

---

## 2. OUR CORE LOOP — Stage 3 as Shipped

Stage 3 "Memory Grid" is a fully playable nonogram roguelite. The existing loop:

**Moment-to-moment (within one puzzle):**
1. A seeded, uniquely-solvable B&W nonogram is generated from `${run.seed}:${run.index}`. The generator walks densities [0.55, 0.5, … 0.30] and acceptance-samples up to `1 + corruption * 5` line-solvable candidates, keeping the hardest. Same seed + index = same puzzle.
2. Player fills cells (space/click) or places X-marks (x/right-click) using keyboard + mouse. Arrow/WASD move a cursor. Completed clues are auto-crossed out.
3. Wrong fills are tracked (not blocked — the mistake model is informational, not punishing). At solve, registers are awarded: `(size² + 5) × throughputMult × corruptionBonus`. Flawless solves earn the same amount (no extra) but track the `flawless` achievement.

**Run loop (across puzzles in one session):**
- `run.solvedCount` drives the corruption ladder: `corruption = min(8, floor(solvedCount/3))`, which increases both grid size (5→12 over 14 solves) and puzzle hardness (want=1→41).
- Every 4 puzzles solved, `retained += 1`. This is the "fragment crystallization" event with log feedback.
- The Defrag shop opens at any time. Five upgrades: Prefetch Cache (pre-fills N correct cells), Throughput (+25% registers/solve), Oracle (reveal a correct cell N times/puzzle), Parity Unit (flag wrong fills N times/puzzle), Overclock (raise grid-size cap by 1).

**Why this loop is fun:**
- The seeded generator means puzzles are deterministic and never repeated across runs, but always solvable with pure logic.
- The corruption escalation is smooth — the jump from 5×5 to 12×12 over 24 solves never feels sudden. The difficulty metric (solver passes) scales independently of size.
- The shop upgrades are orthogonal (each helps a different phase of the solve), so buying order matters and creates run identity.
- The boss is a genuine un-cheat: the restoration key changes every run, lives only in the diff of two log files opened in the real viewer, and is not bypassable.

**What the existing loop lacks (the expansion addresses):**
- Every puzzle is mechanically identical regardless of depth. Size and difficulty change, but the VERBS don't. A corruption-8 puzzle is just a bigger, harder B&W nonogram. The expansion adds qualitatively new cell states and clue types at specific corruption milestones, so "deeper" always introduces something the player has never had to think about before.
- There is no run structure (death / success condition). An endless grind without a goal line reduces urgency. The expansion adds a roguelite run target.

---

## 3. THE EXPANSION ARC — Ordered New Mechanics Per Corruption Tier

This is the primary deliverable. The model is Stage 2 "Glyph Dungeon" biome progression: each new band introduces a single new VERB that the player must learn and integrate with existing verbs. Deeper = a genuinely new thing to think about, never just bigger numbers.

The corruption scale runs 0–8 (`corruptionForRun` in board.js). Puzzle count to reach each corruption tier: corruption N requires `3N` solved puzzles. A full run to corruption 8 requires 24+ solves.

Each mechanic is introduced in its PURE FORM at the tier shown, then the SHOP gains a corresponding mitigation upgrade. Higher corruption means ALL active mechanics are in play simultaneously, so the shop portfolio becomes the player's specialisation choice.

---

### Tier 0 — "Cold Boot" (corruption 0, puzzles 1–3)

**What's new:** Nothing. This is the tutorial tier.  
**Verb:** Fill a cell. Place an X-mark. Move a cursor. Read run-length clues. Understand auto-crossout.  
**Grid:** 5×5. All clues fully visible. Puzzle hardness: want=1 (first line-solvable puzzle found).  
**Design intent:** The player must learn the nonogram format before anything else is added. No shop items needed yet. The first solve should take ~3 minutes for a nonogram newcomer.  
**Economy:** Earn first registers (5×5 + 5 = 30 registers base). Can buy Prefetch Cache level 1 (40 reg) by the second solve.

---

### Tier 1 — "Cache Pressure" (corruption 2, ~7th solve)

**What's new: VOLATILE CELLS**

A handful of cells (2–4, scaling with corruption) are marked "volatile" — shown with a distinct glyph (e.g., `◌` or `⚡` background). A volatile cell that is incorrectly filled (you fill it but the solution has it empty, or vice versa) does NOT just increment the mistake counter: it RESETS to UNKNOWN automatically. You lose the fill and must re-deduce it.

**New verb:** You must be CERTAIN before filling a volatile cell. Tentative fills based on partial deduction are unsafe. This forces the player to think about deduction CONFIDENCE rather than just deduction correctness — you can't "try a fill and see if it breaks anything" on a volatile cell.

**Why this is distinct from the base mechanic:** In standard nonograms, wrong fills are harmless beyond the mistake counter. Volatile cells make the WRONG FILL DISAPPEAR, which means you wasted a move and potentially need to re-examine the line. This creates genuine cost for guessing.

**Thematic framing:** Volatile memory pages can't hold corrupted writes — the bit-flip reverts.

**Shop counter:** "ECC Write-Protect" — costs 80 reg/level. Each level reduces the number of volatile cells by 1 per puzzle (down to 0 at max). The existing Parity Unit upgrade (flag wrong fills) becomes more valuable here because catching a volatile-cell wrong fill early saves the reset.

**Generator note:** Volatile cells are CHOSEN after puzzle generation — pick cells from the solution set that are surrounded by constraining rows/cols (high-information cells) so the player can deduce them confidently rather than needing to guess. This keeps the puzzle line-solvable with no rule change; only the DISPLAY and CONSEQUENCE of a wrong fill changes.

---

### Tier 2 — "Memory Alias" (corruption 4, ~13th solve)

**What's new: LINKED CELL PAIRS (aliasing)**

Some cells appear with a shared marker (e.g., `α`–`α`, `β`–`β`, up to 3 pairs per puzzle). Linked cells have the SAME value in the solution — if one is FILLED, its partner is also FILLED; if one is EMPTY, its partner is also EMPTY. The pairs are highlighted (e.g., a coloured border or small letter in the corner of each cell).

**New verb:** Cross-grid pair constraint reasoning. When you deduce the value of one cell in a pair, you know the value of its partner immediately — even if that partner is in a completely different row/column whose clue you haven't solved yet. This adds a new KIND of deductive step: inter-cell logic (not just intra-line logic).

**Why this is distinct from the previous mechanics:** Standard nonogram logic is purely row/column local. Aliases create GLOBAL constraints that cross line boundaries. A pair at (2,3) and (9,7) on a 12×12 grid effectively creates a new constraint type that cannot be handled by the row/column solver alone.

**Thematic framing:** Memory aliasing — two addresses point to the same physical byte. Writing to one updates both.

**Interaction with volatile cells:** An alias cell can also be volatile. If you incorrectly fill one cell of a pair and it resets, you now know that BOTH that cell and its alias must be in the same unknown state. This stacking creates meaningful emergent complexity.

**Implementation note:** Aliases are selected post-generation. Choose pairs where both cells have the SAME solution value and where knowing one would add genuine deductive power (not two cells that can already be independently deduced in the first solver pass). Pairs stored as `aliases: [[{x,y},{x,y}], …]` in the puzzle object; the grid renderer marks them; `setCell` automatically mirrors fills to the alias. The line-solver already produces valid clues — aliasing only adds the visual/mirror mechanic on top.

**Shop counter:** "Alias Tracer" — costs 100 reg/level. Each level pre-reveals one alias pair per puzzle (marks both cells with a hint that they're linked AND shows their value). Without this, players must infer pair membership from the display markers.

---

### Tier 3 — "Hot/Cold Memory" (corruption 6, ~19th solve)

**What's new: TWO-COLOUR NONOGRAM**

This is the largest mechanic addition. Grid cells can now be BLUE (cold / retained memory) or ORANGE (hot / volatile memory), not just filled or empty. Each row and column gets TWO sub-clue sequences: one for blue runs, one for orange runs. They are displayed as stacked coloured numbers.

**The critical new rule:** Same-colour blocks within a line must have a gap (as in standard nonograms). DIFFERENT-colour blocks may be immediately adjacent — no gap cell needed.

**New verb:** The player must now decide BOTH whether a cell is filled AND which colour it is. The gap-or-no-gap distinction for different colours adds a new logical move that does not exist in B&W: "these two blocks of different colour could be adjacent or separated; the column constraint disambiguates."

**Why this is the most significant tier:** According to Picross S3 reviews, colour nonograms are "easily the most complicated and challenging puzzles the series has offered" and "once they click, they are the most rewarding." The different-colour adjacency rule genuinely changes how line-solving works — the overlap analysis must now account for colour when computing leftmost/rightmost placements. A standard solver would need to be extended to handle colour; our line-solver (nonogram.js `lineSolve`) would need a multicolour variant for the generator.

**Thematic framing:** Hot memory (orange) = actively accessed, volatile cache lines. Cold memory (blue) = retained, stable fragments. The visual contrast (orange vs. blue on the ASCII grid) maps naturally to the memory metaphor.

**Interaction with earlier mechanics:** Volatile cells still exist at corruption 6, and can be either colour. Alias pairs can link cells of the same colour. The player is now managing three simultaneous constraint systems: line clues × 2 colours + volatile resets + alias mirrors.

**Shop counters:**  
- "Thermal Scanner" — costs 140 reg/level. Pre-colours N cells per puzzle (shows the correct colour before the player deduces it). Level 1 = 2 cells; max level = 6 cells.  
- "Spectrum Filter" — costs 160 reg/level. Reveals which colour a volatile cell is (even if you haven't deduced its fill state yet). Prevents the double-unknown of a volatile coloured cell.

**Generator note:** The colour puzzle generator is a significant extension of the existing nonogram.js. The solution now has three states per cell: EMPTY, BLUE, ORANGE. Clues are derived per colour per line. The line-solver must be extended to place two colour channels simultaneously, with the adjacency rule for different colours. The same "accept if the solver fully determines the grid" uniqueness criterion applies — a colour puzzle accepted by the extended solver is uniquely solvable.

---

### Tier 4 — "The Memory Leak (Boss)" (corruption 8 / boss fight)

**What's new: THREE-WAY DIFF (boss un-cheat upgrade)**

The existing boss un-cheat: diff `memory_v1.log` vs `memory_v2.log` in the real viewer, read the changed hunks in order, recover the 9-character restoration key.

**Boss expansion:** At the boss tier (corruption 8 is required to unlock the boss fight), the restoration key is SPLIT ACROSS THREE LOG FILES — `memory_v1.log`, `memory_v2.log`, `memory_v3.log`. Each file has DIFFERENT corruption from the others:
- v1 → v2: some chunks replaced with `[missing]` (same as current)
- v1 → v3: other chunks replaced with `[overwritten]`
- v2 → v3: a third set of chunks replaced with `[leaked]`

The full key can only be recovered by identifying which chunks appear in EXACTLY ONE file and are absent from the others — a 3-way comparison rather than a 2-way diff.

**New verb:** 3-way comparison / consensus logic. Instead of "what changed between A and B," the player must find "what is uniquely readable in one source but not the others." This is a meaningfully harder version of the same core mechanic.

**Why this is load-bearing and non-bypassable (same as the existing boss):** The chunks are SEED-DERIVED per run (`makePieces` in state.js), so the key changes every run. The player cannot memorise it. The v3 file is generated from the same seed but a different piece arrangement, ensuring the split is always clean. Opening v1, v2, v3 in the real viewer and comparing them is the only path to the key.

**Implementation note:** Add `memoryV3Text(state)` to content.js. Add a third file path to messages.js. The boss panel gets a third "open memory_v3.log" button. The key is still 9 characters (3 × 3-char chunks), but now chunk `a` appears only in v1, chunk `b` only in v3, chunk `c` only in v2 (or some arrangement that requires all three to reconstruct). The player must open all three, identify which sector each has intact vs. corrupted, and assemble the key in the order v1-sector-2, v2-sector-6, v3-sector-4 (or whatever arrangement is seeded).

**Maps to:** Backlog item #10 "Boss N-way diff (v1/v2/v3, key split across files)."

---

### Escalation summary table

| Corruption | Milestone name | New verb introduced | Existing verbs still active |
|---|---|---|---|
| 0–1 | Cold Boot | Fill, X-mark, clue-read (tutorial) | — |
| 2–3 | Cache Pressure | Volatile-cell certainty gating | Fill, X-mark |
| 4–5 | Memory Alias | Cross-grid pair constraint | Fill, X-mark, volatile certainty |
| 6–7 | Hot/Cold Memory | Colour placement + gap-adjacency rule | All previous |
| 8 (boss) | The Memory Leak | 3-way log diff for boss restoration key | All previous |

Each new verb is additive and compatible with all prior verbs. The shop grows to match: each tier unlocks a corresponding mitigation upgrade, keeping the economy meaningful at every depth.

---

## 4. FUN & RETENTION — Economy, Meta-Loop, Risk-Reward

### Why the existing economy already works

- Registers earned = `(size² + 5) × throughputMult × corruptionBonus`. This means harder (higher-corruption) puzzles pay more, creating a natural risk-reward: stay at low corruption (easy, low pay) or push deeper (harder, richer). Players who push get more shop access sooner.
- The Defrag shop is open at any time during a run. Buying upgrades is never wasted — Prefetch Cache, Oracle, and Parity apply to every future puzzle including the current run. This is a gentler meta-loop than "bank and unlock next run."
- The `retained` counter (fragments crystallised every 4 solves) is a secondary currency with no current shop use — it is a ready hook for a future "prestige" system.

### What the expansion adds to retention

**Run structure (backlog item #14 — recommended for implementation alongside the expansion):**

Add a target to each run: "Clear N snapshots before the leak corrupts them." The leak has a "pressure clock" — a counter that ticks up by 1 each time the player makes a wrong fill (volatile or otherwise). If the pressure clock hits a threshold before the player clears N snapshots, the run ends early. Player keeps all shop upgrades but starts a new run.

This creates the roguelite run arc: enter → clear puzzles → boss (if pressure low enough) → advance or perish → retry with upgrades intact. The "run advance" threshold maps to the natural gate already in the game: you must have unlocked the boss (entered the diff key) AND kept pressure under the limit.

**Risk-reward decisions per tier:**

- Corruption 0–1: No decisions beyond "buy or save." Very low pressure.
- Corruption 2 (volatile cells): Do I fill this volatile cell now (risking reset) or deduce it further first? Spending Oracle to reveal it costs 1 hint charge but avoids the reset cost.
- Corruption 4 (aliases): Do I use Alias Tracer immediately, or save registers and reason through the pairs manually? The savings vs. cognitive cost trade-off is explicit.
- Corruption 6 (colour): Do I buy Thermal Scanner (pre-colours cells) before going into the first colour tier, or gamble on deducing them? The first colour puzzle without any shop support is genuinely hard — a deliberate "unlock moment" that rewards preparation.
- Corruption 8 (boss): Three-file diff is harder than two-file diff. Players who arrived with high retained fragments and max shop upgrades are in a better position to survive the boss tier's harder puzzles while working out the diff.

### What sustains 40 minutes to 2 hours

- **Puzzle variety from the generator.** The seeded generator produces genuinely distinct puzzles at each depth level — not hand-crafted repetition. A player doing a second run will see entirely different puzzles (different run seed).
- **Learning curve per tier.** Each new tier (volatile, alias, colour) requires ~3–5 puzzles to internalise. With 4 new mechanics across the arc and 3–5 puzzles of learning time each, that's 12–20 puzzles just for the learning arc. At ~5 minutes per puzzle, that is 1–1.7 hours of genuinely novel content.
- **Boss solve.** The 3-way diff boss requires opening 3 files, cross-referencing hunks, assembling the key, entering it, and then solving a final 12×15 puzzle. This alone is a 10–20 minute capstone.
- **Achievement hooks.** Five existing achievements (first restore, flawless, deep defrag, wide recall, retainer) plus two more natural ones for the expansion: "Cold Logic" (clear a colour-tier puzzle without buying Thermal Scanner) and "Alias Breaker" (clear a puzzle with 3 alias pairs without buying Alias Tracer).

---

## 5. CAVEATS — Determinism, Performance, Uniqueness

### Determinism

All mechanics in the expansion must be derived from the existing seed chain. The seed pattern `${run.seed}:${run.index}` already produces unique per-puzzle seeds. Extension:

- Volatile cells: chosen deterministically from the puzzle solution using the per-puzzle rng (`makeRng(puzzle.seed + ':volatile')`). NOT randomly at paint time.
- Alias pairs: chosen deterministically using `makeRng(puzzle.seed + ':alias')`. Pair selection must be deterministic so that saving and restoring the board (which stores only marks, not the pair arrangement) correctly reconstructs the same pairs from the same seed.
- Colour cells: the solution now has three values (EMPTY/BLUE/ORANGE). Generated from `makeRng(puzzle.seed + ':colour')`. Same seed always produces same colour pattern.
- Boss v3 log: generated from `makeRng('s3-pieces-v3:' + runCount)` using a sibling to the existing `makePieces` function. Different seed suffix ensures v3 carries a distinct chunk arrangement from v1/v2.

None of these may use `Date.now()`, `Math.random()`, or any external state.

### Performance

- The arrangements cache in nonogram.js (`ARR_CACHE`) grows with unique `(n, clues)` pairs. At grid sizes ≤15, this is bounded and not a concern. Colour nonograms will produce more unique clue shapes (two sequences per line), but still bounded.
- The multi-colour line-solver will be more expensive per pass because it must enumerate arrangements for two colour channels simultaneously. For a 15×15 grid with two colours, the arrangement count per line can grow substantially. Mitigations: cache the colour arrangements map the same way; cap the colour puzzle grid size at 12×12 (slightly below the B&W max of 15×15 with max Overclock); terminate the solver at 500 passes (2× the current 2000-pass hard limit for B&W but with a smaller search space due to colour constraint density).
- Alias mirrors: the `setCell` function will need to call itself recursively for alias cells. Guard with a `visited` set to prevent cycles if a bug creates mutual aliases.

### Uniqueness guarantee (colour puzzles)

The line-solve-to-completion uniqueness proof still applies to multicolour nonograms: a colour puzzle that the extended line-solver fully determines is uniquely solvable. The acceptance criterion is unchanged — only the solver logic changes. Colour puzzles may be more constrained (same cell has fewer options: BLUE or ORANGE vs. just FILLED), which can make them EASIER to determine uniquely. In practice, the generator may need fewer rejection attempts at lower densities to find a uniquely-solvable colour puzzle.

### Alias pair selection constraint

Not every pair of same-value cells makes a good alias. Bad aliases: (a) both cells are already forced by the line-solver in pass 1 (the alias adds no new information); (b) both cells are in the same row or column (a within-line alias is just a constraint already captured by the clue). Good aliases: cells in DIFFERENT rows AND different columns where at least one cell is not determined until solver pass 3+ (mid-difficulty). The alias picker should skip pass-1-determined cells and within-same-line pairs.

### Volatile cell selection constraint

Volatile cells should not be placed on cells that are trivially determined (an entire row that is all-filled, for example). The reset cost only has meaning if the cell requires genuine deduction to fill correctly. The picker should skip cells in lines with a single unique arrangement (Tier-1 fully-forced lines).

### Save state impact

The expansion mechanics add new per-puzzle fields to the board state:
- `volatileCells: [{x,y}]` (derived from seed, not stored; reconstructed on board load)
- `aliases: [[{x,y},{x,y}]]` (derived from seed, not stored)
- `colourMarks: string[]` (analogous to existing `marks`, but stores BLUE/ORANGE/UNKNOWN per cell; must persist in save)

Only `colourMarks` needs to be persisted (marks are the player's work-in-progress). Volatile cell positions and alias pairs can always be re-derived from the puzzle seed. The state version should be bumped to v3 when colour marks are added.

---

## Sources

- [webpbn Advanced Paint-by-Number Solving Techniques](https://webpbn.com/solving.html)
- [Wikipedia Nonogram](https://en.wikipedia.org/wiki/Nonogram)
- [Ninjapuzzles Nonogram Strategy Guide](https://ninjapuzzles.com/strategies/nonogram/)
- [Ward Games Nonogram Strategy](https://wardgames.now/guides/nonogram-strategy-guide)
- [clarity-media: Colour vs B&W Hanjie](http://www.clarity-media.co.uk/puzzle-strategy/what-is-the-difference-colour-hanjie)
- [webpbn Colour Nonogram Dissertation](https://webpbn.com/survey/dissert_solving_colored_nonograms.pdf)
- [Groningen MSc: Complexity and Solvability of Nonograms](https://fse.studenttheses.ub.rug.nl/15287/1/Master_Educatie_2017_RAOosterman.pdf)
- [Nintendo Life: Picross S3 Review](https://www.nintendolife.com/reviews/switch-eshop/picross_s3)
- [WayTooManyGames: Picross S7 Review](https://waytoomany.games/2022/01/11/review-picross-s7/)
- [PC Gamer: CiniCross article](https://www.pcgamer.com/games/puzzle/i-can-now-say-ive-been-killed-by-a-nonogram-thanks-to-this-roguelike-that-turns-picross-into-a-dungeon-crawler/)
- [So Many Games: CiniCross Review](https://somanygames.co.uk/review/cinicross/)
- [Ctrlr.net: CiniCross deep dive](https://www.ctrlr.net/cinicross-has-done-the-unthinkable-made-nonograms-of-all-things-a-dementedly-addictive-roguelite-hook/)
- [ComicBook.com: Best Picross Games](https://comicbook.com/gaming/list/6-best-picross-puzzle-games-that-you-have-to-play/)
- [Stage 3 backlog memory](../../../../.claude/projects/-home-jens-repos-file-viewer/memory/stage3-memory-grid-backlog.md)
