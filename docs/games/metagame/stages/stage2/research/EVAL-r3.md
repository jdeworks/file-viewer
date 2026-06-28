# Stage 2 "Glyph Dungeon" — Evaluator Report, Round 3

_Prepared 2026-06-27. Read-only code audit + unit test run. All source under
`docs/games/metagame/stages/stage2/`. No edits made._

---

## Scores at a Glance

| # | Dimension | Score | One-line verdict |
|---|-----------|-------|-----------------|
| 1 | Genre Fidelity | 7/10 | Solid roguelite loop; identification economy absent |
| 2 | Fun / Engagement | 7/10 | Torch/stealth and element combos are the high points |
| 3 | Theme Fit | 9/10 | Best-in-class; boss un-cheat is exemplary metagame design |
| 4 | Depth & Length | 4/10 | Estimated 15–25 min; 40–120 min target unmet; Act II is mechanic-dry |
| 5 | Difficulty Curve & Onboarding | 5/10 | Act structure is good; Act III foes arrive undocumented |
| 6 | Polish / UX / Readability | 6/10 | Critical help-text bugs; Act III systems undiscoverable |
| 7 | Determinism & Correctness | 8/10 | RNG clean; two minor non-makeRng calls; all tests pass |
| 8 | Replayability | 7/10 | Affix build variety + ghost tracking; Act II content thin |
| 9 | Technical Health | 7/10 | Modular; styles.css breaches 500-LOC hard cap |
| 10 | Un-cheat Discoverability | 9/10 | Hint ladder + load-bearing gate + real-app use = near-perfect |

**Weighted overall: 6.9 / 10**
(Depth and Fun double-weighted as the bottleneck dimensions.)

---

## Test Results

```
node --test docs/games/metagame/stages/stage2/tests/*.test.mjs

✔ boss.test.mjs   — 14 assertions, 0 failures
✔ combat.test.mjs — 69 assertions, 0 failures
✔ view.test.mjs   — 18 assertions, 0 failures

PASS  3/3 suites, 0 failures
```

All unit tests pass cleanly.

---

## What Round 3 Actually Built vs. Buildplan Intent

The buildplan.md describes an expansion to 13 floors (P1 prerequisite), then D/E/F
mechanics layered on top. The actual implementation made a different architectural
choice that is defensible but deviates:

### Built (beyond A/B/C)
- **3-act structure with act guardians** (`acts.js`, `floor.js:makeGuardian`):
  9 floors, Act I (Warrens 1–3), Act II (Cisterns+Emberworks 4–6), Act III (Overflow
  7–9). A Ω guardian with a mechanic-bearing trick blocks each act cap (floors 3, 6, 9).
  This is architecturally superior to the 13-floor plan — tighter pacing, clearer arc.
- **Darkness system, Act III** (`darkness.js`, `overflow.js`, `view.js`): effective
  light radius (6×3 tight ring, 15×8 torch flood), ghost tracking (last-seen `?` sprites
  for non-phantom foes beyond the ring), torch light-vs-stealth tradeoff
  (`torchSightBonus` draws foes farther while lit). The overflow guardian (floor 9) is a
  lighteater + phantom composite — the strongest single floor spike.
- **Overflow foes** (`data.js` + `overflow.js`): light eater (`e`, feeds on darkness,
  withers in torchlight), mirror (`M`, copies 85% of player ATK), null phantom (`ψ`,
  fast, leaves no ghost, pinned/slowed by torchlight).
- **Void rift hazard** (`hazards.js`): Overflow-specific tile that snuffs the torch and
  applies slow — the anti-complacency hazard for lit-up players.
- **Torch consumable** (`consumables.js`): 4th consumable, the core Overflow tool. Picks
  from an expanding loot pool (floor 5+ regular, floor 7+ double-weight).
- **Element matrix** (`elements.js`): fire/frost/acid/gas interaction table. frost-affix
  → frozen → shatter (bonus damage, thaws). acid-affix/flask → corroded → brittle
  (amplified next hit). fire+gas → gasExplosion. acid+frost → brittle shatter (combo).
