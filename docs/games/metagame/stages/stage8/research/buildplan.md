# Stage 9 "Observer State" — Build Plan

**Date:** 2026-06-26  
**Branch:** `worktree-metagame-bitfoundry`  
**Status entering build:** THIN GATE — shell only; no rendered mechanic; static ASCII diagram; Math.random in live path; `currentLevel:12 / clarity:84` are placeholder defaults, not real saves.

---

## DO FIRST (4 highest-impact items)

These four tasks are prerequisites for everything else. Nothing is playable without them.

| Priority | Task | Why first |
|----------|------|-----------|
| 1 | Create `rng.js` | Determinism foundation; every angle calc depends on it |
| 2 | Create `ring.js` + `tests/ring.test.mjs` | Core rendering unit; proves seed→angle pipeline before touching DOM |
| 3 | Create `game.js` (Band 1 config + CROSS logic) + `tests/game.test.mjs` | First real game event; independently testable; gates the renderer rewrite |
| 4 | Refactor `renderer.js` + create `loop.js` (Band 1 animation + CROSS) | First playable increment; everything after is band expansion on this chassis |

---

## Architecture overview of new modules

```
stage9/
  rng.js          NEW  — xmur3+mulberry32 from stage3; makeRng(seed) → { float, int }
  ring.js         NEW  — pure fns: ringAngle(seed,elapsed), renderRing(angle,opts), renderRingDual,
                           renderRingHidden, renderRingWithGhosts, renderRingBlind
  loop.js         NEW  — animation driver: startLoop(onTick) → { stop }; 100ms setInterval
  game.js         NEW  — band configs 1-6; CROSS/OBSERVE state machine; levelConfig(level,seed)
  state.js        MOD  — reset defaults (level:1, clarity:0); add session fields
  renderer.js     MOD  — wire animation loop + game.js; add OBSERVE button; replace static diagram
  boss.js         MOD  — route boss attempt through real game engine (not flag-check bypass)
  content.js      MOD  — remove static bossDiagram (replaced by ring.js); update serviceWorkerNotes
  messages.js     MOD  — add band-unlock bell messages
  styles.css      MOD  — dark-zone █ color, clarity glow at milestones
  tests/
    ring.test.mjs   NEW
    game.test.mjs   NEW
    boss.test.mjs   EXISTS (keep; extend for boss-engine integration)
```

LOC budget per file (hard cap 500, soft cap 300):
- `rng.js` ~45 — copy of stage3 rng.js; no modification
- `ring.js` ~160 — all render modes + angle math
- `loop.js` ~40 — thin wrapper only
- `game.js` ~210 — 6 band configs + state machine
- `renderer.js` ~260 — grows from 122; stays under 300

---

## Determinism model (read before touching angle logic)

```
baseAngle(seed) = makeRng(seed).float() * 360   // [0, 360)
rotSpeed(seed)  = levelConfig.baseSpeed + makeRng(String(seed)+"s").float() * levelConfig.speedVar
angle(elapsed)  = (baseAngle + rotSpeed * elapsed / 1000) % 360
```

- `elapsed` = `performance.now() - sessionStartMs` (set when level mounts; never Date.now)
- `seed` = 0 offline (fixed); `Math.floor(Math.random() * 1e6)` online (destructive per OBSERVE)
- `Math.random` appears ONLY in `getBossSeed` (online path) and is the mechanic content, not engine randomness
- The game engine calls `ringAngle(seed, elapsed)` identically in both modes; only the seed value differs

---

## Phase 0 — Determinism Foundation (prerequisites)

### Increment 0.1 — `rng.js`
**New verb:** none — infrastructure only  
**File:** `stage9/rng.js` (NEW, ~45 LOC)  
**What:** Copy stage3/rng.js verbatim. Export `makeRng(seed)` → `{ float, int, pick, chance, shuffle }`. Uses xmur3 + mulberry32; no Math.random.  
**Effort:** S  
**Test:** Inline assertion in `tests/ring.test.mjs` block 0: `makeRng(0).float()` is stable across two calls with same seed. `node tests/smoke-area.mjs games` must not regress.

