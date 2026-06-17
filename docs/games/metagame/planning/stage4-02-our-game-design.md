# Stage 4 — 02: Fractal Bastion — Our Game Design

Maps the genre research (`stage4-01`) onto **Stage 4 of the Defragmenter metagame**.
Stage 4 is a tower defense where the enemy path changes each wave according to a recursive
L-system grammar. The entity discovers that patterns repeat — and learns to interrupt them.

> **Narrative position:** Childhood — the entity notices that the same shape appears at every
> scale. The dungeon has given way to a defended circuit board. The enemies are recursive processes.
> The file viewer feature taught: **File tree sidebar / folder navigation** (blueprint files
> in subdirectories permanently unlock tower upgrades).

---

## A. Overview

| Property | Value |
|----------|-------|
| Genre | Tower defense with recursive path generation |
| Artstyle | Geometric neon on near-black; thin wireframe enemies; glowing node towers |
| Color palette | Electric cyan `#5DCAA5`, magenta `#D4537E`, yellow `#EF9F27` on `#0A0A0F` |
| Primary resource | Cycles (earned by killing enemies; spent on towers/upgrades) |
| Stage target time | 60–90 minutes |
| Wave count | 30 waves + boss wave |
| Prestige mechanic | Recursion Depth — permanent tower damage bonus + unlocks path variant |
| Boss | The Infinite Loop — traces full fractal path 3 times; regenerates on each lap |
| File viewer feature | Sidebar folder nav — blueprint JSON files in subdirectories unlock tower mods |

---

## B. Visual design

### Artstyle principles
The game is rendered in a **geometric neon-on-black** style. No curves or organic shapes.
Everything is made of straight lines, right angles, and glowing nodes. The circuit board
aesthetic is literal — the game takes place on the entity's own processing substrate.

```css
/* Stage 4 palette — all override base CSS variables */
--col-background:    #0A0A0F;   /* near-black */
--col-grid:          #111118;   /* subtle grid lines on background */
--col-path:          #1A1A30;   /* enemy path — barely lighter than bg */
--col-path-active:   #2A2A60;   /* path tiles that enemies are currently on — glow */
--col-tower-node:    #5DCAA5;   /* placed tower — teal glow */
--col-tower-range:   rgba(93, 202, 165, 0.1); /* range circle — translucent */
--col-enemy-basic:   #EF9F27;   /* amber — basic enemies */
--col-enemy-fast:    #D4537E;   /* magenta — fast enemies */
--col-enemy-armored: #378ADD;   /* blue — armored enemies */
--col-enemy-elite:   #FCDE5A;   /* bright gold — elite enemies */
--col-enemy-boss:    #E24B4A;   /* red — boss */
--col-integrity:     #9FE1CB;   /* teal — integrity/lives meter */
--col-cycles:        #AFA9EC;   /* purple — Cycles currency display */
--col-blueprint:     #FAC775;   /* amber warm — blueprint unlock glow */
```

### Grid layout
The play field is a **40×40 grid** of tiles. Each tile is either:
- **Background** (tower placement allowed)
- **Path** (enemy route — no tower placement)
- **Occupied** (tower placed)

The path is rendered as a slightly lighter set of tiles with a subtle glow animation when
enemies are on them. No "lane" lines — enemies are dots that move along path coordinates.

### Enemy rendering
Enemies are rendered as **wireframe geometric shapes** — not sprites, just outlines:
- Basic Recursion: small square `□`
- Pattern Crawler: triangle `△`
- Null Packet: hexagon `⬡`
- Fractal Host: larger square with inner square `⊟`
- Boss (Infinite Loop): large ring `○` with rotating inner elements

Each enemy has a thin health bar above it. HP is shown as a fill percentage of the bar width.

---

## C. Tower system

### Tower types (6)

**1. Pulse Node** (base DPS tower)
```
Cost: 80 Cycles    Range: 5    Damage: 8/s    Type: single-target, rapid fire
Upgrade 1 (120C): +4 damage, +1 range
Upgrade 2 (200C): +12 damage; attacks twice per second
Upgrade 3 (350C): [blueprint required] Overload — 10% chance to stun target for 0.5s
Active ability (at level 3): EMP Burst — stuns all enemies in range for 2s, 30s cooldown
```

