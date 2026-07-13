# Stage 2 "Glyph Dungeon" — Expansion Research

_Prepared 2026-06-26. Historical design reference, not an active backlog. The
current implementation is authoritative; unfinished work is tracked only in
[`TASKS.md`](../../../../../../TASKS.md)._

---

## 1. GENRE — What Defines the ASCII Roguelite Dungeon Crawler

### Defining traits (Berlin Interpretation + modern practice)

- Procedurally-generated levels, permadeath, turn-based grid movement, bump combat, persistent
  resource pressure (HP, tools, positioning).
- Items with uncertain identity; every run reshuffles what you know and what you risk.
- Monster escalation that outpaces raw stat growth — forcing tactical adaptation, not grinding.
- Emergent interactions: terrain + items + monsters combine into situations the designer did not
  script (fire spreads, gas explodes, ice slides monsters into chasms).

The identification loop (John Harris's "Eight Rules") underpins engagement: items are useful only
contextually, never universally. Players are always making informed gambles, not following a recipe.
Harris's "Race You Can't Win" rule matters most for depth pacing — monster difficulty must rise
faster than the player, so the tension arc never plateaus.

### The five best genre references and specifically what makes each fun

**1. Brogue (Brian Walker, BrogueCE fork active 2026)**
- _What makes it fun_: systemic terrain. Fire spreads into grass, ignites gas pockets, produces
  chain-detonations. Poison gas can be weaponised by throwing potions. Water creates
  ripples; lava emits light. The dungeon is an active participant, not a backdrop. Every item
  has lateral uses — a potion of darkness is an escape tool as much as a hazard. Depth introduces
  genuine lighting changes (deep floors go visually darker, altering ambient LOS) without new
  mechanics — just new consequences of existing ones.
- _Relevance_: fire spread and the darkness mechanic already planned for Glyph Dungeon derive
  directly from this model. Brogue's key insight: **one new interaction > one new stat.**

**2. Dungeon Crawl Stone Soup (DCSS, open source, ongoing)**
- _What makes it fun_: branch design as biome design. The Lair, Shoals, Snake Pit, Spider's
  Nest, Swamp each introduce a dominant environmental constraint (water-flow, poison gas, webs,
  tides) that changes the correct verb. You cannot play Shoals the same way you play Lair. The
  "no grinding" philosophy is enforced by finite per-floor XP and the "always descend" pressure.
  Each branch is a different question the player must answer.
- _Relevance_: this is the direct design model for Glyph Dungeon's biome bands. DCSS proves
  that the same combat engine can teach four different verbs if the environment changes.

**3. Caves of Qud (Freehold Games, 1.0 2024)**
- _What makes it fun_: character mutations that alter which mechanics are primary. A
  night-vision mutation changes darkness from a threat into an advantage. A pyrokinesis build
  weaponises fire terrain that punishes other builds. Replayability comes from perspective-shift,
  not new content. Emergent world-state ("story generator") means every run has a unique narrative
  texture even without scripted events.
- _Relevance_: Glyph Dungeon's weapon affixes (vampiric/burning/double) are a constrained
  version of this — the active affix changes which terrain hazards are offensive opportunities
  vs. risks. The "burning" affix transforms the Emberworks into a playground. This vector
  should deepen in the expansion.

**4. NetHack (devteam.net, 3.6.6)**
- _What makes it fun_: encyclopaedic item interactions and the knowledge economy. Veteran play
  is accelerated not by higher stats but by knowing what an uncursed scroll of genocide does, or
  that a wand of fire on an ice monster heals it. The dungeon branches (Gnomish Mines, Sokoban,
  Vlad's Tower) each impose a constraint the main dungeon does not (darkness in Mines; push-puzzle
  in Sokoban). Replayability = depth of the knowledge pool.
- _Relevance_: the hidden room types (vault, shrine, captive, trap) in Glyph Dungeon echo
  NetHack's special rooms. The expansion should deepen the knowledge pool — add room types and
  terrain interactions that reward learned pattern recognition.

**5. Cogmind (Grid Sage Games)**
- _What makes it fun_: build identity through found equipment and zone transitions. Moving to a
  new map is always the best escape vector, so zones are designed around exit positioning as the
  primary tension. The "dynamic depth" principle: players at any skill level can engage with
  whatever layer of detail they choose; the game never forces complexity on an unwilling player.
  Cogmind also pioneered per-zone ambient sound design that cues you to zone danger before you
  see a monster.
- _Relevance_: the branch stair (B5) is Glyph Dungeon's version of Cogmind's risk-exit choice.
  The expansion's Kernel biome should amplify that "exit as the most important cell" tension.

---

## 2. OUR CORE LOOP — The Existing Moment-to-Moment Game

### What is already built (A/B/C, shipped)

Glyph Dungeon is a fixed-camera, ASCII-art dungeon crawler running in the browser game modal.
Floors grow per-run-seed (200×200 → 900×900 at max depth), all generated deterministically.
The player `@` moves with arrow/WASD; bumping a monster trades blows. Glyphs bank as
meta-currency; deaths return to the shop but not to zero (roguelite).

**The biome model (verb per band):**

| Biome | Floors | The New Verb Introduced |
|---|---|---|
| The Warrens | 1-3 | Avoid terrain — route around visible hazards (spikes, spores) |
| Flooded Cisterns | 4-6 | Break line-of-sight — pillar play vs. ranged spitters; invisible trap awareness |
| Emberworks | 7-9 | Manage spreading fire — ignite spore fields offensively; don't self-immolate |
| The Overflow | 10+ | Manage darkness — STATED, NOT YET IMPLEMENTED (see D-series below) |

**Systems shipped in A/B/C:**
- A1: Monster archetypes (ranged, summon, explode, ambush). Each archetype demands a different
  tactical response: don't charge a spitter; kill the summoner first; kite an exploder.
- A2: Hazard tiles (spikes, spores, lava, chasm). Lava/chasm block monster pathing so terrain
  is both threat and tool.
- A3: Elite prefixes (armored/venomous/frenzied). Guaranteed cache drop rewards engagement.
- A4: Pressure spawn — off-screen wanderers materialize if you linger; anti-turtle valve.
- B1: Biome identity (CSS data-attribute; zero redraw cost).
- B2: Freed captive allies from hidden rooms (fight for you).
- B3: Consumable runes: blink (escape), firebolt (ranged strike + fire ignition), freeze (AoE lock).
- B4: Invisible traps: dart (bleed), alarm (mass-wake), blink (scatter), pit (hidden fall).
- B5: Optional branch stair — tougher floor, richer loot; player opts in.
- B6: Split monsters — die and spawn two weaker shards; punishes all-in burst.
- C1: Spreading fire — deterministic; bounded by spore fuel; the emergent-puzzle layer.
- C2: Weapon affixes — vampiric, cleave, burning, knockback, double-strike. Horizontal
  progression: changes HOW you play, not just numbers.
- C3: Heat (run modifiers) — Swarm / Drought / Elite Storm; opt-in difficulty for more glyphs.
- C5: Faction infighting — two rival monster camps bicker when not engaged with `@`; bait them.
- Hidden rooms: treasure, trap, teleport, shrine, vault, captive.

### Why the loop is fun right now

The core satisfaction is tactical compression: every decision to move into a tile involves reading
hazard type, trap probability, LOS to ranged foes, fire spread path, and whether the affix makes
engaging vs. repositioning correct. Players who understand all of A-C feel like detectives, not
button-mashers. The boss un-cheat (read `cipher.txt` in the real viewer to find PASSAGE:247)
is currently solid: it is load-bearing (the north pillar is literally inert without it) and not
bypassable (phase 1 loops forever). The boss structure respects both players who read the files and
those who grind attempts for the hint ladder.

---

## 3. THE EXPANSION ARC — Ordered Per-Sub-Stage New Mechanics

> PRINCIPLE: each sub-stage must introduce exactly ONE new verb — a new decision structure the
> player does not yet have. Not bigger numbers. The architecture mirrors what's already shipped:
> a letter-series (D, E, F) that each targets a specific depth band or cross-cutting concern.

### D-series: Darkness — implementing the stated Overflow verb (floors 10+)

The Overflow biome already exists in `biome.js` but its defining verb (darkness management) is
unimplemented. The D-series completes it.

**D1 — Light radius as a first-class world property**

Add `world.lightRadius` (default 7, dropping to 5 on floors 10-11, 4 on floors 12+). The
renderer already knows `world.pos` and the monster list. Tiles beyond `lightRadius` render as
dim glyphs (`░` instead of `.`) and monsters outside radius are shown as their LAST SEEN position
(`?`) rather than their current glyph. The verb: _patrol toward lit areas; never push solo into
dark corridors_.

- Implementation surface: `view.js` (render dim/dark cells), `renderer.js` (track last-seen
  positions), `biome.js` (add `lightRadius` per biome config).
- Determinism note: last-seen tracking is pure derived state from `world.pos` history; no RNG.
- New strategic decision: do you take the corridor you can see, or the shorter dark route to the
  stairs?

**D2 — Lantern rune (new consumable)**

A fourth consumable type (`lantern`): burns for 20 player steps, adds +3 to `world.lightRadius`
while active. Found as floor loot (same `placeConsumables` path) and in treasure hidden rooms.
Cost: one inventory slot. The verb: _ration light-sources — burn it now for safety or save it
for the boss floor_.

- Risk-reward: using a lantern to clear a dark cluster early is always correct. Using it to rush
  to the stairs instead of exploring is sometimes correct. The tension is meaningful because
  lanterns are finite and darkness is permanent on that floor.
- Synergy with B3 firebolt: a firebolt used in darkness illuminates the impact cell and adjacent
  spore tiles — a dual-use tool.

**D3 — Shadow-step monster archetype (new minFloor: 10)**

The "void ref" (glyph `v`) — disguises as a floor cell `.` when outside the player's light
radius. Unlike the ambush/dangling-ref (which disguises as a wall), a void ref on a dark floor
cell is visually indistinguishable from empty floor. It teleports adjacent when the player
moves within 2 tiles, then bites. The verb: _light the area before crossing — don't trust
dark floor cells_.

- Implementation: add `shadow: true` flag; in `view.js` render as `.` when outside light radius
  and `v` when lit. In `monsters.js monsterTurn`: if `m.shadow && !withinLight(world, m)`,
  teleport to adjacent dark cell near the player when `dist <= 2`.
- Counter-play: lantern rune reveals all void refs in range. Freeze rune catches them if you
  already know they're there. Stairwell Sense (compass) routes you around dark clusters.
- Determinism: the teleport target is the closest dark open cell to the player — deterministic,
  no RNG needed.

**D4 — "Lights Out" run modifier (new Heat option)**

Add to `RUN_MODS`: `lights_out` — permanent `world.lightRadius -= 2` for the whole run (+35%
banked glyphs). Forces lantern economy from floor 1. Intended for players who have completed the
boss once and want a fundamentally different challenge.

---

### E-series: Hazard chaining — teaching the combo verb (cross-biome, floors 5+)

Once the player has mastered four individual verbs (avoid, break-LOS, fire, darkness), the
E-series introduces the fifth: _chain two systems together for an outcome neither produces alone_.
This is the "combo" verb of roguelites (the ice-slide into a chasm, the firebolt-on-wet-floor
freeze-chain).

**E1 — Ice patches (Cisterns: floors 4-6, second-half reveal)**

A new terrain state: `wet` floor cells that the freeze rune converts to `ice` (glyph `~`,
class `s2-c-ice`). Ice patches already exist naturally on a small number of Cisterns cells
(the flooded-feel the biome name implies). When a monster steps onto ice, it slides one
extra cell in its current heading, potentially into a wall (stun, 2 turns) or into a chasm
(instant kill). The verb: _position yourself so that chasing foes slide into your prepared
hazards_.

- Implementation surface: `floor.js` (scatter ~3-5 wet cells per Cisterns room); `monsters.js
  monsterTurn` (after greedy-step: if landing cell is `ice`, apply one extra slide step,
  check chasm/wall); `hazards.js` (add `ice` to `HAZARD_GLYPH`/`HAZARD_CLASS`).
- Player slide: the player also slides on ice (same extra-step rule), which is intentional —
  the mechanic punishes careless movement and rewards memorising ice positions.
- Synergy: freeze rune + a chasm = reliable instant-kill for any adjacent monster that slides.
  This is the most satisfying combo in the expansion.

**E2 — Acid pools (Overflow: floors 10+)**

A new hazard type (`acid`, glyph `%`). Stepping in acid applies `corroded` status (3 turns):
the player's effective `atk` is reduced by 2 while corroded. Critically, if the player steps
into acid while carrying a `burning` affix weapon, the acid neutralises the burning affix for
the rest of the floor (not permanent — re-equipping restores it). The verb: _protect your
build from environment — route around acid, or accept a crippled run_.

- Monsters also avoid acid (same `freeCell` logic as lava). This makes acid a valid
  monster-funnel tool: place yourself so foes must choose between acid and charging you.
- Implementation surface: `hazards.js` (add `acid` type, `corrosion` status); `status.js`
  (apply atk-2 during corrosion); `hazardPlan` (add acid to Overflow density).

**E3 — Wych-gas ceiling pockets (Emberworks: floors 7-9, deep-floor variant)**

On floors 8-9, some ceiling cells contain wych-gas pockets (rendered as a faint `"` on the
tile above the floor position — a purely cosmetic hover indicator, no new tile type). A
firebolt or any fire-spreading tile that burns adjacent to a wych-gas position triggers a
ceiling detonation: 3×3 blast, `detonate`-style, hitting all monsters and the player within
radius 1. The verb: _read gas topology before igniting — or deliberately walk a foe under a
pocket and then firebolt from range_.

- This teaches deliberate setup: the player can see the gas pockets (they're always visible),
  plan the firebolt trajectory, and create a scripted kill zone.
- Implementation surface: `floor.js` (scatter 0-3 gas pockets per Emberworks room on floors
  8-9); `fire.js tickFire` (if a fire tile is adjacent to a gas pocket coordinate, call
  `detonate` centered on the pocket with power 8); `view.js` (render `"` at gas positions).
- Determinism: gas positions are placed in `buildFloor` via the same seeded RNG; gas stays
  put regardless of player action; the blast is triggered deterministically by fire adjacency.

---

### F-series: The Kernel — the fifth biome (floors 13+), combining all verbs

The Kernel is the final dungeon layer. Its defining feature: _all four prior verbs are active
simultaneously_, with no single one dominating. The layout changes from BSP rooms-and-corridors
to large, open chambers with pillars (3×3 column obstacles). Monsters have extended sight (9).
Every floor has darkness, acid, fire and ice in the same space.

**F1 — Open-plan chamber layout with pillars**

`generate.js` gets a new mode (`kernelLayout`) triggered when `floor >= 13`. Instead of BSP
partitioning, it places 3-6 large open rooms connected by single-tile "breach" openings and
scattered with 3×3 solid pillar obstacles (glyph `█`). Monsters have LOS from across the room;
pillars are the only cover. The verb: _manage multiple simultaneous sightlines — always have a
pillar between you and the ranged foe while not walking into darkness or acid_.

- This is a genuine test of having learned all four prior verbs: you need to break LOS (B1
  skill), route around hazards (A2 skill), read fire spread (C1 skill), and manage your light
  radius (D1 skill) all at once.
- Implementation: a new `generateKernel(rng, dims)` function in `generate.js`, max 200 LOC.

**F2 — Overloaded foe archetype (minFloor: 13)**

The "stack corruptor" (glyph `S`) inflicts both `poison` and `burn` in a single bite. Without
mitigation this is 2 DoT stacks running simultaneously — potentially lethal within 6 turns.
A new fourth consumable, the "cleanse rune" (glyph `♦`, name "antidote parse"), removes all
active status effects from the player instantly. The verb: _maintain cleanse inventory — the
cost of engaging a corruptor without one is too high_.

- The cleanse rune is the first consumable that is sometimes the wrong choice to use (it
  removes beneficial freeze or burn-on-foe effects if the player has none). The decision
  depth matters.
- Implementation: `data.js` (add `overloaded` behaviour flag); `monsters.js monsterBite` (if
  `m.overloaded`, apply both `poison` and `burn`); `consumables.js` (add `cleanse` type that
  calls `clearStatuses(player)`).

**F3 — Resonance tiles (new terrain, Kernel only)**

Sparse floor cells rendered as `∿` (glyph, class `s2-c-resonance`). Stepping on a resonance
tile broadcasts the player's position to all monsters within 20 tiles for 3 turns — they
immediately begin chasing regardless of LOS. The verb: _memorise resonance tile positions;
treat them as contact landmines; sometimes step on one deliberately to trigger a controlled
convergence_.

- The "sometimes deliberate" use case: step on a resonance tile in a corridor mouth, then
  immediately back into a chokepoint with fire hazards covering your retreat. A controlled
  ambush.
- Resonance tiles are always visible (they pulse), so the player is never surprised — but
  they are placed in routes toward the stairs, forcing a decision: take the resonance path
  (fast, loud) or the dark path (slow, quiet).
- Determinism: broadcast lasts a fixed 3 turns, tracked as `world.resonanceAlert` countdown;
  cleared by decrement in `runloop.js`.

---

## 4. FUN AND RETENTION — Economy, Risk-Reward, Session Arc

### The glyph economy (meta-loop)

Glyphs are earned per kill (scaled by `glyphMult`), per shard pickup, and banked on death or
retreat. They are spent in the persistent shop between runs on permanent stat upgrades (Vitality,
Sharper Cursor, Stairwell Sense, etc.) or on Heat modifiers. This means:

- A failed run is never a wasted run — you always bank something.
- The upgrade that feels closest to "one more run and I can afford it" is almost always
  visible. The cost curve (`upgradeCost` with 1.6-1.9x growth) ensures the shop never
  feels fully bought-out early.
- Heat multipliers (currently +25% per active modifier) give veteran players a steeper
  glyph curve at cost of difficulty. The expansion adds `lights_out` (+35%) which is the
  highest multiplier — a clear "mastery" signal.

For the expansion to sustain 40-120 min sessions, add one shop upgrade tied to each new system:

- "Dark Sight" (cost: 40G, max 2): +1 light radius permanently. Makes darkness less
  punishing without removing it — investment threshold, not removal.
- "Lantern Cache" (cost: 25G, max 1): starts every run with one lantern rune in inventory.
  Lowers the terror of Overflow floor 1, which is the clearest drop-off point currently.
- "Acid Resistance" (cost: 35G, max 3): reduces corrosion atk-penalty by 1 per level.

### Risk-reward decisions that sustain tension

The existing design already has several good risk-reward pivot points:

1. **Chasm vs. route** — taking fall damage now to skip a monster-dense floor.
2. **Branch stair** — richer loot at a harder floor; when is your HP sufficient?
3. **Hidden room** — every unknown door might be treasure or ambush.
4. **Firebolt on a spore field** — clear a path, or burn yourself?

The expansion adds:

5. **Ice setup** (E1) — do you freeze now (crowd control) or hold the freeze for the
   planned ice-slide kill? This is a timing decision that doesn't exist in A/B/C.
6. **Lantern ration** (D2) — burn light now for safe exploration or save for the boss
   floor where darkness drops to radius 4?
7. **Resonance stepping** (F3) — intentional broadcast is a high-risk/high-reward play
   that converts a "mistake" (stepping on a resonance tile) into a strategy once mastered.

### What sustains 40-120 minutes

- **Run variety from weapon affixes**: a burning-affix run plays completely differently from
  a double-strike run; the E3 wych-gas puzzle rewards burning but punishes fire in the wrong
  spot. Players who understand this replay to specialise.
- **Hidden room type variance**: 6 types (treasure, trap, teleport, shrine, vault, captive)
  mean no two "push toward a secret door" decisions are identical.
- **Faction infighting (C5)**: watching rival camps do your work without engaging is a
  10-second playstyle decision that feels like outsmarting the game. Keep adding faction
  interactions in the Kernel biome.
- **The boss as the session anchor**: reaching the boss is a clear 40-min milestone.
  The first time players realise they need to read `cipher.txt` (the real app's file viewer)
  is the most memorable moment of the entire metagame. Preserve this absolutely.

---

## 5. CAVEATS — Determinism, Performance, Uniqueness

### Determinism (non-negotiable)

All new systems must be derivable from `world.seed + world.floor + world.stepCount` or
pure positional logic:

- **Light radius** (`world.lightRadius`): a constant per biome + floor number. No RNG.
- **Last-seen tracking**: pure derived state (`player.lastSeen[monsterIndex]` updated each
  step). Never persisted to JSON — rebuilt in `attachGrid` / on load.
- **Ice slide extra-step**: the target of a slide is the next cell in the monster's current
  direction — fully deterministic.
- **Void ref teleport target**: closest dark open cell to the player — a sort over positions,
  no RNG.
- **Wych-gas blast**: triggered by fire adjacency; positions placed in `buildFloor` via seeded
  RNG (same path as hazards); the blast is a fixed-power `detonate` call.
- **Resonance broadcast**: lasts exactly 3 turns; `world.resonanceAlert` is an integer
  decremented in `runloop.js`. Persisted in the save blob.
- **Cleanse rune**: removes statuses; `clearStatuses` zeroes `player.statuses`. No RNG.

The `makeRng` xorshift32 already used throughout is sufficient for all new content. No new
RNG infrastructure is needed.

### Performance

- **Light radius render pass**: O(viewport) each render frame — already done for hazard
  coloring. Adding a dim-cell pass over the same loop costs ~0 extra work.
- **Last-seen store**: `Map<monsterIndex, {x, y}>` — trivial memory; cleared when monsters die.
- **Ice slide check**: one extra bounds-check after `monsterTurn`'s move — O(1) per monster.
- **Wych-gas blast**: at most 3 per floor; each blast is the existing `detonate` path — O(monsters).
- **Resonance tile lookup**: same O(1) index pattern as `hazardAt` / `trapAt`.

No system in D/E/F changes the dominant cost (which is `monsterTurn` over the live monster set
and `view.js` over the viewport). All additions are sub-linear or O(1) per event.

### File budget (300 LOC soft cap, 500 hard)

New files needed:
- `darkness.js` — light radius query, last-seen tracking, dim-cell list for renderer. ~80 LOC.
- `generate-kernel.js` — Kernel open-plan BSP variant. ~150 LOC.

Modified files:
- `biome.js`: add `lightRadius` field per biome, `kernelLayout` flag. +10 LOC.
- `hazards.js`: add `ice`, `acid` types. +30 LOC.
- `monsters.js`: add ice-slide post-move, `shadow` archetype, `overloaded` bite. +50 LOC.
- `consumables.js`: add `lantern`, `cleanse` types. +30 LOC.
- `fire.js`: add wych-gas adjacency check in `tickFire`. +20 LOC.
- `data.js`: add new shop upgrades, new monster entries, `lights_out` run mod. +40 LOC.
- `view.js`: render dim tiles, last-seen `?` glyphs, wych-gas `"`, resonance `∿`. +60 LOC.
- `floor.js`: scatter ice, acid, gas pocket, resonance tiles in `buildFloor`. +50 LOC.

Total new LOC: ~470 across 9 files. Comfortably within budget if split as above; no file
should need a split unless `view.js` already exceeds the soft cap.

### Uniqueness of the un-cheat boss

The boss un-cheat (`cipher.txt → PASSAGE:247 → mark the action`) is exceptional and should be
preserved exactly as-is. It passes all three tests for a metagame un-cheat:
1. **Load-bearing**: the north pillar is literally inert; phase 1 loops forever without it.
2. **Not bypassable**: the action check is authoritative (`actions.hasAction(2, ACTION_NAME)`).
3. **Teaches the real app**: players who find the passage have genuinely used the file viewer
   as a file viewer, which is the point of the metagame.

No expansion mechanic should weaken or duplicate this. The boss encounter itself (3-phase,
projectile-gap mechanic, pillar structure) is solid and does not need mechanical expansion —
only content polish if desired.

---

## Sources

- [Rogueliker: Best Roguelike Games](https://rogueliker.com/best-roguelike-games/)
- [Rogueliker: Great Contemporary Roguelikes](https://rogueliker.com/great-roguelike-games/)
- [Game Developer: Analysis — The Eight Rules of Roguelike Design (John Harris)](https://www.gamedeveloper.com/game-platforms/analysis-the-eight-rules-of-roguelike-design)
- [Waltorious Writes About Games: Roguelike Highlights: Brogue](https://waltoriouswritesaboutgames.com/2011/10/26/roguelike-highlights-brogue/)
- [Brogue Wiki (main)](https://brogue.wiki/mw/index.php/Main_Page)
- [Jorge Zhang: DCSS — The Greatest Roguelike of All Time and What It Can Tell Us About Game Design](https://www.jorgezhang.com/2020/06/dungeon-crawl-stone-soup-the-greatest-roguelike-of-all-time-and-what-it-can-tell-us-about-game-design/)
- [CrawlWiki: Dungeon Branches](http://crawl.chaosforge.org/Dungeon_branches)
- [CrawlWiki: The Lair](http://crawl.chaosforge.org/The_Lair)
- [DCSS: Shoal Buildin' (blog)](http://crawl.develz.org/wordpress/shoal-buildin)
- [Cogmind: Genre Innovation](https://www.gridsagegames.com/cogmind/innovation.html)
- [Grid Sage Games: Roguelike Level Design — Procedural Layouts](https://www.gridsagegames.com/blog/2019/03/roguelike-level-design-addendum-procedural-layouts/)
- [Game Rant: 10 Best Roguelikes with ASCII Art](https://gamerant.com/best-roguelikes-ascii-art/)
- [Hamatti: Meta-Progression with Gradual Tutorial in Roguelike Games](https://notes.hamatti.org/gaming/video-games/meta-progression-with-gradual-tutorial-in-roguelike-games)
- [NetHack Wiki: Dungeons of Doom](https://nethackwiki.com/wiki/Dungeons_of_Doom)
- [Wikipedia: Dungeon Crawl Stone Soup](https://en.wikipedia.org/wiki/Dungeon_Crawl_Stone_Soup)
- [Spelunky Wiki: Roguelike](https://spelunky.fandom.com/wiki/Roguelike)
- [Game Rant: Roguelites with Innovative Gameplay](https://gamerant.com/best-roguelikes-and-roguelites-with-innovative-gameplay/)
