# Stage 5 "Signal Racer" — Actionable Build Plan

**Date:** 2026-06-26
**Branch:** worktree-metagame-bitfoundry
**Working dir:** `docs/games/metagame/stages/stage5/`

---

## Status: THIN GATE — must build a real game

The existing code is a static fake HUD + a bypass button. Nothing playable exists.
The calibration/boss lock logic in `calibration.js` and `boss.js` is already correct and
load-bearing — keep it. Everything else is replaced or rebuilt.

---

## Priority table — do-first items

| # | Item | Why first | Effort | Blocks |
|---|------|-----------|--------|--------|
| 1 | `rng.js` seedable PRNG | No deps; every pattern table needs it | S | #3 track.js |
| 2 | `state.js` rewrite + remove Date.now | Correctness fix + real game fields | S | #7 renderer |
| 3 | `track.js` round-1 obstacle table | First real game content | M | #7 renderer |
| 7 | `renderer.js` Phase A + bypass button removed | Makes the gate non-bypassable; round 1 playable | L | all expansion |

Once #1-#7 are green, the bypass button is gone and a real game exists.
Everything after that is the expansion arc, one new mechanic per increment.

---

## Guardrails (enforce every increment)

- **No Date.now / Math.random in game logic** — seed from `context.seed`; PRNG from `rng.js`.
- **Obstacle tables are pre-computed at mount**, stored as arrays, indexed by tick. Zero random calls in the render loop.
- **Beat windows are designed constants** per round descriptor (not sampled from audio).
- **File size: 300 LOC soft cap, 500 hard cap.** `renderer.js` + `game-loop.js` are the risk. Split early.
- **After every increment that touches a .js source file:** `node scripts/gen-metagame-bundles.mjs` then `git add stage5/stage.generated.js`.
- **Test gate per increment:** unit test (see per-increment detail) + `node tests/smoke-area.mjs games`.

---

## Phase A — Foundation (increments 1-7)

Removes the thin gate. Builds round 1 playable. Bypass button deleted.

### #1 — `rng.js`: Seedable PRNG [S]

**New system:** Deterministic random number generator from seed string.

**Files:**
- CREATE `stage5/rng.js` — copy xmur3 + mulberry32 pattern verbatim from `stage3/rng.js`;
  export `makeRng(seed)` with `.float()`, `.int(lo, hi)`, `.pick(arr)`, `.chance(p)`, `.shuffle(arr)`.

**Why copy, not import:** each stage bundles standalone (no cross-stage imports at runtime).

**Test:** `node -e "import('./docs/games/metagame/stages/stage5/rng.js').then(({makeRng})=>{ const r=makeRng('s5'); console.assert(r.int(0,2)>=0,'range ok'); const a=makeRng('s5').int(0,100); const b=makeRng('s5').int(0,100); console.assert(a===b,'deterministic'); console.log('rng ok'); })"`

---

### #2 — `state.js`: Real game fields + remove Date.now [S]

**New system:** State schema extended to hold real gameplay state.

**Files:**
- EDIT `stage5/state.js`

**Changes:**

Remove the `Date.now()` fallback on line 4:
```js
// BEFORE
const seed = String(context.seed || context.now || Date.now()).replace(/\W/g, '').slice(-8) || 'stage5';
// AFTER
const seed = String(context.seed || 'stage5s5').replace(/\W/g, '').slice(-8);
```

Add to `defaultState()` return value:
```js
run: {
  lane: 1,           // 0=A, 1=B, 2=C
  tick: 0,
  integrity: 100,
  roundIdx: 0,       // 0-6 for rounds 1-7
  roundComplete: false,
  onBeatCount: 0,
  totalActions: 0,
  packetsThisRound: 0,
  counterPhaseLane: 0,
  counterPhaseAge: 0,
  activeChannel: null,  // null | 'HI' | 'LO' (round 6)
  gatesCollected: 0,
  speedBurstTick: -1,
},
shop: {
  noiseFilter: false,
  spectrumAnalyzer: false,
  signalAmplifier: false,
},
```

Remove the static `race.*` fields (lap, totalLaps, timeMs, boostSegments, position,
jammerOffsetMs) — they are replaced by `run.*`. Keep `packets`, `calibration`, `boss`, `log`.

