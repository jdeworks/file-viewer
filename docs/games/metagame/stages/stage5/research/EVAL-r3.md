# Stage 5 "Signal Racer" — Self-Evaluation Round 3

**Date:** 2026-06-27
**Evaluator:** Rigorous design critic (read-only; no edits; unit tests run)
**Tests:** 16/16 pass (all `tests/*.test.mjs`)

---

## Scores

| # | Dimension | Score | One-line verdict |
|---|-----------|:-----:|-----------------|
| 1 | Genre fidelity | 7 | Track-rider verb escalation is solid; the "rhythm" half needs audio feedback |
| 2 | Fun / engagement | 7 | Rivals + powerups + forks + ghost racing are genuinely engaging; silent beat windows undercut the hook |
| 3 | Theme fit | 8 | Signal-warfare narrative is consistent end-to-end; MP3 un-cheat is thematic |
| 4 | Depth & length | 8 | 9 rounds + 7-part shop + ascension ladder; realistic 40–90 min first clear |
| 5 | Difficulty curve & onboarding | 6 | Verb-per-round discipline is strong; R7 time-trial win-condition is hidden; no per-round intro text |
| 6 | Polish / UX | 6 | Functional but minimal; no beat-pulse CSS, no calibration progress, one cramped legend line |
| 7 | Determinism & correctness | 9 | Excellent — `Date.now` gone, full precompute, transcript resume, one minor tick-drop caveat |
| 8 | Replayability | 8 | Ascension × 4, ghost racing, 7-part shop, packet farming, seed-consistent practice runs |
| 9 | Technical health | 8 | All files under 300 LOC soft cap; 16 tests green; one legacy dual-path in `economy.js` |
| 10 | Un-cheat discoverability | 6 | Hint ladder is good; calibration accumulates with ZERO visual progress while listening |

**Weighted average: 7.3 / 10**

---

## What shipped vs. what was planned

The build significantly over-delivered on the Phase A/B plan (7 rounds). The actual delivery is:

- 9 rounds (vs. 7 planned): added R7 time-trial (beat-the-clock + ghost) and R8 fork relay (multiple forks)
- 7-part multi-rank vehicle shop (vs. 3 flat upgrades planned)
- Seeded AI rivals with precomputed ghosts, bump mechanics, speed degradation on block hits
- 5 powerup types (shield, overclock, repair, cache, EMP) placed deterministically
- 4-rung ascension ladder (post-clear replay depth)
- Resume/checkpoint from a per-tick input transcript (byte-identical reconstruction)
- Full test suite (16 tests covering all core modules)
- Bypass button removed; boss double-locked by suppression math + `hasCounterWave` check

---

## TOP ISSUES

### 1. Calibration progress is completely invisible while listening (CRITICAL)
**File:** `renderer.js:173`
`fields.calib.textContent = lock.unlocked ? 'LOCKED-IN' : 'uncalibrated';`

The `state.calibration.continuousMs` accumulates silently throughout a 14-second listen. The HUD never shows how far through the loop the player is. A player who opens `transmission_hum.mp3` and lets it play has zero visual confirmation anything is happening — they will give up or assume the calibration is broken.

**Fix:** `lock.unlocked ? 'LOCKED-IN' : calibrationProgressStr(state)` where `calibrationProgressStr` returns e.g. `uncalibrated (9 / 14s)` if `continuousMs > 0`.

**Severity:** HIGH — un-cheat discoverability collapses without this.

---

### 2. Beat windows are completely silent — the genre-defining mechanic has no audio or CSS feedback (HIGH)
**File:** `render-track.js:34` (only renders `*` character), `styles.css` (no beat-pulse class)

The research named Thumper, Bit.Trip Runner, and Beat Racer as references — all of which make the beat visceral through sound and/or full-screen visual feedback. Here the beat window is a single `*` appended to the track header. There is no CSS animation, no DOM class toggle, no audio cue. A player focused on obstacle avoidance will miss the `*` entirely. The timing mechanic will feel arbitrary rather than rhythmic.

