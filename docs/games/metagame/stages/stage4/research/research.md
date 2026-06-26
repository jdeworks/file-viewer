# Stage 4 — Fractal Bastion: Design Research

Companion to `stage4-01-tower-defense-research.md` and `stage4-02-our-game-design.md`.
This document audits the current implementation, situates Stage 4 in the genre, and defines
the expansion arc: an ordered progression of new verbs, one per wave group.

> **Current status: THIN GATE.** The live code is a 3-button boss gate (open blueprint, place
> tower, fight boss) with no enemy waves, no real TD loop, and two determinism bugs
> (Math.random for tower IDs, Date.now fallback in stageSeed). The full game described in the
> planning docs does not yet exist.

---

## 1. Genre — What Defines Tower Defense

### Defining properties

Tower defense is a strategy genre where the player builds stationary defenses to destroy
enemies moving along a path before those enemies reach a protected goal. Four things are
non-negotiable to the genre:

- **The path problem.** Enemies have a route (fixed, player-created, or hybrid). The player
  cannot directly attack enemies — they can only place towers beside or across that route.
- **The placement decision.** WHERE a tower goes is more consequential than which tower it is.
  A good tower at a chokepoint outperforms a great tower placed in an open field.
- **The economy loop.** Killing enemies earns resources. Resources buy towers. Towers kill
  enemies more efficiently. Early economies are always undersupplied relative to late-game
  needs, creating constant allocation pressure.
- **The wave structure.** Enemies come in quantized bursts. Between waves the player can
  prepare. Waves escalate in count, composition, and special properties. The game ends when
  either all waves are survived or the defended goal is destroyed.

### The 5 best games and specifically what makes them replayable

**1. Kingdom Rush (Ironhide, 2011)**
Contribution: the gold standard for structured TD. Replayability driver: branching upgrade
paths (each tower tier-3 forks into two identities) means the same map played with different
upgrade choices is a meaningfully different game. Active hero abilities add real-time micro.
"Send wave early" bonus gold creates risk-reward incentive to play faster. Boss waves every
5 levels provide paced landmark moments, not just HP checks. Source: [1]

Specific mechanic that matters: *upgrade path commitment.* At tier 3 you choose one fork
and lose the other. This choice is irrevocable for the run, so each tower becomes a bet.
The bet either pays off or creates a gap that forces adaptation elsewhere.

**2. Bloons TD 6 (Ninja Kiwi, 2018)**
Contribution: extreme depth through synergy and meta-progression. Replayability driver:
synergy between towers (a specific 3-tower combo makes a previously hard map trivial) means
every new run is a combination exploration. The Monkey Knowledge meta-progression tree means
early investment pays off late. Banana Farm (economy tower) creates a genuine "invest now vs
defend now" dilemma in hard modes. Source: [2]

Specific mechanic that matters: *upgrade path exclusion.* Each tower has three upgrade paths
but you can only fully unlock two. This forces a build identity per tower, not just per tower
type. Two players with the same tower make different choices; both can be right on different
maps.

**3. Plants vs. Zombies (PopCap, 2009)**
Contribution: lane clarity and role legibility. Replayability driver: enemy lane targeting
creates a readable threat model even for first-time players. The sun economy (sunflowers
produce the resource; spending sun on more sunflowers vs. on weapons is the core early game
dilemma) is a clear economy-vs-firepower trade-off with obvious feedback. Source: [3]

Specific mechanic that matters: *dual economy management.* The player must invest resources
into resource generators (sunflowers) before they can afford weapons. Every sun spent on a
sunflower is a sun not spent on defense right now. This trade-off is the game.

**4. Defense Grid: The Awakening (Hidden Path, 2008)**
Contribution: route control through placement. Replayability driver: towers block the path,
enemies follow the shortest remaining route. A tower placed just right forces enemies into a
longer loop past all your other towers. A tower placed slightly wrong is wasted coverage.
Maps have a "correct" solution but dozens of wrong paths to it, making mastery feel earned.
Source: [4]

Specific mechanic that matters: *path manipulation as the primary strategic lever.* The
player is never just placing a tower for its DPS — they are also routing the enemy path. One
well-placed tower increases every adjacent tower's effectiveness by extending time in range.
This makes spatial reasoning the dominant skill, not stat optimization.

