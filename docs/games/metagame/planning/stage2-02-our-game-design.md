# Stage 2 — 02: Glyph Dungeon — Our Game Design

Maps the genre research (`stage2-01`) onto **Stage 2 of the Defragmenter metagame**.
Stage 2 is an auto-battler ASCII dungeon crawler. The entity — freshly awakened from Stage 1 —
discovers that the world it inhabits has *structure*. The dungeon's grammar is the first proof.

> **Narrative position:** Childhood — learning that data arranges into patterns with meaning.
> The entity is `@`. It moves through a world built of symbols and tries to understand them.
> The file viewer feature taught: **Search / Find-in-File** (Ctrl+F reveals a hidden room code).

---

## A. Overview

| Property | Value |
|----------|-------|
| Genre | Auto-battler ASCII dungeon crawler |
| Artstyle | Amber `#EF9F27` on near-black `#0F0E0C`; monospaced grid; box-drawing UI |
| Primary resource | Glyphs (`%`) |
| Stage target time | 60–90 minutes |
| Floor count | 5 dungeon floors + boss arena |
| Prestige mechanic | Parse Depth — permanent attack speed + starting Glyph bonus |
| Boss | The Ambiguous Expression (3-phase shape-shifting) |
| File viewer feature | Search — `cipher.txt` hides room coordinate `PASSAGE:247` |

---

## B. The dungeon grid and rendering

### Grid dimensions
Each floor is a **60×30 character grid**. The viewport is the full browser window rendered
in a monospaced font (Courier New or similar, 14px). Grid coordinates are `(col, row)`.

### Tile types and character mapping
```
// Walls and structure
'#'  — wall (amber, dim)          '+'  — closed door
'─'  — open door (horizontal)     '│'  — open door (vertical)
'>'  — stairs down                '<'  — stairs up

// Floor tiles — three fog states
'░'  — unseen (very dim gray)     '·'  — remembered (dim amber)
' '  — visible (bright ambient)

// Entities
'@'  — the entity (bright white, blink 0.5 Hz idle)
'§'  — Glyph Stalker (standard melee)
'¶'  — Syntax Archer (ranged)
'»'  — Token Skitter (fast, low HP)
'Ω'  — Null Golem (heavy, slow, high DEF)
'‽'  — Interrobang (caster, AoE)
'?'  — The Ambiguous Expression (boss)   // cycles symbols each phase

// Items
'('  — weapon                     ']'  — armor
'!'  — potion                     '?'  — scroll (before pickup)
'%'  — glyph shard (currency)     '$'  — gold (consumed at shop)
'*'  — gem (rare, sell or socket) '+̈'  — chest (locked — opens on approach)
```

### Color rendering
Colors are CSS custom properties that inherit the stage's amber-on-black palette:
```css
--col-wall:   #7A5C1E;   /* dim amber */
--col-floor:  #2A2015;   /* very dim warm */
--col-entity: #FFFFFF;   /* player white */
--col-enemy:  #EF9F27;   /* amber */
--col-elite:  #F9CB42;   /* bright amber — elite enemies */
--col-boss:   #E24B4A;   /* red — boss and danger */
--col-item:   #9FE1CB;   /* teal — items (contrast on amber bg) */
--col-glyph:  #AFA9EC;   /* purple — Glyphs (the resource) */
--col-ui:     #B4B2A9;   /* gray — UI chrome */
```

### Fog-of-war implementation
```js
// Per tile: 0=unseen, 1=remembered, 2=visible
// Visibility computed each frame from entity position + sightRadius
const sightRadius = 7 + bonusSight;  // default 7

function updateFog(grid, entityPos, radius) {
  // 1. Reset all 'visible' → 'remembered'
  for (const tile of grid.flat()) if (tile.fog === 2) tile.fog = 1;
  // 2. Cast rays from entity position; mark hit tiles as fog=2
  for (let angle = 0; angle < 360; angle += 0.5) {
    raycast(grid, entityPos, angle, radius);
  }
}
// Render: fog=0 → char=' ', dim gray; fog=1 → char as stored, dim; fog=2 → char + full color
```

