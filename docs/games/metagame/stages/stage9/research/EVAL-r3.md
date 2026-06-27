# Stage 9 "Observer State" — Round 3 Self-Evaluation

**Evaluated:** 2026-06-27  
**Branch:** `worktree-metagame-bitfoundry`  
**Tests:** 5/5 pass (`node --test docs/games/metagame/stages/stage9/tests/*.test.mjs`)  
**Reviewer stance:** skeptical critic; no flattery; every claim cited to source file and line.

---

## Scores

| # | Dimension | Score | Summary |
|---|-----------|-------|---------|
| 1 | Genre fidelity | 6/10 | Timing half excellent; observer-effect half reduced to meta-gimmick |
| 2 | Fun / engagement | 6/10 | 9 distinct verbs but zero visual feedback kills the reflex loop |
| 3 | Theme fit | 7/10 | Macro coherent; individual archetypes vary in thematic alignment |
| 4 | Depth & length | 7/10 | 10 movements, 16 levels; hits the 40–120 min window |
| 5 | Difficulty curve & onboarding | 5/10 | Mostly good; rhythm chain is an unannounced spike |
| 6 | Polish / UX / readability | 4/10 | Log-only feedback; no CSS animations; mobile absent |
| 7 | Determinism & correctness | 9/10 | Clean discipline; one cosmetic loop comment mismatch |
| 8 | Replayability | 5/10 | Fixed per-level seeds; identical every run for levels 1–11 |
| 9 | Technical health | 7/10 | Dead export; utility duplication; renderer.js over soft cap |
| 10 | Un-cheat discoverability | 7/10 | 4-step hint ladder; notes button always visible; correct gating |

**Weighted overall: 6.3 / 10**  
(Polish ×1.5, Fun ×1.5, Determinism ×1.2; others ×0.8–1.0)

---

## Global Law Compliance

| Law | Status | Evidence |
|-----|--------|---------|
| Boss only after full stage body | PASS | `advanceFrom` increments level by 1 only on a real hit (`renderer.js:104–111`); level 16 (boss) is reachable only from level 15. No bypass button or skip path. |
| Un-cheat uses REAL app feature | PASS | Notes opened via `viewer.openFile` / `viewer.openViewerFile` (real file viewer, `renderer.js:237–243`); offline control hidden until `state.offlineControlVisible` is set by reading notes; `actions.setAction` hooks into the app action bus. Boss still requires real timing after unlock. |
| Zero off-origin at runtime | PASS | No CDN or network fetch in any source file. |
| Deterministic seeded RNG | PASS | `Math.random` appears only at `boss.js:66` in the intentional online-destructive path. All mode functions are pure `f(seed, elapsedMs)`. `loop.js` uses `performance.now()` with 100ms cap on delta. |
| Modular files ≤500 LOC hard / 300 soft | WARN | `renderer.js` = 332 lines (over 300 soft cap, under 500 hard). All other files are well under soft cap. |

---

## What Was Built vs. Intended

The build plan specified a 6-band, 18-level structure (Signal / Interference / Collapse / Persistence / Echo / Blind Crossing). The implementation delivers a substantially different and arguably richer 10-movement, 16-level structure with 9 distinct mode archetypes:

| Movement | Levels | Mode | New verb |
|----------|--------|------|----------|
| Signal | 1–2 | simple | watch & time |
| Drift | 3–4 | oscillating | read a changing speed |
| Echo | 5–6 | ghostecho | read your own error |
| Cadence | 7–8 | rhythm | hold the beat (chain) |
| Interference | 9–10 | dual | hold two rhythms |
| Surveillance | 11 | stealth | wait for the blind window |
| Reversal | 12 | reversing | track the flips (online-unstable) |
| Decoys | 13–14 | multigap | pick the real gap (online-unstable) |
| Blackout | 15 | darkzone | extrapolate the occluded gap (online-unstable) |
| Observer | 16 | simple+darkzone | the full effect (boss) |

The four modes not in the plan (oscillating, rhythm, stealth, reversing) are genuine additions that each introduce a different cognitive load. This is the right direction — more verbs, not more levels. The plan's Band 3 "choose when to observe" mechanic (OBSERVE starts a 1.5s reveal window that expires, making the timing a two-step decision) was not implemented; the OBSERVE button simply resets the elapsed clock and reseeds online-unstable levels, which is weaker than the plan's intent.

---

## Dimension Analysis

### 1. Genre Fidelity — 6/10

