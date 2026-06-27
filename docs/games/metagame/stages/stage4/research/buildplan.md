# Stage 4 — Fractal Bastion: Build Plan

Translate research.md into a concrete, ordered increment list.
Each increment introduces ONE new mechanic, is independently testable, and maps to specific
files under `docs/games/metagame/stages/stage4/`. LOC caps: 300 soft, 500 hard per file.
Gate after every increment: `node tests/smoke-area.mjs games` (+ unit test if one exists).
After any source change: `node build/metagame/build.mjs` to regenerate `stage.generated.js`.

---

## Do-First Priority Table

These four items are blocking prerequisites — nothing else can be built until they exist.
Pick the top item and start; each one unblocks the next row.

| Priority | Increment | Why critical | Effort | Unblocks |
|----------|-----------|-------------|--------|---------|
| 1 | **A1** Fix determinism bugs in `state.js` | LCG seed leaks `Date.now`/`Math.random` — breaks replay, prestige, boss coordinates | S | All |
| 2 | **A2** Add `lsystem.js` — path generator | Enemy movement follows the L-system path; all engine and board code imports from here | M | B1, B2, B3 |
| 3 | **A3** Expand `state.js` — add integrity/enemies/waveGroup fields | `engine.js` reads/writes these; normalize must not lose them across saves | S | B2 |
| 4 | **B2** Add `engine.js` — game tick loop | Moving enemies, tower firing, integrity drain; everything wave-related runs through here | L | B4, C1, D1–D6 |

---

## Phase A — Prerequisites (no playable game yet; fix bugs + add foundations)

### A1 — Fix Determinism Bugs in `state.js` [S]

**What:** Two leaks break seeded reproducibility.

1. `normalizeTower` line 70: `tower.id || \`tower-\${Math.random()…}\``.
   Fix: `\`tower-\${tower.type || 'pulse'}-\${tower.x}-\${tower.y}\``.
   IDs must be derived from position + type, never from `Math.random()`.

2. `stageSeed` line 78: `context.seed || context.now || Date.now()`.
   Fix: remove `Date.now()` fallback entirely; use `'stage4default'`.
   The metagame framework always provides `context.seed`; the fallback must be a fixed string.

**Files:** `state.js` (2 line changes).

**Test:** `node docs/games/metagame/stages/stage4/tests/boss.test.mjs`
Confirm `defaultState({ seed: 'alpha' })` called twice produces identical recursion points
(determinism check already in the test suite). Also confirm `defaultState({})` (no seed) still
produces a stable result (not a different value every millisecond).

---

### A2 — Add `lsystem.js` — Seeded L-System Path Generator [M]

**What:** Pure module, no DOM, no state mutation. Exports:

```js
export function buildPath(seed, depth)   // → { tiles: [{x,y}…], entry, exit, recurveTiles: Set }
export function waveGroupDepth(waveNum)  // 1-5→1, 6-10→1, 11-20→2, 21-30→3, 31→3
export function pathTileIndex(tiles)     // → Map<key, indexOnPath> for fast O(1) tower range lookup
```

**Grammar:** Koch-curve variant.
- Axiom: `F`
- Rules: `F → F+F-F-F+F` (produces zigzag at depth 1; recurves at depth 3)
- Turtle: `F` = step forward 1 grid unit; `+` = turn right 90°; `-` = turn left 90°
- Grid: 40×40. Entry = top-left quadrant; exit = bottom-right quadrant.
- Depth 1: ~15 tiles (wave group 1-2). Depth 2: ~45 tiles, 2 branch junctions (wave group 3-4).
  Depth 3: ~120 tiles, recurve zones (wave group 5 and boss).
- Recurve detection: tiles visited more than once in depth-3 output → set `recurveTiles`.
- Branching (depth 2): the two branch junctions are seeded; tiles are tagged `{ branch: 'L'|'R'|null }`.
  Wave composition specifies `leftFraction` (0.6 or 0.4 seeded per-wave from run seed).

**Files:** create `lsystem.js` (~150 LOC).

