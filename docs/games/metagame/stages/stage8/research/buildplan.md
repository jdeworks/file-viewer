# Stage 8 — Entropy Field: Actionable Build Plan

_Source: `research/research.md` (genre deep-dive + expansion arc design).
Design numbers from: `planning/stage8-02-our-game-design.md` (566-line spec — the ground truth for
all tuning). If any value in this plan conflicts with the spec, the spec wins._

---

## DO-FIRST: Priority Table

| Priority | Increment | Deliverable | Why first |
|----------|-----------|-------------|-----------|
| 1 | **A1** | `nodes.js` — 14-node topology | Every other file depends on the graph shape; nothing real can be built without it |
| 2 | **A2** | `state.js` rewrite | Replaces the hardcoded cycle-14/stub defaultState; prerequisite for engine + renderer |
| 3 | **A3** | `engine.js` — cycle advance | The beating heart: decay + income + debris creation; nothing cycles without it |
| 4 | **A4** | `renderer.js` Band 1 UI | Makes A1–A3 visible: node map + health bars + Advance Cycle button |

**C1 (boss gate recalibration) is a hard dependency on A3**. Do not attempt Phase D or E
without C1 in place — the un-cheat will still be bypassable.

---

## Contracts to Preserve (do not break)

- Root element class `stage8-entropy-field`; smoke test waits for this selector.
- `[data-action="archive"]` archives selected debris and records action `8.salvage_archived`.
- Drag-and-drop to `.s8-drop[data-drop-target="/entropy/active_archive/"]` also archives.
- `[data-action="boss"]` challenges Heat Death.
- Achievement `stage8.salvage_archived` fires on the FIRST successful archive.
- `onStageComplete({ stage: 8, defeated: true, btsPath })` called on boss defeat.
- `boss.js` function signatures (`archiveDebris`, `handleDebrisDrop`, `getBossLockState`,
  `recordHeatDeathAttempt`) stay importable from `index.js` re-exports.
- `tests/boss.test.mjs` must stay green after each increment.

---

## File Layout (300 LOC soft cap / 500 hard cap each)

### Existing files — extent of change

| File | Current LOC | Plan | Notes |
|------|-------------|------|-------|
| `state.js` | 67 | **Full rewrite** | New defaultState: cycle 1, 14-node array, repair/stabilizer fields |
| `engine.js` | (new) | **New ~220 LOC** | Cycle advance, decay, cascade, income, debris creation |
| `nodes.js` | (new) | **New ~90 LOC** | 14-node topology data (pure data, no DOM, no side effects) |
| `rng.js` | (new) | **New ~45 LOC** | Copy xmur3+mulberry32 from `stage2/rng.js`; export `makeRng` |
| `events.js` | (new) | **New ~100 LOC** | Seeded event pool; per-cycle event selection + resolution |
| `boss.js` | 165 | **Extend ~+60 LOC** | Heat Death 10-cycle burn sequence; recalibrate gate |
| `renderer.js` | 170 | **Expand to ~280 LOC** | Node map, health bars, repair allocation UI, cycle phases |
| `repair.js` | (new if needed) | **New ~120 LOC** | Extract repair/terminal panel if `renderer.js` nears 300 |
| `content.js` | 18 | **Rewrite ~60 LOC** | Real 14-node tree text; per-band narrative snippets |
| `messages.js` | 29 | **Expand ~80 LOC** | Full bell catalog, band announcement strings, updated constants |
| `styles.css` | 76 | **Expand ~170 LOC** | Health bar widths, glitch CSS variable, zone color states |

### Module dependency order (build this order)
```
nodes.js  (pure data, no imports)
rng.js    (pure, no imports)
state.js  (imports nodes.js)
engine.js (imports nodes.js, rng.js)
events.js (imports nodes.js, rng.js)
boss.js   (imports messages.js — existing)
renderer.js (imports engine.js, boss.js, content.js, messages.js)
index.js  (imports renderer.js, state.js, boss.js, messages.js — unchanged shape)
```

---

## Phase A — Foundation (do-first; 4 increments)

### A1 — `nodes.js`: 14-node topology data (effort: S)

**Create** `stage8/nodes.js`.

Define and export `NODES` (array of 14 node objects) and `ADJACENCY` (Map<nodeId, nodeId[]>).

Node schema:
```js
{
  id: 'C1',          // string id
  name: 'Core Kernel',
  zone: 'core',      // 'core' | 'mid' | 'production' | 'frontier'
  tier: 1,           // 1-4 (core=1, mid=2, production=3, frontier=4)
  baseDecayPct: 3,   // % health lost per cycle at full health
  baseOutput: 10,    // States/cycle when active (health >= 60%)
  degradedOutput: 5, // States/cycle when degrading (health 1-59%)
  supportsHighLoad: false, // only production + frontier
  debrisTier: 1,     // controls debris value: tier1=8-24, tier2=24-48, tier3=48-64, tier4=64-88
}
```