### Increment 0.2 — `ring.js` + `tests/ring.test.mjs`
**New verb:** none — infrastructure only  
**File:** `stage9/ring.js` (NEW, ~160 LOC); `stage9/tests/ring.test.mjs` (NEW)  
**What:** Pure functions, no DOM, no timers.

```js
// ring.js exports
export function ringAngle(seed, elapsedMs, rotSpeedDegPerSec)
// → number: current gap angle in degrees [0, 360)

export function renderRing(gapAngleDeg, opts)
// opts: { radius: 15, gapWidth: 3, darkZone: null, ghosts: [] }
// → string: ASCII ring, one char per degree mapped to 25-char circle
// gap chars: ' ', solid chars: '─' '│' '╴' '╷' etc (box-drawing per quadrant)
// darkZone: { start, end } → replaced with '█'
// ghosts: [{ angle, hit }] → overlay '·' (near) or 'x' (phantom hit) faint chars
// returns 7-line string, 33 chars wide

export function renderRingHidden(opts)
// → same shape but all ring chars are '?'

export function renderDualRing(gap1Deg, gap2Deg, opts)
// outer ring (radius 15) gap1; inner ring (radius 8) gap2
// → 9-line string showing both concentric rings
```

**Effort:** M  
**Test:** `ring.test.mjs` — with seed 0 at elapsed 0ms: `ringAngle(0, 0, 30)` returns expected angle; `renderRing(0, {})` contains a gap space in the 12-o-clock position; `renderRingBlind` positions '█' in the dark zone; rendering is deterministic (same call twice → same string).

---

## Phase 1 — Band 1 "Signal": WATCH AND TIME

*Levels 1–3. Single ring, full visibility, constant 30 deg/s. No observer effect yet.*

### Increment 1.1 — `game.js` (Band 1 config) + `tests/game.test.mjs`
**New verb:** WATCH AND TIME  
**File:** `stage9/game.js` (NEW, ~210 LOC total — build in phases; Band 1 section ~60 LOC)

```js
// game.js Band 1 exports
export function levelConfig(level)
// → { band, bandName, ringCount, rotSpeed, tolerance, speedVar, darkZoneDeg, revealMs, hasPhantom, hasGhosts }

export function crossAttempt({ seed, elapsedMs, config })
// → { hit: bool, gapAngle: number, pressAngle: number, delta: number }
// Pure function: no DOM, no timer, deterministic.
```

Band 1 config: `{ band:1, bandName:'Signal', ringCount:1, rotSpeed:30, tolerance:30, darkZoneDeg:0, revealMs:Infinity, hasPhantom:false, hasGhosts:false }`  
Level progression within band: each level narrows tolerance by 3 deg (30→27→24).

**Effort:** M  
**Test:** `game.test.mjs` block 1 — `crossAttempt({ seed:0, elapsedMs:0, config:levelConfig(1) })` returns deterministic `hit` and `gapAngle`; `levelConfig(1).band === 1`; `levelConfig(4).band === 2`.

### Increment 1.2 — `loop.js`
**File:** `stage9/loop.js` (NEW, ~40 LOC)

```js
export function startLoop(onTick)
// calls onTick(elapsedMs) at 100ms intervals
// elapsedMs = performance.now() - t0, frozen per tick
// returns { stop() }
```

**Effort:** S  
**Test:** No DOM test needed. Functional check in game.test.mjs: import loop.js in Node — if `performance` is not defined it gracefully no-ops (guard on typeof performance). Smoke: `node tests/smoke-area.mjs games` doesn't throw on import.

### Increment 1.3 — `renderer.js` refactor (Band 1 playable)
**File:** `stage9/renderer.js` (MODIFY, grows to ~200 LOC for Band 1; total ~260 by Band 6)  
**File:** `stage9/styles.css` (MODIFY — add `.s9-ring-gap`, `.s9-feedback`, `.s9-band-label`)