**5. Dungeon Warfare 2 (Valsar, 2018)**
Contribution: trap-first defense. Replayability driver: physics-based interactions (push
traps + ledges = instant kill regardless of HP) mean creative players find solutions that
bypass the economy entirely. The trap-tower hybrid requires combining passive corridor damage
with active node towers. Source: [5]

Specific mechanic that matters: *geometry as a damage multiplier.* A push trap beside a
cliff kills any enemy. A slow trap at the entrance to a corridor makes every other trap in
that corridor more effective. This geometry awareness is a skill separate from tower choice
or upgrade sequencing.

---

## 2. Our Core Loop — The Game That Must Be Built

### Current state: what the code actually does

The live stage4 implementation is a boss-gate wrapper with three buttons:

1. **"open recursion_points.json"** — calls `applyRecursionBlueprintOpen`, fires the un-cheat
   (opens the file in the host viewer), sets an action flag, and logs a message.
2. **"place pulse at next point"** — calls `placeTower` at the first uncovered recursion point.
   Deducts 80 Cycles from state. No enemies, no waves, no placement choice.
3. **"run boss wave"** — calls `fightInfiniteLoop`. Computes damage as `coveredPoints * 120`,
   reduces `boss.hp`. Three covered points = one-shot (300 damage, 300 HP). The entire boss
   fight is a single arithmetic check.

This is a gate, not a game. The player clicks three buttons in order and wins. The towers are
auto-placed at the exact coordinates needed. There is no placement decision, no economy pressure,
no waves, no integrity drain, no failure path except "didn't read the file".

### What the real loop must be

The full loop specified in `stage4-02-our-game-design.md` is the target:

**Moment to moment:** Enemies spawn from the entry point and traverse an L-system-generated
path toward the exit. Towers placed on grid cells beside the path fire automatically as enemies
enter range. Killing enemies earns Cycles. Cycles buy more towers or upgrade existing ones.
Enemies that reach the exit drain Integrity. Zero Integrity = wave failure and replay.

**Economy cycle:** Kill enemies → earn Cycles → spend Cycles on towers or upgrades → towers
kill more enemies per wave. The Cycle Extractor adds passive income per wave, creating the
"economy tower investment" dilemma from Plants vs. Zombies.

**The path changes.** The critical innovation: the L-system path is regenerated at each wave
start. Towers do not move. The player must place towers that remain useful as the path changes
shape wave over wave. This is anticipatory placement, not reactive placement — the player must
read where the path is likely to go in the next wave group, not just where it is now.

**The un-cheat boss.** The Infinite Loop is unkillable without the recursion_points.json file.
The file lives at `/stage4/towers/upgrades/tier3_blueprints/recursion_points.json` — three
directories deep in the host app's file tree sidebar. The player must navigate the file tree,
find the file, and open it. The JSON it contains specifies exact grid coordinates. Towers
must then be placed at those coordinates (within radius) to deal any damage to the boss.

This un-cheat is load-bearing: the boss has total armor in the LOCKED state. No damage
registers regardless of tower type, upgrade level, or placement position. The coordinate
knowledge is the unlock, not a shortcut. It is not bypassable.

### Why this loop is fun

The L-system path change creates a unique planning horizon. In Kingdom Rush you know the path
forever. In Stage 4 you know the path only until the next wave group transition. This compresses
the planning window and punishes "solve it once" thinking. Every 10 waves the board you built
is partially wrong for the new path depth. Recovering from that misalignment — selling some
towers, placing new ones in newly hot zones — is the moment-to-moment skill expression.

---

## 3. The Expansion Arc — One New Verb Per Wave Group

This is the primary deliverable. Each wave group must introduce exactly one new cognitive
demand. Not bigger numbers. Not more enemies. A new thing to think about.

The model is Stage 2's biome escalation: The Warrens introduce "avoid terrain"; Flooded
Cisterns add "break line-of-sight via chasms"; Emberworks add "manage spreading burn status";
The Overflow adds "survive chaos with all hazards at peak density". Each biome adds one verb.
Going deeper always means a new thing to think about.

For Stage 4, the wave groups and their verbs are:

---

### Wave Group 1 — Waves 1–5 — PLACE
**New verb: choose a position that covers path segments, not just tiles.**

Setup: L-system depth 1 (simple zigzag). Single enemy type: Recursion (square, 50 HP,
standard). One entry, one exit. Path is clearly visible.

What the player must learn: towers have a range radius. A tower placed at a corner covers
MORE path length than a tower in the middle of a straight segment because it catches enemies
approaching the corner from both directions. The player discovers that placement geometry is
the first skill.

No economy pressure. No enemy diversity. The only question is: where do I put this tower to
cover the most path?

Introduced: Pulse Node (basic DPS). Cycle Extractor introduced mid-group as an optional
economy choice.

---

### Wave Group 2 — Waves 6–10 — MATCH
**New verb: identify which tower type this enemy requires.**

Setup: L-system depth 1 continues (same path shape). Two new enemy types enter:
- Wave 6: Pattern Crawlers (triangle, speed 2.0 — twice as fast). Existing towers deal
  adequate damage but enemies cross coverage windows too quickly. Reveals that single-target
  DPS on slow fire rate misses fast enemies. Solution: Pulse Node upgrade (faster fire rate)
  or Scatter Array (AoE hits even as enemies sprint through).
- Wave 10: Null Packets (hexagon, 50% armor). All Pulse Node and Scatter Array damage is
  halved. The player has built 8 waves of DPS towers that are suddenly 50% less effective
  against a new enemy type. Null Spike (armor pen) is the solution — but the player must
  recognize the problem first.

What the player must learn: tower TYPE matters as much as tower COUNT. There is no single
best tower. Each enemy type punishes one tower archetype and is answered by another. Running
a monoculture of Pulse Nodes was fine in Group 1; it creates a dangerous gap in Group 2.

Introduced: Scatter Array (AoE), Null Spike (armor pen), Attractor Field (slow).

---

### Wave Group 3 — Waves 11–15 — PORTFOLIO
**New verb: defend a split path — you cannot cover both branches fully.**

Setup: L-system depth 2. The path now branches at two points. Enemies take the left branch
60% of the time and the right branch 40% (seeded per-wave from the run seed — not random at
runtime, but varies wave to wave). No branch is ever empty; no branch is ever the majority
every wave.

What the player must learn: portfolio defense. A single cluster of towers covers one branch
perfectly and the other branch zero. Spreading thin covers both branches but neither perfectly.
The optimal answer is to cover both branches cheaply (Scatter Array + Attractor Field slow so
enemies spend more time in the partial coverage) while committing strong DPS towers only where
both branches converge before the exit.

New enemy: Fractal Host (large square with inner square). On death spawns 2 Recursion enemies.
The spawn mechanic reveals another dimension of the portfolio problem: a Fractal Host killed on
the lightly covered branch spawns its children into a low-coverage zone. Killing it later (after
it crosses to the main branch) is safer but risks it escaping first.

Introduced: Fractal Host (on-death spawn), branch-path mechanics.

---

### Wave Group 4 — Waves 16–20 — REPAIR
**New verb: find the hole in your established defense and patch it — without tearing it down.**

Setup: L-system depth 2 (branches continue). The player now has a reasonably stable tower
placement from 15 waves of iteration. Wave 16 introduces Resonance Ghosts (diamond shape,
speed 1.5): they are completely immune to Attractor Field slow. Any tower that relied on the
slow to keep enemies in its range is now undersupplied — the ghost walks through the slow
field at full speed.

If the player over-invested in Attractor Fields (a natural response to branching paths since
slowing enemies on both branches is efficient), they now have 3–4 towers that contribute
nearly nothing to ghost waves. The response is not to build more towers — the board is mostly
full. The response is to sell Attractor Fields in ghost-heavy zones and replace them with
direct-damage towers, or to upgrade Pulse Nodes to level-3 (EMP Burst active ability stuns
ghosts for 2s, bypassing the immunity).

Wave 20 mini-boss: 3 Depth Crawlers simultaneously (heavy, 200 HP, 30% armor, branch-free
movement). This tests the repaired defense: do the patches from waves 16–20 hold against a
different threat profile?