Zone layout (14 nodes total):
- Core: C1 (Core Kernel), C2 (Secondary Core) — 2 nodes
- Mid: M1, M2, M3, M4 — 4 nodes
- Production: P1, P2, P3, P4 — 4 nodes
- Frontier: F1, F2, F3, F4 — 4 nodes

Adjacency (cascade propagates along these edges):
- Frontier → Mid: F1→M1, F2→M2, F3→M3, F4→M4
- Production → Mid: P1→M1, P2→M2, P3→M3, P4→M4
- Mid → Core: M1→C1, M2→C1, M3→C2, M4→C2
- Core: C1↔C2 (mutual)

Exact output values, decay rates, and adjacency weights must come from
`planning/stage8-02-our-game-design.md`. The schema above is the shape; the spec is the numbers.

**Test approach:** `node -e "import('./nodes.js').then(m => { console.assert(m.NODES.length === 14); console.assert(m.ADJACENCY.get('F1').includes('M1')); console.log('ok') })"` — no test file needed (pure data); add assertions to `tests/boss.test.mjs` or a new `tests/nodes.test.mjs`.

**Commit gate:** `node build/metagame/build.mjs` green; LOC < 100.

---

### A2 — `state.js` rewrite: cycle 1 start, 14-node array (effort: M)

**Rewrite** `stage8/state.js`.

`defaultState()` must return:
```js
{
  version: 2,
  cycle: 1,                     // start at cycle 1 (not 14)
  states: 0,                    // no starting States
  totalStatesEarned: 0,         // cumulative earned (drives boss gate)
  salvageTotal: 0,              // cumulative salvaged States (action gate)
  repairUnits: 12,              // per-cycle budget, reset each cycle (spec value)
  repairAllocations: {},        // { nodeId: unitsSpent } during preparation phase
  stabilizers: 0,               // inventory count
  stabilized: {},               // { nodeId: cyclesRemaining }
  highLoad: {},                 // { nodeId: true } for active High-Load nodes
  nodes: initNodes(),           // 14-node live state array (health, status, cascadeStress)
  debris: [],                   // no starter debris
  archive: [],
  phase: 'preparation',        // 'announcement' | 'preparation' | 'advancing' | 'summary'
  lastEvent: null,              // the current cycle's random event
  entropySink: 0,              // drain per cycle (grows with cycles)
  log: ['the field is online. something is already wrong.'],
  boss: {
    reached: false,
    defeated: false,
    attempts: 0,
    lockHintStep: 0,
    firstFailureRewound: false,
    burnCycle: 0,               // 0 = not in boss phase; 1-10 = Heat Death cycle
    burnStatesAtStart: 0,
  },
  meta: {
    firstClearComplete: false,
    btsAvailable: false,
    bandReached: 1,             // highest band the player has entered (1-6)
  }
}
```

`initNodes()` reads `NODES` from `nodes.js` and returns a live-state array:
```js
{ id, health: 100, status: 'active', cascadeStress: 0, highLoad: false, stabilizedFor: 0 }
```

`normalizeState()` must handle version migration: if `state.version < 2`, call `defaultState()` and return fresh (wipe old stub save, restart clean).

**Note:** `createDebris` signature is UNCHANGED — keep it; debris is now created by `engine.js` on node failure rather than pre-seeded.

**Test approach:** Unit test in `tests/boss.test.mjs` — import `defaultState`, assert `cycle===1`, `nodes.length===14`, `debris.length===0`, `states===0`.

**Commit gate:** existing boss.test.mjs suite still passes; build green.

---

### A3 — `engine.js`: cycle advance, decay, income, debris creation (effort: M)

**Create** `stage8/engine.js`.

Single export: `advanceCycle(state, rng)` — pure function, mutates state in place, returns `{income, newDebris, expiredDebris, newlyFailed, entropy}`. Takes an already-seeded `rng` from `rng.js` (so caller can seed deterministically).

Logic in order:
1. **Decrement stabilizers**: for each node in `state.stabilized`, decrement cycles; remove if 0.
2. **Apply decay**: for each node, if not stabilized:
   `node.health -= (baseDecayPct + node.cascadeStress) * (node.highLoad ? 1.5 : 1.0)`
   Clamp health to [0, 100].
3. **Apply repair allocations**: for each allocation in `state.repairAllocations`,
   `node.health += units * REPAIR_EFFICIENCY` (e.g. 3% per unit, spec-exact). Clamp to 100.
   Reset `state.repairAllocations = {}`.
