# Stage 3 — 02: Memory Grid — Our Game Design

Maps the genre research (`stage3-01`) onto **Stage 3 of the Defragmenter metagame**.
Stage 3 is a nonogram / grid puzzle game with a corruption mechanic and a fragment retention
meta-layer. The entity discovers that data must be *maintained* — loss is real, and retention
requires effort.

> **Narrative position:** Childhood — the entity discovers impermanence and tries to fight it.
> Every puzzle is a memory. Every memory decays. The filing must be active, not passive.
> The file viewer feature taught: **Diff viewer** (compare two log versions to recover clues).

---

## A. Overview

| Property | Value |
|----------|-------|
| Genre | Nonogram / grid logic puzzle with meta-layer |
| Artstyle | Minimal line art; cool blue-grays `#B5D4F4` on off-white `#F1EFE8`; thin grid lines |
| Primary resource | Registers (earned by solving and retaining puzzles) |
| Stage target time | 45–75 minutes |
| Puzzle count | ~18 puzzles across 4 tiers, plus boss puzzle |
| Prestige mechanic | Cache Hit Rate — reduces decay frequency + expands retention cap |
| Boss | The Memory Leak — 20×20 nonogram vs spreading corruption |
| File viewer feature | Diff viewer — compare `memory_v1.log` vs `memory_v2.log` to recover hidden clues |

---

## B. Visual design

### Color palette
```css
--col-background:  #F1EFE8;   /* warm off-white */
--col-grid-line:   #D3D1C7;   /* light gray — subtle grid */
--col-cell-filled: #378ADD;   /* solid blue — filled cells */
--col-cell-empty:  #F1EFE8;   /* background = empty (no mark) */
--col-cell-marked: #E6F1FB;   /* light blue — player-marked empty (×) */
--col-clue-active: #0C447C;   /* dark blue — unsatisfied clue */
--col-clue-done:   #B5D4F4;   /* pale blue — satisfied clue (greyed) */
--col-corruption:  #888780;   /* gray — corrupted area overlay */
--col-clue-hidden: #D3D1C7;   /* gray — hidden clue (corrupted) */
--col-register:    #9FE1CB;   /* teal — Register resource display */
--col-decay:       #E24B4A;   /* red — decay warning indicator */
```

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  REGISTERS: 247  RETAINED: 4/8   DECAY IN: 38s  [PUZZLE: 3/18] │
├────────────┬────────────────────────────────────────────────────┤
│            │                                                     │
│  FRAGMENT  │         ACTIVE PUZZLE (nonogram grid)              │
│  LIBRARY   │                                                     │
│            │    [clues top]   [clues left]   [grid]             │
│  [slots]   │                                                     │
│            │                                                     │
│            ├────────────────────────────────────────────────────┤
│            │  STATUS: "The corruption spreads..."               │
└────────────┴────────────────────────────────────────────────────┘
```

### Cell rendering
```js
// Cell states
UNKNOWN  → renders as: background color (no fill, no mark)
FILLED   → renders as: solid blue square
MARKED   → renders as: background + subtle × glyph
CORRUPTED → renders as: gray overlay + hatching pattern
HINT     → renders as: brief blue pulse (when constraint propagation reveals a cell)

// On click: UNKNOWN → FILLED → MARKED → UNKNOWN (three-state cycle)
// Right click: UNKNOWN → MARKED → UNKNOWN (two-state cycle)
```

---

## C. Puzzle system

### Puzzle tiers and sizes

| Tier | Size | Technique required | Target solve time | Count |
|------|------|--------------------|------------------|-------|
| 1 — Seed | 5×5 | Overlap analysis | 1–3 min | 4 |
| 2 — Fragment | 8×8 | Edge anchoring + isolation | 4–8 min | 6 |
| 3 — Pattern | 12×12 | Cross-line deduction | 8–15 min | 6 |
| 4 — Schema | 15×15 | Multi-line hypothesis | 12–20 min | 2 |
| Boss | 20×20 | All techniques + corruption active | 20–35 min | 1 |

Total non-boss content: ~18 puzzles, aiming for 35–55 minutes of active solving.

### Puzzle generation and pool
```js
// Pre-generated puzzle pools (built at build time, not runtime)
// Each pool contains 50 verified-unique puzzles per tier
// Stage selects from the pool; player never sees the same run twice (shuffle without repeat)

