# Stage 2 "Glyph Dungeon" — Expansion Build Plan

_2026-06-26. Based on research.md. Covers the ordered increment backlog for the D → E → F expansion
layer beyond the shipped A/B/C mechanics. Each increment is a green unit: one new mechanic, one
test assertion, independently verifiable by `node tests/smoke-area.mjs games`._

---

## Guardrails (read before any increment)

- **Determinism**: all new game state must derive from `world.seed`, `world.floor`,
  `world.stepCount`, or pure positional logic. No `Date.now()`, no `Math.random()`.
  Use the existing `makeRng(seed)` xorshift32 for any per-floor placement.
- **LOC caps**: soft 300, hard 500 per file. `view.js` is already at 370 LOC (over soft cap);
  add darkness/gas/resonance rendering only as small additions — do NOT add full new functions
  there. `monsters.js` is at 316 LOC; the D3/F2/F3 additions (~40 LOC total) keep it under 360
  (acceptable). `engine.js` is at 301 LOC; avoid adding to it.
- **Boss un-cheat is frozen**: `boss.js`'s `hasSearchPassage()` and `getBossLockState()` must
  NOT be touched by any expansion increment. Phase 1 loops forever and `defeatPossible: false`
  without the `actions.hasAction(2, "search_passage")` check — this is the load-bearing gate.
  The un-cheat is non-bypassable by design; preserve it exactly.
- **Bundle after every commit**: `node scripts/gen-metagame-bundles.mjs` regenerates
  `stage.generated.js`. Then `./scripts/check.sh --fast` before push.
- **Commit contract**: one increment per commit. Unit test green + `node tests/smoke-area.mjs
  games` passes before committing.

---

## Priority table — do these first

| Priority | Increment | Why first | Effort | Blocks |
|----------|-----------|-----------|--------|--------|
| 1 | **P1** Extend run to 13 floors | Without this, floors 7–13 don't exist; ALL D/E/F content unreachable | S | D1–D4, E1–E3, F1–F3 |
| 2 | **D1** Darkness module + last-seen `?` | Overflow biome's verb stated-but-unimplemented since day 1; most visible gap | M | D2, D3, D4 |
| 3 | **E1** Ice patches | First combo mechanic; standalone (no D-series dep); highest Cisterns replay impact | M | — |
| 4 | **F1** Kernel biome + pillar layout | Fifth biome is the expansion capstone; build it before F2/F3 so they iterate on a real floor | L | F2, F3 |

---

## Phase P — Prerequisites

### P1 — Extend run depth to 13 floors (S)

**What it adds**: raises `MAX_FLOOR` from 5 to 13 so the boss is reached after floor 13 instead of
floor 5. All existing biomes (Cisterns 4–6, Emberworks 7–9, Overflow 10+) become reachable in a
real run. No new mechanic — purely structural.

**Files to change**:
- `runloop.js`: `MAX_FLOOR = 13`. Check `descend()` for any hardcoded floor-count assumptions.
- `data.js` (stat scaling note): `spawnMonster` scales stats by `1 + (floor-1)*0.35`; floor 13
  yields ~5.2× floor-1 power. Verify `BASE_STATS` starting values are still competitive at that
  depth — if not, adjust `BASE_STATS.hp` from 30 to 40 and `BASE_STATS.atk` from 5 to 6.
  This is a balance tuning decision, not a mechanic.
- `help.js`: update the floor-count hint text to reference 13 floors.

**DO NOT CHANGE**: boss.js — the boss encounter triggers at `run.floor >= MAX_FLOOR` exactly as
before. The un-cheat path is unchanged.

**Test (one-liner)**: build floor 10 (`buildFloor("t", 10)`); assert `biomeForFloor(10).id === "overflow"` and `buildFloor("t", 13)` returns a valid world. Run `node tests/smoke-area.mjs games`.

---

## Phase D — Darkness (Overflow biome, floors 10+)