**Fix:** Add `.s5-beat-open` CSS `@keyframes` border-pulse on `.s5-track-grid` when the beat window is open. The renderer already has `data-field="arena"` — toggling a class on that element from `paintArena` when `view.beatOpen` is a three-line change. Even a 0.2s glow transition on `--s5-counter` (the teal accent) would convert a cognitive mechanic to a felt one.

**Severity:** HIGH — this is the core genre promise.

---

### 3. Time-trial failure message is wrong for a par-miss (MEDIUM-HIGH)
**File:** `renderer.js:140–142`

```js
pushLog(round.id === FINAL_ROUND_ID
  ? 'the jammer held the throttle down. the counter-wave is not calibrated.'
  : 'signal integrity collapsed. recalibrate and run it again.');
```

When the player completes R7 (time-trial) by surviving to the finish but is slower than the par ghost, `game-loop.js:finish()` demotes the result from `clear` to `fail`. The renderer then logs "signal integrity collapsed" — but integrity was fine. The player crossed the finish line; they just didn't know they needed to beat a clock. This message actively misdirects the player.

**Fix:** Check `round.archetype === 'time-trial'` in the else branch and log something like `'the par ghost had the channel — run faster next time.'`. The `round` object is available in `handleEnd`'s parameter bag.

**Severity:** MEDIUM-HIGH — introduces false information at the one round that changes the win condition.

---

### 4. No round introduction text — new mechanics must be inferred (MEDIUM)
**File:** No current source (missing feature)

A player completing R6 and clicking "7. TIME TRIAL" will start a race they have never encountered before. Nothing explains that this round requires beating the par ghost rather than simply surviving. Similarly, R4 introduces the counter-phase lane with no in-UI explanation beyond a `~` in the glyph legend.

**Fix:** When `startRound()` is called, briefly write to `fields.arena` (pre-game, before `mode = 'playing'`) with a one-line mechanic intro pulled from a new `ROUND_INTRO` array in `content.js`. Clear it once the engine starts. Costs < 20 LOC.

**Severity:** MEDIUM — affects every new mechanic introduction; compounds with issue #3.

---

### 5. `raceBox` and `posBox` spans are never hidden in select/result mode (LOW)
**File:** `renderer.js:33–37` (HTML), `renderer.js:162–170` (repaint)

The HTML renders `RACE sprint` and `POS —` even when mode is `'select'` (no race running). The code path for `mode !== 'playing'` sets text but never sets `.hidden`. The `data-field="raceBox"` / `posBox` refs are captured in `fields` but never toggled.

**Fix:** `fields.raceBox.hidden = (mode !== 'playing'); fields.posBox.hidden = (mode !== 'playing');` in `repaint()`.

**Severity:** LOW — cosmetic clutter, not a correctness bug.

---

### 6. `GLYPH_LEGEND` crams `+` and `$` onto one line (LOW)
**File:** `content.js:30`
`['+', 'repair   $ packet-cache']`

Two glyphs share one legend entry, breaking the one-glyph-per-row discipline. Any monospace alignment pass will need to handle this oddity.

**Fix:** Split into `['+', 'repair (+12 hull)']` and `['$', 'packet cache (+15p)']`.

**Severity:** LOW — presentation bug.

---

### 7. `economy.js` has a legacy `upgrades.signalAmplifier` boolean code path that Stage 5 saves never populate (LOW)
**File:** `economy.js:12`
```js
const gv = upgrades && upgrades.signalAmplifier ? 8 : (Number(gateValue) || 5);
```

The new shop uses `gateValue` from `applyUpgrades()`. The legacy boolean path exists to honour "older callers/saves" but Stage 5 is new — there are no older saves. The two code paths coexist for no benefit and could confuse a future change.

**Fix:** Remove the `upgrades.signalAmplifier` branch. All callers already pass `gateValue: tuning.gateValue`.

**Severity:** LOW — dead code.

---

### 8. Engine tick-drop under heavy frame backpressure (LOW caveat)
**File:** `engine.js:20`
```js
while (acc >= getTickMs() && guard < 8) { ... }
```