Replace the static `bossDiagram` render path with an animated ring. Minimum viable renderer for Band 1:

```
OBSERVER STATE   level 1 / Signal   clarity 0   seed random
┌────────────────────────────────────────────────────────┐
│          EXIT                                          │
│           |                                            │
│   ───────   ──────────────────────────                 │
│  ─                              ─                      │
│   ─────────────────────────────────                    │
│           |                                            │
│          [ @ ]                                         │
└────────────────────────────────────────────────────────┘
  [OBSERVE]  [CROSS]
  > last: bounced (gap was 42deg off)
  > clarity +0
```

Changes:
- `mountStage` (in `index.js`) remains unchanged — passes through to `renderStage9`
- `renderStage9` creates the animation loop via `startLoop`; each tick calls `ring.renderRing` and updates `fields.arena.textContent`
- CROSS button calls `game.crossAttempt`, updates log, shows feedback div for 1.2s, then clears
- `destroy()` calls `loop.stop()`
- OBSERVE button is disabled in Band 1 (hidden); enabled from Band 3 onward

**Effort:** L  
**Test:** `node tests/smoke-area.mjs games` — arena element has non-empty textContent; CROSS button exists; no JS errors on mount/destroy.

### Increment 1.4 — `state.js` reset + migration
**File:** `stage9/state.js` (MODIFY)

Reset placeholder defaults:
```js
currentLevel: 1,   // was 12
clarity: 0,        // was 84
```

Add session fields:
```js
session: {
  startMs: null,      // set on level mount
  attempts: 0,        // resets per level
  gapMap: [],         // Band 4: [{ level, safeSlot, result }]
  echoHistory: []     // Band 5: last 2 [{ gapAngle, result }] per level
}
```

`normalizeState` migration: if incoming `clarity > 0` and `currentLevel > 3` and no `session` key → player had a placeholder save; keep `clarity` and `currentLevel` but inject default `session`.

**Effort:** S  
**Test:** Extend `boss.test.mjs` — `defaultState().currentLevel === 1`; `normalizeState({ currentLevel: 12, clarity: 84 }).session` is not null.

---

## Phase 2 — Band 2 "Interference": HOLD MULTIPLE RHYTHMS

*Levels 4–6. Two concentric rings at different speeds. Success requires AND-alignment of both gaps.*

### Increment 2.1 — `ring.js` extend: `renderDualRing`
**File:** `stage9/ring.js` (MODIFY, +30 LOC)  
Dual ring: outer gap at `config.rotSpeed` (30 deg/s), inner gap at `config.innerSpeed` (45 deg/s). Both derived from same seed via `makeRng(seed+"inner").float()` for inner baseAngle.

**Effort:** S  
**Test:** `ring.test.mjs` — `renderDualRing` contains at least 2 distinct gap positions at elapsed 0ms; NOT the same string as `renderRing`.

### Increment 2.2 — `game.js` extend: Band 2 config + AND-window logic
**File:** `stage9/game.js` (MODIFY, +40 LOC)

