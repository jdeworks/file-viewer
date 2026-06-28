# Stage 8 — Entropy Field: Self-Evaluation Report (Round 3)

_Date: 2026-06-27. Read-only code audit. Unit tests run: 13/13 pass._

---

## Scores

| # | Dimension | Score | Rationale summary |
|---|-----------|-------|-------------------|
| 1 | Genre fidelity | **8/10** | Real decay engine, cascade topology, Heat axis, tech tree, storm mid-bosses — close to ONI/Frostpunk; the RISK-TOGGLE verb (High-Load) is implemented but not exposed in UI |
| 2 | Fun / engagement | **7/10** | Core loop is genuine; storms add drama; tech tree adds discovery; but cascade stress is invisible, High-Load toggle is missing from the UI, repair is click-only |
| 3 | Theme fit | **8/10** | "Managing .sav files in a file-viewer inside a file-viewer" diegesis is intact; log messages and Heat Death payoff line land well |
| 4 | Depth & length | **7/10** | 3-act storm structure plausibly spans 50–120 min first run; tech/structure discovery adds time; later arc (SUPPRESS/SACRIFICE verbs) is underdeveloped |
| 5 | Difficulty curve & onboarding | **6/10** | Storm gates provide implicit pacing; no band announcement bells; no High-Load tutorial; cascade stress invisible; SUPPRESS/entropy threshold mechanic absent |
| 6 | Polish / UX / readability | **5/10** | No cascade stress on node cards; no High-Load toggle per node; no Stabilizer-apply button per node; no entropy-level glitch animation; node map is a flat list, not zoned |
| 7 | Determinism & correctness | **9/10** | xmur3+mulberry32 seeded from `"8:cyc:N"` throughout; no Math.random/Date.now in live path; burn simulation deterministic; version migration wipes old stub states cleanly |
| 8 | Replayability (prestige) | **8/10** | Microstate Collapse: Cores = totalStatesEarned/400 + stormsSurvived; prestigeMult = 1 + 0.08×Cores; tech/structures persist across collapses; first-clear gated correctly |
| 9 | Technical health | **9/10** | 13/13 tests pass; all source files under 300 LOC (max: state.js 241, renderer.js 245, boss.js 211, engine.js 208); module separation excellent; LOC cap respected |
| 10 | Un-cheat discoverability | **7/10** | 4-condition gate with tick marks; `gateHint()` gives ordered specific guidance; 4-step hint ladder; bell fires on boss-attempt failure; debris log entry on node fail; no bell on debris creation |

**Weighted average: 7.4 / 10**
(Weights: fun 0.15, curve/onboard 0.12, depth 0.12, UX 0.12, determinism 0.12, genre 0.10, replayability 0.08, health 0.07, un-cheat 0.07, theme 0.05)

---

## Global Law Compliance

| Law | Status |
|-----|--------|
| Boss only after full stage body (no bypass) | **PASS** — 4-gate lock: `enoughStorms` (stormsSurvived >= 3), `actionReady` (drag-drop), `enoughSalvage` (≥ 72), `enoughStates` (totalEarned ≥ 300), `enoughCycles` (cycle ≥ 8). Storm gate requires ~30+ cycles minimum. Previous bypass is closed (boss.test.mjs confirms). |
| Un-cheat uses a REAL app feature, not trivially bypassable | **PASS** — Internal drag-and-drop required. Cold Storage automation gated behind both `sal3` tech AND `state.manualArchiveDone`, so automation can never substitute for the first hand-archive. |
| Zero off-origin | **PASS** — No remote fetches. All imports are local. |
| Deterministic seeded RNG | **PASS** — `rng.js` copies xmur3+mulberry32 from stage2. Seeds are `"8:cyc:${cycle}"` per advanceCycle, `"8:burn:${cycle}"` for Heat Death. No Math.random or Date.now in engine/events/burn paths. |
| Modular files (300 soft / 500 hard LOC) | **PASS** — All source files under 300 LOC. No violations. |

---

## Top Issues

### Issue 1 — High-Load Mode toggle has NO UI affordance [CRITICAL]
**What's wrong:** `toggleHighLoad(state, nodeId)` is fully implemented in `engine.js:198–204` and correctly applies 1.5× decay when `highLoad[nodeId]` is true. But `paint.js` nodeCard (line 135) renders no `[data-high-load]` button, and `renderer.js` click handler (lines 116–137) has no `data-action="high-load"` branch. The `state.highLoad` object is initialized and serialized but can never be set by the player.