**2. Scatter Array** (AoE tower)
```
Cost: 150 Cycles   Range: 4    Damage: 6 per hit, 2.5-tile radius    Type: area burst
Upgrade 1 (200C): +radius 0.5 tiles, +3 damage
Upgrade 2 (350C): scatter fires in 6 directions (was 4)
Upgrade 3 (550C): [blueprint required] Frag Mode — 20% chance of secondary explosion
Active ability (at level 3): Overcharge — next 3 shots deal 3× damage, 45s cooldown
```

**3. Attractor Field** (slow + utility tower)
```
Cost: 100 Cycles   Range: 6    Effect: -40% enemy speed in radius (passive, always on)
Upgrade 1 (140C): -50% speed, +1 range
Upgrade 2 (250C): also reduces enemy attack frequency by 30%
Upgrade 3 (420C): [blueprint required] Gravity Well — also pulls enemies 1 tile toward center
No active ability — always-on area effect
```

**4. Null Spike** (armor penetration tower)
```
Cost: 200 Cycles   Range: 4    Damage: 15/s    Armor pierce: 50%
Upgrade 1 (280C): pierce 75%; +2 damage
Upgrade 2 (450C): pierce 100%; damage ignores shields/regeneration
Upgrade 3 (700C): [blueprint required] Pattern Strike — on kill, triggers chain to nearest enemy
Active ability (at level 3): Null Wave — removes armor from all enemies on screen for 5s, 60s CD
```

**5. Cycle Extractor** (economy tower)
```
Cost: 250 Cycles   No attack    Passive: +15 Cycles per wave that completes
Upgrade 1 (300C): +25 Cycles/wave
Upgrade 2 (500C): +40 Cycles/wave; also +5 Cycles per enemy killed while in range
Upgrade 3 (800C): [blueprint required] Compound Interest — bonus scales with wave number
No active ability
```

**6. Resonance Hub** (support tower)
```
Cost: 175 Cycles   Range: 5    Passive: boosts adjacent towers' damage by +20%
Upgrade 1 (250C): +30% boost; also +10% fire rate
Upgrade 2 (400C): boost radius includes diagonal tiles (8 adjacents instead of 4)
Upgrade 3 (650C): [blueprint required] Harmony Lock — if 3+ towers are adjacent, all get +50%
No active ability
```

### Blueprint system (file viewer feature)
Each tower's level-3 upgrade requires a **blueprint** found in the file viewer's sidebar.

The file tree looks like:
```
/stage4/
  waves.json
  enemies.json
  /towers/
    pulse_node.json           ← found in root; basic info
    scatter_array.json
    /upgrades/
      tier1_blueprints/
        pulse_overload.json   ← blueprint for Pulse Node tier-3
        scatter_frag.json
      tier2_blueprints/
        attractor_well.json   ← deeper in tree
        null_pattern.json
      tier3_blueprints/
        extractor_compound.json  ← deepest level; most powerful
        resonance_harmony.json
```

Players who explore the sidebar to `/stage4/towers/upgrades/tier3_blueprints/` unlock the two
most powerful blueprints. Players who don't explore find the game manageable but harder on the
boss wave without the Resonance Hub harmony effect.

**Blueprint unlock mechanic:**
When the player opens a blueprint JSON file in the file viewer, it shows:
```json
{
  "blueprint_id": "pulse_overload",
  "name": "Overload Protocol",
  "unlocks": "Pulse Node level 3 upgrade + EMP Burst ability",
  "status": "UNLOCKED"
}
```
The in-game Pulse Node immediately shows the level-3 upgrade button. Permanent for this run.

**Achievement:** *"I looked deeper."*

---

## D. L-system path generation

### Core algorithm
```js
// L-system rules for Stage 4
const RULES = {
  'F': 'F+F-F-F+F',   // Koch-curve-like recursive replacement
  '+': '+',
  '-': '-',
};

function applyRules(axiom, depth) {
  let result = axiom;
  for (let i = 0; i < depth; i++) {
    result = result.split('').map(ch => RULES[ch] || ch).join('');
  }
  return result;
}

// Turtle interpretation: F=forward, +=turn right, -=turn left
function pathFromLSystem(lsystem, startX, startY, stepSize = 1) {
  const path = [{x: startX, y: startY}];
  let x = startX, y = startY, dir = 0; // dir: 0=right, 1=down, 2=left, 3=up
  const DX = [1, 0, -1, 0];
  const DY = [0, 1, 0, -1];

  for (const ch of lsystem) {
    if (ch === 'F') {
      x += DX[dir]; y += DY[dir];
      path.push({x, y});
    } else if (ch === '+') {
      dir = (dir + 1) % 4;
    } else if (ch === '-') {
      dir = (dir + 3) % 4;
    }
  }
  return path;
}
```