**Test:** `node docs/games/metagame/stages/stage5/tests/boss.test.mjs` must still pass (boss/calibration fields unchanged).

---

### #3 — `track.js`: Round 1 obstacle table [M]

**New system:** Pure function that generates a full obstacle table for a round from seed + round descriptor.

**Files:**
- CREATE `stage5/track.js`

**API:**
```js
export function buildObstacleTable(seed, roundDef)
// Returns an array of length roundDef.tickCount.
// Each entry: { lanes: [glyph|null, glyph|null, glyph|null], beatOpen: bool, counterPhaseLane: int }
// glyphs: '░' | '▒' | '▓' | '>>' | null
// beatOpen is precomputed from tick index and roundDef.burstPattern (array of 0/1 per tick position in cycle)
// counterPhaseLane = tick 0-7: 0, tick 8-15: 1, tick 16-23: 2, then cycles (round 4+ only)
```

Round 1 descriptor (used directly in this file for unit testing):
```js
{ tickCount: 100, glyph: '░', density: 0.4, burstPattern: null, counterPhaseShift: null }
```
Rules for round 1: no two adjacent columns blocked in the same row (always at least one clear lane);
blocks placed so at least one escape exists every 3 ticks.

**Test:** CREATE `stage5/tests/track.test.mjs`
- `buildObstacleTable('test', ROUND_1_DEF)` returns 100 rows.
- Same seed → same table every time.
- Different seeds → different tables.
- No row has all 3 lanes blocked.
- All non-null glyphs are `'░'` for round 1.
- `node docs/games/metagame/stages/stage5/tests/track.test.mjs`

---

### #4 — `rounds.js`: Round descriptors array [S]

**New system:** Single source of truth for per-round config.

**Files:**
- CREATE `stage5/rounds.js`

**API:**
```js
export const ROUNDS = [
  // R1
  { id: 1, label: 'AVOID',              tickMs: 180, beatWindowTicks: null,
    glyphs: ['░'],     burstPattern: null,
    counterPhaseShift: null, hasFork: false, hasGates: false, tickCount: 100 },
  // R2
  { id: 2, label: 'TIME IT',            tickMs: 160, beatWindowTicks: 2,
    glyphs: ['▒'],     burstPattern: [1,1,1,0,0],   // 3-tick burst / 2-tick gap
    counterPhaseShift: null, hasFork: false, hasGates: false, tickCount: 120 },
  // R3
  { id: 3, label: 'READ AHEAD',         tickMs: 140, beatWindowTicks: 1,
    glyphs: ['░','▓'], burstPattern: [1,0,1,1],     // 4-tick looping pattern
    counterPhaseShift: null, hasFork: false, hasGates: false, tickCount: 120 },
  // R4
  { id: 4, label: 'COUNTER-PHASE LANE', tickMs: 140, beatWindowTicks: 1,
    glyphs: ['░','▒'], burstPattern: [1,1,0,0],
    counterPhaseShift: 8,    hasFork: false, hasGates: false, tickCount: 130 },
  // R5
  { id: 5, label: 'BOOST GATES',        tickMs: 130, beatWindowTicks: 1,
    glyphs: ['░','>>'],burstPattern: [1,0,1,0],
    counterPhaseShift: 8,    hasFork: false, hasGates: true,  tickCount: 140 },
  // R6
  { id: 6, label: 'SPLIT CHANNEL',      tickMs: 130, beatWindowTicks: 1,
    glyphs: ['░','▓','>>'], burstPattern: [1,0,1,0],
    counterPhaseShift: 8,    hasFork: true,  hasGates: true,  tickCount: 160 },
  // R7 BOSS
  { id: 7, label: 'BOSS',               tickMs: 120, beatWindowTicks: 1,
    glyphs: ['░','▒','▓','>>'], burstPattern: [1,1,0,1,0],
    counterPhaseShift: 4,    hasFork: true,  hasGates: true,  tickCount: 200 },
];
```

**Test:** `node -e "import('./docs/games/metagame/stages/stage5/rounds.js').then(({ROUNDS})=>{ console.assert(ROUNDS.length===7); console.assert(ROUNDS[0].id===1); console.assert(ROUNDS[6].label==='BOSS'); console.log('rounds ok'); })"`

---

### #5 — `engine.js`: rAF tick engine [M]