- **Frost and acid weapon affixes** (`affixes.js`): 7 total affixes, up from 5.
- **Acid consumable** (`consumables.js`): corrodes nearby foes, enabling the
  acid→shatter combo with freeze.
- **XP / level-up system** (`engine.js:awardXp`): per-kill XP, level-up boosts HP + ATK
  by base + per-level shop upgrades.
- **Torchbearer shop upgrade** (`data.js`): permanent starting torches + extended burn
  duration per level.

### Planned in buildplan.md but NOT built
- D3 (shadow-step void ref): no `voidref` in `data.js:MONSTERS`. The unsigned floor
  has no "dark floor cell hides a monster" tension.
- D4 (Lights Out run modifier): `data.js:RUN_MODS` only has swarm/no_potions/elite_storm.
- E1 (ice patches on Cisterns): no `wet` or `ice` type in `hazards.js`. The freeze
  rune is still pure AoE crowd control; no chasm-slide kill.
- E2 (acid terrain pools): acid exists as element/affix/consumable but NOT as a floor
  hazard. Monsters do not avoid acid; player ATK is not reduced by corrosion on self.
- E3 (wych-gas ceiling pockets): `fire.js:tickFire` has no gas-pocket adjacency check.
- F1/F2/F3 (Kernel biome, resonance tiles, stack corruptor): entirely absent.

**Net assessment**: round 3 delivered a solid, restructured Act III with the darkness
verb. But Act II (floors 4–6) received no new decision structure — it plays identically
to A/B/C with bigger numbers. The "combo mechanic" milestone (E-series) is completely
absent, which is the primary reason the depth and length scores are low.

---

## Dimension Justifications

### 1. Genre Fidelity — 7/10

The core roguelite contract is met: procedural BSP floors (seeded, deterministic), a
meta-loop that banks progress across deaths, escalating monster archetypes (A1), hazard
terrain as both threat and tool (A2), and now a genuine darkness-management verb in Act
III. The element matrix (frost→shatter, acid→brittle, fire+gas=explode) is the best
genre-faithful addition this round — systemic cross-interactions are the signature of the
best roguelites (Brogue's fire, DCSS's Shoals).

What's missing: the **identification loop** that John Harris's "Eight Rules" cite as the
depth driver. Items are always known; the "informed gamble" mechanic (do I risk this
unknown scroll?) is entirely absent. Weapon affixes add horizontal variety but not
epistemic risk. The result is a competent roguelite-adjacent game rather than a deep one.

### 2. Fun / Engagement — 7/10

Three moments deliver genuine satisfaction: (a) a torch-in-darkness sweep that reveals
three monster ghosts simultaneously — spatial memory made visceral; (b) a freeze-rune +
shatter combo that vaporises a high-HP elite for bonus damage; (c) a faction infighting
setup where you bait two camps into a spore-hazard corridor and firebolt the cloud. These
are all emergent from existing systems combining — exactly the design goal.

The core loop's drag: bump-attack is still mechanical and low-read; the player fires the
same rhythm regardless of floor. The absence of ice patches (E1) means freeze stays a
lock spell, not a positioning tool. The gap between "figured out the systems" and "ran
out of content to explore" is floor 6 — Act III starts, but the 9-floor run ends shortly
after the player learns the torch tradeoff. No run tension survives past floor 8.

### 3. Theme Fit — 9/10

Exemplary. Every system is thematically grounded: monsters are runtime errors (null
pointer, segfault, fork bomb, null phantom, stack overflow), weapons are parse tools
(regex lance, compiler axe, kernel scythe), the boss is "THE AMBIGUOUS EXPRESSION", the
ghost-tracking glyph is `?` — the literal programmer uncertainty symbol. The biome arc
(Warrens → Cisterns → Emberworks → The Overflow) maps to a program's lifecycle (memory
allocation → I/O → processing → runtime overflow). The boss un-cheat (open the real
file viewer, search cipher.txt, find PASSAGE:247, mark it) is the best single design
decision in the entire metagame: it teaches the app while providing the most memorable
player moment.

The only theme note: "light eater" and "mirror" are slightly generic names for
Overflow-act foes. Renaming mirror to "copy constructor" or light eater to "null sink"
would sharpen the theme.