### Path per wave group
| Waves | L-system depth | Path character | Enemy behavior |
|-------|----------------|----------------|----------------|
| 1–10 | 1 | Zigzag (2 branches) | Enemies follow single path |
| 11–20 | 2 | Branching (path splits at 2 points) | Enemies choose branch (random 60/40 split) |
| 21–30 | 3 | Recurving (path doubles back) | Towers in covered regions shoot twice |
| Boss | 4 | Full fractal | Boss traverses 3× before reaching exit |

### Branch points (Waves 11–20)
When the path splits, enemies randomly choose a branch. Towers must cover both branches
or accept that one path is undefended. This creates a "coverage portfolio" puzzle.

### Recurving path (Waves 21–30)
The path at depth 3 passes through regions it already passed through. Towers placed in these
regions now get "double time" with enemies — first pass + second pass. The game signals
recurving paths with a brighter path color on the second pass: players who read this
anticipate double coverage before building.

---

## E. Enemy types and wave structure

### Enemy types

| Name | Symbol | HP | Speed | Armor | Gold | Special |
|------|--------|-----|-------|-------|------|---------|
| **Recursion** | `□` | 50 | 1.0 | 0 | 5 | — (standard) |
| **Pattern Crawler** | `△` | 30 | 2.0 | 0 | 4 | Fast; hard to hit with slow towers |
| **Null Packet** | `⬡` | 120 | 0.6 | 50% | 10 | Armored; resists Pulse/Scatter |
| **Fractal Host** | `⊟` | 80 | 1.2 | 0 | 8 | On death: spawns 2 Recursions |
| **Resonance Ghost** | `◈` | 60 | 1.5 | 0 | 6 | Ignores Attractor Field slow |
| **Depth Crawler** | `⬣` | 200 | 0.8 | 30% | 20 | Elite; moves between branches freely |

**HP scaling across waves:**
```js
scaledHP(enemy, wave) = enemy.baseHP * (1 + 0.18 * (wave - 1))
scaledSpeed(enemy, wave) = enemy.baseSpeed * (1 + 0.03 * (wave - 1))
// Wave 1 Recursion: 50 HP    Wave 15: 182 HP    Wave 30: 322 HP
```

### Wave structure
```
Wave 1–5:   Recursion only (tutorial — single path, single enemy)
Wave 6:     Pattern Crawlers introduced (test single-target DPS)
Wave 10:    First Null Packets (test armor coverage — Null Spike needed)
Wave 11:    Path branches first time (coverage choice required)
Wave 15:    Fractal Hosts introduced (first "on-death" spawn mechanic)
Wave 16:    Boss mini (Depth Crawler ×3 — hard)
Wave 20:    Resonance Ghosts (punish over-reliance on Attractor Field)
Wave 21:    Path recurves first time (double-region coverage)
Wave 25:    Mixed wave (all types simultaneously — stress test)
Wave 30:    Final wave before boss (all types, max HP scaling)
Boss:       The Infinite Loop (see §G)
```

### Wave budget
```js
waveBudget(n) = 100 * 1.15^(n-1)   // starts at 100, grows 15% per wave
enemyCost(enemy) = enemy.baseHP * enemy.speed * (1 + enemy.armor/100)
// Budget determines enemy count: fill wave with enemy types until budget exhausted
```

---

## F. Cycles economy

### Earning Cycles
```
Enemy kill:      enemy.goldValue Cycles (see table above)
Wave clear bonus: 15 + (wave * 2) Cycles flat bonus on wave completion
Cycle Extractor: 15–40 Cycles per wave (if tower owned, see §C)
Sell tower:      70% of total invested Cycles (tower cost + upgrade costs)
```

### Spending Cycles
All spending is in real-time during waves or between waves. No forced-pause economy.

### Integrity meter (lives system)
The entity has an **Integrity meter** (default 100 points):
```
Enemy escapes:   -integrityDamage (scales with enemy HP at time of escape)
  Recursion escape: -5 Integrity
  Null Packet escape: -15 Integrity (heavy)
  Boss lap:       -25 Integrity per completed lap
Between waves:   +10 Integrity (regenerates; never above 100)
```