**Test:** unit file `tests/lsystem.test.mjs`.
Assert: depth-1 path with seed='alpha' is stable across calls; entry/exit are distinct; all tiles
within [0,39]×[0,39]; depth-3 `recurveTiles` is non-empty; `waveGroupDepth(1)===1`,
`waveGroupDepth(11)===2`, `waveGroupDepth(21)===3`.

---

### A3 — Expand `state.js` — New Fields for Full TD [S]

**What:** Add to `defaultState` and `normalizeState`:

```js
integrity: 100,           // 0 = run failed; drains when enemy reaches exit
waveGroup: 1,             // 1-6 (6 = boss)
waveActive: false,        // true while a wave is running
waveNumber: 1,            // 1-31
enemies: [],              // live enemy objects (not persisted between waves)
towerNextId: 1,           // monotonic counter; replaces Math.random ID generation
```

Tower objects gain: `{ id, type, x, y, level: 1, abilityReady: true, abilityUsed: false }`.
Enemy objects (ephemeral, not saved): `{ id, type, hp, maxHp, x, y, pathIndex, speed, armor, slowImmune }`.

**Files:** `state.js` only (~20 LOC additions to default + normalize).

**Test:** `boss.test.mjs` still passes. Manual confirm: `defaultState({seed:'x'}).integrity === 100`,
`defaultState({seed:'x'}).waveNumber === 1`.

---

### A4 — Add `enemies.js` — Enemy Type Definitions [S]

**What:** Data-only module, zero DOM. Exports `ENEMY_TYPES` map and `spawnEnemy(type, seed, idCounter)`.