### 4. Depth & Length — 4/10

**This is the critical gap.** Target is 40–120 minutes. Estimated actual:
- Floor-by-floor exploration at ~2–3 min/floor = ~20–27 min raw.
- First run death + rerun: adds ~15 min.
- Multiple boss-gate cycles: adds 10–20 min.
- Total realistic first-session: 25–40 min for a competent player.

But here is the structural problem: **Act II (floors 4–6) has NO new mechanic** relative
to A/B/C. A player who understands the A/B/C systems can coast through floors 4–6 on
prior knowledge. The only new tension arrives at floor 7 (Act III). That means floors
4–6 are a 6–9 minute stretch with no learning, just bigger numbers — the definition of
pacing dead time.

The E-series (ice patches, acid terrain, wych-gas) exists precisely to fill Act II. E1
alone (ice patches on Cisterns) would introduce a spatial positioning puzzle (slide a
frozen foe into a chasm) that requires thinking from the first Cisterns floor. Without
it, the 40-min floor is only reachable on replays, and only for players motivated by
the meta-loop — a thin hook.

Content count: 9 floors, 4 biomes (no Kernel), 5 consumables (blink/firebolt/freeze/
torch/acid), 7 affixes, 6 hidden-room types, 3 run-mods, 9 shop upgrades. This is a
reasonable system set but it's sparsely spread over the act structure.

### 5. Difficulty Curve & Onboarding — 5/10

The 3-act structure is the right skeleton: Act I teaches combat, Act II introduces
hazards and fire, Act III adds darkness. Act guardian spikes (Ω at floors 3/6/9) are
correctly positioned — each one is the hardest moment in its act band. The Act II
guardian (explodes + splits) is a well-designed hazard spike.

Two major problems:

First, `help.js` line 5 says **"Descend 5 floors"** when the game is 9 floors. This is
not a minor inaccuracy — it's the player's first information about how long the game is.
A player expecting 5 floors reaches floor 6 and has no mental model for what remains.

Second, Act III mechanics arrive entirely without documentation. The torch, void rift,
ghost tracking, and three new monster types (light eater, mirror, phantom) have no help
text. The `help.js` "Darkness" section says "your sight shrinks — you only see a radius
around @, and foes loom out of the dark" — no mention of ghosts (`?`), torches, rifts,
or any of the three Overflow foes. A player entering floor 7 has been given no mental
model for what they are about to encounter.

The objective-bar text (`renderer.js:143`) does show `"— torch lit (N steps)"` or
`"— DARK: foes hide beyond your light; ghosts mark where you last saw them"` in the
HUD — this partial inline hint is the sole point of Act III onboarding.

### 6. Polish / UX / Readability — 6/10

**Strengths**: biome-per-data-attribute CSS recolouring (no DOM cost), sprite animation
(lunge + dissolve), ghost sprites with correct `opacity` + `grayscale`, mobile d-pad
responsive layout, write-guarded DOM updates in `paintHud()`. The objective bar with
inline torch status is a genuinely elegant informational layer.

**Gaps**:
- `help.js` says "5 floors" (wrong floor count — blocker).
- Overflow foes (`e`, `M`, `ψ`) and acid consumable (`≀`) not in the on-screen legend
  or any help section.
- Torch not mentioned in help; light-vs-stealth tradeoff (torch draws foes farther via
  `torchSightBonus`) is critical information the player must discover through death.
- `s2-bossmeta` div is always visible and shows internal lock state
  (`"LOCKED / north pillar silent / gap 0"`) — this leaks implementation detail to the
  player before they've reached the boss. Consider hiding until boss.reached.

### 7. Determinism & Correctness — 8/10

**Clean**: xmur3+mulberry32 seed pipeline throughout; floor generation fully reproducible
from `${runSeed}:${floorNum}`; hazard/trap arrays saved verbatim; grid non-enumerable
so it's excluded from save and rebuilt deterministically on load; ghost tracking is pure
derived state (not saved, rebuilt on next paintExplore).

**Acceptable**: `damageNoise()` in `runloop.js:76` uses `Math.random()` for the glitch-
text overlay on taking damage. This is cosmetic — it does not affect game logic, RNG
state, or deterministic floor generation. Accepted.