4. **Transition node status**: active if health >= 60; degrading if 1–59; failed if 0.
5. **Detect newly failed**: nodes that transitioned to failed THIS cycle → create debris.
   `createDebris({ node: node.id, cycle: state.cycle, tier: node.tier, value: debrisValue(node, rng), decay: 2 })`
   Push to `state.debris`.
6. **Apply cascade stress**: for each failed node, increment `cascadeStress` on its ADJACENCY neighbors.
   Cascade stress decays by 1/cycle when the source node is repaired above 0.
7. **Expire debris**: decrement `item.decay` for each debris item; remove items where `decay <= 0`
   (log "node_X.sav decayed. States lost permanently.").
8. **Compute States income**:
   - `entropySink = Math.floor(state.cycle / 3)` (grows over time)
   - `income = sum(activeOutput) + sum(degradedOutput * 0.5) - entropySink`
   - Clamp income to 0 (never negative in a single cycle, but entropy can overwhelm later cycles).
   - `state.states += income`; `state.totalStatesEarned += Math.max(0, income)`.
9. **Compute entropy %**: see formula in `messages.js` constant `ENTROPY_FORMULA` or compute inline:
   `entropy = clamp((failedCount * 10 + degradingCount * 4) / 100, 0, 100)` (values from spec).
10. **Reset repair budget**: `state.repairUnits = BASE_REPAIR_UNITS_PER_CYCLE` (spec value).
11. **Increment cycle**: `state.cycle += 1`.
12. **Update band reached**: if `state.cycle >= BAND_THRESHOLDS[n]`, set `state.meta.bandReached`.

Export also: `applyRepair(state, nodeId, units)` — spends from `state.repairUnits`, records in
`state.repairAllocations`; validates budget (no overspend); returns `{ok, reason}`.

Export also: `applyStabilizer(state, nodeId)` — spends 1 stabilizer from inventory, sets
`state.stabilized[nodeId] = 2`; validates inventory > 0.

Export also: `toggleHighLoad(state, nodeId)` — toggles `state.highLoad[nodeId]`; only for nodes
where `supportsHighLoad === true`; returns `{ok, reason}`.

**Determinism rule:** `advanceCycle` takes `rng` as a parameter. The caller in `renderer.js`
seeds it: `makeRng(\`8:${state.cycle}\`)` before calling `advanceCycle`. Never call `Math.random()`
or `Date.now()` inside `engine.js`.

**Test approach:** New `tests/engine.test.mjs`:
```
- advanceCycle from all-100% state → health decremented on all nodes
- applyRepair spends budget, increases health
- applyRepair over-budget → ok:false
- failed node creates debris
- cascade stress increments neighbor health loss
- same cycle + same state → same debris (determinism)
```
Run: `node tests/engine.test.mjs`.

**Commit gate:** engine tests pass; LOC < 230; build green.

---

### A4 — `renderer.js` Band 1 UI: node map + repair allocation + Advance Cycle (effort: M)

**Rewrite** `stage8/renderer.js` substantially.

The existing renderer has the outer shell (HUD, log, drop target, boss section). Expand it to add:

**Node map panel** (`.s8-map`): render 14 nodes from `state.nodes`. Per node:
```
[C1] Core Kernel  ████████░░  84%  active  +10
```
Health bar: use CSS `width: ${health}%` on a `.s8-bar-fill` div inside `.s8-bar`. Color: green
(active), amber (degrading), red (failed). Show cascade stress indicator if `cascadeStress > 0`.
Show High-Load indicator if active. Show stabilized indicator if stabilized.

**HUD additions**: add `repairUnits`, `entropy%`, `cycle/35` to the existing HUD row.

**Preparation panel** (`.s8-prep`): input row per degrading/active node:
```
[C1 Core Kernel  84%]  Repair: [___] units  (budget left: 8)
```
Submit allocations button: "Lock Repairs" or make each increment immediate via `applyRepair`.
Keep it simple — a `<input type="number" min="0">` per node, with live budget tracking.

**Advance Cycle button** (`[data-action="advance"]`): calls `advanceCycle` with seeded RNG,
saves, repaints. Disable during boss phase.

**Summary panel**: after advance, briefly show (via `state.phase = 'summary'`) the cycle result:
income, nodes that degraded/failed, entropy change, debris created/expired.

**Phase display**: a small `.s8-phase` label showing current phase (Preparation / Summary /
Boss Phase).

**renderer.js LOC cap**: if the file approaches 280 LOC, extract the preparation panel HTML
builder into a new `repair.js` module. Do not exceed 300 LOC.

**Test approach:** `node tests/smoke-area.mjs games` — the smoke test still runs the old archive path
(unchanged in Phase A). Visually inspect the node map renders 14 nodes in the browser.