What the player must learn: late-game TD is about maintenance and retrofitting, not expansion.
Your established defense has a shape; each new enemy reveals a blind spot in that shape. The
skill is identifying the minimal change that closes the gap without collapsing coverage
elsewhere. Selling a tower costs 30% of investment (70% refund) — so selective sells are
economically viable; scorched-earth rebuilds are not.

Introduced: Resonance Ghost (slow immunity), Depth Crawler (elite), Resonance Hub support
tower.

---

### Wave Group 5 — Waves 21–30 — ANTICIPATE
**New verb: place towers NOW for a path shape that does not exist yet.**

Setup: L-system depth 3. The path at depth 3 recurves — it passes through regions it already
visited at depth 2. Tiles on the second pass are visually distinguished (brighter path color).
Towers adjacent to recurve zones deal double effective damage because enemies traverse that
segment twice.

What the player must learn: pre-adaptation. The game signals which tiles will be on the second
pass BEFORE the wave starts (the path preview shows the full depth-3 curve). The player who
reads the preview and places a tower on the upcoming double-coverage tile now gets 2x the
tower's effective DPS for that wave. The player who ignores the preview and reacts during
the wave cannot place towers while enemies are on those tiles (enemies block placement).

This is the final, hardest planning horizon extension. In Group 1 you placed for the current
path. In Group 3 you placed for both branch probabilities. In Group 5 you place for a future
path state that exists only as a preview. The discipline is reading ahead, not responding.

Wave 25: all enemy types simultaneously. The stress test for a fully-developed portfolio
defense with anticipatory tower placement. Wave 30: final wave, max HP scaling, all types,
full depth-3 recurve.

The active abilities (EMP Burst, Overcharge, Null Wave) are now essential — not optional
luxuries. A player who never used active abilities in Groups 1–4 will find Wave 28–30 barely
survivable. The nudge: abilities cost no cycles, just attention. The player who learned to
use them in Group 4 (against ghosts and depth crawlers) arrives at Group 5 with a practiced
habit.

Introduced: recurve mechanic, wave preview panel, active ability pressure.

---

### Boss — The Infinite Loop — READ
**New verb: use the host app's file tree to extract structured coordinates, then act on them.**

The boss does not introduce a new tower mechanic or wave composition. Its new verb is
external to the game engine: navigate the host file-viewer's sidebar to
`/stage4/towers/upgrades/tier3_blueprints/recursion_points.json`, open it, read the JSON,
extract four (x, y) coordinate pairs, and place (or confirm existing) towers at those
positions within radius 2.

The JSON the player reads in the host app is generated from the run seed — it contains the
EXACT coordinates for THIS run, not generic placeholder values. If the player copies
coordinates from a walkthrough or a different run's output, they will be wrong. The file must
be opened in this session.

Why this is load-bearing: the boss has total armor in LOCKED state. Every tower fires, every
shot registers `0 damage`. The game's own log shows this (`TOTAL ARMOR`). There is no damage
path except through the recursion points. The player cannot grind through it with enough DPS,
cannot upgrade around it, cannot use active abilities to bypass it. The file must be read.

Why this is the right un-cheat for this stage: Stage 4's narrative is "the entity learns that
the same shape repeats at every scale — and learns to interrupt it." The recursion points ARE
the fold coordinates of the L-system — the positions where the fractal curve doubles back.
Reading the JSON is reading the blueprint of the pattern itself. The mechanic is thematically
coherent, not arbitrary.

Achievement on blueprint open (not boss defeat): "I looked deeper."

---

### Ordered expansion arc summary

| Group | Waves | New Verb | Trigger mechanism |
|-------|-------|----------|--------------------|
| 1 | 1–5 | PLACE — coverage geometry | Single path, single enemy, range radius visible |
| 2 | 6–10 | MATCH — tower type to enemy type | Fast enemies, then armored enemies introduced |
| 3 | 11–15 | PORTFOLIO — defend a split path | L-system depth 2, path branches at 2 points |
| 4 | 16–20 | REPAIR — patch blind spots in established defense | Resonance Ghost (slow immune) invalidates Attractor Fields |
| 5 | 21–30 | ANTICIPATE — pre-place for a future path shape | L-system depth 3 recurve, path preview panel |
| Boss | 31 | READ — extract coordinates from host app JSON | Total-armor boss, sidebar file navigation required |

