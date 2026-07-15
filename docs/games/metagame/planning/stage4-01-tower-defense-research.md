# Stage 4 — 01: Tower Defense Genre Research

Reference research for the **Fractal Bastion** Stage 4 design. Developer-facing distillation
of the tower defense genre's core mechanics, economy design, enemy wave scaling, path design
(fixed vs. maze), tower archetypes, and upgrade systems. Companion doc
`stage4-02-our-game-design.md` maps this onto our Stage 4 implementation.

---

## A. The seminal games and what each contributed

| Game | Year / author | Core contribution we care about |
|------|---------------|---------------------------------|
| **Desktop Tower Defense** | 2007, Paul Preece (Flash) | First major browser TD; popularized **maze building** — the player places towers to create the enemy path rather than building alongside a fixed path. The pathfinding algorithm (shortest path for enemies) is the game's core physics. |
| **Plants vs. Zombies** | 2009, PopCap | **Lane clarity and role legibility.** Each tower (plant) has one clear job (slows, blocks, damages, generates Sun). Lanes make attack coverage obvious. Maps are highly readable. Lesson: *clarity of tower role is as important as tower power*. |
| **Kingdom Rush** | 2011, Ironhide | **Fixed path + branching upgrades + hero units.** The gold standard for structured TD. Four base towers, each with two branching upgrade paths at tier 3. Active hero abilities. "Send wave early" bonus gold. Boss waves every 5 levels. Lesson: *upgrade trees create build diversity without requiring unlimited towers*. |
| **Defense Grid: The Awakening** | 2008, Hidden Path | **Route control through placement.** Enemies walk from entry to exit via shortest path; player's towers can force longer routes by blocking. Mazing without a maze builder — pure spatial strategy. Lesson: *the same tower placed differently changes the game completely*. |
| **Bloons Tower Defense 6** | 2018, Ninja Kiwi | **Extreme depth via synergy.** Dozens of towers, each with 3 upgrade paths and a paragon tier. Meta-progression via Monkey Knowledge. Lesson: *tower synergy is the primary endgame loop* — not individual power but combinations. Also: farming (Banana Farm) as a separate income tower is critical in hard modes. |
| **Infinitode 2** | 2019, Prineside | **Infinite scaling + blueprint meta.** Procedural map generation, 30+ tower types, research tree. Some waves are intentionally unsurvivable until the meta-progression tree is developed. Lesson: *allowing "respectable loss" with clear meta-progress feedback is better than artificial difficulty walls*. |
| **GemCraft** | 2008–2015, GameInABottle | **Crafting system within TD.** Gems are combined to create towers; gem color determines type; gem grade determines power. Highly buildable. Lesson: *adding a crafting/combining system above tower placement transforms TD into a two-layer strategy game*. |
| **Dungeon Warfare 2** | 2018, Valsar | **Trap-first defense.** Traps placed in corridors deal damage per step. Combined with towers, creates elaborate killbox design. Lesson: *passive damage mechanics change the strategic calculation* — a corridor can be more valuable than a tower position. |

---

## B. Core mechanics taxonomy

### 1. The path: fixed, mazing, or hybrid

**Fixed path (Kingdom Rush model):**
- Enemy path is pre-drawn; towers placed alongside it
- Clarity: player knows exactly where enemies go
- Strategy: tower type selection and upgrade priority
- Our Stage 4: **fixed path, but path changes each wave** (recursive L-system generation)

**Maze path (Desktop TD model):**
- Player's towers create the path via pathfinding
- Strategy: path elongation + tower placement combined
- Risk: invalid placements that block the path must be detected and rejected

**Hybrid (Defense Grid model):**
- Path exists but towers can reshape it
- Our stage doesn't use this — too complex for the stage's 60–90 min target

### 2. Economy

Standard TD economy: gold earned by killing enemies, spent on towers and upgrades.

**Income sources:**
- Enemy kill: primary; scales with enemy HP
- Wave start bonus: small fixed amount per wave start
- Sell-back: selling a tower returns 60–80% of total cost (prevents permanent commitment errors)
- Economy tower (Bloons Banana Farm model): a tower that generates passive gold per round

**Spend types:**
- New tower placement: moderate cost, high commitment
- Tower upgrade: lower cost, improves existing placement
- Tower sell: recovery option (never full return)
- Special ability: timed ability purchase (Kingdom Rush spell slots)

```js
// Standard gold economy
goldEarned += enemy.goldValue           // on kill
goldEarned += WAVE_START_BONUS          // each wave: flat 25g
goldEarned += Math.floor(towerBuildCost * 0.7) // sell-back at 70%

// Economy tower (passive income)
// If player owns economy tower: goldEarned += economyTower.income every wave
```