The timing game half is well-executed. Nine modes each with a clean `evaluate(cfg, seed, ms) → { hit, distance }` interface and correct `solveMoment` proof. The Geometry Dash model (each band introduces a new verb, not tighter numbers) is followed.

The observer-effect half is significantly diluted. The design intent (`research.md:147–155`) called for OBSERVE itself to be costly: online, it reseeds (destructive); offline, it reveals without cost — so the player must choose WHEN to observe as a game-mechanical decision. In the build, OBSERVE is never destructive within a level attempt — it just resets the elapsed clock. The seed reseeds on each online attempt at an unstable level, but this is an automatic background event, not a player-initiated collapse. The "choose when to observe" tension is gone. What remains is: "play these levels online, get frustrated that the gap keeps jumping, eventually read the notes and go offline." That is an aha-moment, but it does not deliver the second-by-second "is it cheaper to observe now or to extrapolate from my last observation?" decision the research described.

Cite: `research.md:218–230` (Band 3 mechanic); `renderer.js:94–103` (actual OBSERVE implementation: just resets elapsed + reseeds).

### 2. Fun / Engagement — 6/10

Strong mechanical variety: rhythm's consecutive-chain requirement (7–8 hits in a row to clear) is the most engaging and most replayable mode — it genuinely creates tension because a single miss resets the chain (`renderer.js:143–148`). Stealth's blind window is clever: the eye sweeps independently and must not cover the crossing lane (`modes.js:234–247`), requiring two simultaneous reads. The dual mode (both rings must align) is well-proven by the test at `modes.test.mjs:86–100`.

However, the reflex-game genre is defined by instant feedback. Super Meat Boy has no death screen; Geometry Dash's feedback is 0ms visual. Here, every hit and miss is communicated through the `<ol class="s9-log">` (`renderer.js:280–285`): the player must shift eye focus from the ring animation to a log list below it, then read a text line, to know if they succeeded. For the 333ms cross window on the boss level (±15° at 46°/s), the player's attention has already moved on before the log updates. There is no visual class toggle on the arena, no flash, no border color change, no sound. This is the single biggest engagement failure in a genre where sub-second feedback is load-bearing.

### 3. Theme Fit — 7/10

"Observer State" is coherent: the bell messages (`messages.js:9–14`) and the boss defeat text ("I stopped watching. I moved. I arrived. the paradox didn't resolve. I just went around it.") are the best writing in the metagame. The online/offline seed split maps cleanly to measurement collapse. The movement names Signal, Drift, Echo, Interference, Blackout, Observer have a consistent signal/noise register.

Where it slips: `stealth` mode with the scanning `@` eye is spy-thriller vocabulary, not quantum physics. `reversing` mode ("track the flips") has no thematic anchor in the observer-effect metaphor. The `multigap` phantom-decoy mode is closer to "three-card monte" than quantum state. These are fine mechanics but they reduce thematic density in the back third (movements 7–9), exactly where the theme should be most intense before the boss.

### 4. Depth & Length — 7/10

Estimated per-mode investment based on mechanics:
- Signal + Drift (1–4): 15–25 min (simple learning curves)
- Echo + Cadence (5–8): 20–40 min (chain requirement is deep)
- Interference + Surveillance (9–11): 15–25 min
- Reversal + Decoys (12–14): 15–30 min (run-to-run learning for multigap)
- Blackout + Boss (15–16): 20–40 min (inference + offline un-cheat)

Total: 85–160 min. Hits the 40–120 min target comfortably; likely lands around 90 min for a deliberate player.

Depth concern: the `echoHistory` from the plan (`state.js` session section) was not implemented. The ghostecho mode (`renderer.js:254–258`) only tracks `attempts` in local renderer state — these reset on every `reobserve()` call and are not persisted to `state`. A player who presses OBSERVE between attempts loses their ghost calibration data. The plan called for persistence per-level to accumulate calibration across sessions.

### 5. Difficulty Curve & Onboarding — 5/10

Tolerance shrinks level-by-level across the run (42° down to 16° at the boss), and speed steps up — the structural curve is correct.