**New system:** requestAnimationFrame driver that fires logical ticks at a fixed ms interval regardless of frame rate.

**Files:**
- CREATE `stage5/engine.js`

**API:**
```js
export function createEngine({ onTick, getTickMs })
// getTickMs: () => number  (called each tick so a speed burst can change interval mid-run)
// Returns: { start(), stop() }
// onTick(tick: number) is called once per logical tick, where tick is a monotonically incrementing integer
```

Internal: accumulates `delta` via `requestAnimationFrame`. When `delta >= getTickMs()`, fires `onTick(tick++)` and subtracts `getTickMs()` from `delta`. Pure orchestration, no game logic inside.

**Test:** Engine cannot be unit-tested in Node (no rAF). Covered by integration when renderer uses it and `node tests/smoke-area.mjs games` passes.

---

### #6 — `render-track.js`: ASCII 3×8 grid renderer [S]

**New system:** Pure function that renders the ASCII track viewport given current game state.

**Files:**
- CREATE `stage5/render-track.js`

**API:**
```js
export function renderTrackGrid({ table, tick, lane, counterPhaseLane, counterPhaseActive, beatOpen, activeChannel })
// Returns a string of 9 lines (8 obstacle rows + 1 player row), each 7 chars wide (3 cells + separators)
// Format per cell: ' ░ ' / ' ▒ ' / ' ▓ ' / '>>' / '   '
// Counter-phase lane header row above: '  ~  ' in the active lane column
// Player row (bottom): ' [>]' in the player's lane
// If beatOpen: append '*' to top-right corner of header line (beat indicator)
```

**Test:** CREATE `stage5/tests/track-render.test.mjs`
- Player in lane 1 (B) → '[>]' appears in column 1 of the bottom row.
- Obstacle in lane 0 tick 0 → '░' appears in top row column 0.
- Counter-phase lane 2 → '~' in column 2 of header.
- `node docs/games/metagame/stages/stage5/tests/track-render.test.mjs`

---

### #7 — `renderer.js` Phase A: Round 1 playable + bypass button removed [L]

**New system:** Real playable race game (round 1 only). The "simulate full loop" bypass button is deleted permanently.

**Files:**
- EDIT `stage5/renderer.js` — gut and rebuild
- EDIT `stage5/content.js` — update `raceHudModel` to accept real `run.*` fields

**LOC risk:** This file will grow with each subsequent round increment. Pre-split now:
- `renderer.js` — mount/unmount, keyboard handler, round-to-round navigation, shop screen, boss trigger, calibration button, BTS button (~150 LOC)
- `game-loop.js` — CREATE: integrates `engine.js` + `track.js` + `render-track.js`; per-tick logic (collision detection, integrity update, round completion check) (~130 LOC)

**Changes to renderer.js:**
- Remove the `data-action="calibrate"` button (the bypass). Keep only: "open transmission_hum.mp3", "open signal_racer.bts".
- Add "start round" button per round, disabled until previous round complete (or round 1 is always available).
- Mount `game-loop.js` when a round starts; unmount and show results when round ends.
- Wire ArrowLeft/ArrowRight keyboard inputs → send to active game loop (game-loop.js owns lane switching).

**Changes to game-loop.js:**
```
createGameLoop({ state, roundIdx, calibrated, onComplete })
 → { start(), stop(), handleKey(key) }
```
Per-tick (round 1):
1. Look up `table[tick]` row.
2. If player lane has an obstacle → `integrity -= 2`.
3. Integrity <= 0 → run failed.
4. tick >= table.length → round complete; compute packets (base only in phase A).
5. Render via `renderTrackGrid(...)`.

**Remove from renderer.js:**
- `waveGlyphs` helper (can stay in content.js or be removed; wave panel is secondary now).
- All static `race.lap`, `race.timeMs`, `race.boostSegments` references.

**Test:**
- `node tests/smoke-area.mjs games` — stage renders, no element with `data-action="calibrate"` in DOM.
- Manual: open stage 5, ArrowLeft/Right move car, integrity ticks down on collision, round ends at finish.

**After this increment:** run `node scripts/gen-metagame-bundles.mjs`.

---

## Phase B — Expansion arc (increments 8-13)

One new mechanic per increment. Each builds on the prior. Run the full pre-push gate after this phase:
`./scripts/check.sh --fast`.