If a tab is backgrounded for >8 × tickMs (e.g. 8 × 120ms = 960ms for the boss round), the engine silently drops the excess ticks — the game state advances less than wall-clock time. For a timing-sensitive round this diverges the player's mental model. At current tick rates this requires a ~1-second backgrounding to trigger.

**Fix:** When `acc > 8 * getTickMs()`, clamp and log: `acc = Math.min(acc, 8 * getTickMs())`. This is a protective cap rather than silent drop, and makes the behaviour explicit.

**Severity:** LOW — hard to hit in normal play; harmless in testing.

---

## TOP OPPORTUNITIES

### O1. Beat pulse CSS — highest ROI polish
A `@keyframes s5-beat-pulse` that fires a border glow on `.s5-track-grid` whenever `beatOpen` is true converts the `*` character hint into a felt rhythm. Toggle a class in `paintArena` from `view.beatOpen`. This transforms the genre claim from "technically present" to "viscerally felt" with ~15 LOC change.

### O2. Per-round intro text (30 LOC, closes Issue #4)
A `ROUND_INTRO` array in `content.js` (one sentence per round) shown briefly in the arena pre-element before the engine starts. "This round: move on the beat gap, not against the burst." would onboard the R2 mechanic better than any glyph legend.

### O3. Calibration progress string (5 LOC, closes Issue #1)
Replacing `'uncalibrated'` with `'uncalibrated (Ns / 14s)'` in `repaint()` gives the player the single most important feedback signal when performing the un-cheat. Already tracked in `state.calibration.continuousMs`.

### O4. Rival personality tags
The rival AI currently varies by skill scalars (speed/lag/aggression) but all behave identically in strategy. Adding two archetypes — "Blocker" (intentionally occupies the counter-phase lane) and "Gate Racer" (always commits HI at forks) — would create tactical decisions in R6–R8 beyond just obstacle avoidance. Both are pure precomputed-ghost tweaks.

### O5. Per-round packet estimate in the round selector
Showing e.g. `"7. TIME TRIAL (est. 90–130p)"` next to each round button exposes the grind incentive explicitly. `calcRoundPackets` with representative inputs can produce this at render time without game-state change.

---

## Global law compliance

| Law | Status | Evidence |
|-----|--------|---------|
| Boss only after full stage body | PASS | `renderer.js:95` — boss gated by `clearedRounds < BOSS_IDX (8)`; all 8 body rounds must clear sequentially |
| Un-cheat uses a real app feature | PASS | `calibration.js:27` — checks `isTransmissionHum(file) && active && !seeking`; bypass button absent from HTML |
| Zero off-origin | PASS | No CDN imports anywhere in stage5 |
| Deterministic seeded RNG | PASS | `state.js:6` — `Date.now` removed; `rng.js` is pure xmur3+mulberry32; obstacle tables precomputed at mount |
| Modular files ≤ 300/500 LOC | PASS | Longest: `game-loop.js` 288, `renderer.js` 284; all others < 110 |

---

## Overall verdict

**7.3 / 10** — The build is mechanically complete and structurally sound. It has over-delivered on the planned scope (9 rounds vs. 7, 7-part shop vs. 3, rivals with EMP + powerups, time-trial ghost racing, ascension ladder, resume system). The test suite is comprehensive and all 16 tests pass. The determinism story is excellent.

The gap between 7.3 and a 9 is almost entirely in the sensory / feedback layer:
- A rhythm racer with no beat-pulse CSS or audio is a puzzle racer wearing a rhythm label. The genre's core promise requires the beat to be felt, not just read.
- The calibration progress gap will cause players to abandon the un-cheat before completing it.
- The time-trial's hidden win condition with a wrong failure message is a real onboarding failure at the one round that changes the rules.

**Single most important round-4 action:** Add the beat-pulse CSS animation (`@keyframes` glow on `.s5-track-grid` when `beatOpen`) and the calibration progress string (`'uncalibrated (Ns / 14s)'`). These two changes together — roughly 25 LOC — convert the largest genre-promise gap and the largest un-cheat discoverability gap in one pass. Do both; they are inseparable in impact.