Two unmarked spikes:
1. **Level 7 (Cadence / rhythm mode)**: Every previous mode requires exactly one CROSS press per level. Level 7 requires 3 consecutive on-beat presses (`movements.js:39`, `chain: 3`); level 8 requires 4 (`chain: 4`). This is a fundamentally different win condition — a miss resets the chain to 0 (`renderer.js:143`). There is no announcement or explanation. The HUD shows "movement Cadence — hold the beat" which is correct but tiny. A first-time player will assume they need one press, land it, see "on beat (1/3)" in the log (if they notice the log), and press again before the next beat — likely missing. The natural assumption is "I just did it wrong" rather than "this is a chained mechanic."
2. **Level 11 (Surveillance / stealth mode)**: The eye covers the crossing lane with a 64° blind arc. A CROSS only succeeds when BOTH the gap is at the top AND the eye is NOT covering the top. `modes.js:239`: `watched = angularDist(eye, 0) <= blind/2`. The player must now simultaneously track two independent rotating elements and identify their joint favorable window. No introduction is given.

The hint text at `renderer.js:276–278` only changes for unstable levels, not per-mode.

### 6. Polish / UX / Readability — 4/10

The build plan's `styles.css` increment (7.2, `buildplan.md:420–428`) listed:
- `.s9-feedback.success` green flash (0.8s fade) — **absent**
- `.s9-feedback.bounce` red flash — **absent**
- `.s9-clarity-milestone` pulse at 25/50/75/100 — **absent**
- `@keyframes s9-pulse` — **absent**
- Mobile touch button sizing — **absent** (only grid-column collapse at `styles.css:78–82`)

The only dynamic CSS class applied outside of static layout is `s9-aid-owned` on the tachometer button (`renderer.js:307`). The arena `<pre>` has no class changes on hit or miss — `fields.arena.textContent` is overwritten every frame but no class state is toggled.

The `s9-boss` section is always rendered, even at level 1. On level 1 it says "clear levels to reach the Observer (level 16)" which is acceptable as a destination signal, but the border box dominates the lower third of the screen and visually competes with the arena.

The aid buttons display cost in parens and their description only in `title` attribute (`renderer.js:43`). On touch devices, `title` is never shown. Aid costs are undiscoverable on mobile.

The `OBSERVE (reset rotation)` label is UX-correct but breaks the quantum vocabulary. "OBSERVE (reset rotation)" says what it does mechanically but not why (for unstable levels, it also reseeds — the parenthetical is incomplete and misleading for those levels).

### 7. Determinism & Correctness — 9/10

This is the strongest dimension. `rng.js` is xmur3 + mulberry32, identical to stage2/stage3. Every mode function is a pure function: `evaluate(cfg, seed, ms)` and `render(cfg, seed, ms)` are referentially transparent. `Math.random` appears ONLY at `boss.js:66` as the mechanic of destructive observation (intentional). The `loop.js` implementation accumulates per-frame deltas rather than computing from a fixed `t0`, which is actually more robust for tab-switch recovery than the plan described (the 100ms delta clamp at `loop.js:19` prevents a single large jump from skipping a full rotation).

The `game.test.mjs:37–48` loop covers all 16 levels: for each level, `solveMoment(seed, level)` returns a moment (or array of moments for rhythm) where `crossAttempt.hit === true`. All 16 pass. The `boss.test.mjs` proves: online → fail; offline mistimed → fail; offline at `offlineSolveElapsed()` → win.

One cosmetic issue: `loop.js:3` comment says "performance.now() - t0" but the implementation has no `t0` — it accumulates deltas. Not a bug but the comment is incorrect.

### 8. Replayability — 5/10

Stable level seeds are `level * 31 + 7` (`game.js:47`). This means every playthrough of levels 1–11 is IDENTICAL — same base angles, same oscillation phases, same rhythm beat positions. Once a player learns "level 3 starts with the gap at roughly 6 o'clock," that knowledge is permanent. The game is solved-once for the stable front.

The online-unstable back third (levels 12–15) has seed variation per OBSERVE press, but this variation is designed to be frustrating (proving the un-cheat is needed), not replayable in a rewarding sense.

The rhythm chain requirement is the strongest replayability mechanic — even with a fixed seed, landing 3–4 consecutive beats is a skill that takes many attempts. The `multigap` phantom-decoy mode has per-attempt run-to-run learning value (first attempt 50/50, second 100%). Both are good.

The aids (Stabilizer charges, Tachometer) add mild meta-progression but the Tachometer is permanent once bought and Stabilizer charges are minor convenience items.

### 9. Technical Health — 7/10

Good structure overall. Issues:

1. **Dead export**: `content.js:11` exports `bossDiagram(lock)` — a static ASCII function the build plan (`buildplan.md:394`) said to remove. It is not imported anywhere in the stage (checked all imports). Dead code.

