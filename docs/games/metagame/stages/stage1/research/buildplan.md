# Stage 1 — Bit Foundry: Expansion Build Plan

> **Starting point:** Stage 1 is a fully built, tuned idle-clicker (7 tiers, managers, Gravitational
> Pull prestige, Defragmenter boss with cheat-edit un-cheat). This plan defines the NEXT layer:
> ordered expansions that introduce one new mechanic per prestige depth. The core loop is not
> rebuilt. Every increment below is a self-contained unit that passes before the next starts.
>
> **Gate:** every increment ends with `node scripts/gen-metagame-bundles.mjs` (to rebuild
> `stage.generated.js`) + `node tests/smoke-area.mjs games` (the smoke check).
> After all increments in a phase, run `./scripts/check.sh --fast` before pushing.

---

## Priority table — do these first

| # | Increment | Why first | Effort | Prerequisite |
|---|-----------|-----------|--------|-------------|
| 1 | **I0 — prestigeDepth helper** | Foundation for every expansion gate; 5-minute change | S | none |
| 2 | **P1 — Pipeline panel + state** | The first thing a player hits after prestige 1; gating proof of concept | M | I0 |
| 3 | **P2 — Pipeline tick hook** | Completes Pipeline; first new verb is now playable end-to-end | S | P1 |
| 4 | **F1–F3 — Flux complete** | Second expansion; direct engagement mechanic, highest mid-game impact | M | I0 |

Echoes (Phase 4) and Resonance (Phase 5) are depth-4 and depth-5 content; most players won't
reach them in a first session. Build them after Pipeline + Flux are playable and smoke-tested.

---

## Boss un-cheat: non-bypass guarantee

The Defragmenter is mechanically unwinnable with `CHEAT=true` in `Overwriter.frag`. The boss
reads the cheat status from the metagame **actions store** (`ctx.actions.hasAction(1, 'cheat_disabled')`
in `boss1.js::readCheat`), which is **not stage state**: it lives in the metagame orchestrator's
persistent store, is set only by `maybeSetCheatDisabledAction` in `cheat.js` (called when the
viewer parses the edited Overwriter.frag file in Monaco), and is **never touched by prestige**
(`s1reset.js::doReset` does not clear actions). The cheat flag is latched at the START of each
fight (`startFight()` in `boss1.js`), so mid-fight edits don't help.

**Guarantee:** no expansion mechanic in this plan creates an alternate win path. Pipeline,
Flux, Entropy, Echoes, and Resonance all operate in the grind phase (before the boss arena).
The only path to defeating the Defragmenter remains:
1. Reach bossTicket bits (1e54).
2. Edit `Overwriter.frag` in Monaco and set `CHEAT=false`.
3. Win the fair click contest.

**One hardening task (Increment I1)** adds an explicit invariant comment to `boss1.js::readCheat`
and verifies that the action key (`'1.cheat_disabled'`) matches `stageMeta.requiredAction` in
`index.js`. This is a documentation+assertion-only change, not a behavior change.

---

## Phase 0 — Prestige depth infrastructure

All expansion mechanics are gated on `state.pullFactors.length >= N`. This phase adds the helper
and verifies the normalizeState contract so expansion state fields persist correctly.

### Increment I0 — prestigeDepth helper (S)

**Goal:** A single exported helper that all expansion modules use as their gate; prevent
accidentally hardcoding `pullFactors.length` in six places.

**File:** `s1economy.js` (357 LOC; this adds 4 lines, stays under 370).

**What to build:**
- Export `function prestigeDepth(state)` returning `(state.pullFactors || []).length`. Pure, no
  side effects. Used in all expansion guards: `if (prestigeDepth(state) < 1) return;`.
- No other changes in this increment.

**Test:** unit-test: `prestigeDepth({ pullFactors: [] }) === 0`,
`prestigeDepth({ pullFactors: [2, 2.1] }) === 2`. Then `node tests/smoke-area.mjs games`.

---

### Increment I1 — un-cheat invariant + normalizeState audit (S)

**Goal:** Document that cheat action is metagame-layer-only (not stage state) and add a
code-level assertion that `stageMeta.requiredAction === '1.cheat_disabled'` matches the key used
in `boss1.js::readCheat`. Audit `normalizeState` to confirm `delete target.defeated` and
`delete target.achievements` are correct (both are managed by the orchestrator layer, not stage
state — document this with a comment).

**Files:** `boss1.js` (490 LOC — add comment block only), `state.js` (58 LOC — add comment),
`index.js` (80 LOC — add 1-line assertion).

**What to build:**
- In `boss1.js::readCheat`, add a comment block: "The cheat flag lives in the metagame actions
  store, not stage state. It is set only by maybeSetCheatDisabledAction (cheat.js) when Monaco
  parses Overwriter.frag with CHEAT=false. No expansion mechanic touches this path."