If Integrity hits 0 mid-wave, the wave fails. The player keeps all Cycles earned so far in
the wave but the wave is replayed. 3 failed attempts on the same wave = player can choose to
reduce wave difficulty (-20% enemy HP) or continue at full difficulty.

---

## G. Boss — The Infinite Loop

### Description
The Infinite Loop is a single enemy that traverses the **full depth-4 fractal path** three
times. It does not stop or pause between laps. On completing each lap, it regenerates 30% of
its max HP.

### Stats
```
Max HP:       2,500 (before wave 30 scaling)
Speed:        0.8 (slower than most, but the path is very long)
Armor (LOCKED): TOTAL — all damage reduced to 0
Armor (UNLOCKED): 50% — only towers at recursion points break through
Regen on lap: +750 HP per lap completion
Integrity damage on exit: -50 (instant fail if it escapes)
```

### Boss lock — LOCKED state (boss is immune to all damage without blueprints)

**The Infinite Loop is literally unkillable without the recursion points blueprint.**

In LOCKED state, the boss has `ARMOR = total` — every tower hit shows `0` damage. The boss
completes all 3 laps, exits, and the player loses Integrity. The wave fails. The boss cannot
be harmed under any circumstances.

Combat log shows:
- `> Pulse Node hits Infinite Loop for 0 (TOTAL ARMOR)`
- `> Scatter Array hits Infinite Loop for 0 (TOTAL ARMOR)`

**Taunt messages during LOCKED state** (appear as combat log entries):
- *"your towers hit me. nothing registers. perhaps your towers are not the right version."*
- *"blueprints exist for a reason. they describe what I am vulnerable to."*
- *"the upgrade files are in the directory. have you looked further than the root?"*

After 2 failed waves, a bell fires: *"there are directories I haven't opened. things I missed."*

### File viewer action — Folder navigation

The file tree in the sidebar contains:
```
/stage4/towers/upgrades/tier3_blueprints/
  recursion_points.json   ← 3 levels deep
```

When the player opens `recursion_points.json`:
```json
{
  "recursion_points": [
    {"x": 12, "y": 8},
    {"x": 28, "y": 8},
    {"x": 12, "y": 32},
    {"x": 28, "y": 32}
  ],
  "boss_vulnerability": "standard",
  "note": "The Infinite Loop takes full damage from towers at these coordinates only."
}
```

**On blueprint found** (`appState.fileViewerActions.stage4_blueprint_boss_found = true`):
- Boss armor changes from `TOTAL` to `50%` — but **only for towers at recursion points**
- Towers elsewhere still deal 0 damage to the boss
- The 4 recursion point tiles on the map now glow amber — visible when the player returns
- Bell fires: *"the blueprint showed me where it's vulnerable. only there."*
- The boss is now beatable — but only if the player places towers at the coordinates

**Achievement fires on unlock (not on boss defeat):** *"I looked deeper."*

The mechanic teaches: files are nested; critical information lives deeper in directory trees;
professional work requires exploring the file system, not just the root level.

### Mechanic — Recursion Points (UNLOCKED)
The fractal path at depth 4 has **4 recursion points** — the corner tiles where the L-system
folds back on itself. Towers placed adjacent to recursion points receive a **×2 damage
multiplier** against the boss, and — crucially — bypass the boss's residual 50% armor.
Towers NOT at recursion points still deal 0 damage.

The player who read `recursion_points.json` has the coordinates. The player who didn't must
guess — and guessing wrong means 0 damage and a guaranteed boss escape.

---

## H. Prestige — Recursion Depth

### When available
After boss defeat. Can also prestige before boss if `totalCyclesEarned ≥ 50,000` (the
total including spent — indicates the player has completed many waves).

### What resets
- All Cycles on hand
- All placed towers (removed from board)
- Wave counter (back to wave 1)
- Blueprint unlocks from sidebar (must re-explore next run)

### What persists
- Recursion Depth level
- Total Cycles earned (meta-stat)
- Path variant unlocks (each prestige unlocks one new L-system variant for future runs)
- Best wave reached (leaderboard stat)

### Recursion Depth bonus
```js
recursionDepthBonus(level) = 1 + (level * 0.15)   // +15% all tower damage per level
// Level 1: +15%   Level 3: +45%   Level 5: +75%

// Also: starting Cycles increase by 50 per level
startingCycles(level) = 150 + (level * 50)
// Level 1: 200   Level 3: 300   Level 5: 400
```