**Minor technical debt**:
1. `nearbyOpen()` in `consumables.js:40–51` uses a hand-rolled LCG keyed on
   `world.pos.x ^ world.pos.y ^ world.stepCount` rather than `makeRng`. For the blink
   rune, this means the teleport destination is not reproducible from a save (it depends
   on the mutable positions at the moment of use). Not a bug in practice since blink is
   a tactical escape tool, but it deviates from the stated determinism contract.
2. Same pattern in `traps.js:82–84` for the blink trap.
3. `state.js:defaultState()` does not initialise `meta.runMods`. `runloop.js:runMods()`
   gracefully handles this with `|| {}`, but `normalizeState()` does not merge it into
   a loaded state, so a loaded save missing `meta.runMods` does not have the field
   set directly (shop.js accesses it via `|| {}` fallback — fine in practice, minor).

### 8. Replayability — 7/10

Strong structural pillars: meta-loop (die → bank → upgrade → retry) never resets to
zero. Seven weapon affixes (vampiric/cleave/burning/knockback/double/frost/acid) create
build identity — a frost-affix run plays around the freeze→shatter rhythm; a burning
run has fire synergy with the spore fields. Three heat modifiers reward replay for
veterans. Six hidden-room types ensure exploration variance. Ghost-tracking as a spatial
memory skill increases in value each run.

Limiting factor: Cisterns (floors 4–6) is the same decision set every run — hazard
avoidance + ranged LOS management. Without ice patches (E1) or wych-gas (E3), neither
room nor terrain offers novelty past the first run. The player's motivation to reach
Act III "one more time" is the main replay driver, but the Act II stretch is a
cost they pay to get there, not a pleasure.

### 9. Technical Health — 7/10

**Modular**: 25+ focused source files, clean separation of concerns. No file imports
create a cycle. The element matrix in `elements.js` is a well-isolated data table.
`overflow.js` correctly splits the Overflow-foe behaviours out of `monsters.js` to
keep that file under the hard cap.

**LOC status** (from `wc -l`):
- `renderer.js`: 456 — soft cap exceeded (300), under hard cap (500). Acceptable.
- `view.js`: 411 — same.
- `monsters.js`: 325 — same.
- `engine.js`: 308 — same.
- **`styles.css`: 537 — EXCEEDS the 500-LOC hard cap.** `scripts/loc-check.sh` will
  flag this. The CSS is not vendored, so it is subject to the cap.

The generated `stage.generated.js` (3207 lines) is excluded from the cap as a build
artifact.

`damageNoise` using `Math.random()`: cosmetic only; no determinism concern.

No dead code detected. All exports are consumed. The `world.__fvStage2` debug hook in
`renderer.js:327` is correctly cleaned up in `destroy()`.

### 10. Un-cheat Discoverability — 9/10

The boss un-cheat is the strongest element in the game and should not be touched. It
passes all three load-bearing tests:

1. **Load-bearing**: `getBossLockState()` returns `defeatPossible: false` when
   `hasSearchPassage(actions)` is false. `damageUnlockedBoss` is never called without
   the lock check. Phase 1 loops forever.
2. **Non-bypassable**: the gate is `actions.hasAction(2, "search_passage")` — a
   cross-system query into the viewer's actual action history that the game code cannot
   forge.
3. **Teaches the real app**: the player must genuinely open `cipher.txt` in the file
   viewer, search for PASSAGE, and mark line 247. This is the metagame's entire reason
   for existing.