**Impact:** The RISK-TOGGLE verb — the central Band 3 design pillar ("a temporal bet: spend nothing now, earn faster, pay repair cost later") — is **completely invisible**. Players have no way to discover or use High-Load mode. The RISK-TOGGLE mechanic is the most asymmetric decision in the game and is the primary engagement driver in cycles 11–22.

**Fix:** In `paint.js` `nodeCard()`: add `<button type="button" data-high-load="${n.id}">HL</button>` for nodes where `nodeById(n.id).supportsHighLoad`. In `renderer.js` click handler: add `const hl = event.target.closest("button[data-high-load]"); if (hl) { toggleHighLoad(state, hl.dataset.highLoad); persistAndPaint(); return; }`. Add `is-high-load` class to node card when active. Effort: ~10 lines.

**Severity: CRITICAL — an implemented engine mechanic is player-invisible.**

---

### Issue 2 — Cascade stress not shown on node cards [HIGH]
**What's wrong:** `engine.js:109–119` correctly computes `n.cascadeStress` on each cycle from failed neighbors. `paint.js:135–145` `nodeCard()` reads neither `n.cascadeStress` nor the node's effective decay rate. The player sees a node at 78% health with no indication it is decaying at 2× base rate because P1 failed next door.

**Impact:** The topology lesson ("the node map is a graph, not a list") — the central design goal of the PRIORITIZE verb — cannot be learned if cascade stress is invisible. Players will repair the most-damaged node instead of the most-strategically-critical one because the cascade mechanic is opaque.

**Fix:** In `nodeCard()`: add a conditional stress indicator, e.g. `${n.cascadeStress > 0 ? ` <span class="s8-node-stress">+${n.cascadeStress}</span>` : ""}`. Add `.s8-node-stress { color: #c8553b; font-size: 12px; }` to `styles.css`. One line in `paint.js`, one CSS rule. Effort: ~3 lines.

**Severity: HIGH — the game's core spatial decision is unteachable without this.**

---

### Issue 3 — No UI to apply Stabilizer to a node [HIGH]
**What's wrong:** `applyStabilizer(state, nodeId)` is implemented in `engine.js:177–184`. `paint.js` renders no "stabilize" button per node. `renderer.js` click handler has no `data-action="stabilizer-node"` branch. The only stabilizer-related UI is `[data-action="stabilizer"]` (build a new Stabilizer from States) and the burn simulation (which auto-spends stabilizers). The player can buy stabilizers but cannot deploy them during the body game.

**Impact:** The mid-game ENDURE mechanic (freeze a critical node for 2 cycles to protect it through a storm) is inaccessible. Stabilizers become a Heat-Death-only resource, losing their in-game tactical value.

**Fix:** Add a "freeze" button per node in `nodeCard()` (enabled only when `state.stabilizers > 0`). Wire it in `renderer.js`. Effort: ~8 lines. Consider gating visibility to cycles >= 6 (Band 2+) to avoid overwhelming Band 1.

**Severity: HIGH — the "insurance" mechanic is built but unusable.**

---

### Issue 4 — Entropy threshold events are RNG-events, not threshold-driven [MEDIUM]
**What's wrong:** The buildplan D2 called for threshold-driven events: when `state.entropy >= 60`, fire Pattern Failure (two mid-zone nodes lose 15 health); when `state.entropy >= 80`, fire Total Cascade (all degrading nodes lose 30 health). These were to be **deterministic consequences of crossing the threshold**. Instead, `events.js` implements `pattern_failure` (hit the weakest node for -18) and `jitter_storm` (field-wide -3) as random 60%-per-cycle events unrelated to the entropy level.

**Impact:** The Band 5 SUPPRESS verb ("second-order threshold management") is absent. Players never learn to repair a low-value failed node purely to push entropy below 60% to avoid a threshold event. The system-level entropy statistic is display-only rather than load-bearing.