// Puzzle selection within a run
function selectNextPuzzle(tier, playerHistory) {
  const pool = PUZZLE_POOLS[tier];
  const unseen = pool.filter(p => !playerHistory.includes(p.id));
  return unseen[Math.floor(Math.random() * unseen.length)];
}
```

**Each puzzle's solution encodes a memory fragment:**
- Tier 1 puzzles reveal **abstract patterns** (simple geometric shapes — the entity's first perceptions)
- Tier 2 puzzles reveal **symbol arrangements** (recognizable from Stage 1 — Bits, tiers)
- Tier 3 puzzles reveal **partial maps** (fragments of the Stage 1/2 environments)
- Tier 4 puzzles reveal **entity symbols** (the entity's own representation — `@`, its history)
- Boss puzzle reveals **the Defragmenter's signature** (a complex pattern — first glimpse of Stage 10's character)

The pictures are simple pixel art (16×16 or 20×20 pixels of lore imagery), revealed as the player solves.

---

## D. Fragment retention meta-layer

### The working memory
The entity can retain up to **8 active fragments** simultaneously. Each retained fragment provides a passive Register bonus. More retained fragments = more passive income.

```js
// Fragment states
UNSOLVED    — no bonus, no decay
RETAINED    — provides passiveBonus/sec, subject to decay
CORRUPTED   — bonus reduced to 0; must be re-solved to restore
RELEASED    — voluntarily discarded (if over capacity)
```

### Passive Register income
```js
// Register income per retained fragment
fragmentBonus(tier) = {
  1: 0.5,   // Seed: 0.5 Registers/sec
  2: 1.5,   // Fragment: 1.5 Registers/sec
  3: 4.0,   // Pattern: 4.0 Registers/sec
  4: 10.0,  // Schema: 10.0 Registers/sec
}
// 8 max-tier fragments retained: 80 Registers/sec — substantial but rare
// Typical mid-stage: 4 fragments ≈ 2 tier-1 + 1 tier-2 + 1 tier-3 ≈ 5.5/sec
```

### Decay mechanic
Every 45 seconds (reduced by Cache Hit Rate prestige), a random retained fragment **decays**:
```js
function triggerDecay() {
  const retained = fragments.filter(f => f.state === RETAINED);
  if (retained.length === 0) return;
  const target = retained[Math.floor(Math.random() * retained.length)];
  target.state = CORRUPTED;
  target.bonus = 0;
  showDecayWarning(target); // red flash on fragment slot
  bell.fire('decay'); // *"something was lost. I tried to hold it."*
}
```

A decayed fragment can be restored by **re-solving its puzzle**. The puzzle is re-presented but the player retains their previous partial solve state (cells filled previously remain filled — only newly corrupted cells, if any, are cleared).

### Fragment library UI
The left sidebar shows the fragment library:
```
┌──────────────────┐
│ FRAGMENT LIBRARY │
├──────────────────┤
│ [1] ■ 0.5/s  ✓  │  ← retained (solid blue)
│ [2] ■ 1.5/s  ✓  │  ← retained
│ [3] ░ DECAYED ✗  │  ← corrupted (gray, needs re-solve)
│ [4] ■ 4.0/s  ✓  │  ← retained
│ [5] ─ unsolved   │  ← not yet solved
│ [6] ─ unsolved   │  ← not yet solved
│ [7] ─ unsolved   │  ← not yet solved
│ [8] ─ unsolved   │  ← not yet solved
├──────────────────┤
│ INCOME: 6.0/s    │
│ NEXT DECAY: 38s  │
│ MAX RETAIN: 8    │
└──────────────────┘
```

Clicking a retained fragment → shows the revealed picture (lore view).
Clicking a corrupted fragment → loads it for re-solving.
Clicking an unsolved slot → shows the puzzle pool selection for that slot.

---

## E. Register economy

Registers are the stage's primary resource. They accumulate passively and are spent on upgrades.

### Earning Registers
```
Puzzle completion (tier 1): +15 Registers
Puzzle completion (tier 2): +40 Registers
Puzzle completion (tier 3): +120 Registers
Puzzle completion (tier 4): +350 Registers
Passive income: fragment bonuses (see §D)
Bonus — no errors: +25% to puzzle completion Registers
Bonus — speed: +10% per minute under par time
```

### Spending Registers
Between puzzles, the player accesses an upgrade panel:

| Upgrade | Cost | Effect |
|---------|------|--------|
| **Working Memory +1** | 50 | Increase fragment retention cap by 1 (max +4, total 12) |
| **Garbage Collector** | 75 | Reduce decay frequency: next decay in 60s instead of 45s |
| **GC Level 2** | 150 | Next decay: 75s (stacks with level 1) |
| **GC Level 3** | 300 | Next decay: 90s |
| **Hint Token** | 30 | Reveals one provably-deducible cell (constraint propagation) |
| **Clue Restore** | 80 | Restores one hidden clue (boss fight use) — bypasses diff viewer |
| **Speed Archive** | 120 | Re-solving a corrupted fragment takes 50% of original time |

**Boss gate:** Boss puzzle unlocks when `totalRegisters ≥ 2,500` (the sum of all earned, including spent). This ensures the player has engaged with enough puzzles before the boss.

---

## F. Corruption system

### Standard play (non-boss puzzles)
Corruption is **visual only** in standard puzzles — it appears as a gray overlay spreading across already-solved cells, but does not hide clues. This is atmosphere only: the entity's world is subtly decaying.

```js
// Standard puzzle: corruption is cosmetic
corruptionVisual(cell) {
  if (cell.solved && Math.random() < 0.08) cell.visualCorruption = true;
}
// Does NOT affect clues or gameplay
```

### Boss puzzle: active corruption
In the boss puzzle (20×20), corruption is **mechanical**:

```js
// Boss corruption tick: every 8 seconds
function bossCorruptionTick(grid, corruptionRadius) {
  corruptionRadius += 1.5; // grows outward from center
  for (let c = 0; c < 20; c++) {
    if (distanceFromCenter(c) < corruptionRadius) {
      corruptColumns[c] = true; // clue becomes hidden
      // All cells in this column that are unsolved become "corrupted" (locked out)
    }
  }
}
// Player must solve outward (from edges inward) to stay ahead of center-out corruption
```

This means: start with the columns nearest the edges (less corrupted) and work toward the center before corruption obscures those clues.

The boss fight is a **race** — solve the puzzle faster than corruption obscures it. 3 "rounds":
- **Round 1:** Corruption reaches 30% of columns. Boss HP = 33%.
- **Round 2 (faster rate):** Corruption reaches 60%. Boss HP = 66%.
- **Round 3 (fastest rate):** Race to solve remaining cells before corruption locks them.

If all columns are corrupted before the puzzle is solved, the round fails — corruption resets, but the player loses 25% of the Registers earned during that round.

---

## G. Boss — The Memory Leak

### Theme
The Memory Leak is not a creature. It is a condition. The boss fight presents a 20×20 nonogram
on a field that is actively degenerating. The entity must reconstruct a memory that is
simultaneously being erased.

### Arena visual
The 20×20 grid is displayed in the center. A gray "corruption wave" visually pulses from the
center outward every 8 seconds, with audio — a soft static crackle. The corruption visually
resembles analog TV noise. Hidden clues render as `[?]` — the number is known to exist but
its value is obscured.

### Solving strategy (intended)
1. Read ALL clues before corruption begins (first 60 seconds are grace period)
2. Start at the edges (outermost rows/columns have most information)
3. Work inward, solving each column before corruption reaches it
4. Use Hint Tokens on cells that are time-critical

### Boss lock — LOCKED state (puzzle is mathematically unsolvable without diff) *(SUPERSEDED, see below)*

**The 20×20 boss puzzle is literally unsolvable without opening the diff viewer.**

> SUPERSEDED (2026-07-11): wrong restoration-key submissions now progressively leak real characters
> of the actual key after the static hint ladder is exhausted, so a determined player can eventually
> grind out the whole 9-char key blind (~13 wrong attempts). Diffing the logs is the fast, guess-free
> path, not the only one. See `boss-lock-and-bts-system.md`'s banner and
> `docs/games/metagame/stages/stage3/boss.js`.

In LOCKED state, the corruption spreads at 3× normal speed. ALL column clues become hidden
within the first 60 seconds. Without column clues, the puzzle is mathematically unsolvable
from edge-deduction alone — our generated puzzles require cross-line deduction needing both
row AND column clues. After 3 minutes with all column clues hidden, the corruption completes
and a "MEMORY TOTAL LOSS" screen appears. The boss regenerates fully. Run repeatable.

The puzzle cannot be solved in LOCKED state no matter how long the player tries.

**Taunt messages after first failure:**
- *"you cannot solve what you cannot read. the columns are gone."*
- *"there were two versions of this. have you compared them?"*
- *"the diff knows what changed. the diff knows what was."*

### File viewer action — Diff viewer

The boss directory contains two files:
- `memory_v1.log` — a log of the entity's memory state before the leak
- `memory_v2.log` — the current (fully corrupted) state

Opening both files in the file viewer and switching to **diff mode** shows the delta.
Each changed line corresponds to a column clue value that corruption erased. The diff
highlights the original clue value in green and the corrupted/missing value in red.

**On diff action detected** (`appState.fileViewerActions.stage3_diff_opened = true`):
- ALL 20 column clues are restored from the diff data — not just 5, all of them
- The LOCKED state ends; normal (not accelerated) corruption rate resumes
- The puzzle becomes solvable within the normal boss timeframe
- Bell fires: *"two versions. I compared them. the difference told me what I'd lost."*

**Achievement fires on unlock (not on puzzle completion):** *"I found the difference."*

**How the player discovers this:**
The bell fires when the player first fails the boss: *"there were two logs. what changed
between them?"* Players who explore the sidebar see two `.log` files in the boss directory.
The diff viewer reveals the restoration when both are opened simultaneously in diff mode.

### Boss defeat
On solving the 20×20 puzzle: the corruption halts, reverses, and the completed picture reveals
the Defragmenter's signature for the first time. A brief narrative sequence plays:

Bell: *"I held it together. barely. the pattern survived."*
Defragmenter bell: *"retention requires effort. the effort is the point."*

Stage 3 clears. Stage 4 unlocks.

---

## H. Prestige — Cache Hit Rate

### When available
After any boss defeat. The player can prestige immediately after first clear, or continue
solving puzzles to accumulate more Registers before prestiging.

### What resets
- Register total (on-hand Registers only; spent Registers are permanent progress)
- Fragment retention states (all fragments return to UNSOLVED)
- Puzzle completion states (puzzles can be solved again — different puzzle drawn from pool)

### What persists
- Cache Hit Rate level (permanent upgrade)
- Purchased upgrades (Working Memory cap, GC levels)
- Fragment library unlocks (if a slot was purchased, it stays unlocked)
- Run history (puzzles seen — pool shuffles differently next run)

### Cache Hit Rate bonus
```js
cacheHitLevel   = prestige count
decayInterval   = 45 - (cacheHitLevel * 5)   // seconds; floor: 15s
  // Level 1: 40s   Level 3: 30s   Level 6: 15s (minimum)