**Commit gate:** smoke area games passes; node map renders; LOC < 300; build green.

---

## Phase B — Real Mechanics (5 increments)

_Prerequisites: Phase A complete._

### B1 — Cascade stress (in `engine.js`): topology-aware decay (effort: S)

Cascade stress is already in `advanceCycle` (from A3 step 6 above), but this increment wires the
**visual feedback** and **rules**:

- A failed node sets `cascadeStress = TIER_STRESS_LEVELS[tier]` on each neighbor in `ADJACENCY`.
- Stress decays by 1/cycle when the source node recovers above 0 (i.e. any repair).
- Cascade stress is shown in the node map as `!(cascadeStress)` indicator.
- When `cascadeStress > 0`, the node's effective decay rate is shown in amber even if the node is active.

**Test approach:** `tests/engine.test.mjs` case: fail P1 manually, advance 1 cycle, assert M1's
effective decay rate is higher than baseline.

**Commit gate:** engine tests green; games smoke green; build green.

---

### B2 — Entropy % (in `engine.js` + `state.js` + `renderer.js`): weighted aggregate display (effort: S)

- `engine.js` `advanceCycle` already computes entropy. Store in `state.entropy` (add field to `state.js`).
- HUD displays entropy as `entropy: XX%`.
- Root element gets `data-entropy` attribute (integer 0–100) for CSS hooks.
- `styles.css`: add entropy-driven styles:
  ```css
  [data-entropy="high"] .s8-map { animation: glitch-shift 2s infinite; }
  ```
  Where "high" is ≥ 60. Use three buckets: normal (<40), elevated (40–59), high (≥60).

**Test approach:** Set a state with 8 failed nodes, call `advanceCycle`, assert `state.entropy >= 57`.

**Commit gate:** entropy displays in HUD; CSS class applied; games smoke green.

---

### B3 — High-Load Mode toggle (in `engine.js` + `renderer.js`): binary mode switch (effort: S)

- `toggleHighLoad(state, nodeId)` already exported from `engine.js` (A3).
- Wire it in `renderer.js`: add a toggle button `[data-action="high-load"][data-node-id="F1"]`
  per eligible node (production + frontier) in the preparation panel.
- Visual: `is-high-load` CSS class on the node row; amber border.
- High-Load state persists in `state.highLoad` across cycles (player sets once, stays until toggled off).

**Band gate**: High-Load nodes only appear/become toggleable at cycle 11+ (Band 3 activation).
In `renderer.js`, filter: `supportsHighLoad && state.cycle >= BAND_THRESHOLDS.band3`.

**Test approach:** `tests/engine.test.mjs` — toggle high load on F1, advance cycle, assert
F1's health decreased more than a non-high-load node of same tier.

**Commit gate:** toggle works; games smoke green; build green.

---

### B4 — Stabilizer mechanic + Upgrade Terminal (in `engine.js` + `renderer.js`): freeze + shop (effort: M)

**Stabilizer mechanics** (already in A3 `applyStabilizer`):
- Wire a "Stabilize" button per node in the prep panel.
- Costs 1 stabilizer from `state.stabilizers`; freezes node decay for 2 cycles.
- Stabilized nodes show a lock indicator.

**Upgrade Terminal** (new panel `.s8-terminal`):
- "Buy Repair Pack (+3 units this cycle): 20 States" — calls `buyRepairPack(state)` function
  (define inline in `renderer.js` or extract to `repair.js`).
- "Buy Stabilizer (1 unit): 30 States" — calls `buyStabilizer(state)`.
- Only available during preparation phase.
- Starting stabilizers: 0. Upgrade terminal is the only source.

**Band gate**: Upgrade Terminal panel only renders at cycle 6+ (Band 2 activation).

**Commit gate:** stabilizer freezes decay for 2 cycles (engine test); shop deducts States;
games smoke green.

---

### B5 — Debris decay timers (in `engine.js`): expire + bell warning (effort: S)

Already in `advanceCycle` (A3 step 7), but this increment adds the **expiry warnings** and
wires the bell:

- During `advanceCycle`: before decrementing timers, collect items where `decay === 1` (about to
  expire). After cycle summary, bell fires for each: `"${item.id} will decay next cycle. salvage it."`
- Items reaching `decay === 0` are permanently removed; log: `"${item.id} expired. States locked inside, lost."`
- Debris items with `decay === 1` get `is-expiring` CSS class in the file tree (red border).

**Critical**: `defaultState()` has NO starter debris. The first debris only appears when a node
actually fails during engine-driven gameplay.

**Test approach:** Create debris with `decay:1`, call `advanceCycle`, assert debris gone from
`state.debris`; assert bell message queued.

**Commit gate:** expiry works; no starter debris in fresh state; games smoke test must now play
enough cycles to produce real debris (see C2 for smoke test update).