2. **Utility duplication**: `rings.js:82–93` copies five helper functions (`mod360`, `angularDist`, `inArc`, `inZone`, `ringChar`) from `ring.js:52–67` verbatim. These are pure math; they should be imported from `ring.js`, not duplicated. If either copy diverges in a bug fix, the other stays broken.

3. **renderer.js LOC**: 332 lines, exceeding the 300 soft cap. The file does more than it should: `crossSublevel`, `challengeBoss`, `doCross`, `buyAidAction`, `doPeek`, `openNotes`, `paintArena`, `repaint`, `paintTach`, `paintAids`, `persistAndPaint`. A `ui.js` module for the paint functions would bring renderer.js under 250 lines.

4. Test coverage is otherwise good. The `aids.test.mjs` covers the offline-only peek gate. The `modes.test.mjs` proves stealth's eye blocks (the `blocked` probe at line 55–62 is excellent) and the dual AND-window (line 85–99).

### 10. Un-cheat Discoverability — 7/10

Path:
1. Reach level 12 (first `onlineUnstable` level).
2. Press CROSS → log: "the gap reseeded the instant you committed. nothing holds while live. (go offline.)" Hint steps through `lockedHintLadder` (`messages.js:16–21`): 4 hints culminating in "read service-worker-notes.txt, then activate Offline Mode for Stage 9."
3. "open service-worker-notes.txt" button is always visible in the sidebar (not hidden until needed, `renderer.js:46`). This is discoverability-positive.
4. Notes display the cache explanation (`content.js:1–9`) and the real file viewer opens.
5. "Activate Offline Mode (Stage 9)" button appears (was hidden; now visible after notes are read, `renderer.js:279`).
6. Clicking it calls `activateOfflineMode` → sets fixed seed 0 → boss is now beatable by timing.
7. Boss still requires a real CROSS at the right moment (`boss.js:103`). Offline does not auto-win.

The path is well-designed. Docked slightly: the first unstable level produces only a log message and a −1 clarity penalty. A player grinding through the stable levels on speed would easily miss the log text and assume they're just timing badly. A visual indicator on the HUD that this level's seed is "live-random" (`renderer.js:269` does show "seed: live-random" but this requires reading a small HUD field, not a visual alert) would catch more players earlier.

---

## Top Issues

**1. No visual hit/miss feedback** (severity: HIGH)  
**File:** `renderer.js` + `styles.css`  
All hit/miss information is in the `<ol class="s9-log">` list. Timing games require sub-second feedback at the point of action. The log is below the fold of the arena and requires a deliberate eye shift that takes longer than the tolerance window.  
**Fix:** After `crossAttempt`, toggle a class on `fields.arena` (`s9-arena--hit` or `s9-arena--miss`) for 400ms with a CSS border-color transition (`#5dcaa5` for hit, `#c0392b` for miss). 12 lines of CSS, 5 lines of JS.

**2. OBSERVE is not a game mechanic — it is a reset button** (severity: HIGH)  
**File:** `renderer.js:94–103`, `research.md:218–230`  
The plan's Band 3 "choose when to observe" verb — where pressing OBSERVE collapses the ring to visible state for 1.5s, after which it returns to `?` (hidden), creating a two-step decision — was not implemented. The OBSERVE button only resets elapsed and reseeds. The observer-effect mechanic lives entirely at the meta level (online/offline seed), not within any level's moment-to-moment gameplay.  
**Fix:** For online-unstable levels, add a `revealExpiresAt` timer: OBSERVE shows the real ring for 1.5s (class-toggled hidden/revealed), then hides it. A CROSS pressed after the window expires returns 'expired' with no clarity change. This is roughly 40 lines across `game.js` and `renderer.js`.

**3. No per-movement announcement when a new archetype first appears** (severity: MEDIUM)  
**File:** `renderer.js`, no change currently  
Level 7 introduces the rhythm chain (new verb: land N consecutive presses). Level 11 introduces the stealth eye (new verb: wait for the blind window). Level 12 is the first online-unstable level. None of these transitions carry an in-UI announcement. The `fields.hint` element exists but shows only online-unstable hints or the static "watch the gap; CROSS when it faces the top."  
**Fix:** Track which movements have been seen in `state`; on first entry to a movement, set `fields.hint.textContent` to a one-sentence verb description for 10 seconds. 20 lines.