### #8 — Round 2: TIME IT — beat window + off-beat penalty [M]

**New verb:** WHEN to move, not just where.

**Files:**
- EDIT `stage5/game-loop.js` — add beat window check to lane-switch handler
- EDIT `stage5/track.js` — extend `buildObstacleTable` to support `burstPattern`; add ▒ glyph support
- EDIT `stage5/render-track.js` — add beat-open indicator (e.g. `*` top-right, or HUD pulse field)
- EDIT `stage5/renderer.js` — show accuracy % in HUD; show `▒` in glyph legend for round 2

**Mechanic detail:**
- `beatOpen = burstPattern[tick % burstPattern.length] === 0` (gap = beat open).
- Lane switch during `!beatOpen` (burst tick): `integrity -= 2` off-beat penalty in addition to normal collision.
- Lane switch during `beatOpen`: no penalty (clean window).
- HUD: "ON-BEAT: 71%" updated per switch.

**Test:** CREATE `stage5/tests/beat.test.mjs`
- Assert beat window pattern [1,1,1,0,0]: tick 0,1,2 closed; tick 3,4 open.
- Assert off-beat switch when burstPattern is active costs 2 extra integrity.
- `node docs/games/metagame/stages/stage5/tests/beat.test.mjs`

---

### #9 — Round 3: READ AHEAD — ▓ dense block, 5x integrity cost [S]

**New verb:** Prioritise which hit to take deliberately.

**Files:**
- EDIT `stage5/track.js` — round 3 uses a 4-tick looping pattern; ▓ blocks in one lane per loop
- EDIT `stage5/game-loop.js` — collision handler: `glyph === '▓' ? 5 : 2` integrity cost
- EDIT `stage5/rounds.js` — confirm round 3 beatWindowTicks: 1 (narrow window)

**Mechanic detail:**
- The 4-tick pattern is seeded but fixed for the whole round (same loop repeats). Player can see it coming 3+ rows ahead (the 8-row viewport shows 3+ look-ahead).
- Beat window is narrower than round 2 (1 tick vs 2 ticks for round 2).

**Test:** extend `beat.test.mjs` or CREATE `stage5/tests/collision.test.mjs`
- ░ hit: integrity -= 2. ▓ hit: integrity -= 5.
- `node docs/games/metagame/stages/stage5/tests/collision.test.mjs`

---

### #10 — `economy.js`: Packet calculation per round [S]

**New system:** Packet rewards that make replay worth it.

**Files:**
- CREATE `stage5/economy.js`
- EDIT `stage5/game-loop.js` — call `calcRoundPackets` on round complete, accumulate to `state.packets`
- EDIT `stage5/renderer.js` — show packet breakdown in round-complete screen

**API:**
```js
export function calcRoundPackets({ roundId, onBeatPct, integrityRemaining, gatesCollected, upgrades })
// base per round: [30, 40, 50, 60, 70, 80, 100] for rounds 1-7
// + floor(onBeatPct * 20)       // 0-20 accuracy bonus
// + floor(integrityRemaining * 0.3)   // 0-30 survival bonus
// + gatesCollected * (upgrades.signalAmplifier ? 8 : 5)
// min 10 (always give something for finishing)
```

**Test:** CREATE `stage5/tests/economy.test.mjs`
- Perfect round 1 (100% beat, 100 integrity, 0 gates): 30 + 20 + 30 = 80.
- Survival only (0% beat, 10 integrity, 0 gates): 30 + 0 + 3 = 33.
- signalAmplifier on: gate value 8 not 5.
- `node docs/games/metagame/stages/stage5/tests/economy.test.mjs`

---

### #11 — Round 4: COUNTER-PHASE LANE — lane-as-state [M]

**New verb:** Move to the shield position, not just the gap.

**Files:**
- EDIT `stage5/game-loop.js` — track `counterPhaseLane` in per-tick state; shift every 8 ticks (A→B→C→A); burst immunity when `run.lane === counterPhaseLane && isBurstTick`
- EDIT `stage5/track.js` — round 4 `buildObstacleTable` passes `counterPhaseLane` per row
- EDIT `stage5/render-track.js` — show `~` in counter-phase lane header; 2-tick flicker warning before shift (if `counterPhaseAge >= 6`)
- EDIT `stage5/rounds.js` — round 4 `counterPhaseShift: 8`