---

## Phase C — Boss Hardening: Non-Bypassable Gate (2 increments)

_This is the most important architectural change. Do immediately after Phase B._

### C1 — Boss gate recalibration: `boss.js` + `messages.js` (effort: M)

**The problem with the current gate**: `SALVAGE_REQUIRED = 72` and the game starts with 72 States
of pre-seeded debris. Archive twice → win. This must become non-bypassable.

**The new gate** has TWO parts:

**Part 1 — Action gate (unchanged in mechanism, changed in difficulty)**:
`hasSalvageArchived(actions)` checks that the player used drag-and-drop at LEAST ONCE during the
run. This is the feature-showcase check. Keep as-is.

**Part 2 — Economic gate (new, load-bearing)**:
The boss is not challengeable until the player has accumulated enough States IN HAND to survive
the Heat Death burn. `getBossLockState` adds:
```js
const heatDeathSurvivalCost = calcBurnTotal(); // sum of escalating burn: 17+19+...+35 = 260
const canSurvive = state.states >= heatDeathSurvivalCost;
```
AND: minimum cycle gate — boss cannot be challenged before cycle 34 (the run must complete its arc).
```js
const cycleReady = state.cycle >= MIN_BOSS_CYCLE; // 34 or spec value
const unlocked = actionReady && canSurvive && cycleReady;
```

**Update `SALVAGE_REQUIRED`** in `messages.js`: set to the real salvage gap (~70 States, exact
value from spec). The economic gate is the real lock; SALVAGE_REQUIRED is the hint threshold.

**Heat Death 10-cycle burn sequence** in `boss.js` `recordHeatDeathAttempt`:
- Set `state.boss.burnCycle = 1`, `state.boss.burnStatesAtStart = state.states`.
- Each "advance" during boss phase calls `advanceBossCycle(state)`:
  - `burnThisCycle = 15 + state.boss.burnCycle * 2` (17, 19, 21, 23, 25, 27, 29, 31, 33, 35).
  - Player may `useStabilizer(state)` to pause burn for 2 cycles (no burn those cycles).
  - `state.states -= burnThisCycle`. If `state.states < 0` → `recordHeatDeathFailure`.
  - `state.boss.burnCycle += 1`. If burnCycle > 10 → `state.boss.defeated = true`.
- The renderer must show a "boss phase" view: burn counter (cycle X/10), current burn rate, States
  remaining, Stabilizer-use button.

**How this makes it non-bypassable**: the only way to enter the boss with 260+ States is to have
salvaged debris throughout the run. The economic math: with zero salvage, ~190 States at cycle 34;
with full salvage (~70 States), ~260. The gap is unbridgeable without the drag-and-drop habit.
The minimum-cycle gate (cycle >= 34) prevents the player from bypassing by rushing.

**Update `rewindToWarningCheckpoint`**: on failure, rewind to cycle 29 (5 cycles before boss),
NOT an arbitrary checkpoint. Bell: the existing `failed` message is correct.

**Test approach**: Update `tests/boss.test.mjs`:
- Fresh state + archive 1 debris → `getBossLockState.unlocked === false` (cycle not ready, states insufficient).
- State at cycle 34 with states=260 + action recorded → `unlocked === true`.
- `advanceBossCycle` with states=100 after enough cycles → `defeated === false`.
- `advanceBossCycle` with states=280 through 10 cycles → `defeated === true`.

**Commit gate:** boss test suite passes; old trivial 2-click win no longer works.

---

### C2 — Smoke test update: `tests/areas/games.mjs` lines 734–749 (effort: S)

The current smoke test clicks archive twice then boss. With Phase C in place, this no longer works
(no starter debris, cycle gate, economic gate).

**Replace the stage 8 block** (lines 734–749) with:

1. Wait for `.stage8-entropy-field`.
2. Inject a near-complete game state via `page.evaluate`:
   ```js
   // Set stage8 state: cycle 33, states 195, 1 debris file ready (value 80), salvageTotal 180,
   // totalStatesEarned 4200, action 8.salvage_archived already set in actions.
   const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3') || '{}');
   save.stageStates = save.stageStates || {};
   save.stageStates[8] = {
     version: 2, cycle: 33, states: 195, totalStatesEarned: 4200, salvageTotal: 180,
     repairUnits: 12, stabilizers: 2, nodes: /* 14 nodes all at health 50 */,
     debris: [{ id: 'node_f1_cycle31.sav', node: 'f1', cycle: 31, tier: 4, value: 80, decay: 2,
                path: '/entropy/debris/node_f1_cycle31.sav' }],
     archive: [], phase: 'preparation', entropySink: 11, entropy: 42, log: [],
     boss: { reached: false, defeated: false, attempts: 0, lockHintStep: 0 },
     meta: { firstClearComplete: false, btsAvailable: false, bandReached: 4 }
   };
   save.actions = { ...(save.actions || {}), '8.salvage_archived': { source: 'internal-drag-drop' } };
   localStorage.setItem('fv:games:metagame:v3', JSON.stringify(save));
   ```