**4. Rhythm chain spike with no contextual briefing** (severity: MEDIUM)  
**File:** `renderer.js:130–148`, `movements.js:39`  
Levels 1–6 all require a single CROSS press. Level 7 requires 3 consecutive presses (`chain: 3`). The HUD shows "Cadence — hold the beat" but the win condition (consecutive chain) is not communicated until the first partial-hit result appears in the log. Most players will interpret "on beat (1/3)" as an error message on first encounter.  
**Fix:** Include chain requirement in the movement description ("hold the beat — land 3 in a row") and display it in the hint on first entry.

**5. Dead `bossDiagram` export in `content.js`** (severity: LOW)  
**File:** `content.js:11–23`  
The build plan explicitly said to remove this (`buildplan.md:394`). It is not imported anywhere. 13 lines of dead code.  
**Fix:** Delete lines 11–23 of `content.js`.

**6. `renderer.js` over soft LOC cap** (severity: LOW)  
**File:** `renderer.js` (332 lines; soft cap 300)  
`paintArena`, `paintTach`, `paintAids`, and `repaint` are ~90 lines of pure DOM-update logic that could move to a `ui.js` module.  
**Fix:** Extract to `stage9/ui.js`; renderer.js drops to ~240 lines.

**7. Utility function duplication between `ring.js` and `rings.js`** (severity: LOW)  
**Files:** `rings.js:82–93`, `ring.js:52–67`  
`mod360`, `angularDist`, `inArc`, `inZone`, `ringChar` are copied verbatim. A divergent bug fix in one copy will silently leave the other broken.  
**Fix:** Export these from `ring.js` (already present); import in `rings.js`.

**8. No visual signal distinguishing online-unstable levels before first CROSS** (severity: MEDIUM)  
**File:** `renderer.js:268–269`  
The HUD shows "seed: live-random" in a small text field, which is easy to miss. A player arriving at level 12 after completing level 11 has no UI affordance warning that the rules have changed.  
**Fix:** Add an `s9-hud--unstable` class to the HUD when `cfg.onlineUnstable` is true, with a CSS amber border or text color on the seed field. 5 CSS lines + 2 JS lines.

---

## Top Opportunities

**1. Visual hit/miss flash (highest ROI)**  
10 lines of CSS + 5 lines of JS — immediately transforms how the game FEELS. This is the genre's most basic expectation and its absence most undermines everything else. Do this first.

**2. Implement the in-level OBSERVE reveal window for unstable levels**  
The deepest missing mechanic from the research. "Choose when to observe" is a genuine second cognitive layer that would make the observer-effect theme load-bearing within each attempt, not just at the meta level. Roughly 40 lines of new logic.

**3. Per-movement announcement overlay on first entry**  
20 lines. Directly addresses the onboarding gaps at Cadence (level 7) and Surveillance (level 11). Pays forward every band transition.

**4. Vary stable-level seeds across playthroughs**  
Currently all stable levels replay identically. Including a per-session counter in the seed derivation (e.g., `sublevelSeed(level, playthrough)`) would make repeat plays feel fresh. 5-line change in `game.js`.

**5. CSS clarity milestones (25/50/75/100 clarity)**  
20 CSS lines (`@keyframes s9-pulse`, `.s9-clarity-milestone`). This was in the plan and would give players visible forward progress signals between level completions.

---

## Overall Verdict

**6.3 / 10** — A genuinely built stage that replaced the thin gate with real mechanics. The 10-movement, 9-archetype structure is richer than the 6-band plan. Determinism is disciplined. The boss is gated correctly and requires both the offline un-cheat and real timing skill. The rhythm chain and stealth blind-window modes are the strongest contributions.

The stage's core failure is a genre-level mismatch: this is a timing game with no instant visual feedback. Every classic in the reflex/timing genre — Geometry Dash, Super Meat Boy, Tunnel Rush — puts feedback at the point of action, in the frame the button was pressed. Stage 9 puts feedback in a log list that requires a deliberate eye movement to read. For a level where the tolerance window is 333ms, the log has already been crowded by new messages before the player looks at it.

The observer-effect theme is present at the meta level (online = destructive, offline = learnable) but absent within any individual level attempt. The plan's Band 3 mechanic — where OBSERVE itself is costly, starting a countdown, making "when to observe" a real-time decision — would complete the theme. Without it, the game's name is thematically sound but its mechanics are not.

**Single most important round-4 action: add hit/miss visual feedback to the arena element.** Two CSS classes, one 400ms transition, triggered immediately after `crossAttempt`. This is the prerequisite for every other improvement: it makes the game *feel* like a timing game before any new mechanic is added.