**Mechanic detail:**
- `counterPhaseAge` increments each tick; at 8 resets to 0, `counterPhaseLane` shifts (+1 mod 3).
- Ticks 6 and 7 of each 8-tick window: the ~ header flickers (CSS class or alternate glyph `¬`).
- In counter-phase lane on a burst tick: skip all integrity damage (obstacle still shows in the grid, player just phases through).

**Test:** extend `collision.test.mjs`
- Burst tick, player in counter-phase lane: integrity unchanged.
- Burst tick, player NOT in counter-phase lane: integrity -= 2 (or 5 for ▓).
- Counter-phase lane shifts from 0 to 1 after 8 ticks.

---

### #12 — Round 5: BOOST GATES — >> glyph, offensive routing [M]

**New verb:** Actively hunt rewards vs. purely dodge obstacles.

**Files:**
- EDIT `stage5/track.js` — round 5: `>>` gates appear in one lane per beat window (never in a lane that also has ▓ on that tick)
- EDIT `stage5/game-loop.js` — interaction handler: player in gate lane + `beatOpen` → `+5 packets` + set `speedBurstTick = tick + 1`; tick === speedBurstTick → use `tickMs * 0.7` for one tick
- EDIT `stage5/engine.js` — `getTickMs` callback (already in API) returns `run.speedBurstTick === tick ? tickMs * 0.7 : tickMs`
- EDIT `stage5/renderer.js` — show "GATES: N" in HUD; show >> in glyph legend

**Mechanic detail:**
- Missing a >> gate (wrong lane or off-beat): no penalty — pure opportunity cost.
- >> gate in the same tick as a ▓ block: never generated (track.js must prevent this).
- Speed burst: the next tick's getTickMs returns a shorter value; this is already supported by the engine's `getTickMs` callback.

**Test:** extend `economy.test.mjs` or CREATE `stage5/tests/gates.test.mjs`
- On-beat gate hit: packets += 5 (or 8 with signalAmplifier).
- Off-beat gate hit: packets unchanged.
- >> never co-occurs with ▓ in same tick/lane.

---

### #13 — Round 6: SPLIT CHANNEL — fork/merge committed routing [L]

**New verb:** Commit to a route 8 ticks ahead rather than reacting tick-by-tick.

**Files:**
- EDIT `stage5/track.js` — round 6 `buildObstacleTable` embeds fork sections:
  at a seeded tick T_fork, insert Y marker (3 rows); then 8-tick HI-channel rows + 8-tick LO-channel rows in parallel; then ^ merge marker.
  HI: more >> gates, ▓ blocks. LO: only ░, predictable counter-phase shift.
- EDIT `stage5/game-loop.js` — detect Y marker at current tick: set `run.activeChannel = null` (awaiting choice); ArrowUp = HI, ArrowDown = LO (or reuse Left/Right mapping within fork prompt); lock `activeChannel` until ^ merge tick; use only the locked channel's rows for collision/gate
- EDIT `stage5/render-track.js` — when `activeChannel !== null`: render the active sub-channel (4 rows wide? or annotate HI/LO label). At fork: show both sub-channels side-by-side with `[HI]` / `[LO]` labels.
- EDIT `stage5/renderer.js` — add visual cue "FORK: choose HI [Up] or LO [Down]" when `activeChannel === null` during fork segment

**Mechanic detail:**
- Y marker: at tick T_fork, a prompt row appears (no obstacles). Player must press Up (HI) or Down (LO) within 3 ticks or default to LO.
- HI channel: density 0.5, ▓ proportion 0.3, gates on every other beat.
- LO channel: density 0.2, ░ only, counter-phase shift every 8 ticks (same as round 4 rate).
- Fork + merge appear once per round (seeded position: 40-80% through the tick table).

**Test:** CREATE `stage5/tests/channel.test.mjs`
- After Y marker: `activeChannel === null` until choice made.
- After Up key: `activeChannel === 'HI'`; remains until ^ merge.
- After ^ merge: `activeChannel === null`.
- HI rows contain ▓ blocks; LO rows contain only ░.

---

## Phase C — Boss, Economy shop, Polish (increments 14-16)

### #14 — Round 7 BOSS: All mechanics + counter-wave suppression gate [M]

**New verb:** Synthesis of all prior verbs. The boss is the real un-cheat.