Band 2 config: `{ band:2, ringCount:2, rotSpeed:30, innerSpeed:45, tolerance:20 }`  
`crossAttempt` for band 2: BOTH gaps must be within tolerance of 0 deg (12 o'clock). Returns `{ hit: bool, outerDelta, innerDelta }`.

**Effort:** S  
**Test:** `game.test.mjs` — at seed 0 find `elapsedMs` where both gaps align via brute search; confirm `crossAttempt` returns `hit:true` at that elapsed; confirm `hit:false` at elapsed+50ms.

### Increment 2.3 — `renderer.js` extend: dual-ring display
**File:** `stage9/renderer.js` (MODIFY, +30 LOC)  
Band detection via `levelConfig(state.currentLevel).band`. When band ≥ 2: render dual ring; HUD shows "OUTER: Xdeg INNER: Ydeg"; announce band transition in log on first level 4 mount.

**Effort:** S  
**Test:** `node tests/smoke-area.mjs games` + manual check: Band 2 levels show two visible ring layers.

---

## Phase 3 — Band 3 "Collapse": CHOOSE WHEN TO OBSERVE

*Levels 7–9. Ring displays '?' until OBSERVE is pressed. Reveal expires after 1.5s. Online: OBSERVE also resamples the seed.*

### Increment 3.1 — `ring.js` extend: hidden + revealed modes
**File:** `stage9/ring.js` (MODIFY, +15 LOC)  
`renderRingHidden` already planned (all '?'). Add: `renderRingRevealing(angle, revealRemainMs, opts)` — normal ring chars but with countdown marker in corner.

**Effort:** S  
**Test:** `ring.test.mjs` — `renderRingHidden` has no gap-position-specific chars (all '?'); `renderRingRevealing` is not all '?'.

### Increment 3.2 — `game.js` extend: Band 3 OBSERVE action
**File:** `stage9/game.js` (MODIFY, +50 LOC)

```js
export function observeAction({ state, seed, isOnline, elapsedMs, getBossSeedFn })
// Returns: { newSeed, revealExpiresAt, currentAngle }
// Online: newSeed = getBossSeedFn() (calls Math.random via boss.js, resampling base angle)
// Offline: newSeed = seed (unchanged)
// Sets state.session.revealExpiresAt = performance.now() + 1500

export function crossAttempt({ ..., revealExpiresAt })
// Band 3: if Date.now() > revealExpiresAt → result: 'expired' (no penalty; no clarity gain)
```

Band 3 config: `{ band:3, revealMs:1500, observeResamples: true }`

**Effort:** M  
**Test:** `game.test.mjs` — online `observeAction` returns a different `newSeed` each call; offline returns same `newSeed`; cross after reveal expires returns `expired`.

### Increment 3.3 — `renderer.js` extend: OBSERVE button + countdown
**File:** `stage9/renderer.js` (MODIFY, +40 LOC)  
Show OBSERVE button from Band 3 onward. Clicking OBSERVE calls `observeAction`; HUD shows countdown "REVEALED: 1.2s" decrementing each tick. Arena switches between `renderRingHidden` and `renderRingRevealing` based on reveal state. Log: "observed. ring visible for 1.5s." (online: "seed resampled. ring visible for 1.5s. — observation has a cost.")

**Effort:** M  
**Test:** `node tests/smoke-area.mjs games` — OBSERVE button present when at Band 3 level; arena textContent changes after OBSERVE click.

---

## Phase 4 — Band 4 "Persistence": MAP ACROSS RUNS

*Levels 10–12. Two gaps: one safe, one phantom ('x'). Result is logged; memory builds map across attempts.*

### Increment 4.1 — `game.js` extend: safe/phantom gap logic
**File:** `stage9/game.js` (MODIFY, +45 LOC)

```js
// safeGapSlot(seed, level) → 0 or 1  (deterministic from seed+level)
// gapAngles(seed, elapsedMs, config) → [angle0, angle1]  (second gap = angle0 + 180)
// crossAttempt returns: { hit, slot: 0|1, safeSlot: 0|1, wasPhantom: bool }
```

Band 4 config: `{ band:4, hasPhantom: true, tolerance:25 }`

**Effort:** M  
**Test:** `game.test.mjs` — `safeGapSlot(0, 10)` is stable across two calls; `crossAttempt` with seed 0 at phantom-gap timing returns `{ hit:false, wasPhantom:true }`.

### Increment 4.2 — `state.js` extend: `gapMap`
**File:** `stage9/state.js` (MODIFY, +15 LOC)  
`normalizeState` ensures `state.session.gapMap = []`. Each attempt appends `{ level, slot, angle, wasPhantom, result }`. Capped at 30 entries total.

**Effort:** S  
**Test:** `boss.test.mjs` — after 2 cross attempts at level 10, `state.session.gapMap.length === 2`.

### Increment 4.3 — `renderer.js` extend: gap map HUD
**File:** `stage9/renderer.js` (MODIFY, +25 LOC)  
Band 4: render two visible gap positions. After a failed cross: log "gap@Xdeg was phantom. noted." After success: log "gap@Xdeg was safe. crossed." HUD inset shows last 3 gapMap entries as short list.

**Effort:** S  
**Test:** `node tests/smoke-area.mjs games` — at Band 4 level, arena string shows two distinct gap char positions.

---

## Phase 5 — Band 5 "Echo": READ YOUR OWN HISTORY

*Levels 13–15. Last two attempt ghost rings overlaid on arena. Player calibrates timing from own history.*

### Increment 5.1 — `ring.js` extend: ghost overlay
**File:** `stage9/ring.js` (MODIFY, +20 LOC)  
`renderRing` already accepts `ghosts: [{ angle, result }]`. Implement: ghost chars `·` (miss) or `⊕` (hit) placed at ghost's gap angle in the ring string, distinct from live gap chars.

**Effort:** S  
**Test:** `ring.test.mjs` — `renderRing(0, { ghosts:[{ angle:90, result:'miss' }] })` contains '·' char at the 90-deg position.

### Increment 5.2 — `state.js` extend: `echoHistory`
**File:** `stage9/state.js` (MODIFY, +10 LOC)  
Per-level: store last 2 attempts as `{ gapAngle, pressAngle, result }`. Reset on level advance.

**Effort:** S  
**Test:** `boss.test.mjs` — after 3 attempts at level 13, `echoHistory.length === 2` (capped at 2).

### Increment 5.3 — `renderer.js` extend: echo display + calibration hint
**File:** `stage9/renderer.js` (MODIFY, +25 LOC)  
Pass `echoHistory` as ghosts to `renderRing`. Below arena, show: "last: pressed Xdeg [early/late]." The delta is `pressAngle - 0` (12-o-clock = 0). Negative = early, positive = late.

**Effort:** S  
**Test:** `node tests/smoke-area.mjs games` — after a cross attempt, calibration hint element has non-empty textContent.

---

## Phase 6 — Band 6 "Blind Crossing" + Boss Wire-up: INFER OCCLUDED STATE

*Levels 16–18. 60–90 deg dark zone hides the gap. Inference from last known angle + elapsed × speed. Boss (level 18) is provably impossible without offline/seed-0.*

### Increment 6.1 — `ring.js` extend: `renderRingBlind`
**File:** `stage9/ring.js` (MODIFY, +20 LOC)  
`renderRing` dark zone: when `opts.darkZone = { start:270, end:360 }`, replace those arc chars with '█'. Gap char hidden when inside dark zone. Offline badge: if seed is 0, show `[OFFLINE: SEED=0]` label below ring.

**Effort:** S  
**Test:** `ring.test.mjs` — `renderRing(315, { darkZone:{start:270, end:360} })` contains '█' at the 315-deg position and no gap char there.

### Increment 6.2 — `game.js` extend: Band 6 config
**File:** `stage9/game.js` (MODIFY, +30 LOC)

Band 6 config: `{ band:6, rotSpeed:45, tolerance:15, darkZoneDeg:60, darkZoneStart:270, revealMs:800 }`  
`crossAttempt` for Band 6: gap position during dark zone is not directly shown; the angular extrapolation the player must perform is: `inferredAngle = lastObservedAngle + rotSpeed * (elapsedMs - lastObservedMs) / 1000`. The game does NOT do this for the player — it just evaluates the actual angle at press time. The dark zone is purely a display restriction.

**Effort:** S  
**Test:** `game.test.mjs` — `levelConfig(16).band === 6`; `levelConfig(18).band === 6`; `crossAttempt` at level 18 with seed 0 at computed optimal elapsed returns `hit:true`.

### Increment 6.3 — Boss wire-up: real game engine path
**File:** `stage9/boss.js` (MODIFY, ~30 LOC change)

Current `recordObserverBossAttempt` only checks offline flag — it grants victory if `state.offlineMode` regardless of any timing. Replace with a real engine path:

```js
export function recordObserverBossAttempt({ state, actions, elapsedMs })
// elapsedMs: from renderer's active session timer
// Calls game.crossAttempt({ seed: getBossSeed({state,actions}), elapsedMs, config:levelConfig(18) })
// Only sets state.boss.defeated if crossAttempt.hit === true AND offlineMode === true
// Non-bypassable: online seed Math.random → base angle variance ±180 deg → ±4s timing uncertainty
//   at 45 deg/s; human cannot hit ±15 deg tolerance under that variance.
//   Offline seed 0 → base angle fixed → timing uncertainty ≤200ms human reflex → ±9 deg → ±15 deg OK.
```

The `elapsedMs` must be passed from the renderer's `startLoop` session timer, NOT from Date.now.

**Effort:** M  
**Test:** `boss.test.mjs` — extend: `recordObserverBossAttempt` with offline=false and any elapsedMs returns `defeated:false`; with offline=true and computed correct elapsedMs (from seed 0 ringAngle calculation) returns `defeated:true`; with offline=true but wrong elapsedMs returns `defeated:false`.

### Increment 6.4 — Non-bypassability enforcement
**File:** `stage9/boss.js` (MODIFY, minor)  
`recordObserverBossAttempt` must call `getBossSeed` (which uses `Math.random` online) to resample on each online attempt, AND call `crossAttempt` to evaluate the actual angle. The combination means:
- Online: `Math.random` gives new base angle → player gets random starting position → cannot build on prior knowledge
- Offline: seed 0 → fixed base angle → player can observe once, track, cross

Add assertion comment: `// Non-bypassable by definition: online Math.random variance (±180deg) >> tolerance(15deg)`. No UI bypass path allowed (no "admin" or debug key that skips the engine check). The smoke test must confirm the boss button does NOT call `onStageComplete` without both conditions.

**Effort:** S  
**Test:** `boss.test.mjs` — new block: attempt boss 100 times online with random `elapsedMs` values; confirm none returns `defeated:true`. (Statistical proof of non-bypassability.)

### Increment 6.5 — `renderer.js` extend: Band 6 display + boss UX
**File:** `stage9/renderer.js` (MODIFY, +30 LOC)  
Band 6: pass `darkZone` to `renderRing`. Add "BLIND ZONE" annotation below arena. On boss level (18): show `[BOSS]` label in HUD. Pass `elapsedMs` from active loop tick to CROSS button click handler. Hint text at boss: "calculate: last angle + elapsed × 45deg/s". On online failure: cycle hint ladder from `boss.js`.

**Effort:** M  
**Test:** `node tests/smoke-area.mjs games` — at a simulated Band 6 level, arena contains '█' chars; boss button is present at level 18.

---

## Phase 7 — Polish and Ship

### Increment 7.1 — `content.js` + `messages.js` update
**File:** `stage9/content.js` (MODIFY)  
Remove exported `bossDiagram` (replaced by `ring.js`). Update `serviceWorkerNotesText` to reference the dark zone and inference:

```
The service worker caches the seed endpoint for offline use.
Online: each observation resamples the starting angle — watching breaks what you track.
Offline (seed 0): the ring starts at a fixed angle. The rotation is learnable.
Band 6 dark zone hides the gap for part of each rotation.
Only a fixed seed makes that zone navigable by calculation.
Activate Offline Mode before attempting level 18.
```

**File:** `stage9/messages.js` (MODIFY, +20 LOC)  
Add band-unlock bell messages:
```js
export const bandMessages = {
  band2: "two rhythms now. I need to hold both.",
  band3: "the act of looking changed what I saw.",
  band4: "failure is not waste. failure is data.",
  band5: "I can see where I was. I can correct.",
  band6: "a zone I cannot see. I must calculate."
};
```

**Effort:** S  
**Test:** `node tests/smoke-area.mjs games` — stage mounts without reference errors.

### Increment 7.2 — `styles.css` polish
**File:** `stage9/styles.css` (MODIFY, +30 LOC)  
- `.s9-dark-zone` — '█' chars rendered in `#333` (dim, not pure white) via a `<span>` wrapper in the arena pre if needed, or via CSS custom property toggle
- `.s9-feedback.success` — brief green flash (0.8s fade)
- `.s9-feedback.bounce` — brief red flash
- `.s9-clarity-milestone` — pulse animation when clarity hits 25/50/75/100
- `@keyframes s9-pulse` for milestone
- Mobile: OBSERVE and CROSS buttons larger on touch screens (`@media (max-width:600px) button { min-height:44px }`)

**Effort:** S  
**Test:** Visual only; smoke checks no CSS parse errors.

### Increment 7.3 — `content.js` band label text + HUD copy
**File:** `stage9/content.js` (MODIFY, +20 LOC)  
Export band descriptor per band number:
```js
export const BAND_LABELS = ['', 'Signal', 'Interference', 'Collapse', 'Persistence', 'Echo', 'Blind Crossing'];
export const BAND_VERBS  = ['', 'WATCH AND TIME', 'HOLD MULTIPLE RHYTHMS', 'CHOOSE WHEN TO OBSERVE',
                                'MAP ACROSS RUNS', 'READ YOUR HISTORY', 'INFER OCCLUDED STATE'];
```
Use in `renderer.js` HUD: `level N / BandLabel — VERB`.

**Effort:** S  
**Test:** Smoke.

### Increment 7.4 — Bundle regeneration + gate pass
**What:** Run `node build/metagame/build.mjs` to rebuild `stage9/stage.generated.js`. Stage `stage.generated.js`. Run `node tests/smoke-area.mjs games` (green). Run `./scripts/check.sh --fast` (green).

**Effort:** S  
**Test:** `check.sh --fast` passes. Commit as a discrete green increment.

---

## Level configuration reference

| Band | Levels | rotSpeed | innerSpeed | tolerance | revealMs | darkZoneDeg | hasPhantom | hasGhosts |
|------|--------|----------|------------|-----------|----------|-------------|------------|-----------|
| 1 Signal | 1-3 | 30 | — | 30→24 | ∞ | 0 | false | false |
| 2 Interference | 4-6 | 30 | 45 | 20→14 | ∞ | 0 | false | false |
| 3 Collapse | 7-9 | 35 | — | 22→16 | 1500→1000 | 0 | false | false |
| 4 Persistence | 10-12 | 30 | — | 25→19 | ∞ | 0 | true | false |
| 5 Echo | 13-15 | 38 | — | 20→14 | ∞ | 0 | false | true |
| 6 Blind Crossing | 16-18 | 45 | — | 18→15 | 800 | 60→90 | false | true |

`tolerance` steps down by 3 deg per level within the band. `darkZoneDeg` increases from 60 (level 16) to 90 (boss level 18). `revealMs` is only active in Band 3 and Band 6.

---

## Non-bypassability proof (boss un-cheat)

**Online mode — why the boss is impossible:**
- Each OBSERVE press calls `getBossSeed` → `Math.random()` → new base angle ∈ [0, 360) uniform
- Base angle uncertainty = ±180 deg (half-range)
- At 45 deg/s, ±180 deg uncertainty = ±4 seconds timing uncertainty
- Human timing precision: ~±150 ms = ±6.75 deg at 45 deg/s
- Tolerance window: ±15 deg
- Probability of random hit: 30/360 = 8.3% per attempt
- BUT: every observation resets — the player cannot accumulate knowledge. Expected hits in N attempts: 0.083N (no learning). Boss requires a single confident hit, not a grind; the intent is "I know when to cross" not "I got lucky."
- Any "CROSS without OBSERVE" strategy: without observation, base angle is stale from the last `getBossSeed` call. Online, that was a random value. Same ±180 deg uncertainty.

**Offline mode — why the boss is solvable:**
- `getBossSeed` returns FIXED_OFFLINE_SEED = 0
- `makeRng(0).float()` → deterministic `baseAngle`
- Player presses OBSERVE once: ring displays. No resample. `revealExpiresAt = now + 800ms`.
- Player reads the angle visually (or counts), tracks through dark zone by arithmetic: `nextAngle = seenAngle + 45 * elapsedSec`
- Optimal press when `nextAngle ≈ 0 deg` (12-o-clock crossing)
- Required precision: ±15 deg at 45 deg/s = ±333 ms window. Human can aim within ±150 ms. Achievable.

**Code enforcement:** `recordObserverBossAttempt` in `boss.js` calls `game.crossAttempt` with the actual ring angle at press time. There is no code path that grants `defeated:true` without `crossAttempt.hit === true`. No bypass flag. No debug shortcut in production bundle.

---

## Prerequisites and ordering constraints

```
0.1 rng.js
  └─ 0.2 ring.js        (depends on rng.js for angle seed)
       └─ 1.1 game.js   (depends on ring.js angle functions)
            └─ 1.2 loop.js       (no dependency; can be done alongside 1.1)
                 └─ 1.3 renderer.js refactor   (depends on all of above)
                      ├─ 1.4 state.js reset    (no dependency; safe to do with 1.3)
                      ├─ 2.x Band 2 increments (sequentially on 1.3 chassis)
                      ├─ 3.x Band 3 increments
                      ├─ 4.x Band 4 increments
                      ├─ 5.x Band 5 increments
                      └─ 6.x Band 6 + boss     (6.3 boss.js MOD depends on game.js Band 6 config)
```

Increments within a phase (e.g. 2.1 → 2.2 → 2.3) are sequential.  
Phase 7 polish is independent of phase order; can be interleaved with any phase.  
Bundle regeneration (7.4) must run after every commit touching source files.

---

## Per-increment commit contract

Each numbered increment = one commit. Before committing:
1. `node tests/smoke-area.mjs games` — green
2. `node docs/games/metagame/stages/stage9/tests/*.test.mjs` — all pass
3. `node build/metagame/build.mjs` — rebuilds `stage.generated.js` without error
4. `git add stage.generated.js` — never commit stale bundle

Commit message format: `Stage 9 [X.Y]: <one-line description of new mechanic>`

---

## Summary table

| Phase | Increments | New mechanic introduced | Key files created/modified |
|-------|------------|------------------------|---------------------------|
| 0 Foundation | 0.1–0.2 | None (infrastructure) | `rng.js` NEW, `ring.js` NEW, `tests/ring.test.mjs` NEW |
| 1 Band 1 Signal | 1.1–1.4 | WATCH AND TIME | `game.js` NEW, `loop.js` NEW, `renderer.js` MOD, `state.js` MOD |
| 2 Band 2 Interference | 2.1–2.3 | HOLD MULTIPLE RHYTHMS | `ring.js` MOD, `game.js` MOD, `renderer.js` MOD |
| 3 Band 3 Collapse | 3.1–3.3 | CHOOSE WHEN TO OBSERVE | `ring.js` MOD, `game.js` MOD, `renderer.js` MOD |
| 4 Band 4 Persistence | 4.1–4.3 | MAP ACROSS RUNS | `game.js` MOD, `state.js` MOD, `renderer.js` MOD |
| 5 Band 5 Echo | 5.1–5.3 | READ YOUR OWN HISTORY | `ring.js` MOD, `state.js` MOD, `renderer.js` MOD |
| 6 Band 6 + Boss | 6.1–6.5 | INFER OCCLUDED STATE (boss non-bypassable) | `ring.js` MOD, `game.js` MOD, `boss.js` MOD, `renderer.js` MOD |
| 7 Polish | 7.1–7.4 | — | `content.js` MOD, `messages.js` MOD, `styles.css` MOD, bundle regen |