### 3. Tower archetypes

Every well-designed TD has towers that fill distinct roles:

| Archetype | Role | Kingdom Rush equivalent | Our Stage 4 equivalent |
|-----------|------|------------------------|----------------------|
| Basic DPS | Single-target reliable damage | Archer Tower | Pulse Node |
| AoE | Area damage, clump clearing | Artillery Tower | Scatter Array |
| Slow | Reduces enemy speed | Mage Tower (slow) | Attractor Field |
| Anti-armored | Armor penetration | Dwarven Bombard | Null Spike |
| Economy | Passive gold generation | (no KR equivalent) | Cycle Extractor |
| Support | Boosts adjacent towers | Mage (damage buff) | Resonance Hub |

**Anti-archetype enemies** (enemies that counter specific tower types):
- Fast enemies: punish single-target DPS; reward AoE/slow
- Armored enemies: punish low-penetration; reward anti-armor
- Swarm: punish single-target; reward AoE
- Air units: punish ground-only towers; force air coverage

### 4. Wave structure

**Standard wave anatomy:**
- 3–5 enemy types per wave
- Wave budget: total "enemy points" allocated per wave (sum of enemy HP × count)
- Early waves: single enemy type, tutorial
- Mid waves: 2–3 types simultaneously with different speeds/armor
- Boss waves: single powerful enemy with special properties, less chaotic

**Wave budget scaling:**
```js
waveBudget(n) = 100 * 1.15^n   // +15% per wave; n=0 is wave 1
// Wave 1: 100pts  Wave 5: 201pts  Wave 10: 405pts  Wave 20: 1637pts  Wave 30: 6621pts
```

**Enemy HP within a wave:**
```js
enemyHP(waveN, tier) = baseHP[tier] * (1 + 0.18 * waveN)
enemyAtk(waveN)     = baseAtk * (1 + 0.12 * waveN)
enemySpeed(waveN)   = baseSpeed * (1 + 0.03 * waveN)   // speed scales slowest
```

### 5. Upgrade systems

**Linear upgrades (simple):** Tower A → Tower A+ → Tower A++. One path.
**Branching upgrades (Kingdom Rush style):** Tower A, at level 3 choose path X or path Y.
**Tree upgrades (Bloons style):** Multiple upgrade paths (top/middle/bottom), different tiers.

Our Stage 4: towers upgrade through three levels and choose an irrevocable tier-three fork. This
keeps the early campaign readable while giving later maps meaningful specialization.

### 6. Lives system

Standard: player has N lives. Each enemy that reaches the exit costs 1 life. 0 lives = loss.

Variations:
- HP-based: each escaping enemy reduces HP by its current HP (boss waves can be one-shot failures)
- Fortress HP: a single large HP pool; different enemies deal different damage on escape