The hint ladder (`lockedHintLadder` in `messages.js`) escalates over 4 failed boss
attempts from abstract ("the arena has structure") to fully explicit ("search cipher.txt
for PASSAGE. mark PASSAGE:247, then return."). The UX for this path is solid.

Minor note: the `s2-bossmeta` div leaks the technical lock-state string to the player
even before they reach the boss, phrased as `"LOCKED / north pillar silent / gap 0"`.
This exposes implementation detail. Consider showing this div only after `boss.reached`.

---

## Top Issues (prioritized)

### BLOCKER — B1: help.js says "5 floors", game has 9

`help.js:5` reads `"Descend 5 floors, then beat THE AMBIGUOUS EXPRESSION"`. The actual
game is 9 floors across 3 acts. This is the first text every player reads. A player
expecting 5 floors loses all mental orientation at floor 6 and may assume the game is
broken. Fix is trivial: update to `"Descend 9 floors across three acts — then beat THE
AMBIGUOUS EXPRESSION at the bottom."` While editing, note that `help.js` also says
`"Pink ♦ runes"` (Runes section) but only lists blink/firebolt/freeze — missing torch
(the primary Act III tool) and acid flask.

### BLOCKER — B2: Act III foes and systems absent from all player-facing text

`help.js` has zero mention of: light eater, mirror, null phantom, torch, rift hazard,
ghost tracking, or the torch aggro tradeoff. The only Act III coverage is one vague
"Darkness" line. The result: a player who reaches floor 7 has no model for why monsters
are gaining ATK every turn, or why a mirror enemy is suddenly dealing their own ATK back
at them, or why stepping on `○` killed their torch. Fix: add "Darkness" and "Overflow"
sections to help.js covering: torch use + aggro cost, ghost tracking, rift hazard, the
three new foe types.

### MAJOR — M1: Act II (floors 4–6) has no new decision structure

The Cisterns and Emberworks biomes (Act II, floors 4–6) introduce no mechanic beyond
what A/B/C shipped. They have larger floors and higher monster stats, but the decision
set is identical to floor 3. This 6–9 minute stretch is the game's biggest drag on
session length. E1 (ice patches on Cisterns) is the most targeted fix: 50–70 LOC across
`hazards.js` (add `wet`/`ice` types), `floor.js` (scatter wet cells on Cisterns floors),
`consumables.js` (freeze rune converts wet → ice), `monsters.js` (post-move ice slide),
and `engine.js` (player slide). The resulting freeze→slide→chasm kill is the highest
skill-expression moment the game doesn't currently have.

### MAJOR — M2: styles.css at 537 LOC — over the 500-line hard cap

`docs/games/metagame/stages/stage2/styles.css` is 537 lines. `scripts/loc-check.sh`
enforces the 500-line hard cap on all project files. The excess is in the shop + help
panel styles (lines ~380–538). Fix: extract those ~120 lines to `styles-overlays.css`
(loaded alongside the main sheet) to bring the main file under 450 lines.

### MAJOR — M3: Session length 15–25 min vs. 40–120 min target

With 9 floors and no new Act II mechanic, first-session time is 15–25 min for a player
who understands roguelites. The meta-loop (die → upgrade → retry) extends this, but only
if the player is engaged enough to retry. Three partial fixes:
- Implement E1 (ice patches) to fill Act II.
- Implement D4 (Lights Out run mod) to add a mastery replay track.
- Add one more shop upgrade row tied to the new systems.

### MINOR — m1: nearbyOpen() / blinkCell() use hand-rolled LCGs, not makeRng

`consumables.js:40–51` and `traps.js:82–84` use inline LCG hash functions instead of
`makeRng()` from `rng.js`. This means blink teleport destinations are not reproducible
from a save-reload in the same game session. Not a player-facing bug (blink is
inherently tactical), but it violates the determinism contract. Fix: replace with
`makeRng(\`${world.seed}:blink:${world.stepCount}\`)`.

### MINOR — m2: s2-bossmeta leaks lock-state before boss.reached

`renderer.js:83–85` renders `s2-bossmeta` (with `"LOCKED / north pillar silent / gap 0"`
text) for all players, even on floor 1. This is a spoiler and exposes internals.
Fix: add `hidden` to the `s2-bossmeta` element in the template; remove it only when
`state.run.boss.reached` is true (which `paintHud()` already checks for related elements).

### MINOR — m3: meta.runMods not initialized in defaultState

`state.js:defaultState()` does not include `meta.runMods`. `normalizeState()` does not
merge it. The shop creates it lazily (`meta.runMods = meta.runMods || {}`), which is
safe but inconsistent with how `meta.shopUpgrades` and `meta.floorsCleared` are
initialized. Fix: add `runMods: {}` to the `meta` object in `defaultState()`.

### MINOR — m4: legend missing Act III glyphs

The on-screen legend (renderer.js:48–62) shows `@/s/!/>/≈/^` but not `e/M/ψ/○/†`.
The light eater (`e`), mirror (`M`), null phantom (`ψ`), void rift (`○`), and torch
(`†`) all appear in Act III. A second legend row below the stair/lava/spike row would
cover them.

---

## Top Opportunities

### O1: E1 — Ice patches on Cisterns floors 4–6 (highest leverage)

The most direct path to raising Depth, Fun, and Replayability simultaneously. A freeze
rune already exists; the only new concept is `wet` cells (scattered by `floor.js` in
Cisterns rooms) that the freeze rune converts to `ice`. After conversion, any monster
stepping onto an `ice` cell slides one extra step in its current direction: into a chasm
= instant kill; into a wall = stun. The player also slides. This is the missing
"positioning puzzle" verb for Act II. Target: 60–80 LOC. The buildplan section E1 has
the complete spec.

### O2: Fix help.js for Act III (cheapest highest-impact fix)

Fixing "5 floors", adding torch/darkness/ghost/rift/overflow-foe coverage, and listing
the two new consumables requires no new code — only text. It's the highest
player-experience-per-minute fix available. Do it in the same commit as B1/B2 issues.

### O3: D4 — Lights Out run modifier (mastery signal, low cost)

One new entry in `data.js:RUN_MODS` (`{ id: 'lights_out', name: 'Lights Out', desc:
'light radius −2 (whole run) +35% glyphs', heatBonus: 0.35 }`) plus a
`_lightsOutPenalty` field read by `darkness.js:effectiveLight()`. This gives returning
players a clear "I have mastered Act III" mode and adds a 35% glyph bonus as incentive.
Gate behind `state.meta.bestFloor >= 7` in `shop.js` so it surfaces only after the
player has reached the Overflow. Target: 20 LOC total.

### O4: D3 — Shadow-step void ref (Act III tension deepener)

A new `voidref` monster (`v`, minFloor 7) that renders as `.` (floor glyph) when outside
the light radius — visually indistinguishable from empty floor. When the player moves
within distance 2 and the monster is unlit, it teleports to the nearest dark open cell
adjacent to the player and bites on the following turn. This adds "don't trust dark
floor cells" as a mental habit, which is exactly the kind of paranoia a darkness act
should cultivate. Counter-play: torch reveals all void refs in radius. The buildplan D3
section has the complete spec. Target: ~35 LOC.

### O5: Biome-synergy hint in the objective bar

When the player carries a burning affix weapon and enters Emberworks, the objective bar
could append `"— burning weapon synergizes with fire terrain"`. When frost affix enters
Cisterns, `"— freeze + wet floor = ice slide"` (once E1 is built). This costs zero new
mechanics and teaches the element matrix to players who haven't discovered it naturally.

---

## Overall Verdict

**6.9 / 10**

Round 3 delivered exactly what Act III promised since day one: darkness management as a
load-bearing mechanic, with ghost tracking, the torch light-vs-stealth tradeoff, three
thematically distinct Overflow foes, and the void rift hazard. The element matrix
(frost→shatter, acid→brittle, fire+gas=explode) is the round's sleeper success — it
transforms simple bump-attack into a multi-turn combo builder. The act guardian system
with three mechanically distinct Ω bosses adds clear escalation spikes.

The game's Achilles heel is Act II (floors 4–6): a 6–9 minute segment that introduces
no new decision structure relative to what A/B/C already shipped. The entire E-series
(ice, acid terrain, wych-gas) is absent, leaving the "combo mechanic" milestone
completely undelivered. The session-length gap (15–25 min vs. 40–120 min target) is
almost entirely explained by this void.

**The single most important round-4 action: implement E1 (ice patches on Cisterns
floors 4–6), simultaneously with fixing help.js's wrong floor count and adding Act III
content to the help text.** The ice-patch combo mechanic is the highest-leverage
mechanical addition (it fills the entire Act II gap), and the help-text fixes remove
an active onboarding blocker that makes the new Act III content invisible to most
players. These two tasks are independent and can be executed in a single commit pair.