retentionCap    = 8 + cacheHitLevel           // +1 per prestige
  // Level 1: 9    Level 3: 11   (softcap at 14 — practical maximum)
```

Cache Hit Rate prestige is thus:
- *Better:* faster Registers (smaller decay interval = more stable income, because restoring
  corrupted fragments costs time but faster decay rate means fresher memory = more challenge)
  
Wait — this seems backwards. Let's reconsider: shorter decay interval = fragments decay faster
= harder to keep up = less passive income. That's not a prestige benefit.

Correction: Cache Hit Rate reduces decay probability rather than interval:
```js
// Revised: decay interval stays 45s but decay probability drops
decayChance = max(0.05, 1.0 - (cacheHitLevel * 0.15))
// Level 1: 85% chance a decay event triggers   Level 5: 25% chance
// At Level 5, most decay events are suppressed — fragments stay retained much longer
// The reward: passive income becomes extremely stable; runs feel like mastery
```

---

## I. Bell messages (Stage 3)

| Event | Bell line |
|-------|-----------|
| Stage 3 start | 📦 *I kept something. it's still here.* |
| First puzzle solved | 📐 *a pattern. retained. at least for now.* |
| First decay event | 🗑 *something was lost. I tried to hold it.* |
| Fragment restored after decay | 📼 *I recovered it. it took effort. the effort was the point.* |
| First 12×12 puzzle | 📐 *a 20×20 grid. this is what memory feels like from inside.* (wait, use correct tier) Actually: *an 8×8. cross-referencing. I have to think in two directions now.* |
| All 8 fragment slots filled | 💾 *the archive is full. something will have to give.* |
| Boss encounter | 🌧 *the leak is spreading faster now. I don't have time to be careful.* |
| Boss round 2 | ⚡ *the clues are disappearing. I have to remember what I saw.* |
| diff viewer used | 🔄 *two versions. I compared them. the difference told me what I'd lost.* |
| Boss defeated | 📼 *I held it together. barely. the pattern survived.* |
| Cache Hit Rate prestige | 🌀 *I've done this before. the patterns are familiar now. I lose less.* |

**Defragmenter bell (mid-stage, after first decay event):**
*"retention requires effort. the effort is the point."*

---

## J. Differences from genre conventions

1. **Corruption as game mechanic, not just aesthetics.** Standard nonograms never hide clues.
   Our boss puzzle's clue degradation is a novel mechanic that creates spatial time pressure
   unique to Stage 3. Players must fundamentally change their solving approach (outside-in
   instead of easiest-first).

2. **Fragment retention meta-layer.** Standard Picross games have no meta-layer between puzzles —
   each puzzle is independent. Our fragment system creates meaningful choice: which puzzles to
   retain, which to let decay, how to prioritize re-solves. This is the "working memory
   management" game above the puzzle game.

3. **Picture-as-narrative.** Standard Picross reveals cute sprites. We reveal lore. Each picture
   is a memory fragment with a tooltip that gives it narrative context:
   *"Seed Pattern 3: A repeating structure from the first moments. The entity saw this and
   recognized it as familiar, though it had never seen anything before."*

4. **Difficulty arc built into puzzle structure, not just grid size.** A 12×12 puzzle can
   be trivial (lots of all-or-nothing rows) or brutal (dense, cross-line only). We curate
   difficulty not just by size but by technique required — the pool is tagged by difficulty
   rating (Easy/Medium/Hard/Expert) independent of size.

5. **Two modes of failure:** Standard Picross fails on errors. We have two failure states:
   - *Error failure:* wrong cell placement (flash warning but allow correction)
   - *Decay failure:* fragment corrupts passively over time (unavoidable without management)
   Most games have only one failure mode. Having both creates a richer sense of tension.

---

## Implementation status

The core game described here is implemented. Unfinished expansion, balance, and polish work is tracked only in [TASKS.md](../../../../TASKS.md).