**Files:**
- CREATE `stage5/boss-race.js` — boss round config: builds a combined-mechanics obstacle table (imports `track.js` with round-7 config); exports `getBossRunConfig(calibrated)` which returns:
  ```js
  {
    roundDef: ROUNDS[6],
    suppressionActive: !calibrated,      // true = double ▓ damage, fast counter-phase shift
    jammerRow: 2,                        // X glyph 2 rows ahead of player row always
  }
  ```
- EDIT `stage5/game-loop.js` — import `getBossRunConfig`; apply suppression:
  - `suppressionActive` → `▓` costs 10 (vs. 5 calibrated); counter-phase shift every 4 ticks (vs. 8)
  - jammer X glyph shown 2 rows above player; if player in same lane as jammer: `integrity -= 3` per tick
- EDIT `stage5/renderer.js` — after round 6 complete: show "RACE THE JAMMER" button (reusing existing `data-action="boss"` hook, now triggering the real boss game-loop instead of the stub `raceTheJammer()` call). `raceTheJammer()` is called on boss circuit completion (not on button press).

**Non-bypassable confirmation:**
- Boss game-loop only starts if `hasCounterWave(actions)` OR suppression mode is accepted (player can attempt but will mathematically run out of integrity: 200 ticks × average 3 ▓ hits × 10 = depletes 100 integrity before finish).
- `raceTheJammer()` is called only when the boss circuit is physically completed (tick >= 200), not on button press.
- The "simulate full loop" button was already removed in #7.

**Test:** extend `boss.test.mjs`
- Boss run without calibration: `suppressionActive === true`; ▓ collision costs 10.
- Boss run with calibration: `suppressionActive === false`; ▓ collision costs 5.
- `raceTheJammer()` still requires `hasCounterWave(actions)` to return `true` for `defeated === true`.

---

### #15 — `shop.js`: 3 stage-local upgrades [M]

**New system:** Packet-gated upgrades that change the damage/timing/reward constants.

**Files:**
- CREATE `stage5/shop.js`
- EDIT `stage5/state.js` — `shop` field already added in #2
- EDIT `stage5/renderer.js` — show shop panel between rounds (after round complete, before next round start); show packet cost + purchased state
- EDIT `stage5/game-loop.js` — read upgrades from `state.shop` and pass to `calcRoundPackets` and collision handler

**Upgrades:**
```js
export const UPGRADES = [
  { id: 'noiseFilter',      label: 'Noise Filter',       cost: 60,
    desc: 'Reduces ░ hit damage from 2 to 1.' },
  { id: 'spectrumAnalyzer', label: 'Spectrum Analyzer',  cost: 80,
    desc: 'Widens the beat window by 1 extra tick per round.' },
  { id: 'signalAmplifier',  label: 'Signal Amplifier',   cost: 100,
    desc: 'Boost gate value: 5 → 8 packets.' },
];

export function applyUpgrades(shop, base) {
  // base: { noiseDamage: 2, beatWindowBonus: 0, gateValue: 5 }
  return {
    noiseDamage:      shop.noiseFilter      ? 1 : base.noiseDamage,
    beatWindowBonus:  shop.spectrumAnalyzer ? base.beatWindowBonus + 1 : base.beatWindowBonus,
    gateValue:        shop.signalAmplifier  ? 8 : base.gateValue,
  };
}
```

Purchases: `state.packets -= cost; state.shop[id] = true; save()`.

**Test:** CREATE `stage5/tests/shop.test.mjs`
- noiseFilter: `applyUpgrades({noiseFilter:true,...}, base).noiseDamage === 1`.
- spectrumAnalyzer: beatWindowBonus increases by 1.
- Insufficient packets: purchase rejected, state unchanged.
- `node docs/games/metagame/stages/stage5/tests/shop.test.mjs`

---

### #16 — Polish: round transitions, narrative log, CSS [S]

**New system:** Narrative cohesion, visual completeness.

**Files:**
- EDIT `stage5/messages.js` — add `roundLogLines` array (7 entries, one per round), each a 1-sentence signal-warfare log line pushed on round completion. Example:
  - R1: `'signal corridor acquired. static interference at standard density.'`
  - R7: `'jammer signal collapses into silence. the channel is yours.'`