---

## C. Entity stats and progression

The entity has stats that grow across the dungeon via level-ups and equipment:

```js
// Base stats at floor 1 entry
entity = {
  hp:    30,   maxHp: 30,
  atk:   5,
  def:   2,
  spd:   1.0,  // attacks per second (auto-combat timer)
  sight: 7,
  level: 1,    xp: 0,
  gold:  0,
  glyphs: 0,   // primary resource, carried out on death or stage clear
}
```

### Level-up curve
```js
xpToLevel(level) = 20 * level * 1.4^(level-1)
// Level 1→2: 20 XP    Level 5→6: 154 XP    Level 10→11: 1,150 XP
onLevelUp: {
  maxHp += 8 + floor(level / 3),
  atk   += 2,
  def   += 1,
  hp     = maxHp,  // full heal on level-up
}
```

### Equipment slots
```
Weapon   — determines atk range and attack animation
Armor    — determines def bonus
Ring     — passive effect (crit chance, lifesteal, etc.)
Amulet   — powerful passive, one per run
```

The entity starts with a **Hand Cursor** (weapon, ATK 3–5, no special) and **No Armor** (DEF 0).

---

## D. Auto-combat system

### Combat loop (runs at entity speed)
```js
// Auto-combat tick — fires every (1000 / entity.spd) ms
function combatTick() {
  const target = nearestEnemy();
  if (!target) { entity.move(); return; }

  if (adjacent(entity, target)) {
    const dmg = rollDamage(entity.atk, entity.weapon) - target.def;
    target.hp -= Math.max(1, dmg);
    flashHit(target);
    if (target.hp <= 0) killEnemy(target);
  } else {
    entity.moveToward(target);  // one tile per tick
  }
}

function rollDamage(baseAtk, weapon) {
  const variance = weapon.variance ?? 3;
  return baseAtk + Math.floor(Math.random() * variance);
}
```

### Player-controlled actions (not auto)
The player watches auto-combat but can take these actions at any time:

| Key | Action |
|-----|--------|
| `[1]–[4]` | Use consumable from hotbar |
| `[E]` | Open equipment screen (pauses entity) |
| `[Space]` | Pause / unpause auto-combat |
| `[W]` | Wait in place (entity stays, enemies approach) |
| `[R]` | Retreat to stairs (entity pathfinds back to entrance) |