### D1 — Darkness module + last-seen `?` rendering (M)

**What it adds**: the one mechanic the Overflow biome promised but never delivered. Monsters beyond
the player's light radius now show as `?` at their LAST SEEN position, not simply hidden. The
visual `lightRadius()` in `view.js` already exists (it dims terrain to spaces on floors 4+); D1
promotes it from purely cosmetic to a game mechanic by adding last-seen tracking and making the
radius configurable per biome.

**Files to create**:
- `darkness.js` (~80 LOC):
  - `makeLastSeenStore()` → returns a `Map<monsterIndex, {x, y}>`.
  - `updateLastSeen(world, store)` → called each player step: for each alive monster, if within
    light radius write their position; delete entry when monster dies.
  - `effectiveLightRadius(world)` → reads `world.lightRadius` (set by biome, modified by lantern
    bonus); returns `{rx, ry}` or `null` for full-light floors.
  - `litCell(world, x, y)` → the shared lit/dark predicate used by view.js and monsters.js.

**Files to change**:
- `biome.js`: add `lightRadius` field to each biome entry:
  ```
  { id: "warrens",    lightRadius: null },        // full light
  { id: "cisterns",   lightRadius: null },        // full light
  { id: "emberworks", lightRadius: { rx: 9, ry: 5 } },
  { id: "overflow",   lightRadius: { rx: 7, ry: 4 } }
  ```
  Remove the `maxFloor: Infinity` on overflow (it already is the last entry so the fallback works).