- EDIT `stage5/renderer.js` — push `roundLogLines[roundIdx]` to `state.log` on round complete; show round index and label in round-select panel
- EDIT `stage5/styles.css` — add:
  - `.s5-track-grid`: monospace pre-like container, 8 rows, fixed-width, readable font
  - `.s5-beat-open` pulsing border or glow on the track container when beat window is open
  - `.s5-counter-phase` column highlight (subtle left-border on active lane)
  - `.s5-boost-gate` coloured >> glyph (use `--s5-boost` var already defined)
  - `.s5-channel-hi` / `.s5-channel-lo` sub-channel panel labels
- EDIT `stage5/content.js` — update `raceHudModel` to accept `run.*` fields from #2

**Test:** `node tests/smoke-area.mjs games`
- Narrative log lines appear after round completion.
- CSS classes for track elements do not cause layout errors.

---

## Bundle regeneration checkpoint

After every increment touching a `.js` source file under `stage5/`:

```
node scripts/gen-metagame-bundles.mjs
git add docs/games/metagame/stages/stage5/stage.generated.js
```

Suggested natural checkpoints (bundle + commit):
- After #7 (Phase A complete — round 1 playable, bypass gone)
- After #10 (economy wired, rounds 1-3 + economy all green)
- After #13 (expansion arc complete, round 6 playable)
- After #16 (boss + shop + polish, full pre-push gate: `./scripts/check.sh --fast`)

---

## File manifest

| File | Action | Introduced at | Notes |
|------|--------|---------------|-------|
| `stage5/rng.js` | CREATE | #1 | Copy from stage3/rng.js |
| `stage5/state.js` | EDIT | #2 | Remove Date.now; add run.*, shop |
| `stage5/track.js` | CREATE | #3 | Obstacle table generator |
| `stage5/rounds.js` | CREATE | #4 | ROUNDS descriptor array |
| `stage5/engine.js` | CREATE | #5 | rAF tick driver |
| `stage5/render-track.js` | CREATE | #6 | ASCII 3×8 grid renderer |
| `stage5/renderer.js` | EDIT | #7 | Gut; remove bypass; real game shell |
| `stage5/game-loop.js` | CREATE | #7 | Per-tick logic, collision, round end |
| `stage5/economy.js` | CREATE | #10 | Packet calculation |
| `stage5/boss-race.js` | CREATE | #14 | Boss run config + suppression |
| `stage5/shop.js` | CREATE | #15 | 3 upgrades, applyUpgrades |
| `stage5/boss.js` | KEEP | — | Already correct; keep as-is |
| `stage5/calibration.js` | KEEP | — | Already correct; keep as-is |
| `stage5/messages.js` | EDIT | #16 | Add roundLogLines |
| `stage5/content.js` | EDIT | #7, #16 | Update raceHudModel for run.* |
| `stage5/styles.css` | EDIT | #7, #16 | Track grid, beat pulse, channel labels |
| `stage5/index.js` | EDIT | #7 | Export game-loop.js symbols if needed |
| `stage5/tests/track.test.mjs` | CREATE | #3 | |
| `stage5/tests/beat.test.mjs` | CREATE | #8 | |
| `stage5/tests/collision.test.mjs` | CREATE | #9 | |
| `stage5/tests/economy.test.mjs` | CREATE | #10 | |
| `stage5/tests/gates.test.mjs` | CREATE | #12 | |
| `stage5/tests/channel.test.mjs` | CREATE | #13 | |
| `stage5/tests/shop.test.mjs` | CREATE | #15 | |
| `stage5/stage.generated.js` | REGENERATE | every increment | `node scripts/gen-metagame-bundles.mjs` |

**Files never touched:** `tests/artifact.test.mjs`, `tests/boss.test.mjs` (keep; already green).

---

## Effort summary

| Phase | Increments | Effort | Result |
|-------|-----------|--------|--------|
| A — Foundation | #1-#7 | S+S+M+S+M+S+L = ~2-3 days | Real game, bypass gone, round 1 playable |
| B — Expansion | #8-#13 | M+S+S+M+M+L = ~2-3 days | Rounds 2-6 complete, full arc |
| C — Boss/Shop/Polish | #14-#16 | M+M+S = ~1 day | Boss non-bypassable, shop wired, ship-ready |

Total: 5-7 focused sessions.