- In `state.js::normalizeState`, add comment before the delete block: "achievements and defeated
  are managed by the metagame orchestrator (ctx.achievements API, ctx.onStageComplete). They are
  removed here so stale in-state copies don't shadow the orchestrator's authoritative records."
- In `index.js`, add: `const _reqAction = stageMeta.requiredAction; void _reqAction;` with a
  comment naming the cross-reference (readable, not a runtime assertion).

**Test:** `node tests/smoke-area.mjs games` (no behavior change, smoke confirms no regression).

---

## Phase 1 — Pipeline (prestige depth >= 1)

**New verb: ROUTE.** After the first prestige, a Signal Router panel appears in the Managers tab.
The player draws directed ASCII "wires" between timed tiers; when the source tier completes, the
downstream tier auto-queues immediately (no manager required). Managers still speed individual
tiers; pipelines chain them sequentially.

### Increment P1 — Pipeline state + panel (M)

**Goal:** Add pipeline state fields and render the Signal Router panel; wires can be drawn/removed
but have no tick-loop effect yet (that is P2).

**Files (create):** `s1pipeline.js` (~220 LOC).
**Files (edit):** `state.js` (+12 LOC), `s1reset.js` (+5 LOC), `stage1.js` (+8 LOC for tab wiring).

**What to build:**

`state.js`:
- Add `pipeline: []` to `defaultState()` — array of `[srcId, dstId]` string pairs.
- In `normalizeState`, add: `target.pipeline = Array.isArray(target.pipeline) ? target.pipeline : [];`.
- **Pipeline is a per-run decision and RESETS on prestige.** Already covered: `doReset` in
  `s1reset.js` does not explicitly list pipeline... add `state.pipeline = [];` to doReset alongside
  the other per-run clears.