Our Stage 4: **Integrity meter** (the entity's coherence). Enemies that reach the exit drain
Integrity. At 0%, the wave fails. Integrity regenerates 10% between waves if above 0%.

### 7. Special abilities and cooldowns

Kingdom Rush popularized hero abilities with cooldowns:
- Fireball (big damage, 30s CD)
- Reinforcement (temporary blocking unit, 60s CD)
- Freeze (area slow, 45s CD)

These create active gameplay moments in what is otherwise passive tower placement.

Our Stage 4 twist: abilities are tied to **tower level** — placing a level-3 tower unlocks its
active ability as a useable spell. The player manages both tower placement and ability timing.

---

## C. Standard formulas

### DPS calculation
```js
// Tower damage per second
towerDPS(tower) = (tower.damage * tower.attackSpeed) + aoeBonus
aoeBonus = tower.aoeRadius > 0
  ? tower.damage * 0.4 * expectedEnemiesInRadius
  : 0

// Time to kill a single enemy
ttk(tower, enemy) = enemy.hp / towerDPS(tower)
```

### Path length and DPS optimization
```js
// Value of a tower position = DPS × time_in_range
towerValue(tower, position) = towerDPS(tower) * (tower.range * 2 / enemy.speed)
// Longer paths → enemies spend more time in range → same tower position is more valuable
// This is why mazing improves efficiency without changing tower stats
```

### Gold efficiency
```js
// Gold efficiency: DPS per gold spent
goldEfficiency(tower) = towerDPS(tower) / tower.cost
// Upgrade gold efficiency
upgradeEfficiency(tower, level) = (towerDPS(level) - towerDPS(level-1)) / upgradeCost(level)
// Diminishing returns: later upgrades usually have lower efficiency than early ones
// Optimal strategy: upgrade multiple towers to level 2 before any to level 3
```

### Enemy wave budget
```js
function buildWave(waveNumber, totalBudget) {
  const enemyPool = getAvailableEnemies(waveNumber); // unlocked by wave number
  let remaining = totalBudget;
  const wave = [];

  while (remaining > 0) {
    const enemy = weightedRandomEnemy(enemyPool, remaining);
    wave.push(enemy);
    remaining -= enemy.cost; // enemy "cost" = HP * speed factor
  }

  // Ensure at least one of each newly-introduced enemy type this wave
  return ensureMinimumVariety(wave, waveNumber);
}
```

---

## D. Path-specific consideration: L-system recursion

Our Stage 4 has a **unique path mechanic**: the enemy path is generated per-wave using an
L-system (Lindenmayer system), the same recursive grammar that produces fractals. This fits
the stage's theme (Pattern — recursion, self-similarity) but adds implementation complexity.

**L-system basics for paths:**
```
// L-system: axiom + rules, iterated N times
axiom = "F"            // Start: draw forward
rules = {
  "F": "F+F-F-F+F"   // Replace F with a square spike pattern
}
// After 2 iterations, this produces a Koch-snowflake-like curve

// Turtle interpretation for path:
F = move forward (one grid tile)
+ = turn right 90°
- = turn left 90°

// After 3 iterations on our 30×30 grid:
// The path resembles a fractal curve, visiting most of the grid
// Recursion depth increases with wave number
```

**Path properties per wave group:**
- Waves 1–10: L-system depth 1 (simple zigzag, two branches)
- Waves 11–20: L-system depth 2 (branching path, enemies split at branch points)
- Waves 21–30: L-system depth 3 (recurving — path doubles back through regions the player
  already defended; towers in those regions get double-duty)
- Boss wave: depth 4 full fractal (the Infinite Loop enemy traverses the path 3 times)

**Technical note:** At each wave, the L-system produces a new path. The tower grid is
**preserved** between waves (towers don't move when the path changes). This creates a
fascinating strategic challenge: towers that were well-placed on wave 10's path may be
misaligned for wave 11's path. The player must anticipate and pre-adapt.

---

## E. UX patterns for tower defense

- **Tower placement preview:** ghost tower (semi-transparent) shows range circle before placement
- **Range visualization:** clicking a placed tower shows its range overlay
- **Wave preview (one wave ahead):** before sending the wave, show enemy types and counts
- **Speed control:** ×1 / ×2 / ×3 speed button; pause during placement
- **Sell + refund:** right-click tower to sell at 70% refund
- **Upgrade indicator:** towers show upgrade availability when affordable
- **Enemy HP bar:** thin bar above each enemy; boss has large health bar at top of screen
- **Gold display:** always visible, updates in real-time on each kill
- **Wave counter:** "Wave 8 of 30" or "Endless: Wave 45"

---

## F. Design pitfalls to avoid

1. **Dominant strategy.** If one tower type is always optimal, placement becomes solved. Ensure each
   archetype is best-in-class for at least one enemy type. Rotate introduced enemies to prevent
   stale loadouts.
2. **Path illegibility.** If the path isn't visually clear, players don't know where to place
   towers. Use color and animation to make the path the most visually prominent element.
3. **Snowball (too easy):** If the player gets ahead of the wave budget early, the rest of the
   game is trivial. Solution: introduce a new enemy type every 5 waves; first encounter of that
   type is always threatening.
4. **Snowball (too hard):** If the player falls 2 waves behind, the deficit is unrecoverable.
   Solution: lives > 1; first-time player gets 3 "integrity shields" that absorb a leak without
   cost.
5. **Economy starvation.** Late-game upgrades cost so much that the player's economy can't keep
   up. Solution: ensure economy tower income scales with waves, not with player decisions alone.
6. **Boss anti-climax.** If the boss wave is just a big slow enemy with high HP and no new
   mechanic, it's a DPS check, not a strategy challenge. Our boss (Infinite Loop) introduces a
   mechanic (loops the path, regenerates health each lap) that specifically requires towers at
   recursion points.

---

## G. How this maps to Stage 4: Fractal Bastion (pointer)

Stage 4 borrows **Kingdom Rush's** fixed-path + upgrade tree structure, **Defense Grid's** spatial
positioning importance, and **Bloons**' tower synergy depth. Our key innovation: the **L-system
path** changes each wave, requiring anticipatory placement rather than reactive. The enemy
"recursion depth" mechanic (Eigencore tower) and the boss's looping behavior thematically
tie the game design to the stage's Pattern / Recursion narrative. Full spec in
`stage4-02-our-game-design.md`.