3. Reload the page (or trigger a repaint via the game API if available).
4. Re-wait for `.stage8-entropy-field`.
5. `page.click('[data-action="archive"]')` — archives the debris, states become 275 (195+80).
6. Advance to cycle 34: `page.click('[data-action="advance"]')`.
7. Wait for cycle to reach 34.
8. `page.click('[data-action="boss"]')`.
9. Advance through the boss: `page.click('[data-action="boss-advance"]')` × 10 (or
   wait for auto-resolve if boss fires automatically after clicking boss).
10. Wait for `save.defeated.includes(8) && save.unlockedStages.includes(9)`.

**Alternative (simpler)**: add a `[data-debug-action="skip-to-boss"]` button rendered ONLY
when `new URLSearchParams(location.search).has('debug')`. The smoke test navigates with `?debug=1`
and clicks this button to fast-forward state. This is the cleanest automation hook and mirrors
Stage 1's debug menu pattern. The button sets state to exactly: cycle 33, states 195, 1 debris.

Whichever approach is chosen, the test MUST NOT be passable without both the action gate and the
economic gate being satisfied. Document the approach in a comment in `games.mjs`.

**Commit gate:** `node tests/smoke-area.mjs games` passes end-to-end including stage 8.

---

## Phase D — Expansion Bands (4 increments)

_Prerequisites: Phases A–C complete._

### D1 — `rng.js` + `events.js`: seeded event system (effort: S)

**`rng.js`**: copy `stage2/rng.js` verbatim (xmur3 + mulberry32 + `makeRng`). No modifications.

**`events.js`**: define event pool and per-cycle resolution.

Event pool (from spec; expand as needed):
```js
const EVENTS = [
  { id: 'repair_grant',   weight: 20, desc: 'emergency repair units',    effect: repairGrant },
  { id: 'cascade_warn',   weight: 25, desc: 'instability detected',      effect: cascadeWarn },
  { id: 'node_burst',     weight: 15, desc: 'output surge this cycle',   effect: nodeBurst },
  { id: 'entropy_drain',  weight: 20, desc: 'entropy drain accelerated', effect: entropyDrain },
  { id: 'salvage_hint',   weight: 10, desc: 'debris detected',           effect: salvageHint },
  { id: 'quiet',          weight: 10, desc: '(no event this cycle)',      effect: null },
];
```

`selectEvent(cycle, rng)` — use weighted pick from the seeded RNG. The seed is `makeRng(\`8:${cycle}:event\`)`.

`applyEvent(event, state)` — mutates state. Called from `engine.js` `advanceCycle` step 0 (before
decay, after announcement phase).

Events must be announced one cycle before they fire (set `state.lastEvent = {id, resolveAtCycle: cycle+1}`
so the renderer can telegraph).

**Test approach:** `node -e` inline test: same cycle always picks same event; different cycles pick differently.

**Commit gate:** determinism test passes; build green.

---

### D2 — Entropy threshold cascades (in `engine.js`): Pattern Failure + Total Cascade (effort: S)

Add to `advanceCycle`, after entropy computation:

```js
if (state.entropy >= 80) {
  // Total Cascade: all currently degrading nodes lose 30 additional health
  triggerTotalCascade(state, rng);
  pushLog(state, 'total cascade. all degrading nodes destabilized.');
} else if (state.entropy >= 60) {
  // Pattern Failure: 2 random mid-zone nodes lose 15 health
  triggerPatternFailure(state, rng);
  pushLog(state, 'pattern failure. mid-zone instability.');
}
```

`triggerPatternFailure(state, rng)`: pick 2 from `{M1,M2,M3,M4}` using RNG (seeded from cycle),
apply -15 health.
`triggerTotalCascade(state, rng)`: all degrading nodes -30 health.

Bell messages for both events: add to `messages.js`.

**Band gate**: these events only fire at cycle 23+ (Band 5).

**Test approach:** `tests/engine.test.mjs` — set state with 8 failed nodes (entropy ≥ 60),
call `advanceCycle`, assert a mid-zone node lost extra health.

**Commit gate:** threshold tests pass; games smoke green.

---

### D3 — Band announcements + bell catalog (in `messages.js` + `content.js`): per-band bells (effort: S)