`s1pipeline.js` — new module:
- `PIPELINE_MAX = 2` (only 2 wires allowed; raise at higher prestige depth in a later increment).
- `WIRE_COST(srcTier)` — one-time bit cost to connect: `mulScalar(srcTier.base, 100)` (100× the
  tier's base cost). Returns BigNum.
- `canConnect(state, srcId, dstId, cfg)` — pure: returns `{ ok, reason }`. Rules: src must be a
  timed tier, dst must be a timed tier, src !== dst, no duplicate wire, no cycle (dstId not already
  src of another wire pointing back to srcId), player can afford WIRE_COST.
- `connect(state, srcId, dstId, cfg, save)` — spends bits, pushes `[srcId, dstId]` to
  `state.pipeline`, calls save.
- `disconnect(state, srcId, save)` — removes all wires where src === srcId, calls save.
- `renderPipelinePanel(panelsEl, state, cfg, tiers, save)` — render function. Shows only when
  `prestigeDepth(state) >= 1`. Draws the three timed tiers as ASCII node labels with `→` arrows
  for active wires. Below: two "Connect" rows (src selector → dst selector → cost button) and a
  "Remove" button per active wire. Uses `s1dom.js::setHtml` for dirty-checking. Delegate clicks
  via `bindActivate`.
- Export `{ renderPipelinePanel, connect, disconnect, canConnect, PIPELINE_MAX, WIRE_COST }`.

`stage1.js`:
- Import `renderPipelinePanel` from `./s1pipeline.js`.
- Add `'pipeline': () => prestigeDepth(state) >= 1` to `tabVisible` (new tab key).
- Add `'🔗 Pipeline'` to `TAB_LABELS`.
- Add `pipeline` branch in `renderPanel()`.
- The Managers tab already has a `createManagersController`; Pipeline is a separate tab (not
  inside Managers) so the tab framework handles isolation cleanly.

**Test:** unit-test `canConnect` edge cases (cycle prevention, max-2 enforcement, affordable check).
Render-smoke: open stage1, prestige once (use debug menu or force `state.pullFactors = [2]` in
localStorage), confirm Pipeline tab appears and wires can be drawn/removed. `node tests/smoke-area.mjs games`.

---

### Increment P2 — Pipeline tick hook (S)

**Goal:** Make wires actually do something: when a timed tier completes, check if there is a
downstream wire and auto-queue the target.

**File:** `stage1.js` (+10 LOC in the tick loop).

**What to build:**
- Import `{ connect, disconnect }` not needed here; only need the pipeline adjacency lookup.
- After the `timedDone` block in the tick loop (the section that checks `ts.active` and fires
  payouts), add: for each completed tierId, look up `state.pipeline` for any `[srcId, dstId]`
  where `srcId === tierId`. If found, and the dst tier is not already active, auto-start the dst
  tier cycle (set `state.timedStates[dstId] = { active: true, startedAt: now, duration_ms: t.duration_ms }`).
  A manager already covering the dst tier will re-auto-fire it after its own interval anyway, so
  pipeline auto-queues only if the dst is idle. No double-start guard: check `!ts || !ts.active`
  before starting.
- Note: pipeline auto-queue is event-driven (fires once per completion), not tick-driven. Zero
  steady-state cost.

**Test:** unit-test the adjacency lookup (pure function extracted to s1pipeline.js as
`pipelineDownstream(state, srcId)`). Manual: wire Bit Box → Signal Booster; confirm Signal
Booster starts automatically on Bit Box completion. `node tests/smoke-area.mjs games`.

---

### Increment P3 — Pipeline bell hint + prestige message (S)

**Goal:** The player learns Pipeline exists via the bell, not via inspection of a tab that appears
silently.

**File:** `messages1.js` (84 LOC, adds ~10 lines).

**What to build:**
- Add a message: trigger `'prestige'` event with `pullFactors.length === 1`, text:
  "signal routing unlocked. the Router tab lets you wire completions so one cycle starts the next.
  a first wire costs some bits — once drawn, it fires for free."
- This fires in `checkMessages('prestige', ...)` after the first prestige, in the existing bell
  pipeline.

**Test:** prestige once; confirm bell notification appears. `node tests/smoke-area.mjs games`.

---

## Phase 2 — Flux meter (prestige depth >= 2)

**New verb: RIDE vs. DRAIN.** After the second prestige, a narrow Flux bar appears in the stats
panel. Timed payouts charge flux (0.01 per bit produced, passive rate excluded). At 100%, an
auto-release fires a 3x burst for 5 seconds but pauses managers for 2 seconds. Manual drain at
any point: spend 50% flux for a 1.5x burst lasting 2 seconds, no manager pause.

### Increment F1 — Flux state + economy hook (S)

**Goal:** Add flux state fields and the accumulation math as a pure function.

**Files:** `state.js` (+8 LOC), `s1reset.js` (+3 LOC), `s1economy.js` (+25 LOC).

**What to build:**

`state.js`:
- Add `flux: 0`, `fluxReleasing: false` to `defaultState()`.
- In `normalizeState`: `target.flux = Number.isFinite(target.flux) ? target.flux : 0;`
  `target.fluxReleasing = Boolean(target.fluxReleasing);`.
- In `s1reset.js::doReset`, add `state.flux = 0; state.fluxReleasing = false;`.

`s1economy.js`:
- Export `FLUX_PER_BIT = 0.01` (tuning constant — one place to change).
- Export `function accrueFlux(state, timedPayoutBits)` — pure: returns updated flux value (capped
  at 100). Only call when `prestigeDepth(state) >= 2`. Takes the numeric payout from one timed
  completion: `Math.min(100, state.flux + timedPayoutBits * FLUX_PER_BIT)`. Returns a number,
  does not mutate state (caller assigns).
- Export `function fluxBurstMult(releasing)` — returns 3 if releasing, 1 otherwise. Placeholder
  for the tick-loop to use when computing payouts during a burst.

**Test:** unit-test `accrueFlux` boundary: `accrueFlux({ flux: 99, pullFactors:[2,2] }, 200) === 100`
(caps at 100). `node tests/smoke-area.mjs games`.

---

### Increment F2 — Flux tick + burst logic (M)

**Goal:** Wire flux accumulation into the tick loop and implement the full RIDE vs. DRAIN burst
lifecycle.

**File:** `stage1.js` (+35 LOC in tick loop + imports).
**File (create):** `s1flux.js` (~170 LOC).

**What to build:**

`stage1.js` tick loop:
- After timed completions block, call `accrueFlux` for each payout that fired this tick and
  assign back to `state.flux`. Only when `prestigeDepth(state) >= 2`.
- Auto-release check: if `!state.fluxReleasing && state.flux >= 100`, set
  `state.fluxReleasing = true`, store `state.fluxBurstEnd = now + 5000`,
  `state.fluxPauseEnd = now + 2000`. Pause all managers: iterate `state.managers` and set each
  `ms.paused = true` (manager auto-fire loop will un-pause after 2s).
- During burst: apply `fluxBurstMult(state.fluxReleasing)` to timed payouts in this tick (pass
  as a multiplier into the payout calculation or multiply the result before adding to bits).
- Burst expiry: when `now >= state.fluxBurstEnd`, reset `state.fluxReleasing = false`,
  `state.flux = 0`. Un-pause managers (set `ms.paused = false` for all that were paused by flux,
  not by the broke-bits rule — use a separate flag `ms.fluxPaused` to distinguish).
- Manager un-pause after 2s: check `now >= state.fluxPauseEnd`; un-pause only the managers that
  were paused by flux (not those already paused by the broke-bits rule).

`s1flux.js` — new module:
- `renderFluxBar(statsEl, state)` — injects or updates a `<div class="mg-s1-flux-wrap">` inside
  the stats panel. Shows: a narrow bar (CSS width = `state.flux`%), a label "Flux: N%", and when
  `prestigeDepth(state) >= 2`: a "Drain (−50%)" button (enabled only when `state.flux >= 25`).
  Uses guarded writes via `setText`/`setClass`. Returns the drain button element for event wiring.
- `drainFlux(state, cfg)` — mutates state: if `state.flux >= 25 && !state.fluxReleasing`, set
  `state.fluxBurstEnd = now + 2000`, `state.fluxReleasing = true`, set
  `state.flux = state.flux * 0.5` (consume 50%), start a 2s burst with multiplier 1.5 (NOT 3),
  no manager pause. Different constant from the auto-release — wire this via a `flux_drain_mult`
  parameter or a second boolean `state.fluxDraining`.
- Export `{ renderFluxBar, drainFlux }`.

Wiring in `stage1.js`:
- Import `{ renderFluxBar, drainFlux }` from `./s1flux.js`.
- In `paintStats()`, call `renderFluxBar(statsEl, state)` at the end (only when `prestigeDepth >= 2`).
- Wire the drain button's click → `drainFlux(state, cfg); save(state);`.

**Test:** manual: prestige twice (force via debug or localStorage), run timed cycles until flux
reaches 50%, hit Drain, confirm 1.5x burst fires for 2s without manager pause. Let flux reach 100%,
confirm 3x burst fires and managers pause briefly. `node tests/smoke-area.mjs games`.

---

### Increment F3 — Flux bell hint + visual polish (S)

**Goal:** Inform the player about flux on second prestige, add visual burst glow.

**Files:** `messages1.js` (+12 LOC), `docs/assets/games.css` (+10 LOC).

**What to build:**
- Message: trigger `'prestige'` with `pullFactors.length === 2`, text:
  "flux meter active. timed payouts charge it. at 100% it auto-releases: 3x burst, 2-second
  manager pause. drain manually at 50%+ for a smaller safe burst. riding to 100% pays more — if
  you can afford the pause."
- `games.css`: `.mg-s1-flux-full { box-shadow: 0 0 8px #e8c33988; }` on the flux bar container
  when flux >= 80 (CSS class toggled in `renderFluxBar`). Subtle amber glow as warning before auto.

**Test:** prestige twice; confirm bell fires. `node tests/smoke-area.mjs games`.

---

## Phase 3 — Entropy (prestige depth >= 3)

**New verb: MAINTAIN.** After the third prestige, every 60 seconds the lowest-owned unmanaged tier
loses 1 unit (min 1). Managers now prevent decay, not just speed up cycles.

### Increment E1 — Entropy state + pure logic (S)

**Goal:** Add entropy state and a pure decay function — no tick wiring yet.

**Files:** `state.js` (+5 LOC), `s1reset.js` (+2 LOC).
**File (create):** `s1entropy.js` (~100 LOC).

**What to build:**

`state.js`:
- Add `lastDecayTick: 0` to `defaultState()`. In `normalizeState`:
  `target.lastDecayTick = Number.isFinite(target.lastDecayTick) ? target.lastDecayTick : 0;`.
- `s1reset.js::doReset`: add `state.lastDecayTick = 0;`.

`s1entropy.js` — new module:
- `DECAY_INTERVAL_MS = 60000` (one constant to tune).
- `decayTarget(state, cfg)` — pure: returns the tierId (or null) that would decay this tick.
  Algorithm: among all tiers that are `type !== 'passive'`, `owned[tierId] >= 2`, and have no
  hired manager (manager level === 0 or manager paused): pick the one with the lowest `owned` count.
  If tied, pick the one that appears first in `cfg.tiers` (deterministic). Returns `null` if no
  tier qualifies (all managed, or all at owned=1).
- `tickEntropy(state, cfg, now)` — pure: if `prestigeDepth(state) < 3` or `now - state.lastDecayTick < DECAY_INTERVAL_MS`, returns `null`. Otherwise: finds `decayTarget`, decrements `state.owned[id]` by 1, sets `state.lastDecayTick = now`, returns `{ decayed: id, newCount: state.owned[id] }` or `null` if no target.
- Export `{ tickEntropy, decayTarget, DECAY_INTERVAL_MS }`.

**Test:** unit-test `decayTarget` with a mock state (manager hired vs. not, various owned counts,
minimum-1 guard). Unit-test `tickEntropy` with `now - lastDecayTick < DECAY_INTERVAL_MS` (should
return null) and `>= DECAY_INTERVAL_MS` (should decrement). `node tests/smoke-area.mjs games`.

---

### Increment E2 — Entropy tick wiring + visual feedback (S)

**Goal:** Wire entropy into the main tick loop and show a decay indicator on the shop row.

**Files:** `stage1.js` (+12 LOC), `s1shop.js` (+8 LOC in paintShop).

**What to build:**

`stage1.js` tick loop:
- Import `tickEntropy` from `./s1entropy.js`.
- After the builder-unit block, call `const decay = tickEntropy(state, cfg, Date.now())`.
- If `decay !== null`: call `save(state)`, add a bell line ("a tier decayed — check which one."),
  call `paintShop()` to update the row counts.

`s1shop.js::paintShop`:
- Import `{ decayTarget }` from `./s1entropy.js`.
- In the tier-row paint loop, call `decayTarget(state, cfg)` once (returns the at-risk tier ID).
- Toggle class `mg-s1-decay-risk` on the tier row if `t.id === decayTargetId`. CSS for the class
  is a faint red left-border: add to `games.css`.

`docs/assets/games.css`:
- `.mg-s1-decay-risk { border-left: 3px solid #e0313188; }` — subtle, not alarming.

**Test:** force prestige depth 3 via localStorage (`pullFactors: [2,2.1,2.3]`), set
`lastDecayTick = 0`, confirm that after 60s (or lower `DECAY_INTERVAL_MS` in test) the lowest
unmanaged tier loses 1. Confirm bell fires. Confirm red indicator on at-risk tier.
`node tests/smoke-area.mjs games`.

---

### Increment E3 — Entropy bell hint (S)

**Goal:** Inform the player about entropy on third prestige.

**File:** `messages1.js` (+10 LOC).

**What to build:**
- Message: trigger `'prestige'` with `pullFactors.length === 3`, text:
  "hardware degrades without maintenance. once per minute, the least-managed tier loses a unit.
  managers prevent it. decide which tiers get covered — not all of them will."

**Test:** prestige 3 times; confirm bell fires. `node tests/smoke-area.mjs games`.

---

## Phase 4 — Defrag Echoes (prestige depth >= 4)

**New verb: VIGILANCE.** After the fourth prestige, a Defrag Echo spawns silently every 4-5
minutes (deterministic from `pullFactors.length`). A corrupted ASCII character appears in the
stats panel. Click it within 90 seconds to banish the echo with no penalty. Miss it and 20% of
passive income diverts until clicked.

### Increment D1 — Echo state + timer logic (M)

**Goal:** Add echo state fields and the spawn/expiry logic as a new module.

**Files:** `state.js` (+12 LOC), `s1reset.js` (+5 LOC).
**File (create):** `s1echoes.js` (~200 LOC).

**What to build:**

`state.js`:
- Add `echoActive: false`, `echoSpawnAt: 0`, `echoPenalty: 0`, `echoIndex: -1` to `defaultState()`.
- In `normalizeState`: normalize all four fields (isFinite for numbers, Boolean for bool).
- `s1reset.js::doReset`: reset all four.

`s1echoes.js` — new module:
- `ECHO_BASE_MS = 240000` (4 minutes) + deterministic jitter: `(state.pullFactors.length * 17) % 60000`.
  So each prestige depth gets a slightly different echo interval (never `Math.random`).
- `ECHO_EXPIRY_MS = 90000` (90 seconds to click before it sticks).
- `ECHO_PENALTY = 0.20` (20% passive income diversion per unaddressed echo, max 2 echoes = 40%).
- `spawnEcho(state, now)` — called when `prestigeDepth(state) >= 4` and `!state.echoActive`.
  Sets `state.echoActive = true`, `state.echoSpawnAt = now`, `state.echoIndex = echoCharIndex(state)`.
- `echoCharIndex(state)` — returns a deterministic character index (0-11) for the stats panel
  "corrupted character" position. Seed: `(state.pullFactors.length * 31 + state.echoPenalty * 7) % 12`.
  Never `Math.random`.
- `shouldSpawn(state, now)` — returns true when: `prestigeDepth(state) >= 4`, `!state.echoActive`,
  and `now - state.echoSpawnAt >= ECHO_BASE_MS + jitter`. Note: `echoSpawnAt` is repurposed as
  "last spawn time" when no echo is active.
- `tickEcho(state, now)` — call every tick. If echo is active and `now - state.echoSpawnAt > ECHO_EXPIRY_MS`:
  echo has expired unaddressed. Increment `state.echoPenalty` (max 2). Set `state.echoActive = true`
  (stays active — echo persists until clicked). Does NOT auto-dismiss. Returns `'expired'` or `null`.
- `catchEcho(state, now)` — called when player clicks the corrupted character. Clears
  `state.echoActive = false`, `state.echoSpawnAt = now` (restart spawn timer), returns
  `{ caught: true, wasPenalty: wasAlreadyExpired }`.
- `echoDiversionFactor(state)` — returns `state.echoPenalty * 0.20` (0, 0.20, or 0.40).
  Used by economy to reduce passive rate.
- Export `{ spawnEcho, shouldSpawn, tickEcho, catchEcho, echoDiversionFactor, echoCharIndex }`.

**Test:** unit-test `shouldSpawn` timing (before and after interval), `tickEcho` expiry, `catchEcho`
clears active flag, `echoDiversionFactor` at 0/1/2 penalties. `node tests/smoke-area.mjs games`.

---

### Increment D2 — Echo tick wiring + diversion + UI (M)

**Goal:** Wire echo into the tick loop, apply passive income diversion, and render the corrupted
character in the stats panel.

**Files:** `stage1.js` (+20 LOC), `s1economy.js` (+8 LOC), `s1shop.js` (+15 LOC in paintStats).
**File:** `docs/assets/games.css` (+8 LOC).

**What to build:**

`s1economy.js`:
- Modify `passiveRate(state, cfg)` signature: add optional `echoDiversion = 0` parameter (0–0.40).
  Multiply result by `(1 - echoDiversion)` before returning. All existing callers pass no argument
  (zero diversion, no behavior change). Only the tick loop passes the live diversion.
- Alternatively: add `effectivePassiveRate(state, cfg)` that calls `passiveRate` and applies
  `1 - echoDiversionFactor(state)`. Keep `passiveRate` pure for tests.

`stage1.js` tick loop:
- Import `{ shouldSpawn, spawnEcho, tickEcho, catchEcho, echoDiversionFactor }` from `./s1echoes.js`.
- Before passive accrual: if `shouldSpawn(state, now)`, call `spawnEcho(state, now)` and
  trigger a subtle bell ("…" or nothing — echo spawns silently; no bell on spawn).
- Call `tickEcho(state, now)`. If it returns `'expired'`, add bell line: "something is draining
  your signal. check the stats."
- Apply passive accrual with diversion: `mulScalar(fromNumber(passiveRate(state, cfg) * (1 - echoDiversionFactor(state))), 1/10)`.

`s1shop.js::paintStats` (the stats sub-section of the Bits tab):
- Import `{ echoDiversionFactor, echoCharIndex }` from `./s1echoes.js`.
- The stats panel renders a series of `<span>` elements for labels. When `state.echoActive`, add
  a specific `<span class="mg-s1-echo-char">` at position `state.echoIndex` in a fixed-layout stats
  line. The character inside is a block glyph (e.g. `▒`). Toggle class `mg-s1-echo-corrupted` on
  the span when active. Click handler on this span calls `catchEcho(state, now); save(state);`
  and adds bell line: "caught one."
- When echo is expired (penalty > 0 but still active): label shows dim amber `▒` instead of
  blinking; add a faint "signal leak: -N%" note next to passive rate.

`docs/assets/games.css`:
- `.mg-s1-echo-char { cursor: pointer; color: #e0742f; animation: mg-s1-echo-blink 1.8s ease infinite; }`
- `@keyframes mg-s1-echo-blink { 0%,100% { opacity:1; } 50% { opacity:0.2; } }`
- When penalty active (class `mg-s1-echo-stuck`): `animation: none; opacity: 0.55; color: #888;`.

**Test:** force prestige depth 4, set `echoSpawnAt` to a time that triggers spawn immediately.
Confirm character appears in stats. Click it: confirm echo dismissed, bell fires "caught one."
Let it expire: confirm penalty applies (passive rate drops ~20%). Click it: confirm penalty
clears, `echoPenalty` does NOT decrement (penalty is permanent per-run). Wait for next spawn.
`node tests/smoke-area.mjs games`.

---

### Increment D3 — Echo bell hint (S)

**Goal:** Inform the player about Defrag Echoes on fourth prestige.

**File:** `messages1.js` (+10 LOC).

**What to build:**
- Message: trigger `'prestige'` with `pullFactors.length === 4`, text:
  "the Defragmenter left something behind. watch the stats — if something looks wrong, click it.
  you have 90 seconds before it sticks."

**Test:** prestige 4 times; confirm bell fires. `node tests/smoke-area.mjs games`.

---

## Phase 5 — Resonance (prestige depth >= 5)

**New verb: DISCOVER.** After the fifth prestige, hidden tier-pair ratio bonuses activate. No
documentation. The only hint: a faint `~` character next to a tier name when it is in resonance.

### Increment R1 — Resonance check + economy hook (S)

**Goal:** Pure resonance logic + multiplier applied in timedPayout.

**File (create):** `s1resonance.js` (~80 LOC).
**File (edit):** `s1economy.js` (+15 LOC).

**What to build:**

`s1resonance.js` — new module:
- Hard-coded resonance windows (tuning constants, one place to change):
  ```js
  const RESONANCE_PAIRS = [
    { a: 's1-boost', b: 's1-box',     ratioMin: 1/4, ratioMax: 1/2, bonus: 0.30 },
    { a: 's1-cluster', b: 's1-boost', ratioMin: 1/3, ratioMax: 1/2, bonus: 0.20 },
    { a: 's1-neural',  b: 's1-quantum',ratioMin: 2,   ratioMax: 4,   bonus: 0.25 },
  ];
  ```
  Ratio = `owned[a] / owned[b]`. Resonance is active when ratio is in `[ratioMin, ratioMax]`.
- `checkResonance(state)` — pure: returns a `Set<tierId>` of all tier IDs currently in resonance.
  If `prestigeDepth(state) < 5`, returns an empty Set. For each pair: compute ratio, check
  window; if in window, add both tier IDs to the set.
- Export `{ checkResonance, RESONANCE_PAIRS }`.

`s1economy.js::timedPayout`:
- Import `{ checkResonance }` from `./s1resonance.js`.
- At the end of `timedPayout`, after computing the base output: check
  `checkResonance(state).has(tierId)`. If true, multiply output by `(1 + resonanceBonus)` where
  the bonus is the matching pair's `bonus` constant. The resonance set is computed once per
  `timedPayout` call (it's cheap — 3 ratio comparisons).

**Test:** unit-test `checkResonance` for each pair at ratioMin, ratioMax, outside window, and at
prestige depth < 5 (should return empty set). Unit-test that `timedPayout` returns higher value
when in resonance. `node tests/smoke-area.mjs games`.

---

### Increment R2 — Resonance "~" indicator in shop + bell hint (S)

**Goal:** Surface resonance to the player with a faint visual indicator; deliver the discovery hint
on fifth prestige.

**Files:** `s1shop.js` (+10 LOC in `paintShop`), `messages1.js` (+10 LOC),
`docs/assets/games.css` (+4 LOC).

**What to build:**

`s1shop.js::paintShop`:
- Import `{ checkResonance }` from `./s1resonance.js`.
- In the tier-row paint loop: call `checkResonance(state)` once; toggle class `mg-s1-resonant` on
  the tier name span when the tier ID is in the set. The class shows a `~` before the tier name
  (via CSS `::before`).
- Only compute/toggle when `prestigeDepth(state) >= 5`; otherwise the class is never set.

`docs/assets/games.css`:
- `.mg-s1-resonant::before { content: '~'; color: var(--fg-2); margin-right: 3px; opacity: 0.5; }`

`messages1.js`:
- Message: trigger `'prestige'` with `pullFactors.length === 5`, text:
  "some combinations hum. some don't."

**Test:** force prestige depth 5, set owned counts to hit Signal Booster:Bit Box ratio in [1:4, 1:2].
Confirm `~` appears next to both tiers. Adjust owned counts out of window. Confirm `~` disappears.
`node tests/smoke-area.mjs games`.

---

## Phase 6 — Integration hardening

### Increment H1 — Prestige reset: expansion state audit (S)

**Goal:** Confirm that all expansion state clears correctly on prestige and that global state
(`pullFactors`, `milestones`, `claimed`) are never wiped.

**File:** `s1reset.js` (audit-only unless gaps found).

**Checklist:**
- `state.pipeline = []` — ✓ added in P1.
- `state.flux = 0; state.fluxReleasing = false` — ✓ added in F1.
- `state.lastDecayTick = 0` — ✓ added in E1.
- `state.echoActive = false; state.echoSpawnAt = 0; state.echoPenalty = 0; state.echoIndex = -1`
  — ✓ added in D1.
- Resonance has no state (pure function of owned, which resets via `state.owned = {}`).
- `state.pullFactors` — NOT cleared (accumulates across prestiges — the whole point).
- `state.milestones` — NOT cleared.
- `state.claimed` — NOT cleared.
- `state.mgrBuyMult` — NOT cleared (UX convenience, persists across resets intentionally).

If any gap is found, add the missing clear to `doReset` and document it.

**Test:** prestige once from a state with pipeline wires drawn and flux at 70. After prestige:
confirm `pipeline = []`, `flux = 0`, `pullFactors.length === 1`. `node tests/smoke-area.mjs games`.

---

### Increment H2 — Help panel + achievements for expansion mechanics (S)

**Goal:** Update the in-game Help panel (stage1.js `HELP_SECTIONS`) and add at least one
achievement per new mechanic for engagement signaling.

**Files:** `stage1.js` (+5 LOC in HELP_SECTIONS), `achievements1.js` (+40 LOC).

**What to build:**

`stage1.js` `HELP_SECTIONS` — add conditional entries shown only at the right prestige depth:
- At depth >= 1: `['🔗 Pipeline', 'Wire timed tiers in the Pipeline tab: one cycle auto-queues the next.']`
- At depth >= 2: `['⚡ Flux', 'Timed payouts charge flux. At 100% it auto-releases a 3x burst (managers pause briefly). Drain early for 1.5x safely.']`
- At depth >= 3: `['⚠ Entropy', 'Unmanaged tiers lose 1 unit per minute (min 1). Managers prevent it.']`

Gate the section render with `if (prestigeDepth(state) >= N)` around each entry.

`achievements1.js` — add four achievements:
- `ach-pipeline-first`: condition = `state.pipeline.length >= 1`. Bell: "routed. signal flowing."
- `ach-flux-drain`: condition = check a flag `state.fluxDrains >= 1` (set in drainFlux). Bell: "controlled surge."
- `ach-echo-catch`: condition = check flag `state.echoCaught >= 1` (set in catchEcho). Bell: "caught one."
- `ach-resonance-find`: condition = `checkResonance(state).size >= 1`. Bell: "it hums."

Each achievement fires via the existing `checkAchievements` loop.

**Test:** trigger each condition manually. `node tests/smoke-area.mjs games`. Full check:
`./scripts/check.sh --fast`.

---

## File registry

| File | Status | Owns | Notes |
|------|--------|------|-------|
| `s1economy.js` | edit | core math | Add `prestigeDepth`, `accrueFlux`, `FLUX_PER_BIT`, resonance hook |
| `s1pipeline.js` | CREATE | Pipeline panel + logic | ~220 LOC target |
| `s1flux.js` | CREATE | Flux bar + drain | ~170 LOC target |
| `s1entropy.js` | CREATE | Entropy decay logic | ~100 LOC target |
| `s1echoes.js` | CREATE | Defrag Echoes | ~200 LOC target |
| `s1resonance.js` | CREATE | Resonance check | ~80 LOC target |
| `state.js` | edit | state shape | New fields per phase; keep under 120 LOC |
| `s1reset.js` | edit | prestige reset | Clear expansion state; keep under 60 LOC |
| `stage1.js` | edit | tick loop + tabs | Import/call each new module; watch 500 LOC cap (currently 411) |
| `s1shop.js` | edit | shop rows paint | Decay risk indicator, resonance "~", echo char |
| `messages1.js` | edit | bell messages | 5 prestige-event messages (one per depth 1–5) |
| `achievements1.js` | edit | achievements | 4 new achievements |
| `docs/assets/games.css` | edit | visual | Flux glow, decay indicator, echo char, resonance ~ |

---

## Guardrails

**Determinism:** all new mechanics are deterministic from state.
- Pipeline: pure adjacency array.
- Flux: pure function of timedPayout calls.
- Entropy: 60s fixed interval, `decayTarget` is deterministic order (lowest owned, first in cfg.tiers).
- Echoes: `ECHO_BASE_MS + (pullFactors.length * 17) % 60000` — never `Math.random`. Char index:
  `(pullFactors.length * 31 + echoPenalty * 7) % 12` — never `Math.random`.
- Resonance: pure ratio comparisons on state.owned.

**Tick budget:** each new mechanism adds at most one O(1) or O(n tiers) check per 100ms tick:
- Pipeline: event-driven (fires once per timed completion, not every tick).
- Flux: one addition + comparison per tick.
- Entropy: one 60s-gated comparison per tick.
- Echoes: one boolean check per tick.
- Resonance: computed only on shop paint (triggered by buy or tick-driven paintShop, not in the
  core tick body).

**LOC caps:** 300 soft / 500 hard. New files are each under 250 LOC. `stage1.js` is currently
411 LOC — the tick additions across all phases add ~75 LOC (estimates): total ~486, just under
the 500 hard cap. If it reaches 490, split the tick body into `s1tick.js`.

**Bundle regeneration:** after EVERY source edit, run:
```
node scripts/gen-metagame-bundles.mjs
```
Then run the smoke gate: `node tests/smoke-area.mjs games`. Stage and commit the regenerated
`stage.generated.js` with each increment. Do NOT commit source changes without regenerating.

**Expansion never bypasses boss:** verified in Increment I1. No expansion mechanic writes to the
actions store, modifies `stageMeta.requiredAction`, or alters `readCheat()`. Expansion state lives
entirely in game state, not in the metagame actions layer.