The progression is: REACTIVE (place, match) → STRATEGIC (portfolio, repair) → ANTICIPATORY
(anticipate) → INFORMATIONAL (read). Each step adds a new cognitive layer without removing
the previous ones. By the boss fight the player is simultaneously managing tower matchups
(Group 2), portfolio coverage (Group 3), defense gaps (Group 4), pre-placed recurve
positions (Group 5), AND an external file lookup. The complexity accretes; nothing is retired.

---

## 4. Fun and Retention — Economy, Meta-Loop, Risk-Reward

### The moment-to-moment economy

Every Cycle allocation is a trade-off among three competing demands:
- **Expand coverage** (place a new tower) — costs 80–250 Cycles, locks in a position
- **Deepen effectiveness** (upgrade an existing tower) — costs 120–800 Cycles, scales a bet
- **Invest in income** (Cycle Extractor) — costs 250 Cycles upfront, pays back after ~5 waves

The extractor creates the Plants vs. Zombies dilemma in TD form: buying an Extractor on wave
3 means weaker coverage on waves 4–7 but meaningfully higher income on waves 8–30. Players
who invest early have more options late. Players who don't invest fall into upgrade starvation
around wave 20. The dilemma is real because the correct answer changes with playstyle.

### Tower sell as a mid-game tension release

70% refund on sell means the player is not permanently trapped by a bad early placement.
Sells are viable but costly — a 250-Cycle Scatter Array returns 175 Cycles, which is enough
for a Pulse Node but not a Null Spike. The economic friction of selling (30% loss) creates
a real second-guess moment: "is this tower placement bad enough to warrant the loss?" This
is a meaningful decision, not a free undo.

### Active abilities as retention mechanics in late waves

Level-3 towers each unlock one active ability (EMP Burst, Overcharge, Null Wave). These
abilities have 30–60s cooldowns and deal substantial moment-effect (AoE stun, triple damage
burst, armor strip). In waves 1–15 they feel optional — the player probably survives without
them. In waves 20–30 they are necessary. This creates a natural skill ramp: casual players
survive to wave ~22 using abilities occasionally; engaged players who manage ability
rotations make wave 28+.

The abilities also create the "one more attempt" loop. When the player fails a wave, they
immediately see what ability rotation might have saved it. The next attempt starts with that
knowledge.

### Integrity as a forgiving failure system

Integrity regenerates +10 per wave (never above 100). A player who loses 15 Integrity on
wave 8 (a Null Packet escape) recovers that loss over 1.5 waves. Early leaks are not fatal.
Late leaks at wave 26 (when Integrity income barely outpaces escaping enemies) are critical.
This creates a natural difficulty curve where early forgiveness fades into late precision
requirement — without a "3 lives and you're done" hard wall.

### Prestige as the meta-loop

Recursion Depth prestige gives +15% all tower damage per level and +50 starting Cycles.
More importantly, each prestige unlocks a new L-system grammar (different path shapes). A
player on their third prestige run is playing on a fundamentally different map than their
first run — the path grammar changes which choke points exist, which tower positions are
dominant, and which enemies are hardest to cover. This is the same mechanic as Bloons TD 6's
different maps: the strategy that solves Koch-curve path may not solve Sierpinski-curve path.

---

## 5. Caveats — Determinism, Performance, Uniqueness

### Determinism bugs (must fix before building real loop)

Two bugs exist in the current code:

1. `normalizeTower` in `state.js` line 70:
   ```js
   id: String(tower.id || `tower-${Math.random().toString(16).slice(2)}`)
   ```
   Uses `Math.random()` for tower IDs. IDs need not be random — they can be a sequential
   counter (`tower-${state.towers.length + 1}`) or a hash of position. Fix: remove
   Math.random entirely; derive ID from position + type + placement-order index.

2. `stageSeed` in `state.js` line 78:
   ```js
   return String(context.seed || context.now || Date.now()).replace(/\W/g, '').slice(-8) || 'stage4';
   ```
   Falls back to `Date.now()` if neither `context.seed` nor `context.now` is provided.
   This seeds the L-system path generation from wall-clock time, producing a different path
   every session. Fix: the metagame framework must pass a stable `context.seed` (derived
   from user identity or a persisted run seed). The fallback should be a fixed string
   (`'stage4default'`), not `Date.now()`.