**`messages.js`**: add `BAND_THRESHOLDS` and `BAND_INTRO_BELLS`:
```js
export const BAND_THRESHOLDS = { band2: 6, band3: 11, band4: 17, band5: 23, band6: 29 };
export const BAND_INTRO_BELLS = {
  band2: 'the network is awake. topology matters now.',
  band3: 'frontier nodes online. risk is a temporal choice.',
  band4: 'debris is collecting. the wreckage does not wait.',
  band5: 'the field approaches threshold. one bad cycle cascades.',
  band6: 'the budget cannot hold everything. choose what survives.',
};
```

**`engine.js`** `advanceCycle`: after incrementing `state.cycle`, check if the new cycle crosses
a band threshold. If `state.meta.bandReached < newBand`, fire the band intro bell and update
`state.meta.bandReached`.

**`content.js`** `entropyTreeText(state)`: add a band status line at the top:
```
// cycle 17 — THE DEBRIS FIELD
```
Derive the band label from `state.meta.bandReached`.

**Test approach:** advance from cycle 5 to 6, assert bell queue contains the band2 intro message.

**Commit gate:** band bells fire on transition; games smoke green.

---

### D4 — Sacrifice zone visual: glitch CSS + zone abandonment feedback (effort: S)

**`styles.css`**: add CSS custom property approach:
```css
.stage8-entropy-field {
  --entropy-level: 0;  /* set via JS: root.style.setProperty('--entropy-level', pct/100) */
}
.s8-zone-frontier.is-fully-failed {
  filter: blur(0.3px);
  opacity: 0.45;
  border-color: #3d1a10;
}
.s8-node.is-failed {
  animation: glitch-shift calc(3s / (var(--entropy-level) + 0.1)) infinite;
}
@keyframes glitch-shift {
  0%, 95%   { transform: none; }
  96%       { transform: translateX(1px) skewX(-1deg); }
  98%       { transform: translateX(-2px); }
  100%      { transform: none; }
}
```

**`renderer.js`**: after each repaint, set `root.style.setProperty('--entropy-level', state.entropy / 100)`.
Group the 14 nodes into zone divs (`.s8-zone-core`, `.s8-zone-mid`, `.s8-zone-production`,
`.s8-zone-frontier`). A zone is `is-fully-failed` when ALL its nodes are in failed status.

**Visual intent**: at low entropy, glitch animation is very slow (barely noticeable); at 80%
entropy it runs at under 1s/cycle (visible static). The Core zone never gets the fully-failed
class if the player manages triage correctly.

**Test approach:** Set state entropy to 80, repaint, assert `--entropy-level` CSS variable is 0.8.
No automated DOM test needed; visually verify in the browser.

**Commit gate:** glitch scales with entropy; build green; games smoke green.

---

## Phase E — Polish + Ship (2 increments)

### E1 — Full Upgrade Terminal UI (in `renderer.js` or `repair.js`): shop panel (effort: S)

The terminal stub from B4 had buy-repair and buy-stabilizer. This increment completes it:

- Display current States, available purchases, costs.
- Disable purchase buttons if insufficient States.
- Add "Recalibrate Nodes" purchase (bulk-applies 1 unit to all active nodes at a discount) — a
  high-cycle quality-of-life option so the player doesn't need 14 individual inputs.
- Track purchases in `state.log` ("bought stabilizer. 30 States deducted.").

If `renderer.js` is approaching 300 LOC, extract the terminal panel builder into `repair.js`:
```js
export function buildTerminalPanel(state, onBuy) { /* returns DOM element */ }
```

**Test approach:** Click "Buy Stabilizer" → assert `state.stabilizers` incremented and `state.states`
decremented by 30. (Unit test in `tests/engine.test.mjs` or inline test.)

**Commit gate:** terminal functional; LOC caps respected; build green.

---

### E2 — Bundle regeneration + final audit (effort: S)

1. Run `node build/metagame/build.mjs` — regenerates `stage8/stage.generated.js`.
2. Run `./scripts/check.sh --fast` — fails if any generated file is stale; run generators, stage,
   re-run.
3. LOC audit: `wc -l docs/games/metagame/stages/stage8/*.js` — each file must be < 500 (hard cap),
   ideally < 300 (soft cap). If any source file exceeds 300, split it before this commit.
4. Run `node tests/smoke-area.mjs games` — must pass end to end.
5. Run `node tests/smoke-area.mjs games` a second time to confirm no state bleed.
6. Run unit tests: `node tests/stage8/boss.test.mjs` + `node tests/stage8/engine.test.mjs`
   (if created) + `node tests/stage8/nodes.test.mjs` (if created).
7. Stage all changed generated files (`git add stage8/stage.generated.js`) before commit.

**Commit gate:** ALL tests pass; no file over 500 LOC; generated file is fresh; `check.sh --fast` green.

---

## Increment Summary Table