**Fix:** In `engine.js` `advanceCycle()` after line 155 (where `result.entropy` is set), add:
```js
if (state.cycle >= 23 && result.entropy >= 80) triggerTotalCascade(state, rng);
else if (state.cycle >= 23 && result.entropy >= 60) triggerPatternFailure(state, rng);
```
Where `triggerPatternFailure` picks 2 mid-zone nodes by RNG and applies -15, and `triggerTotalCascade` applies -30 to all degrading nodes. The existing random events in `events.js` can stay as-is; the threshold events are additive. Effort: ~20 lines.

**Severity: MEDIUM — a designed player verb is absent; entropy% is cosmetic past cycle 23.**

---

### Issue 5 — No glitch/sacrifice visual (CSS entropy level) [MEDIUM]
**What's wrong:** The buildplan D4 specified a `--entropy-level` CSS custom property set via JS, a `@keyframes glitch-shift` animation, and `.s8-zone-frontier.is-fully-failed` zone-darkening styles. `styles.css` (148 lines) has none of these. `paint.js` never calls `root.style.setProperty(...)`. The node map renders a flat list with no zone grouping.

**Impact:** The "field visually degrades as entropy rises" design goal (research.md §4: "players experiencing visual degradation instinctively want to fix it — the aesthetic is aversive in exactly the right way") is entirely absent. The Band 6 sacrifice visual ("Frontier zone goes dark") has no feedback channel. The atmospheric driver that makes entropy feel threatening rather than merely numerical is missing.

**Fix:** (a) Add `@keyframes glitch-shift` and zone-grouped CSS to `styles.css`. (b) In `paint.js` `paintStage8()`: `root.style.setProperty('--entropy-level', (state.entropy / 100).toFixed(2))` and assign zone classes to node cards. (c) Wrap `map.replaceChildren()` by grouping nodes into zone `<section>` elements. Effort: ~30 lines CSS + 10 lines JS.

**Severity: MEDIUM — thematic feedback absent; the game's signature aesthetic is missing.**

---

### Issue 6 — No band announcement bells [MEDIUM]
**What's wrong:** The buildplan D3 called for `BAND_INTRO_BELLS` in `messages.js` and a check in `engine.js` `advanceCycle()` to fire a bell when the cycle crosses a band threshold. Neither `messages.js` nor `engine.js` has this. The storms implicitly introduce new sectors, but there is no explicit "here's the new verb" moment for the player.

**Impact:** First-run players will not understand that they have entered a qualitatively new phase of the game. The engagement spike from "the game just taught me something new" (band transitions) is absent. Notably, the storm system partially replaces this (each storm brings a new sector type online — Research nodes for Insight, Coolant nodes for Heat venting), but there is no telegraphing that says "Research nodes now produce Insight: spend it in the Tech Tree."

**Fix:** Add 3–5 storm-milestone log messages in `storms.js` `bringSectorOnline()` or `resolveStorm()` that describe what the new nodes do. This is simpler than full band bells and fits the storm-based structure that was built. Effort: ~8 lines.

**Severity: MEDIUM — first-run onboarding gap; each storm win is a key engagement reset.**

---

### Issue 7 — `content.js` `nodeRows` export is dead stub data [LOW]
**What's wrong:** `content.js:1–6` exports `nodeRows` with hardcoded entries for C1 ("Core Kernel"), M2 ("Memory Shard B"), P1 ("Process Node A"), F1 ("Frontier Ext A"). These names ("Memory Shard B", "Process Node A") predate the node topology rewrite; M2 is now "Mid Relay 2", P1 is "Production 1". The export is not consumed by any live code path (only `entropyTreeText` is called), but it is dead/wrong data.

**Fix:** Delete `nodeRows` from `content.js`, or replace with `export { NODES as nodeRows } from "./nodes.js"`. Effort: 1 line.

**Severity: LOW — dead code; harmless but confusing.**

---

### Issue 8 — Boss economic gate checks `totalStatesEarned` but burn consumes `state.states` [LOW-MEDIUM]
**What's wrong:** `getBossLockState()` in `boss.js:111` gates on `totalStatesEarned >= STATES_REQUIRED (300)`. But the Heat Death burn (`burn.js`) drains from `state.states` (current in-hand States), not from the cumulative total. A player who earned 300 States cumulative but spent 270 on tech and structures has ~30 in hand and cannot survive the burn (which costs ~255–275). The gate hint says "bank deeper reserves: X/300 States earned" — "reserves" implies in-hand, but the gate checks cumulative.