| Key | Shape glyph | HP | Speed | Armor | Special |
|-----|------------|-----|-------|-------|---------|
| `recursion` | `[ ]` | 50 | 1.0 | 0 | — |
| `pattern_crawler` | `/\` | 30 | 2.0 | 0 | fast |
| `null_packet` | `<>` | 60 | 1.0 | 0.5 | 50% armor |
| `resonance_ghost` | `<>` | 40 | 1.5 | 0 | slow-immune |
| `fractal_host` | `[[ ]]` | 120 | 0.8 | 0 | spawns 2 `recursion` on death |
| `depth_crawler` | `[##]` | 200 | 1.2 | 0.3 | elite |

Stats live in `ENEMY_TYPES`; no game logic here.

**Files:** create `enemies.js` (~80 LOC).

**Test:** inline assertions: `ENEMY_TYPES.null_packet.armor === 0.5`,
`ENEMY_TYPES.resonance_ghost.slowImmune === true`.

---

### A5 — Add `towers.js` — Tower Type Definitions and Upgrade Tables [S]

**What:** Data-only module. Exports `TOWER_TYPES` map and `towerUpgradeCost(type, fromLevel)`.

| Key | Glyph | Cost | Range | FireRate | Damage | Special |
|-----|-------|------|-------|----------|--------|---------|
| `pulse_node` | `[P]` | 80 | 3 | 1.0/s | 20 | — |
| `scatter_array` | `[S]` | 150 | 2 | 0.8/s | 12 AoE r=2 | hits all enemies in AoE |
| `null_spike` | `[N]` | 200 | 4 | 0.5/s | 40 | ignores armor |
| `attractor_field` | `[A]` | 120 | 3 | — | — | slow 50%, no slow-immune |
| `resonance_hub` | `[H]` | 250 | 5 | — | — | +30% DPS to adjacent towers |
| `cycle_extractor` | `[E]` | 250 | — | — | — | +25 Cycles per wave end |

Upgrade costs per level: L1→L2: cost×2; L2→L3: cost×4. Level-3 towers unlock active abilities:
- `pulse_node` L3: EMP Burst (AoE stun 2s, r=5, 30s cooldown)
- `null_spike` L3: Null Wave (strip armor on all enemies for 5s, 60s cooldown)
- `scatter_array` L3: Overcharge (triple damage burst for 3s, 45s cooldown)

**Files:** create `towers.js` (~120 LOC).

**Test:** inline assertions: `TOWER_TYPES.null_spike.ignoresArmor === true`,
`towerUpgradeCost('pulse_node', 1) === 160` (80×2), L3 ability exists on pulse_node.

---

## Phase B — Core Loop (Waves 1–5, PLACE verb; playable)

### B1 — Add `waves.js` — Wave Composition Definitions [M]

**What:** Defines what spawns in each wave. Wave 1-5 only for this increment.

```js
export function waveComposition(waveNum, seed) {
  // returns { enemies: [{type, count}], leftFraction: null, integrity: 100 }
}
```

Wave 1: 6 `recursion`. Wave 2: 9 `recursion`. Wave 3: 12 `recursion`.
Wave 4: 15 `recursion`, integrity bonus +5 if wave 3 survived clean.
Wave 5: 18 `recursion` + 1 extra Cycle reward hint ("cover corner tiles").

Spawn timing: one enemy every 1.5s. Between-wave gap: 5s.

**Files:** create `waves.js` (~100 LOC for waves 1-5; will grow in C1 and D7).

**Test:** `waveComposition(1,'x').enemies[0].type === 'recursion'`.
`waveComposition(5,'x').enemies.length >= 18`.

---

### B2 — Add `engine.js` — Game Tick Loop [L]

**What:** The core game loop. Exported functions:

```js
export function startWave(state, waveNum, pathTiles)   // populates state.enemies from wave composition
export function tick(state, deltaMs, pathTiles)         // moves enemies, fires towers, drains integrity
export function resolveDeath(state, enemy, pathTiles)   // on-death spawns, log, Cycles earned
export function waveComplete(state)                     // returns true if no enemies and wave active; awards Cycles, triggers next wave
```

**Tick logic:**
1. Move each enemy `speed × (deltaMs/1000)` steps along `pathTiles` index.
2. For each tower, find all enemies in range (`distance(tower, enemy) <= tower.range`).
   Apply fire rate (tower fires when `lastFired + 1/fireRate <= now`).
   Apply damage: `baseDmg × (1 - enemy.armor)` (or full damage if `ignoresArmor`).
   Attractor Field: reduce enemy speed by 50% while in range (skip if `enemy.slowImmune`).
   Resonance Hub: add 30% bonus to adjacent tower damage queries.
3. Enemy HP <= 0: call `resolveDeath`. Award `ENEMY_TYPES[type].reward` Cycles.
4. Enemy reaches `pathTiles.length - 1` (exit): drain `state.integrity -= ENEMY_TYPES[type].integrityDrain`.
   If `state.integrity <= 0`: set `state.waveFailed = true`.
5. On Fractal Host death: spawn 2 `recursion` enemies at same pathIndex.
6. `waveComplete`: if `state.enemies.length === 0 && !state.waveActive` after all spawned.

**Recurve double-damage:** if `pathTiles[pathIndex].recurve === true`, tower damage ×2 this tick.
This is the key depth-3 mechanic; engine checks the tile flag, not the wave number.

**File size target:** ~280 LOC. If it grows past 300, split path-traversal helpers into `pathing.js`.

**Files:** create `engine.js`.

**Test:** `tests/engine.test.mjs`.
Seed a depth-1 path; spawn 1 `recursion`; place `pulse_node` in range; call `tick` until enemy dead;
assert `state.cycles` increased and `state.integrity === 100`.
Spawn 1 enemy, place no towers, tick to exit; assert `state.integrity < 100`.

---

### B3 — Add `board.js` — ASCII Board Renderer [M]

**What:** Pure function, returns a string. No DOM manipulation.

```js
export function boardText(state, pathTiles, width=40, height=20)
```

Grid characters:
- `.` empty
- `-` / `|` path tile (horizontal/vertical segment from path direction)
- `+` path corner tile
- `~` recurve tile (second-pass highlight)
- `R` recursion point (from `state.recursion.points`)
- Tower glyphs from `TOWER_TYPES[type].glyph`: `[P]`, `[S]`, `[N]`, `[A]`, `[H]`, `[E]`
- Enemy glyphs from `ENEMY_TYPES[type].glyph`: `[ ]`, `/\`, `<>`, `[[ ]]`, `[##]`
- `>` entry tile; `X` exit tile

Enemy position is computed from `enemy.pathIndex` (integer) mapped to `pathTiles[index]`.

Board is 40 columns × 20 rows rendered as monospace. The existing renderer uses 24×12 — expand
the CSS grid and `<pre>` element to 40×20.

**Files:** create `board.js` (~130 LOC). Update `styles.css` for wider board.

**Test:** build a mock state with one tower and one enemy; call `boardText`; assert the tower glyph
and enemy glyph appear at the expected row×column positions. Assert path tiles (`-`, `|`, `+`) connect
entry to exit.

---

### B4 — Expand `renderer.js` — Game Loop + Click-to-Place [L]

**What:** Replace the current 3-button stub with a real TD renderer.

Remove:
- `"place pulse at next point"` button (auto-place bypass removed)
- `"run boss wave"` button (boss is triggered by reaching wave 31, not a button)
- `"open recursion_points.json"` button (CRITICAL: this is the bypass — the file must be
  found in the host sidebar; the button routes through `viewer.openFile` but also calls
  `applyRecursionBlueprintOpen` directly, making the un-cheat bypassable; remove the
  `applyRecursionBlueprintOpen` call from the click handler; only `viewer.openFile` should be
  called, and only the HOST's file-open dispatch should trigger `applyRecursionBlueprintOpen`).

Add:
- `"Start Wave N"` button: calls `startWave(state, state.waveNumber, currentPath)`; begins
  `requestAnimationFrame` tick loop calling `engine.tick(state, delta, currentPath)` then `repaint()`.
- Click-on-board placement: the `<pre>` click event maps mouse position to grid cell (character
  width/height offset math); opens a `<dialog>` or inline panel listing placeable tower types
  with costs; confirm calls `boss.placeTower(state, {x, y, type})`.
- Sell button on selected tower: calls `sellTower(state, towerId)` (70% refund, remove tower).
- Active ability buttons: appear for each L3 tower in the sidebar; clicking calls `useAbility(state, towerId)`.
- HUD: CYCLES / INTEGRITY / WAVE / WAVE GROUP text fields, updated on repaint.
- Path regeneration: when `state.waveNumber` crosses a group boundary (5→6, 10→11, 20→21),
  rebuild `currentPath = buildPath(seed, waveGroupDepth(state.waveNumber))` before starting the wave.

**requestAnimationFrame loop:** store `lastTs`; on each frame compute `deltaMs`; call
`engine.tick`; call `repaint`; if `waveComplete(state)` stop loop and update state.

**File size:** renderer.js will approach or exceed 300 LOC after this increment. Split into:
- `renderer.js` — DOM setup, event wiring, rAF loop (~250 LOC)
- `hud.js` — all `repaint()` helpers (update fields, log, points panel, board render call) (~120 LOC)

**Files:** expand `renderer.js`; create `hud.js`.

**Test:** `node tests/smoke-area.mjs games` — confirm stage 4 mounts, a Start Wave button appears,
and the board renders a path. No JS errors.

---

### B5 — Add `upgrades.js` — Sell/Refund + Extractor Passive [S]

**What:**

```js
export function sellTower(state, towerId)          // 70% refund, removes tower, recalculates coverage
export function upgradeTower(state, towerId)       // pays upgrade cost, increments tower.level
export function applyExtractorIncome(state)        // called on waveComplete: +25 Cycles per extractor tower
```

Sell refund = `Math.floor(TOWER_TYPES[tower.type].cost * Math.pow(2, tower.level - 1) * 0.7)`.
Upgrade rejects if `state.cycles < towerUpgradeCost(tower.type, tower.level)`.

**Files:** create `upgrades.js` (~80 LOC). Wire `sellTower`/`upgradeTower` into `renderer.js`.

**Test:** unit assertions: sell a pulse_node L1 → returns 56 Cycles (80×0.7). Upgrade L1→L2 costs
160 (80×2). Two extractors → `applyExtractorIncome` awards 50 Cycles.

---

## Phase C — Wave Groups 2 and 3 (MATCH + PORTFOLIO, Waves 6–15)

### C1 — Waves 6–10 (MATCH): Pattern Crawlers + Null Packets [M]

**What:**
- Extend `waves.js`: waves 6-10 compositions using `pattern_crawler` (wave 6-7) and `null_packet`
  (wave 8-10, mixed). Wave 6 intro text (via `pushLog`): "pattern crawlers: they sprint through
  sparse coverage."
- No new engine code; `enemies.js` already has the types. The MATCH mechanic is purely emergent:
  fast enemies expose low-fire-rate towers (existing engine behavior); armored enemies halve pulse
  node damage (existing armor formula).
- Add `scatter_array`, `null_spike`, `attractor_field` to the shop panel (available from wave 6).
  They are already in `towers.js`; just expose them in renderer's tower-select dialog.

**Files:** `waves.js` (extend to 50 LOC more); `hud.js` or `renderer.js` (add new tower types
to placement picker starting at wave 6).

**Test:** `waveComposition(6,'x').enemies.some(e=>e.type==='pattern_crawler')`.
Smoke: mount stage, start wave 6, confirm `pattern_crawler` glyph appears on board.

---

### C2 — Waves 11–15 (PORTFOLIO): Depth-2 Branching Path [M]

**What:**
- Extend `lsystem.js`: depth-2 path has two branch junction tiles.
  `buildPath(seed, 2)` returns `tiles` with `{ branch: 'L'|'R'|null }` tags.
  `leftFraction(seed, waveNum)` → seeded float 0.4–0.6 (alternates per wave using LCG).
- Extend `engine.js`: at a branch tile, each enemy's `branchChoice` (seeded from enemy id +
  wave seed) determines `'L'` or `'R'`. Append branch-specific tiles to enemy's remaining path.
  This is a one-time choice per enemy at the junction.
- Extend `waves.js`: waves 11-15. Wave 11 intro log: "path forks. both sides require coverage."
- Add `fractal_host` to waves 13-15.
- Extend `engine.js` `resolveDeath`: if `enemy.type === 'fractal_host'`, spawn 2 `recursion`
  enemies at `enemy.pathIndex`.

**Files:** `lsystem.js` (+60 LOC branch logic); `engine.js` (+40 LOC branch choice + host spawn);
`waves.js` (+50 LOC waves 11-15).

**Test:** depth-2 path has tiles tagged `branch:'L'` and `branch:'R'`. Fractal Host death spawns
exactly 2 recursion entries in `state.enemies`. Smoke: no JS errors on wave 11.

---

## Phase D — Wave Groups 4–5 + Economy (REPAIR + ANTICIPATE, Waves 16–30)

### D1 — Waves 16–20 (REPAIR): Resonance Ghost + Depth Crawler [M]

**What:**
- Extend `waves.js`: waves 16-20. Resonance Ghosts (slow-immune) from wave 16.
  Wave 20: 3 simultaneous `depth_crawler` mini-bosses (spawned at once, not queued).
- Extend `engine.js`: Attractor Field slow-application already checks `enemy.slowImmune` (was
  added as a no-op field in A4). Wire it: if `enemy.slowImmune`, skip the slow entirely even
  when the enemy is in the Attractor Field's range. Log "ghost passes through field."
- Add `resonance_hub` to the shop (available from wave 16). Resonance Hub's +30% adjacent bonus
  is already in engine.js tower-fire logic (A5 stub); verify it's wired.

**Files:** `waves.js` (+50 LOC); `engine.js` (wire slow-immune check, ~10 LOC); confirm
`resonance_hub` appears in placement picker from wave 16.

**Test:** engine unit: place Attractor Field, spawn `resonance_ghost` in range; tick; assert
enemy speed unchanged. Smoke: wave 16 mounts without error.

---

### D2 — Add `abilities.js` — Active Abilities [M]

**What:**

```js
export function useAbility(state, towerId, pathTiles, nowMs)
// dispatches to: empBurst, nullWave, overcharge
// sets tower.abilityUsed=true, tower.abilityCooldownEnd=nowMs+cooldownMs
// returns { ok, reason, ability }
```

- **EMP Burst** (`pulse_node` L3): stun all enemies within radius 5 for 2000ms. Set `enemy.stunUntil=nowMs+2000`.
  Engine tick: skip movement if `enemy.stunUntil > nowTs`.
- **Null Wave** (`null_spike` L3): set `state.armorStripped=true, armorStripEnd=nowMs+5000`.
  Engine applies 0 armor to all enemies while the flag is active.
- **Overcharge** (`scatter_array` L3): set `state.overchargeEnd=nowMs+3000`.
  Engine multiplies scatter damage ×3 while active.

Cooldown check: `towerId.abilityCooldownEnd <= nowMs` or never used.

**Files:** create `abilities.js` (~120 LOC). Wire `useAbility` into `engine.js` tick (check stun,
armorStripped, overcharge flags). Expose ability buttons in `hud.js` for each L3 tower.

**Test:** unit: EMP Burst stuns an enemy (stunUntil set). Cooldown rejects a second immediate use.
Overcharge triples scatter damage in one tick interval.

---

### D3 — Tower Upgrade Flow in Renderer [S]

**What:** Add an "Upgrade" button to the selected-tower panel (already in `upgrades.js`).
- Shows current level and cost of next upgrade.
- Grays out at L3.
- L3 reveals the ability button.

**Files:** `hud.js` (+30 LOC for upgrade panel rendering). No new logic — `upgrades.js` already
has `upgradeTower`.

**Test:** Smoke: click a placed tower → upgrade panel appears. Click upgrade (with sufficient
cycles) → level increments. At L3 → ability button appears.

---

### D4 — Waves 21–30 (ANTICIPATE): Depth-3 Recurve + Wave Preview Panel [L]

**What:**
Two distinct sub-features bundled as one wave-group transition:

**4a — Depth-3 Recurve mechanic:**
- `buildPath(seed, 3)` already produces `recurveTiles` in `lsystem.js` (planned in A2).
  Verify recurveTiles are non-empty at depth 3.
- Engine already multiplies damage ×2 on recurve tiles (added in B2).
- `board.js`: render recurve tiles as `~` (already planned in B3).
- Wave 21 intro log: "the path folds back. towers on overlap tiles deal double."

**4b — Wave preview panel:**
- Before the player clicks "Start Wave N", show a sidebar panel listing: next wave enemy types +
  counts; path depth for this wave group; if depth 3, which grid tiles are recurve zones
  (highlight them in the board with `~` even before wave start).
- This panel is `hud.js`: a `<div class="s4-wave-preview">` populated before `waveActive`.

**4c — Waves 21–30 compositions:**
- Extend `waves.js` with all enemy types mixed, increasing counts. Wave 25: all types simultaneously.
  Wave 30: max HP scaling (×1.5 to all enemy HP). All waves use `leftFraction` seeded branching.

**Files:** `waves.js` (+80 LOC); `hud.js` (+60 LOC wave preview); verify `lsystem.js` depth-3
output; verify `board.js` `~` marker; `engine.js` (verify recurve ×2 already wired from B2).

**Test:** `waveComposition(25,'x').enemies` includes all 6 enemy types.
`buildPath('alpha',3).recurveTiles.size > 0`. Smoke: wave 21 starts, `~` tiles visible on board.

---

## Phase E — Boss + Un-cheat Hardening (Wave 31 = The Infinite Loop)

### E1 — Wire Boss as Wave 31 (Non-Bypassable) [M]

**What:** The boss is not a button; it is wave 31.

**Remove from `renderer.js`:**
- The `"open recursion_points.json"` button's call to `applyRecursionBlueprintOpen`.
  The button may remain as a navigation hint (`viewer.openFile(path)` only), OR be removed
  entirely. The critical change: `applyRecursionBlueprintOpen` must ONLY be called when the
  host app's file-open dispatch fires with the correct path. The button must never set the action.
- The `"run boss wave"` button — deleted entirely.

**Add to `waves.js`:** `waveComposition(31, seed)` returns `{ isBoss: true, enemies: [] }`.

**Add to `engine.js`:** Boss wave mode:
- When `state.waveNumber === 31`, spawn The Infinite Loop as a persistent entity
  `{ type: 'boss', hp: 300, armor: LOCKED ? 'total' : 0 }`.
- LOCKED = `!hasRecursionBlueprint(ctx.actions)`.
- In LOCKED state: every damage calculation returns 0; log "TOTAL ARMOR — the loop regenerates."
  No amount of DPS, no ability, no upgrade, bypasses this. Integrity does NOT drain during boss wave
  (the boss is stationary at the exit; it does not traverse the path).
- In UNLOCKED state: tower damage applies only if the firing tower is within radius of a
  recursion point. Non-covering towers still fire but deal 0 damage to the boss. Log shows which
  towers are contributing.
- Boss defeat: `boss.hp === 0` → `state.boss.defeated = true` → `onStageComplete` fires.

**Why non-bypassable:** in LOCKED state, the JS code simply returns 0 for all damage. There is no
code path that skips the `hasRecursionBlueprint` check. The only way to change that check from
`false` to `true` is `actions.setAction(4, 'recursion_blueprint_read', ...)`, which is only called
from `applyRecursionBlueprintOpen`, which is only called from the host's file-open dispatch when
the user actually navigates the sidebar to the correct JSON path.

**Files:** `engine.js` (+60 LOC boss wave logic); `renderer.js` (remove bypass buttons, ~20 LOC
removed); `waves.js` (+10 LOC wave 31 stub).

**Test:** `boss.test.mjs` (existing): `fightInfiniteLoop` locked → 0 damage. Extend: boss wave
with LOCKED actions → integrity does not drain after 100 ticks. With UNLOCKED actions + covering
tower → boss HP decrements.

---

### E2 — Boss HP Loop + Integrity Regen [S]

**What:**
- Boss persists across tick calls until `boss.hp === 0`. If the player reaches wave 31 without
  all recursion points covered: boss is immune until the file is opened; the wave simply keeps
  looping with the boss stationary until the player reads the file.
- Integrity regen: `+10` per wave end (called in `engine.js` `waveComplete`), capped at 100.
  Never regens during boss wave (no wave-complete event until boss defeated).

**Files:** `engine.js` (+20 LOC boss persistence, integrity regen).

**Test:** `applyExtractorIncome` + integrity regen both fire on `waveComplete` but not during
boss wave. Smoke: full run to wave 31 (with seeded path) does not crash.

---

### E3 — Prestige System [S]

**What:** After boss defeat, show "Recursion Depth" prestige button.
- Clears run state except `recursionDepth` counter (increments by 1).
- Awards permanent bonuses (stored in `state`): +15% all tower damage per level; +50 starting
  Cycles per level.
- Unlocks new L-system grammar at depth 2+ (Sierpinski curve: different axiom/rules,
  different choke points). Expose as `export function buildPath(seed, waveDepth, grammar)` in
  `lsystem.js` with `grammar: 'koch'|'sierpinski'`.

**Files:** `state.js` (+20 LOC prestige fields in defaultState/normalize); `renderer.js` (+30 LOC
prestige button on boss defeat screen); `lsystem.js` (+30 LOC Sierpinski grammar).

**Test:** `defaultState` with `recursionDepth:1` has startingCycles=290. Smoke: prestige button
appears after boss defeat. `buildPath('x',1,'sierpinski')` produces a different tile set than
`buildPath('x',1,'koch')`.

---

## Phase F — Polish + Ship

### F1 — Log Messaging for Wave Group Transitions [S]

**What:** Each wave-group boundary fires a distinct `pushLog` + bell message:
- Wave 5→6: "pattern crawlers detected. match your tower types."
- Wave 10→11: "the path branches. portfolio coverage required."
- Wave 15→16: "resonance ghosts are field-immune. find the gap."
- Wave 20→21: "depth 3. the path recurves — pre-place on overlap tiles."
- Wave 30→31: "the infinite loop approaches. check the blueprint."

Add `waveGroupMessage(waveNum)` to `messages.js`.

**Files:** `messages.js` (+30 LOC); `engine.js` or `waves.js` (call on wave-group boundary).

**Test:** `waveGroupMessage(6)` matches /pattern crawlers/i. Smoke: log entries appear at correct
wave numbers.

---

### F2 — Styles: Path Color, Enemy Shape Markers, Tower Range [M]

**What:**
- `styles.css`: widen `.s4-board` to accommodate 40-char wide × 20-row board.
- Color coding via `<span>` wrappers in `board.js`:
  - Path tiles `- | +`: dim cyan (`var(--s4-cyan)` at 40% opacity)
  - Recurve tiles `~`: bright yellow (`var(--s4-yellow)`)
  - Tower glyphs: type-specific color (pulse=cyan, null_spike=magenta, attractor=blue)
  - Enemy glyphs: health-proportional color (full HP=green, half=yellow, low=red)
  - Recursion points `R`: bright white, bold
- Board function must return an HTML string (with `<span class="...">` wrapping) and the `<pre>`
  must use `innerHTML` instead of `textContent`. Sanitize: only color span wrappers, no user data.

**Files:** `board.js` (+60 LOC color spans); `styles.css` (+30 LOC color classes); `renderer.js`
or `hud.js` (switch from `textContent` to `innerHTML` for board pre element).

**Test:** Smoke: board renders colored output, no XSS vector (no user data in board string).

---

### F3 — Regenerate Bundle + Final Gate [S]

**What:** After every increment above, and one final time after F2:

```
node build/metagame/build.mjs
node tests/smoke-area.mjs games
```

Confirm `stage.generated.js` is updated and committed. Run the full suite once before tagging:
`./scripts/check.sh --fast`.

The `scripts/gen-metagame-bundles.mjs` wrapper (called by `check.sh`) will WARN if the bundle is
stale — `git add` the regenerated file before pushing.

**Files:** `stage.generated.js` (regenerated artifact, never hand-edited).

---

## Module Inventory After Full Build

| File | Status | Approx LOC | Concern |
|------|--------|-----------|---------|
| `state.js` | expand | ~160 | fields for enemies, integrity, waveGroup |
| `messages.js` | expand | ~70 | wave-group transition messages |
| `content.js` | unchanged | ~30 | recursionBlueprintContent |
| `boss.js` | minor expand | ~130 | sellTower wiring, boss armor check |
| `lsystem.js` | NEW | ~180 | path generation depth 1-3, grammar, recurve |
| `enemies.js` | NEW | ~90 | enemy type data |
| `towers.js` | NEW | ~130 | tower type data, upgrade costs |
| `waves.js` | NEW | ~220 | 31 wave definitions |
| `engine.js` | NEW | ~280 | tick, move, fire, drain, spawn, boss |
| `abilities.js` | NEW | ~130 | EMP Burst, Null Wave, Overcharge |
| `upgrades.js` | NEW | ~90 | sell/refund, extractor income, upgrade |
| `board.js` | NEW | ~190 | ASCII board render, color spans |
| `hud.js` | NEW | ~130 | repaint helpers, wave preview panel |
| `renderer.js` | expand | ~240 | DOM setup, rAF loop, event wiring |
| `styles.css` | expand | ~120 | wider board, color classes |
| `tests/boss.test.mjs` | expand | ~100 | extend with boss-wave + locked state |
| `tests/lsystem.test.mjs` | NEW | ~60 | determinism, depth, recurve |
| `tests/engine.test.mjs` | NEW | ~120 | tick, armor, slow-immune, fractal spawn |
| `stage.generated.js` | regenerated artifact | — | never hand-edit |

Largest files approach but do not exceed the 300 LOC soft cap. `engine.js` is the one to watch —
split `pathing.js` out of it if tick + path-traversal helpers together exceed 300 LOC.

---

## Key Constraints Carried Forward

**Determinism:** every random choice (path shape, branch fractions, enemy IDs, spawn order) must
flow from the LCG chain seeded by `context.seed`. No `Math.random()`, no `Date.now()` anywhere
in stage4 source after A1.

**Un-cheat hardening:** the "open recursion_points.json" button in the current renderer must NOT
call `applyRecursionBlueprintOpen`. Removing that call (or the button entirely) is the single most
important security fix. The boss LOCKED state is trivially bypassable as long as a UI button can
set the action flag.

**ASCII render:** all board output is a `<pre>` with character-art glyphs. No canvas, no SVG.
The `boardText` / colored `innerHTML` approach in `board.js` keeps it compliant.

**LOC cap:** if any new file is trending toward 400+ LOC mid-increment, split by concern
before the increment is committed, not after. Suggested split candidates:
- `engine.js` → `engine.js` + `pathing.js` (path-index → tile coordinate resolution)
- `waves.js` → `waves.js` (waves 1-15) + `waves-late.js` (waves 16-31)