All random choices in the live path — L-system generation, enemy spawn positions, branch
choice probabilities, recursion point coordinates — must flow from the seeded LCG chain
already present in `state.js` (`lcg` and `hashSeed`). The LCG is correct; the seed input
is the only leak.

### Performance: path rendering on a 40x40 grid

The current board renderer (`boardText` in renderer.js) iterates the full grid on every
repaint as a nested array. For a real TD with 30+ enemies moving per tick, the render loop
must not rebuild a 1600-cell string 10–30 times per second. Options:
- Use a canvas element instead of `<pre>` for the game board (allows per-cell dirty marking)
- If keeping `<pre>`, compute a diff of changed cells only (track which grid positions changed
  since last render) and update only those span elements
- Clamp the tick rate to 30fps maximum regardless of requestAnimationFrame speed

Enemy count at peak (wave 30): ~25–35 simultaneous enemies on the path. Each enemy occupies
one grid cell. The collision model (enemy movement along path tiles) needs an index:
enemy-by-tile-index for fast tower range queries.

### Performance: L-system path generation

At depth 3 the Koch-curve L-system string reaches length `5^3 = 125` production tokens,
which maps to ~60–80 grid tiles after turtle interpretation. At depth 4 (boss): `5^4 = 625`
tokens, ~250–300 grid tiles. This is fast to compute (microseconds on any modern CPU) but
must be re-cached only at wave transitions, not per-frame.

### Uniqueness preservation

The L-system path change per wave group is the core design differentiator. No major TD game
changes the path shape over the course of a run. The closest analog is Rogue Tower's
procedurally expanding path, but that expands to new territory — it does not re-route enemies
through existing territory with different geometry. Stage 4's recurving depth-3 path (enemies
revisit the same tiles on two different traversals) is genuinely novel.

The blueprint-gated level-3 upgrade is also unique to this project. In all reference games,
upgrades are purchased with in-game currency. Gating the most powerful upgrades behind
external file discovery (sidebar JSON files in the host viewer) is a metagame-layer mechanic
that no standalone TD game can replicate. It should be preserved and clearly communicated:
the in-game UI should actively invite sidebar exploration, not leave it to chance.

The boss un-cheat (sidebar navigation to extract exact JSON coordinates) is the canonical
instance of Stage 4's host-app interaction. It is both load-bearing (total armor, no bypass)
and thematically coherent (the recursion points ARE the L-system fold coordinates). This must
not be softened into a hint or approximation — the coordinates must be exact, the armor must
be total in LOCKED state, and the file must be genuinely found rather than triggered by any
in-game button.

---

## Sources

- [1] TowerWard — Kingdom Rush vs Bloons TD 6: core mechanics comparison
  https://towerward.com/blog/kingdom-rush-vs-bloons-td-6
- [2] Switchblade Gaming — 15 Tower Defense Games Worth Playing in 2026
  https://www.switchbladegaming.com/strategy-games/best-tower-defense-2026/
- [3] Cubix — Demystifying Tower Defense Game Architecture: A Practical Guide
  https://www.cubix.co/blog/demystifying-tower-defense-game-architecture-practical-guide/
- [4] Game Developer — Tower Defense Game Rules (Part 1): win/loss conditions, path types, economy
  https://www.gamedeveloper.com/design/tower-defense-game-rules-part-1-
- [5] Scientific Gamer / Shacknews — Orcs Must Die! series: trap choreography, maze-building
  https://scientificgamer.com/thoughts-orcs-must-die-3/
  https://www.shacknews.com/article/142859/orcs-must-die-deathtrap-review-sisphyian-tower-defense
- [6] Game-Ace — Engineering the Next Generation of Tower Defense Games
  https://game-ace.com/blog/engineering-of-tower-defense-games/
- [7] Teraconnects — Revitalising the Tower Defense Genre in the Digital Age
  https://www.teraconnects.com/blogs/revitalising-the-tower-defense-genre-in-the-digital-age/