**Fix:** Consider a parallel gate: `state.states >= BURN_ESTIMATE (240)` where `BURN_ESTIMATE` is the expected burn total without stabilizers. Or add to the hint: "earned total (spend carefully — the burn costs your current reserves, not your lifetime)". The existing test in `boss.test.mjs` already demonstrates this gap (states=50, totalEarned=600 → gate passes, burn fails, not defeated) — which is correct behavior, but the gate message is misleading.

**Severity: LOW-MEDIUM — confusing UX, not a correctness bug; the burn correctly reflects actual reserves.**

---

## Top Opportunities

### Opportunity 1 — Add the High-Load toggle (highest-ROI action in round 4)
This is already fully built in `engine.js`. Adding ~10 lines of UI to `paint.js` and `renderer.js` activates the RISK-TOGGLE verb that the design identified as the third core mechanic. It would immediately deepen the engagement from cycle 11 onward with zero engine risk (the engine path is tested). This is the single most impactful action for round 4.

### Opportunity 2 — Add cascade stress indicator to node cards
3 lines: one in `paint.js` nodeCard, one CSS rule. Turns the cascade mechanic from invisible to legible. Every player who has had a cascade spiral will immediately understand why. High signal-to-effort ratio.

### Opportunity 3 — The 3-act storm structure is richer than the 6-band design
The built game has a better expansion arc than the research.md's cycle-band system. Cascade Storms are genuine mid-bosses with multi-cycle scripted damage, variable duration, survival conditions (cores alive), and sector-unlock rewards. This is closer to Frostpunk's countdown events than the band system. The round-4 eval should recognize this as a genuine design improvement and not force it back to the band model. The opportunity is to complete it — add band intro messages keyed to storm wins, not cycle numbers.

### Opportunity 4 — Entropy threshold events (Band 5 SUPPRESS)
~20 lines in `engine.js`, gated at cycle >= 23. Would add the last major missing verb (second-order entropy management). Combined with the existing `state.entropy` display, this would make the entropy readout load-bearing rather than cosmetic.

### Opportunity 5 — Glitch CSS animation
~30 lines CSS + 10 lines JS. Zero engine complexity. The visual payoff is high — a field at 80% entropy twitching with glitch-shift animation makes entropy feel threatening in a way no HUD number can. This is the cheapest atmospheric upgrade available.

---

## Overall Verdict

**Score: 7.4 / 10.**

This is a real game. The cycle engine, cascade topology, Heat axis, three Cascade Storm mid-bosses, 12-tech tree, placeable structures, Microstate Collapse prestige, and deterministic 4-gated Heat Death boss represent a substantial, working survival resource management sim. The boss bypass that motivated this round has been fully closed. The technical quality (test coverage, module separation, LOC discipline, determinism) is excellent.

The gap between 7.4 and 9.0 is almost entirely in the UI layer, not the engine. Three implemented mechanics have no player-facing affordances: High-Load toggle, node Stabilizer application, and cascade stress display. These are engines running in the dark. The SUPPRESS verb (entropy threshold cascades) and the glitch aesthetic (entropy-level CSS) are the two most significant design-complete gaps. The band announcement system is the onboarding debt.

**Single most important round-4 action:** Add the High-Load mode toggle button per eligible node in `paint.js` and wire it in `renderer.js`. It is the highest-leverage UI change — one already-built, tested, and engine-integrated mechanic, inaccessible only for lack of a button. It unlocks the RISK-TOGGLE verb, directly addresses the 7/10 fun score, and requires fewer than 15 lines of change.

---

## Test Results

```
node --test docs/games/metagame/stages/stage8/tests/*.test.mjs
✔ boss.test.mjs       (63ms)
✔ burn.test.mjs       (61ms)
✔ engine.test.mjs     (59ms)
✔ events.test.mjs     (57ms)
✔ heat.test.mjs       (56ms)
✔ nodes.test.mjs      (55ms)
✔ prestige.test.mjs   (54ms)
✔ resources.test.mjs  (52ms)
✔ solver.test.mjs     (52ms)
✔ state.test.mjs      (50ms)
✔ storms.test.mjs     (48ms)
✔ structures.test.mjs (46ms)
✔ tech.test.mjs       (63ms)

13 tests, 13 pass, 0 fail. Duration: 92ms.
```