| Phase | # | Increment | Files Created/Changed | Effort | Test |
|-------|---|-----------|----------------------|--------|------|
| A | 1 | nodes.js — 14-node topology | CREATE `nodes.js` | S | inline assert, `engine.test.mjs` |
| A | 2 | state.js rewrite — cycle 1, nodes array | REWRITE `state.js` | M | `boss.test.mjs` |
| A | 3 | engine.js — cycle advance, decay, income | CREATE `engine.js` | M | CREATE `tests/engine.test.mjs` |
| A | 4 | renderer.js Band 1 — node map + Advance Cycle | EXPAND `renderer.js`, `styles.css` | M | `smoke-area games` |
| B | 5 | Cascade stress — topology-aware decay | `engine.js` | S | `engine.test.mjs` |
| B | 6 | Entropy % — weighted aggregate, HUD | `engine.js`, `state.js`, `renderer.js`, `styles.css` | S | `engine.test.mjs` |
| B | 7 | High-Load toggle — binary mode switch | `engine.js`, `renderer.js` | S | `engine.test.mjs` |
| B | 8 | Stabilizer + Upgrade Terminal stub | `engine.js`, `renderer.js` | M | `engine.test.mjs` |
| B | 9 | Debris decay timers — expire + bell warn | `engine.js`, `boss.js` | S | `engine.test.mjs` |
| C | 10 | Boss gate recalibration — economic gate + burn sequence | `boss.js`, `messages.js`, `state.js` | M | `boss.test.mjs` |
| C | 11 | Smoke test update — real cycle-engine win path | `tests/areas/games.mjs` | S | `smoke-area games` |
| D | 12 | rng.js + events.js — seeded event system | CREATE `rng.js`, `events.js` | S | inline determinism test |
| D | 13 | Entropy threshold cascades — 60%/80% events | `engine.js`, `messages.js` | S | `engine.test.mjs` |
| D | 14 | Band announcements + bell catalog | `messages.js`, `content.js`, `engine.js` | S | `engine.test.mjs` |
| D | 15 | Sacrifice zone visual — glitch CSS + zone abandonment | `styles.css`, `renderer.js` | S | visual + `smoke-area games` |
| E | 16 | Full Upgrade Terminal UI | `renderer.js` or `repair.js` | S | `engine.test.mjs` |
| E | 17 | Bundle regen + final audit | `stage.generated.js`, all | S | `check.sh --fast` |

---

## Non-Bypassable Gate: Exact Mechanism

**The un-cheat is load-bearing in two ways that cannot be collapsed into a single cycle:**

1. **Action gate** (`hasSalvageArchived`): requires at least one drag-and-drop (or archive-button
   fallback with `fallback:true` — acceptable per existing design) during the run. Checked via the
   `actions` store (`8.salvage_archived`). This proves the player touched the file-management verb.

2. **Economic gate** (`state.states >= calcBurnTotal()`): The Heat Death burns 17+19+21+23+25+
   27+29+31+33+35 = 260 States over 10 cycles. A player who never salvaged has ~190 States at
   cycle 34. The 70-State gap is closed ONLY by salvaging debris files across multiple cycles.
   Each debris file (value 8–88 States) must be archived within 2 cycles of appearing or it
   is permanently lost. No shortcut exists to retroactively close this gap.

3. **Cycle gate** (`state.cycle >= MIN_BOSS_CYCLE`): the boss cannot be triggered before cycle 34
   regardless of States. This prevents a "hoard States, skip game, boss" bypass.

**What happens on failure**: `rewindToWarningCheckpoint` sends the player to cycle 29. The
`failed` bell message fires: "there was more. it was in the debris files. I didn't move them in
time." The hint ladder in `lockedHintLadder` escalates on each failed attempt, eventually giving
an explicit drag-and-drop instruction. The player cannot un-fail the run without restarting Band 5
and salvaging throughout.

---

## Guardrails Checklist (verify per increment)

- [ ] No `Math.random()` or `Date.now()` in `engine.js` or `events.js` — RNG is always seeded
  from `makeRng('8:${cycle}:...')`.
- [ ] ASCII rendering: node health bar uses CSS width, not canvas. Terminal output is `<pre>` text.
  No images required for the game to function.
- [ ] Every new module ≤ 300 LOC soft cap; reject commit if any exceeds 500 hard cap.
- [ ] `node build/metagame/build.mjs` regenerates `stage8/stage.generated.js` after EVERY change
  to stage8 source. Stage `stage.generated.js` before every commit.
- [ ] `node tests/smoke-area.mjs games` passes after every increment.
- [ ] `node tests/stage8/boss.test.mjs` passes after every increment.
- [ ] Zero off-origin requests: no CDN, no remote fetch. Verify with smoke test assertion.