- `floor.js` (`buildFloor`): add `world.lightRadius = biomeForFloor(floor).lightRadius` to the
  returned world object. Persist in the save blob (it's enumerable). `attachGrid` is unchanged —
  it reconstructs from `buildFloor`.
- `view.js`:
  - Replace the hardcoded `lightRadius(floor)` function body with a call to
    `effectiveLightRadius(world)` from `darkness.js`.
  - `reconcileSprites`: when a monster is off-radius AND has a last-seen entry in the store, place
    a `?` sprite at the stored `{x, y}` instead of dropping it. Use a separate sprite pool
    (`lastSeenEls: Map<index, el>`) so it does not pollute `mobEls`. Clear stale last-seen sprites
    when the monster dies or re-enters light.
  - Add `import { effectiveLightRadius, makeLastSeenStore, updateLastSeen } from "./darkness.js"`.
  - `paintExplore` calls `updateLastSeen(world, lastSeenStore)` each repaint.
  - **LOC check**: view.js is at 370 LOC; this adds ~30 LOC → ~400. Under 500 hard cap. Acceptable.

**Test**: unit test in `tests/` (new file `darkness.test.mjs`):
- Build a world, place a monster off-radius, call `updateLastSeen`, assert last-seen entry recorded.
- Move monster back into radius, assert it updates.
- Call `games` smoke area.

---

### D2 — Lantern consumable (S)

**What it adds**: a fourth consumable. Using it sets `world._lanternBonus = 3` and
`world._lanternSteps = 20`. Each player step in `runloop.js` decrements `_lanternSteps`; at zero,
clears `_lanternBonus`. While active, `effectiveLightRadius(world)` adds the bonus to `{rx, ry}`.
Placed as floor loot (same `placeConsumables` path) and in treasure hidden rooms.

Shop upgrade added alongside: **Lantern Cache** (cost 25G, max 1): start every run with one
lantern rune in `player.inventory.lantern`.

**Files to change**:
- `darkness.js`: `effectiveLightRadius` applies `world._lanternBonus` to the returned rx/ry.
- `consumables.js`:
  - Add `lantern` to `CONSUMABLES` dict and `CONSUMABLE_KEYS`.
  - `useConsumable` lantern branch: sets `world._lanternBonus = 3`, `world._lanternSteps = 20`,
    appends log line `"lantern rune — light expands for 20 steps."`.
- `runloop.js`: in `descend()` (after each step resolves), decrement `world._lanternSteps` if
  positive; clear `_lanternBonus` when it reaches zero.
- `data.js`:
  - Add `{ id: 'lantern_cache', name: 'Lantern Cache', desc: 'start each run with a lantern rune', max: 1, apply: (s) => { s.inventory.lantern = (s.inventory.lantern || 0) + 1; } }` to `SHOP_UPGRADES`.
  - Add to `SHOP_BASE` / `SHOP_GROWTH`: `lantern_cache: 25, 1`.
- `shop.js` (display): include `lantern_cache` in the rendered shop list.

**Test**: unit — `useConsumable(world, p, "lantern", ev)` sets `world._lanternBonus === 3`;
after 20 step-ticks, `_lanternBonus` clears. `games` smoke.

---

### D3 — Shadow-step void ref archetype (M)

**What it adds**: a new monster archetype (`shadow: true`, glyph `v`, name "void ref") that
disguises as a floor cell `.` when outside the player's light radius. When the player moves within
Manhattan distance 2 and the monster is in darkness, it teleports to the nearest dark floor cell
adjacent to the player, then acts on its next turn. Counter: lantern rune or freeze.

**Files to change**:
- `data.js` (MONSTERS): add `{ id: 'voidref', glyph: 'v', name: 'void ref', hp: 28, atk: 11, xp: 8, drop: 4, minFloor: 10, shadow: true }`.
- `monsters.js`:
  - Add `shadow` to `BEHAVIOURS` list so it copies to spawned monsters.
  - In `monsterTurn`, before the `ambush` branch: if `m.shadow`:
    1. If `litCell(world, m.x, m.y)` — visible, acts normally.
    2. If NOT lit AND `dist <= 2` — find the nearest dark open cell adjacent to player; if found,
       teleport (`m.x = spot.x; m.y = spot.y`), log `"something moves in the darkness —"`. The
       teleport target is the closest dark cell adjacent to the player position sorted by Manhattan
       distance — deterministic, no RNG.
- `view.js` (`reconcileSprites`): when `m.shadow && !litCell(world, m.x, m.y)`, render the monster
  sprite with glyph `.` and class `s2-c-floor` (blends into terrain); skip it from the last-seen
  `?` pool (shadow monsters deliberately leave no trace when in darkness).

**Test**: unit — place a shadow monster off-radius at dist 3 from player, advance dist to 2, call
`monsterTurn`, assert monster teleports to an adjacent cell. `games` smoke.

---

### D4 — Lights Out run modifier (S)

**What it adds**: a new Heat option `lights_out` that reduces the effective light radius by 2
cells for the entire run (+35% banked glyphs — the highest multiplier, a mastery signal). Available
in the shop's Heat panel once the Overflow biome has been reached at least once.

The existing `HEAT_PER_MOD = 0.25` is a flat rate. `lights_out` needs 0.35 — so the heat
calculation must support per-mod bonuses.

**Files to change**:
- `data.js` (RUN_MODS): add `{ id: 'lights_out', name: 'Lights Out', desc: 'light radius −2 whole run (+35% glyphs)', heatBonus: 0.35 }`.
  Give the other mods `heatBonus: 0.25` explicitly (replacing the global `HEAT_PER_MOD`).
- `data.js` (`runHeat`): change from `1 + HEAT_PER_MOD * count` to
  `1 + RUN_MODS.filter(m => runMods[m.id]).reduce((s, m) => s + m.heatBonus, 0)`.
- `darkness.js` (`effectiveLightRadius`): apply `world._lightsOutPenalty` (−2 to rx and ry) if
  set. `floor.js` sets `world._lightsOutPenalty = mods.run?.lights_out ? 2 : 0` in `buildFloor`.
- `shop.js`: show `lights_out` in the Heat panel only if `state.meta.bestFloor >= 10` (gate unlock
  behind reaching the Overflow once, so new players aren't overwhelmed).

**Test**: unit — `runHeat({ lights_out: true })` returns 1.35;
`runHeat({ swarm: true, lights_out: true })` returns 1.60. `games` smoke.

---

## Phase E — Hazard Chaining (combo verb, cross-biome)

### E1 — Ice patches (Cisterns floors 4–6) (M)

**What it adds**: the first combo mechanic. `freeze` rune on a `wet` floor cell converts it to
`ice`. When a monster steps onto `ice`, it slides one extra cell in its current movement direction.
If the slide lands on a chasm: instant kill. If it lands on a wall: stun 2 turns. The player also
slides on ice (same rule). Wet cells scatter naturally in Cisterns rooms (3–5 per room, always
visible as `~`). Ice cells render as `~` with a different colour class.

**Files to change**:
- `hazards.js`:
  - Add to `HAZARD_GLYPH`: `wet: "~", ice: "~"`.
  - Add to `HAZARD_CLASS`: `wet: "s2-c-wet", ice: "s2-c-ice"`.
  - Add `enterHazard` branch for `ice`: the slide extra-step is handled in `monsters.js` and
    `engine.js` (see below); `enterHazard` for ice just adds a log line for the player.
- `floor.js` (`hazardPlan`): for Cisterns floors (4–6), include `wet` type in the pool at a small
  density (3–5 wet cells per floor). This uses the existing `placeHazards` seeded path, so it is
  fully deterministic.
- `consumables.js` (`useConsumable` freeze branch): after applying `frozen` to nearby monsters,
  scan `world.hazards` for `wet` cells within radius 5 of the player; mutate their `type` to
  `"ice"`. Deterministic: no RNG, just a scan of the existing array.
- `monsters.js` (`monsterTurn`): after the greedy step resolves, if the landing cell is `ice`
  (check `world.hazardAt(target.x, target.y) === "ice"`):
  - Compute the slide direction (same as the move just made: `{dx: target.x - m.x, dy: target.y - m.y}`).
  - Find the slide cell (`{sx: target.x + dx, sy: target.y + dy}`).
  - If chasm at slide cell: set `m.hp = 0; m.alive = false`; log `"${m.name} slides into the chasm!"`.
  - If wall at slide cell: apply `applyStatus(m, "stun", 2, 1)`; log `"${m.name} slams into the wall!"`.
  - Otherwise: move monster to slide cell.
- `engine.js` (`step`, player movement): apply the same slide logic to the player after resolving
  their move (check if the destination cell is `ice`; slide + apply consequences).
- `styles.css`: add `.s2-c-wet { color: … }` and `.s2-c-ice { color: … }` CSS vars under the
  `[data-s2-biome="cisterns"]` selector (so the palette fits the Cisterns theme).

**Test**: unit (extend `combat.test.mjs` or new `ice.test.mjs`):
- Freeze on a wet cell flips it to ice.
- A monster stepping onto ice slides one extra step.
- A slide into a chasm kills the monster.
- `games` smoke.

---

### E2 — Acid pools (Overflow floors 10+) (M)

**What it adds**: a new hazard type, `acid` (glyph `%`). Stepping in acid applies `corrosion`
status (3 turns), which reduces the player's effective ATK by 2 while active. If the player has
a `burning` weapon affix when they step in acid, the burning affix is neutralised for that floor
(re-equipping the same weapon restores it). Monsters avoid acid (same `freeCell` rule as lava),
making acid a valid monster-funnel obstacle.

**Files to change**:
- `hazards.js`:
  - Add `acid: "%"` to `HAZARD_GLYPH`, `acid: "s2-c-acid"` to `HAZARD_CLASS`.
  - `enterHazard` acid branch: `applyStatus(player, "corrosion", 3, 2)` (new status type);
    if `player.affix === "burning"`, set `player._affixNullified = true`;
    log `"acid corrodes your cursor — ATK −2."`.
  - `hazardPlan`: add `acid` to the Overflow density tier (floors 10+).
- `status.js`: add `corrosion` to the `CONTROL` map (not DoT — it's an ATK debuff, not damage).
  Add `ICON.corrosion = "⚗"`.
- `engine.js` (attack calculation): when computing player ATK, subtract 2 if
  `hasStatus(player, "corrosion")`. Also: if `player._affixNullified`, skip `applyHitAffix`.
- `monsters.js` (`freeCell`): add `acid` to the hazard types monsters refuse to step on
  (alongside `lava` and `spikes`).
- `styles.css`: `.s2-c-acid { color: … }`.
- `data.js` (SHOP_UPGRADES): add **Acid Resistance** — `{ id: 'acid_resist', name: 'Acid Resistance', desc: '−1 corrosion ATK penalty per level', max: 3, apply: (s, n) => { s.acidResist = n; } }`.
  `engine.js` uses `acidResist` to reduce the 2-point penalty (floor to 0 at max 3 → but max is 3
  so at max the penalty is fully negated). Add to `SHOP_BASE/GROWTH`.

**Test**: unit — `enterHazard(w, p, "acid", ev)` applies corrosion; player atk reduced in next
attack calc; monsters refuse to step onto acid tile. `games` smoke.

---

### E3 — Wych-gas ceiling pockets (Emberworks floors 8–9) (M)

**What it adds**: on floors 8–9 in the Emberworks biome, some rooms have 0–3 ceiling gas pockets
(stored as `world.gasPockets = [{x, y}]`). They render as `"` (always visible — they pulse overhead).
When a fire tile is cardinally adjacent to a gas pocket position, `tickFire` triggers a ceiling
detonation at the pocket's position: 3×3 blast (`detonate`-style, power 8), hitting all creatures
within radius 1. The verb: read the gas topology before igniting, or walk a foe under a pocket
and then firebolt from range.

**Files to change**:
- `floor.js` (`buildFloor`): when `floorNum >= 8 && floorNum <= 9 && biome.id === "emberworks"`,
  scatter 0–3 gas pockets per room using `takeCell()` seeded through the existing floor rng.
  Add `world.gasPockets = gasPockets` (enumerable, saved in state blob).
- `fire.js` (`tickFire`): after the spread loop, for each active fire cell, check if any entry in
  `world.gasPockets` is cardinally adjacent (`Math.abs(f.x - p.x) + Math.abs(f.y - p.y) === 1`).
  If yes and not already detonated (`!p.blown`): set `p.blown = true`, call
  `detonate(world, { x: p.x, y: p.y, atk: 8, name: "gas pocket" }, player, events)`.
  Import `detonate` from `monsters.js`.
- `view.js` (`reconcileItems`): add rendering of `world.gasPockets` as `"` sprites with class
  `s2-c-gas` (always rendered, not lit-gated — the player can always see ceiling pockets).
  ~5 LOC addition.
- `styles.css`: `.s2-c-gas { color: … }` (a yellow-orange ceiling glow).

**Test**: unit — build a world with a gas pocket at (5,5) and a fire at (4,5); call `tickFire`;
assert `events.blast` set and nearby monster HP reduced. `games` smoke.

---

## Phase F — The Kernel (fifth biome, floors 13+)

### F1 — Kernel biome + open-plan pillar layout (L)

**What it adds**: the fifth biome. Floors 13+ use `generateKernel()` instead of the BSP generator:
3–6 large open chambers connected by single-tile "breach" openings, scattered with 3×3 solid
pillar obstacles (`█`). Monsters have extended sight (9) in the Kernel. All four prior verbs
(avoid/LOS/fire/darkness) are active simultaneously.

**Files to create**:
- `generate-kernel.js` (~150 LOC):
  - `generateKernel(rng, dims)` → returns `{ grid, rooms, hidden, decor }` (same shape as
    `generate()` so `buildGrid` in floor.js can swap it in).
  - Algorithm: place 3–6 large rectangular chambers (min 20×20) across the map with some overlap
    allowed; connect adjacent chambers via a single-cell "breach" (one open cell through the shared
    wall); scatter 2–4 solid 3×3 pillar blocks inside each chamber (solid wall `#`, not a hazard).
  - Reuse `attachHiddenRooms` from `generate.js` for hidden room placement.
  - Reuse `decorateRoom` from `structures.js` for loot markers.
  - Reuse `floodDistances` from `generate.js` to verify connectivity (every chamber reachable from
    the first).

**Files to change**:
- `biome.js`: add the Kernel entry BEFORE the final catch-all Overflow:
  ```
  { id: "kernel", name: "The Kernel", maxFloor: Infinity,
    lightRadius: { rx: 7, ry: 4 }, kernelLayout: true }
  ```
  Change Overflow's `maxFloor` to 12 (so Overflow is floors 10–12, Kernel is 13+).
- `floor.js` (`buildGrid`): when `biomeForFloor(floorNum).kernelLayout`, import and call
  `generateKernel(rng, dims)` instead of `generate(rng, dims)`.
  Add `import { generateKernel } from "./generate-kernel.js"`.
- `monsters.js` (`spawnMonster` or `buildFloor`): when `floor >= 13`, set `m.sight = 9` for
  all spawned monsters (Kernel monsters have extended sightlines across open chambers).
  Do this in `buildFloor` after spawning: `if (floorNum >= 13) for (const m of monsters) m.sight = 9`.
- `data.js` (SHOP_UPGRADES): add:
  - `{ id: 'dark_sight', name: 'Dark Sight', desc: '+1 light radius (max +2)', max: 2, apply: (s, n) => { s.darkSightBonus = n; } }`.
    `darkness.js effectiveLightRadius` adds `world._darkSightBonus` to rx/ry.
    `floor.js buildFloor` copies `mods.entity?.darkSightBonus` into `world._darkSightBonus`.
  - (Lantern Cache was already added in D2; Acid Resistance was added in E2.)
- `styles.css`: add `[data-s2-biome="kernel"]` CSS var block (dark stone palette, amber accent).

**Test**: unit — `buildFloor("kernel-test", 13)` uses kernel layout; `world.grid` contains pillar
blocks (`#` in non-perimeter positions inside a room); `floodDistances` from spawn reaches all
rooms. `games` smoke.

---

### F2 — Stack corruptor + cleanse rune (M)

**What it adds**: a new Kernel-only monster archetype (`overloaded: true`): the "stack corruptor"
(`S`) inflicts both `poison` AND `burn` in a single bite. A new consumable, `cleanse` (glyph `♦`,
name "antidote parse"), removes all active player statuses instantly. The decision: cleanse is
correct against a corruptor but wastes freeze coverage you might want to maintain; it is the first
consumable that is sometimes the wrong tool.

**Files to change**:
- `data.js` (MONSTERS): add
  `{ id: 'corruptor', glyph: 'S', name: 'stack corruptor', hp: 50, atk: 14, xp: 12, drop: 5, minFloor: 13, overloaded: true }`.
  Add `overloaded` to `BEHAVIOURS` list.
- `monsters.js` (`monsterBite`): add a branch:
  `if (m.overloaded) { applyStatus(player, "poison", 4, 2); applyStatus(player, "burn", 4, 2); }`.
  Place before the `if (m.venom)` line.
- `consumables.js`:
  - Add `cleanse` to `CONSUMABLES`: `{ glyph: "♦", name: "antidote parse", desc: "removes all active status effects" }`.
  - Add `"cleanse"` to `CONSUMABLE_KEYS`.
  - `useConsumable` cleanse branch: `clearStatuses(player); events.log.push("antidote parse — all effects purged.")`.
- `data.js` (CONSUMABLE_KEYS): already updated by the above.
- No view.js changes needed — cleanse uses the existing `♦` glyph shared by all consumables.

**Test**: unit — spawn a corruptor, call `monsterBite`, assert player has both `poison` AND `burn`
statuses; then `useConsumable(w, p, "cleanse", ev)` and assert `p.statuses` is empty.
`games` smoke.

---

### F3 — Resonance tiles (Kernel terrain) (M)

**What it adds**: sparse Kernel floor cells rendered as `∿` (class `s2-c-resonance`). Stepping
on one sets `world.resonanceAlert = 3` and broadcasts the player's position to all monsters within
20 tiles: they immediately set `m.chasing = true` regardless of LOS. The alert decrements by 1
each player step (in `runloop.js`) and at 0 the broadcast ends. Resonance tiles are always visible
(not dimmed by darkness) so the player is never surprised — but they are placed in routes toward
stairs, forcing the decision: fast-and-loud vs. slow-and-dark.

**Files to change**:
- `floor.js` (`buildFloor`): when Kernel floor (13+), after placing hazards, scatter 2–4 resonance
  tiles using `takeCell()` preferring cells within 12 tiles of the exit (to place them on likely
  stair-routes). Store as `world.resonanceTiles = [{x, y}]`.
- `hazards.js` (or inline in floor.js): No change to `HAZARD_GLYPH` — resonance tiles are NOT
  a hazard (no damage); they are a separate array `world.resonanceTiles`.
- `engine.js` (`step`, after player move): after resolving the move and before `monsterTurn`,
  check if `world.resonanceTiles?.some(t => t.x === world.pos.x && t.y === world.pos.y)`.
  If yes: `world.resonanceAlert = 3`; for every alive monster within Manhattan 20 of `world.pos`,
  set `m.chasing = true`. Log `"resonance pulse — every shadow knows where you are."`.
- `runloop.js` (`descend` / step hook): after each player step, if `world.resonanceAlert > 0`,
  decrement it. When it reaches 0, log `"resonance fades."`. Persisted in save blob.
- `view.js` (`reconcileItems`): render `world.resonanceTiles` as `∿` sprites with class
  `s2-c-resonance`. Use `!lit()` skip only for tiles completely outside view — resonance tiles
  override the darkness dim (always shown). ~8 LOC addition.
- `styles.css`: add `.s2-c-resonance { color: … ; animation: s2-pulse … }` — a subtle pulse
  animation that makes tiles visually identifiable without being distracting.

**Test**: unit — place player on a resonance tile, call `step`; assert `world.resonanceAlert === 3`;
assert a monster at dist 15 has `m.chasing === true`; advance 3 steps; assert `resonanceAlert === 0`.
`games` smoke.

---

## Ordered backlog summary

| # | Increment | Phase | Effort | New Files | Primary Modified Files | Test |
|---|-----------|-------|--------|-----------|----------------------|------|
| 1 | P1 — Extend to 13 floors | P | S | — | `runloop.js`, `data.js`, `help.js` | `buildFloor(t,10)` reaches Overflow |
| 2 | D1 — Darkness module + `?` | D | M | `darkness.js` | `biome.js`, `floor.js`, `view.js` | last-seen store + `?` render |
| 3 | D2 — Lantern consumable | D | S | — | `consumables.js`, `darkness.js`, `runloop.js`, `data.js` | lantern bonus clears after 20 steps |
| 4 | D3 — Shadow-step void ref | D | M | — | `data.js`, `monsters.js`, `view.js` | void ref teleports in dark |
| 5 | D4 — Lights Out modifier | D | S | — | `data.js`, `darkness.js`, `floor.js`, `shop.js` | `runHeat({lights_out:true}) === 1.35` |
| 6 | E1 — Ice patches | E | M | — | `hazards.js`, `floor.js`, `consumables.js`, `monsters.js`, `engine.js`, `styles.css` | freeze→ice→chasm kills monster |
| 7 | E2 — Acid pools | E | M | — | `hazards.js`, `status.js`, `engine.js`, `monsters.js`, `data.js`, `styles.css` | acid applies corrosion, atk reduced |
| 8 | E3 — Wych-gas pockets | E | M | — | `floor.js`, `fire.js`, `view.js`, `styles.css` | fire adj. to pocket triggers blast |
| 9 | F1 — Kernel layout + biome | F | L | `generate-kernel.js` | `biome.js`, `floor.js`, `data.js`, `monsters.js`, `styles.css` | floor 13 uses kernel layout |
| 10 | F2 — Corruptor + cleanse | F | M | — | `data.js`, `monsters.js`, `consumables.js` | corruptor bite → dual DoT; cleanse clears |
| 11 | F3 — Resonance tiles | F | M | — | `floor.js`, `engine.js`, `runloop.js`, `view.js`, `styles.css` | resonance alert fires + decrements |

---

## LOC budget notes

| File | Current LOC | Budget risk | Mitigation |
|------|-------------|-------------|------------|
| `view.js` | 370 | Soft cap exceeded (300); each D/E/F render addition risks 500 hard cap | Keep render additions to ≤5 LOC per increment (single `forEach` line for gas/resonance); if it hits 430+ after D1, extract `reconcileItems` block (~45 LOC) to `view-items.js` |
| `monsters.js` | 316 | Soft cap exceeded; D3+F2+F3 add ~40 LOC → ~356 | Acceptable (well under 500); no split needed unless further archetypes added |
| `engine.js` | 301 | At soft cap | Do NOT add to engine.js in this expansion; route new player-move checks through helpers in `darkness.js` and inline in `step()` as 2–3 line calls only |
| `renderer.js` | 400 | Over soft cap, approaching hard cap | No expansion tasks should touch renderer.js; it handles the game loop, not mechanics |
| `generate-kernel.js` | (new) 0 | Target ~150 LOC | Keep chamber placement + breach-carve + flood check within 150 LOC; if pillar scatter needs more, split to `kernel-pillars.js` |

---

## Boss un-cheat: load-bearing gates (DO NOT TOUCH)

The expansion does not modify the boss encounter. For reference, here is exactly why it is
non-bypassable and what to preserve:

1. **Load-bearing**: `getBossLockState()` in `boss.js` returns `defeatPossible: false` when
   `hasSearchPassage(actions)` is false. The renderer checks `defeatPossible` before applying
   any damage in phase 1 — the boss loops forever in phase 1 without the unlock.

2. **Non-bypassable check**: `actions.hasAction(2, ACTION_NAME)` where `ACTION_NAME = "search_passage"`
   is resolved by the real file-viewer's action history (the player must have genuinely searched
   for a passage in `cipher.txt`). This is not a game-state flag — it is a cross-system query
   into the viewer's own history that cannot be forged within the game.

3. **Hint ladder**: `lockedHintLadder` in `messages.js` escalates hints with each failed attempt,
   so players who grind see progressively clearer hints pointing at cipher.txt. This is the only
   graceful fallback and must remain.

4. **Preservation rule**: no expansion increment should add an alternative win path, modify the
   `phase` gate logic, or add a `skipBoss` flag. If an F-series biome pushes players to floor 13
   before the boss, ensure `runloop.js descend()` still routes `floor >= MAX_FLOOR` to the boss
   arena, not to a 14th exploration floor.

---

## After each increment: commit contract

```bash
# 1. Run the unit test for the new module (if created)
node docs/games/metagame/stages/stage2/tests/<new>.test.mjs

# 2. Rebuild the lazy bundle
node scripts/gen-metagame-bundles.mjs

# 3. Run the games smoke area
node tests/smoke-area.mjs games

# 4. Stage modified files + generated bundle
git add docs/games/metagame/stages/stage2/<files> docs/games/metagame/stages/stage2/stage.generated.js

# 5. Commit the single increment
git commit -m "Stage 2 <D1|D2|…>: <one-line description>"
```