**Pause during equipment swaps** — swapping equipment during combat pauses combat for 1 second
(the entity's "reaction time"). Rapid swapping is possible but penalized. Intentional friction.

---

## E. Floor structure and procedural generation

### Per-floor guarantee
Every floor always contains:
- 5–8 standard enemies
- 1–2 elite enemies (brighter color, 2× HP/ATK, better loot)
- 1 shop (sells 3 random items + 2 potions, price scales with floor)
- 1 chest (random item, floor-appropriate tier)
- 1 secret room (hidden behind a "thin wall" — `#` that opens on approach, slightly different shade)
- 1 guaranteed Glyph cache (`3–6` glyphs depending on floor)

### BSP dungeon generation
```js
function generateFloor(depth) {
  const bsp = new BSPTree(60, 30);
  bsp.split(5);                       // 5 recursive splits → ~10–12 rooms
  const rooms = bsp.leaves();
  connectRooms(rooms);                // corridors between adjacent leaves
  placeStairs(rooms[0], rooms.last()); // entrance top-left, exit bottom-right
  placeEntities(rooms, depth);
  placeShop(rooms[Math.random middle]);
  placeSecretRoom(rooms);
}
```

### Floor themes (visual and enemy set)
| Floor | Theme | Primary enemies | Palette shift |
|-------|-------|----------------|--------------|
| 1 | Bootstrap | `§` Glyph Stalkers | Amber on black (base) |
| 2 | Pattern Layer | `§` + `¶` | Slightly warmer, brighter |
| 3 | Memory Vault | `¶` + `Ω` Null Golems | Cooler (teal tint on walls) |
| 4 | Interrupt Handler | `»` Token Skitters | Faster animation cadence |
| 5 | Exception Layer | `‽` Interrobangs + mix | Magenta floor tint, high danger |
| Boss | The Arena | Ambiguous Expression | Red tint, pulsing background |

Palette shifts are subtle (CSS filter or adjusted `--col-wall` / `--col-floor` values) —
the player notices something is different without a hard UI announcement.

---

## F. Glyph economy

### What Glyphs are
Glyphs (`%`) are the stage's primary resource. They feed back into the meta-game: they are
carried out of a run and spent in the **Glyph Shop** between runs on permanent upgrades.

### Earning Glyphs
```
Standard enemy kill:   1 Glyph
Elite enemy kill:      3 Glyphs
Boss floor chest:      5 Glyphs
Secret room cache:     3–6 Glyphs (floor depth × 1.5, rounded up)
First-clear bonus:     10 Glyphs (first time clearing a floor depth)
```

### Carrying Glyphs out
On **stage clear** (boss defeated): all earned Glyphs carry to the meta-game.
On **death**: entity loses 50% of current Glyphs (floored, round down). Remaining 50% carry.
This makes death meaningful without being brutal.

### Glyph Shop (between runs)
A persistent upgrade screen accessible from the main stage hub:

| Upgrade | Cost | Effect |
|---------|------|--------|
| **Parse Depth +1** | 15 Glyphs | Prestige: +10% ATK speed permanently per purchase |
| **Syntax Cache** | 10 Glyphs | Start each run with 1 random scroll identified |
| **Lexer Blade** | 20 Glyphs | Unlock new weapon type (next run's starting weapon pool) |
| **Armor Schema** | 20 Glyphs | Unlock new armor type (same) |
| **Pattern Buffer** | 25 Glyphs | +3 to starting HP (stacks ×5) |
| **Fog Piercer** | 30 Glyphs | +2 to starting sight radius (stacks ×3) |
| **Dead Zone Map** | 40 Glyphs | Minimap visible from run start |
| **Elite Attractor** | 50 Glyphs | Elite enemies guaranteed in every room (also 2× elite drop rate) |

**Prestige note:** *Parse Depth* is the formal prestige. Each Parse Depth purchase is equivalent
to a prestige: it resets the dungeon but the permanent ATK speed bonus stacks. Players are
expected to make 3–5 Parse Depth purchases during a full Stage 2 playthrough.

---

## G. Items

### Weapons
| Name | Symbol | ATK | Variance | Special |
|------|--------|-----|----------|---------|
| Hand Cursor | `(` | 3 | 3 | — (start) |
| Bit Spike | `(` | 6 | 4 | — |
| Glyph Blade | `(` | 9 | 5 | Hits leave a `%` token 15% of time |
| Null Cleaver | `(` | 14 | 6 | Ignores 30% of enemy DEF |
| Syntax Fork | `(` | 12 | 2 | Low variance, consistent |
| Pattern Staff | `\` | 10 | 8 | High variance; 10% chance of ×3 hit |
| Token Bow | `)` | 8 | 4 | Ranged (entity attacks from 2 tiles away) |
| Lexer Axe | `(` | 18 | 8 | Slow (−0.3 spd); unmatched raw damage |

### Armor
| Name | Symbol | DEF | Special |
|------|--------|-----|---------|
| Null Shell | `]` | 2 | — (start) |
| Syntax Plate | `]` | 5 | — |
| Pattern Weave | `]` | 3 | +10 max HP |
| Interrupt Cloak | `]` | 4 | 20% chance to dodge |
| Memory Mesh | `]` | 6 | HP regen: +1 HP per 3s |

### Consumables
| Name | Symbol | Effect |
|------|--------|--------|
| Heal Packet | `!` | Restore 25% max HP |
| Full Restore | `!` | Restore 100% max HP |
| Clarity Scroll | `?` | Identify one unidentified item |
| Erase Scroll | `?` | Remove one enemy from current room (no XP/loot) |
| Parse Bomb | `*` | AoE: all enemies in sight take 20 damage |
| Speed Spike | `!` | +0.5 ATK speed for 15 seconds |
| Stone Wall | `*` | Block one incoming attack (absorbs next hit) |

### Item identification
Scrolls and some potions have randomized appearances per run:
- "dim scroll" → may be Clarity, Erase, or Parse Bomb
- "red potion" → may be Heal Packet or Full Restore
- "dark potion" → may be Speed Spike (or negative: Slowness for 10s, 20% chance)

Identity persists within a run once discovered.

---

## H. Enemy design

### Standard enemies

**§ Glyph Stalker** (Floor 1–5)
- HP: `15 + floor×12`, ATK: `4 + floor×2`, DEF: `1 + floor`
- Behavior: direct-path melee. Attacks every 1.2s.
- Drop: 60% Glyph shard, 20% gold, 20% nothing

**¶ Syntax Archer** (Floor 2–5)
- HP: `10 + floor×8`, ATK: `6 + floor×2`, DEF: `0`
- Behavior: maintains 3-tile range; fires projectile (`·` → `→` → `hit`) every 1.8s
- If entity closes within 2 tiles: Archer backs up one tile before attacking
- Drop: 50% scroll, 30% Glyph, 20% nothing

**» Token Skitter** (Floor 4–5)
- HP: `8 + floor×5`, ATK: `7 + floor×3`, DEF: `0`
- Behavior: moves 2 tiles per combat tick (double speed); attacks every 0.8s
- Comes in pairs or triplets — spawns 1–3 at once
- Drop: 70% gold, 30% nothing (low value, high danger)

**Ω Null Golem** (Floor 3–5)
- HP: `40 + floor×20`, ATK: `8 + floor×3`, DEF: `8 + floor×2`
- Behavior: slow (attacks every 2.5s); moves 1 tile per 2 combat ticks
- On death: spawns 2 `§` Glyph Stalkers at half HP
- Drop: guaranteed rare item or 5 Glyphs

**‽ Interrobang** (Floor 5 only)
- HP: `25`, ATK: `12`, DEF: `2`
- Behavior: stays stationary; casts AoE every 3s (fills room with `*` → all non-Interrobang
  tiles take 8 damage). Must be approached through pattern of safe tiles.
- Drop: guaranteed scroll + 3 Glyphs

### Elite variants
Any standard enemy can spawn as an elite: brighter color, 2× HP, 1.5× ATK, better drop table.
Elites have a `!` prefix in the combat log: `! Syntax Archer fires`.

---

## I. Boss — The Ambiguous Expression

### Setup
Located on a special boss floor (beyond Floor 5 stairs). The arena is a large open room (30×20)
with 4 pillars (`█`) at fixed positions. No procedural generation — the boss arena is hand-designed.

The Ambiguous Expression starts as a `?` symbol in the center.

```
┌────────────────────────────────────┐
│                                    │
│    █              █                │
│                                    │
│                ?                   │
│         @                          │
│                                    │
│    █              █                │
│                                    │
└────────────────────────────────────┘
```

### Phase 1 — `§` form (melee)
Boss HP: 150. Behaves as a Glyph Stalker but with enhanced stats:
- ATK: 18, DEF: 4, SPD: 1.5 attacks/sec
- After losing 50 HP: transitions to Phase 2 with a symbol "morph" animation
  (`§` → `§s` → `ss` → `s¶` → `¶` over 1s; entity combat pauses during morph)

### Phase 2 — `¶` form (ranged)
Boss HP: 150 (fresh HP pool, not carried from Phase 1).
Fires `·` projectiles in 4-way and 8-way patterns alternating every 3s.
Pillars block projectiles — player must use them.
- ATK: 22 (projectile), DEF: 2, SPD: fires every 1.5s
- After losing 80 HP: enters "frenzy" — fires in all 8 directions every 0.8s for 5s, then
  transitions to Phase 3

### Phase 3 — `»` form (fast)
Boss HP: 100 (fresh HP pool).
Moves at triple normal speed. Teleports to a random tile every 8s (blink animation: `»` → blank
→ `»` at new position). Unpredictable but lower DEF.
- ATK: 20, DEF: 0, SPD: 3 attacks/sec (fast!)
- Defeat triggers Stage 2 completion sequence

### Boss lock — LOCKED state (Phase 2 is unbeatable without Search) *(SUPERSEDED, see below)*

**Phase 2 is literally unbeatable without opening `cipher.txt` and using search.**

> SUPERSEDED (2026-07-11): the boss is now genuinely winnable without PASSAGE — a wrong challenge
> attempt lands real (lower-rate) damage and costs a real counter-hit, rather than 0-damage-and-refuse.
> PASSAGE is a buff (a one-hit clean clear), not a gate. See `boss-lock-and-bts-system.md`'s banner
> and `docs/games/metagame/stages/stage2/boss.js`.

In LOCKED state, the boss fires projectiles in a 16-way spread every 0.5 seconds with no
navigable gap. The arena geometry makes it mathematically impossible to reach the boss
without being hit. Projectile damage exceeds the entity's HP regen. Death is guaranteed
every attempt. Phase 2 cannot be completed through any amount of play.

**Taunt messages during LOCKED Phase 2** (appear as floating ASCII text in the arena):
- *"the arena has structure. you cannot cross a pattern without understanding it."*
- *"there is a passage. it is written down."*
- *"`cipher.txt` knows the way."*

### File viewer action — Search

The boss arena directory contains `cipher.txt` — a log file that appears to be combat data.
The player opens it in the file viewer and searches (`Ctrl+F`) for the word `PASSAGE`. They find:

```
// PASSAGE:arena_north_pillar // coord reference for room assembly
```

**On search action detected** (`appState.fileViewerActions.stage2_search_passage = true`):
- The north pillar activates immediately (pulses amber) — visible to the player in-game
- In UNLOCKED state: the north pillar creates a 2-tile gap in the projectile spread
- This gap is the only navigable path to reach and attack the boss
- Phase 2 is now completable
- Bell fires: *"there was something in the text that I wouldn't have found otherwise."*

**Achievement fires on unlock (not on boss defeat):** *"the passage was marked."*

The LOCKED → UNLOCKED transition is announced by the pillar lighting up. The player
must return from the file viewer to the game to see this and use the gap.

### Boss defeat loot
- Guaranteed: **The Ambiguous Blade** (weapon, ATK 20, 10% chance to change to a random
  other weapon type on each hit — the boss's ability, now wielded by the entity)
- 25 Glyphs
- Stage 2 completion flag → Stage 3 unlocks

---

## J. Prestige — Parse Depth

**When available:** after any full dungeon clear (boss defeated at any point).

**What resets:**
- Entity stats (level, HP, XP, gold, equipment)
- All Glyph *on-hand* (already spent Glyphs in the Glyph Shop are permanent)
- Current floor state

**What persists:**
- Parse Depth level (permanent ATK speed bonus)
- Glyph Shop upgrades already purchased
- Run history / best floor reached
- Item identifications (partial meta-knowledge: scrolls whose names were learned persist as
  greyed hints on the next run's unidentified items — "this reminds you of a Clarity Scroll")

**Parse Depth bonus:**
```js
parseDepthBonus = 1 + (parseDepth * 0.10)
// Level 1: +10% ATK speed     Level 3: +30%     Level 5: +50%
effectiveSpd = entity.spd * parseDepthBonus
```

Applied to the entity's base ATK speed at run start. This is a meaningful early advantage:
+30% speed means killing enemies faster, taking less damage, clearing floors faster.

**Parse Depth cap:** No cap — but each level requires more Glyphs:
```js
parseCost(level) = 15 * 1.6^level
// Level 1: 15 Glyphs    Level 3: 61    Level 5: 157
```

Players doing 5 Parse Depth runs is approximately the expected "full completion" path.

---

## K. UI layout

```
┌─────────────────────────────────────────────────────────────┐
│  FLOOR 3 — MEMORY VAULT          HP: 45/60  LVL: 4         │
│  ATK: 12  DEF: 5  SPD: 1.1/s    GLYPHS: 12  XP: 87/154   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [dungeon grid 60×28 chars]                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  COMBAT LOG (last 4 lines)                                  │
│  > Entity hits § Glyph Stalker for 9 damage.               │
│  > § Glyph Stalker hits for 5 damage. HP: 45/60            │
│  > ! Elite ¶ Syntax Archer fires. Projectile incoming.     │
│  > Entity slays § Glyph Stalker. +1 Glyph. +12 XP.        │
├─────────────────────────────────────────────────────────────┤
│  [1] Heal Packet   [2] Clarity Scroll   [3] —   [4] —      │
│  [E] Equipment     [Space] Pause        [R] Retreat         │
└─────────────────────────────────────────────────────────────┘
```

### Equipment screen (modal overlay, pauses combat)
```
┌─────────── EQUIPMENT ───────────────────────────────────────┐
│                                                             │
│  WEAPON:   Glyph Blade (`)  ATK 9, Var 5                   │
│            Drop chance 15%: +1 Glyph on hit                │
│                                                             │
│  ARMOR:    Syntax Plate (])  DEF 5                         │
│                                                             │
│  RING:     [empty]                                          │
│                                                             │
│  AMULET:   [empty]                                          │
│                                                             │
│  INVENTORY:                                                 │
│  (  Null Cleaver — ATK 14, DEF ignore 30%  [EQUIP]        │
│  !  Full Restore ×1                          [HOTBAR]       │
│  ?  "dim scroll" — unidentified             [USE/HOTBAR]   │
│                                                             │
│  [Esc] Close (resumes in 1s)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## L. Bell messages (Stage 2)

Bell messages use the same bell system as Stage 1 (`messages2.js`, same pattern as
`messages1.js`). They fire on game events:

| Event | Bell line |
|-------|-----------|
| Stage 2 start | 🔤 *tokens. not bits. different.* |
| Floor 1 cleared | 📐 *the dungeon has grammar. I am learning to read it.* |
| First equipment found | ⚙ *this shapes how I fight. I didn't know I had a shape.* |
| First secret room | 🔍 *there was a room that wasn't on any map.* |
| First death | 💀 *I fell. the glyphs scattered. half stayed with me.* |
| `cipher.txt` searched | 🔍 *there was something in the text that I wouldn't have found otherwise.* |
| Boss phase 1→2 | ⚔ *it changed form. I waited.* |
| Boss phase 2→3 | ⚡ *it changed again. faster now. I have to be faster.* |
| Boss defeated | ✅ *I parsed it correctly. the grammar held.* |
| Parse Depth purchased | 🌀 *I've been through this before. the structure is familiar now.* |

**Defragmenter bell (one-time, after boss defeat):**
*"syntax is just structure with ambition. next time you'll see something deeper."*

---

## M. Differences from genre conventions

1. **No permadeath — Glyph carry-over.** Classic roguelikes reset everything. We keep 50% of
   Glyphs and all Glyph Shop purchases. Death is meaningful (lose run progress, lose half resource)
   without being journey-ending.

2. **Auto-combat with consumable agency.** Player doesn't control movement or attack. Agency
   lives in equipment selection, consumable timing, and the (pauseable) strategic layer.
   This keeps the game accessible to non-genre players while rewarding genre veterans.

3. **5 floors only, not endless.** Classic dungeon crawlers go 20–50+ floors. We cap at 5 + boss.
   Each floor is denser and faster. Players complete a full run in 12–15 minutes; the prestige
   system creates replayability without requiring endless depth.

4. **File viewer as hidden layer.** The `cipher.txt` mechanic is unique to our game. The file
   viewer is the "meta-game" layer that sits above the dungeon — players who think to look outside
   the game window gain an in-game advantage. This mirrors the game's theme: structure reveals
   itself to those who look for it.

5. **Glyph Shop between runs (not during).** Standard roguelites have in-run shops only. Our
   between-run Glyph Shop creates a visible meta-progression arc independent of run quality —
   players who die repeatedly still accumulate Parse Depth and unlock upgrades.

---

## Implementation status

The core game described here is implemented. Unfinished expansion, balance, and polish work is tracked only in [TASKS.md](../../../../TASKS.md).