### Path variants (unlocked per prestige)
Each prestige run unlocks a new L-system rule set:
```
Prestige 1: "F": "F+F--F+F"     (Sierpinski curve variant — more branching)
Prestige 2: "F": "FF+F+F+FF"    (space-filling curve — very long path)
Prestige 3: "F": "F-F+F+F-F"    (zigzag heavy — favors tower placement at corners)
```

Different path grammars create meaningfully different strategic challenges.

---

## I. Bell messages (Stage 4)

| Event | Bell line |
|-------|-----------|
| Stage 4 start | 🔁 *it happened again. the same shape. smaller.* |
| First wave cleared | 📐 *enemies move in patterns. the patterns have patterns.* |
| Path branches (wave 11) | 🌿 *the path split. I have to cover both. I can't watch everything.* |
| Blueprint found in sidebar | 🗂 *there was more in the folder. I should have looked earlier.* |
| Path recurves (wave 21) | ⟳ *the path came back. it passed through where I'd already been.* |
| Integrity hits 0 | 💔 *it got through. I wasn't watching the right place.* |
| Boss encounter | 🔄 *the loop. I've seen this structure. once. I know where it folds.* |
| Boss defeated | 🌀 *I broke it. it will not reform. the fractal is mine.* |
| Recursion Depth prestige | ♾ *I've been through this before. the towers go up faster now.* |

**Defragmenter bell (Wave 20):**
*"patterns don't care what you want them to do. they repeat until you interrupt them."*

---

## J. Differences from genre conventions

1. **Changing path per wave** (unique). Standard TD games have a fixed path per level.
   Our L-system path changes each wave, requiring the player to place towers thinking about
   *future path shapes*, not just the current wave. This is the core design innovation.

2. **Blueprint-gated level-3 upgrades** (unique). Standard TD games unlock upgrades via
   currency only. Our blueprint system gates the most powerful upgrades behind file explorer
   discovery — creating a discovery reward above the standard economy loop.

3. **Recursion Points boss mechanic** (unique). Standard TD boss = high HP enemy.
   Our boss rewards placement knowledge (knowing the recursion point coordinates) over
   raw DPS. Players who prepared beat it in 2 laps; players who didn't may need all 3 laps
   and face heavy HP regeneration.

4. **Integrity regeneration between waves** (genre variant). Standard TD lives are permanent
   losses. Our integrity regens +10 per wave, making early mistakes recoverable over time.
   This prevents the "lost 2 lives on wave 5, now I'm just grinding through inevitably" feeling.

5. **6 tower types (all essential)** (Kingdom Rush style, smaller set). Bloons has 20+;
   Kingdom Rush has ~8 with branches. We have 6 with clear roles and no redundancy.
   Each enemy type has a clear counter in the tower set; no tower is ever useless.

---

## K. Implementation checklist (for the developer)

- [ ] 40×40 grid renderer with path / background / occupied tile states
- [ ] L-system path generator: rules, depth, turtle interpretation, grid clamping
- [ ] Path per wave: generate at wave start, cache for tower coverage calculation
- [ ] Branch points: detect path splits; route enemies probabilistically (60/40)
- [ ] Recurve detection: mark tiles visited more than once; apply double-shoot to towers there
- [ ] 6 tower types with 3 upgrade levels each; active ability system (level-3 only)
- [ ] Blueprint system: file sidebar opens JSON; unlocks in-game upgrade; persistent per run
- [ ] Recursion Points map: JSON defines coordinates; displayed if blueprint found
- [ ] Enemy types (6) with stat scaling per wave number
- [ ] Wave budget system: `waveBudget(n)` → enemy selection → spawn sequencer
- [ ] Integrity meter: tracks escapes, scales damage by enemy HP, regens between waves
- [ ] Cycles economy: earn on kill + wave bonus + extractor; spend on towers/upgrades/sell
- [ ] Wave failure: Integrity hits 0 → replay option; 3 failures → difficulty assist offer
- [ ] Boss: Infinite Loop — 3 lap traversal, HP regen per lap, recursion point bonus
- [ ] Prestige: Recursion Depth — bonus stack, path variant unlock, state reset
- [ ] Bell messages (`messages4.js`)
- [ ] Speed controls: ×1/×2/×3/pause; wave preview panel (enemy types for next wave)
- [ ] Stage 4 completion → Stage 5 unlock
