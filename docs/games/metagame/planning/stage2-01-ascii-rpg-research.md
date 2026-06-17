# Stage 2 — 01: ASCII RPG / Auto-Battler Genre Research

Reference research for the **Glyph Dungeon** Stage 2 design. Developer-facing distillation
of the ASCII dungeon-crawler / auto-battler lineage: how key games handle exploration,
combat, equipment, and pacing in a character-rendered world. The companion doc
`stage2-02-our-game-design.md` maps this onto our specific Stage 2 implementation.

---

## A. The seminal games and what each contributed

| Game | Year / author | Core contribution we care about |
|------|---------------|---------------------------------|
| **Rogue** | 1980, Toy/Wichman/Arnold | The archetype. Random dungeon generation (BSP rooms + corridors), `@` as player, letter-symbols for monsters (`D`=dragon, `Z`=zombie), `%`=food, `]`=armor. Turn-based, every action has equal time cost. Permadeath. Fog of war (unexplored = black, seen = gray, visible = lit). This visual grammar is the shared language all subsequent games inherit. |
| **NetHack** | 1987–ongoing, DevTeam | **Item identification and emergent depth.** Potions/scrolls/rings are unidentified on pickup; their identity must be discovered by use or inference. *Polymorph* and thousands of item interactions create an "everything simulates" world. Lesson: the dungeon is a *discovery engine*, not a stage. Players are curious, not just progressing. |
| **Brogue** | 2009, Brian Walker | **Clarity and environmental storytelling.** Deliberately trimmed NetHack's sprawl to something playable in a session. Key design rules: every mechanic is visually legible; fire spreads; gas drifts; terrain participates in combat. Lesson: a dense, small set of legible rules produces emergent richness better than a large set of opaque ones. |
| **Dungeon Crawl Stone Soup (DCSS)** | 2006–ongoing, community | **Removing un-fun design.** Starvation clocks removed; identification simplified; auto-explore added; monster memory shown in-UI. Every mechanic must be *interesting*, not just hard. Lesson: friction that teaches nothing should be cut; friction that creates decisions should stay. |
| **Stone Story RPG** | 2014–2023, Martian Rex | **Auto-combat with strategic layer.** Player character moves and attacks automatically. Player role: choose location, equip items, use consumables at key moments, and (for power users) write Stonescript to customize the AI. 16,000 hand-drawn ASCII frames. Lesson: *auto-combat does not mean no agency* — the agency moves to equipment management, timing, and positioning. The player is a *director*, not a pilot. |
| **SanctuaryRPG: Black Edition** | 2014–2015, Black Shell Games | **ASCII + JRPG fusion.** Turn-based combat with combo system, 160 class/race combinations, 1,400+ weapons. Color-coded combat text as UI — yellow words in enemy text = reposition, red in HP text = bleed. Permadeath or softcore modes. Lesson: *color in ASCII communicates system state* efficiently without pixel art; text color is a first-class UI element. |
| **A Dark Room** | 2013, Doublespeak Games | **Narrative-first, mechanic-reveal idle.** No tutorial; mechanics and story surface gradually as the player pokes. Lesson: **mystery is motivating**; the player's curiosity carries the early game more than explicit rewards. Directly influences our Stage 2's "first time in the dungeon with no map" opening. |
| **Candy Box / Candy Box 2** | 2013, aniwey/Gabriel Verdon | **Browser ASCII with progressive reveal.** Items and entire game systems appear as you accumulate. Boss fights are simple but thematically memorable. Lesson: the ASCII constraint is *not* a limitation — it is the aesthetic, and players lean into it enthusiastically. First game Gabriel Santos (Stone Story) cited as his inspiration. |

---

## B. Core mechanics taxonomy

### 1. The @ and the dungeon grid

The player is a character (`@`, cursor, or symbol) on a 2D grid. The grid has:
- **Walls** — impassable (`#`, `█`)
- **Floor** — passable (`.`, space)
- **Doors** — open on contact or key (`+`)
- **Stairs** — advance floor (`>`, `<`)
- **Entities** — monsters (symbol), items (`!`, `?`, `]`, etc.)

**Procedural generation approaches:**
- *BSP (Binary Space Partition):* divide space recursively, place rooms in leaves, connect with corridors. Produces clean, legible layouts. Rogue/Brogue style.
- *Cellular automata:* seed random tiles, iterate neighbor rules, produces cave-like organic layouts. Good for later floors.
- *Prefab + random:* hand-designed "rooms of interest" (treasure vault, puzzle room, shop) inserted among random corridors. Ensures notable moments amid procedural noise.

Our Stage 2 uses BSP for legibility (player must read the map quickly in auto-combat context).

### 2. Fog of war (three-state)

The standard three-state system:
- **Unseen:** character `·` or empty. Player has no information.
- **Remembered:** dimmed version of tile. Player has seen it but it's not currently visible.
- **Visible:** full color. Within the player's current sight radius (typically 7–10 tiles in roguelikes; smaller in auto-battlers where the player isn't manually navigating every step).

In our auto-battler context, the entity moves automatically. The fog of war therefore *reveals over time* as the entity patrols — the player's role is to watch the revelation and react.

### 3. Auto-combat (Stone Story model)

The entity moves toward the nearest enemy and attacks on a fixed timer. Combat resolution:
```
damage = attacker.atk - defender.def    // floored at 1
defender.hp -= damage
if defender.hp <= 0: enemy dies, drop loot
```
**Player agency in auto-combat:**
1. **Equipment selection** — chosen *before* the run or between rooms
2. **Consumable timing** — potions/scrolls used manually at key moments
3. **Item switching** — swapping weapon mid-fight (Stone Story: right-click to queue swap)
4. **Location selection** — which dungeon floor to send the entity to
5. **Stonescript / scripting** (advanced, not required)

### 4. Equipment and item slots

Standard slot system:
| Slot | Examples |
|------|---------|
| Weapon | sword `(` , staff `\`, bow `)` |
| Offhand | shield `[`, torch `!`, quiver |
| Armor | `]` breastplate, `(` cloak |
| Ring ×2 | `=` stat rings |
| Amulet | `"` passive effect |

**Item quality tiers** (common pattern): Normal → Magic (1 affix) → Rare (2–3 affixes) → Unique (fixed special effect). Items drop from enemies, chests, and boss kills.

**Identification system (NetHack-inherited):** Items have a *true name* and an *appearance*. The appearance is consistent within a run but randomized per run. Players identify by use (drink a potion, see the effect) or by using identify scrolls. This creates *information asymmetry* that makes each item feel like a discovery.

### 5. Enemy design (ASCII)

ASCII enemies are distinguished by:
- **Symbol** (primary identifier) — `§`, `¶`, `D`, `k`, etc.
- **Color** (secondary identifier) — same symbol, different danger level per color
- **Behavior** — melee/ranged/caster/swarm/boss

**Behavior archetypes:**
| Archetype | Behavior |
|-----------|---------|
| Melee | Moves toward `@`, attacks adjacent |
| Ranged | Maintains distance, fires projectile |
| Caster | Low HP, high damage, casts area spells |
| Swarm | Multiple instances, individually weak |
| Stalker | Moves when player doesn't look (NetHack `F`) |
| Boss | Larger symbol, multi-phase, arena gimmick |

### 6. Loot economy and progression

**Loot sources:** enemy drops, chests, shops, hidden caches.
**Progression axes:**
- *Power* — raw stat (attack, defense, HP)
- *Utility* — special effect (slow enemy, AoE damage, regen)
- *Economy* — gold/currency for shops

**Shops in dungeons:** sell consumables and one guaranteed equipment piece per floor. Gold is dropped by enemies; prices scale per floor. Shops prevent complete RNG-dependence on drops.

### 7. Floor structure and pacing

**Typical floor structure:**
- Multiple rooms connected by corridors
- 1–3 elite enemies (harder than standard, better drops)
- 1 shop (optional)
- 1 chest (random loot)
- 1 secret room (hidden wall, bonus loot)
- Stairs down at the far end from entrance

**Difficulty scaling between floors:**
```
floorMult = 1 + floor(floorNumber / 3) × 0.25
enemyHP   = baseHP   × floorMult
enemyAtk  = baseAtk  × floorMult × 0.8   // attack scales slower than HP
lootTier  = min(3, floor(floorNumber / 5)) // better drops deeper
```

### 8. Prestige and meta-progression

Classic roguelikes have no prestige — death is death, restart from zero. Modern roguelites add:
- **Permanent unlocks** (new classes, starting items, passive buffs) via a meta currency
- **Knowledge persistence** — player retains understanding of enemy patterns, item identities
- **Run modifiers** — starting bonuses earned in prior runs

Our Stage 2 is a **roguelite** (meta-progress) not a roguelike (pure), because the narrative
requires the entity to accumulate permanent power across the arc.

### 9. Boss design in ASCII contexts

ASCII bosses use the same tile grid but are distinguished by:
- **Larger sprite** — multi-tile boss occupies a 3×3 or larger region
- **Phase transitions** — boss changes symbol/behavior on HP thresholds
- **Arena mechanic** — floor tiles change (fire spreads, walls close in, projectile patterns)
- **Unique loot** — boss always drops a key item or guaranteed high-tier piece

---

## C. Standard formulas

### Combat resolution
```
// Per-hit calculation
rawDamage  = attacker.atk + rand(0, attacker.weaponVariance)
defense    = defender.def * defenseScaling        // defenseScaling ∈ [0.7, 1.0]
netDamage  = max(1, rawDamage - defense)
// Critical hit
if rand(0,1) < critChance: netDamage *= 1.5
```

### Enemy scaling per floor
```
hpMult    = 1 + floorIndex * 0.18
atkMult   = 1 + floorIndex * 0.12
dropBonus = floorIndex * 0.04     // +4% drop rate per floor, capped at 50%
```

### Experience / level-up
```
xpToLevel = baseXP * level^1.5
xpFromKill = enemy.tier * floorMult * 10
onLevelUp: hp += 8, atk += 2, def += 1
```

### Item stat ranges (auto-battler simplified)
```
// Item generated at floor depth d, rarity r ∈ {1,2,3}
statRange = [baseStat*(d*0.5), baseStat*(d*0.8)] * r
```

---

## D. ASCII rendering conventions

### Character-as-meaning vocabulary (our Stage 2 palette)
```
@   — the entity (player)
§   — standard enemy (melee)
¶   — ranged enemy
»   — fast enemy (skips tiles)
#   — standard enemy (heavy/elite)
░   — unexplored floor (fog)
·   — explored floor (dim)
    — current-visible floor (bright)
█   — wall
+   — door (closed)
─   — door (open)
>   — stairs down
<   — stairs up
!   — potion
?   — scroll
]   — armor/equipment
(   — weapon
$   — gold
*   — gem/special item
%   — glyph currency (our stage-specific resource)
```

### Color conventions (terminal palette — 16 colors)
| Color | Semantic meaning |
|-------|-----------------|
| Bright white | Current-turn active, player `@`, UI labels |
| Amber/yellow | Items, gold, warnings |
| Green | Safe / HP above 50% |
| Red | Danger / HP below 25% / boss |
| Cyan | Water, ice, cold effects |
| Magenta | Magic / special abilities |
| Dark gray | Walls, explored-but-not-visible tiles |
| Black | Unexplored / background |

### Animation conventions
ASCII "animation" is achieved by cycling characters over time:
- Idle enemy: alternates between symbol and a slight variant (`§` ↔ `s` at 0.5 Hz)
- Running entity: trails `·` characters that fade after 3 frames
- Attack flash: target blinks bright red for 2 frames
- Boss intro: symbol grows (single char → multi-char "sprite" assembled over 0.5s)
- Explosion: `.` → `*` → `+` → `×` → `·` → ` ` in expanding ring

---

## E. UX patterns specific to ASCII RPGs

- **Equipment preview:** before equipping, show delta stats (`ATK: 12 → 15 (+3)`)
- **Auto-move with interrupt:** the entity moves automatically; the player can *pause* auto-move to inspect items or take a consumable
- **Combat log:** last 5 lines of combat text always visible; color-coded by event type
- **Minimap:** optional 20×20 overview in corner showing explored tiles, current position, staircase location
- **Hotkeys for consumables:** `[1]–[5]` for quick-use slots; holding a key queues it for next combat round

---

## F. Design pitfalls to avoid

1. **Symbol ambiguity.** Two symbols too visually similar at small size. Solution: use color as a second dimension; never rely on symbol alone for danger level.
2. **Combat opacity.** Player doesn't understand why they're dying. Solution: combat log with clear number breakdown; cursor-hover tooltip on enemies showing their stats.
3. **Dead-end floors.** Procedural generation produces floors with no items, no loot, no interest. Solution: guarantee minimum 1 shop + 1 chest per floor regardless of random generation.
4. **Auto-combat removes agency.** Player feels like a spectator. Solution: consumable system with good timing windows; equipment choice creates runs that feel distinct.
5. **Permadeath frustration.** In our context (no permadeath — runs contribute to meta-progress) the risk is the *opposite*: no tension. Solution: death sends the entity back to floor 1 but retains Glyphs earned, so death stings but never erases.
6. **Pacing flatness.** Every floor feels the same. Solution: introduce a new mechanic or enemy type every 2 floors; use visual palette shifts to signal new zone.

---

## G. How this maps to Stage 2: Glyph Dungeon (pointer)

Stage 2 takes the **Stone Story RPG** auto-combat model (entity fights automatically, player
directs via equipment and consumables), the **Brogue** clarity principles (small legible rules
that compound), the **color-as-UI** lesson from SanctuaryRPG, and the **mystery-first** reveal
from A Dark Room. It wraps these in a pure ASCII aesthetic (amber-on-black) with a 5-floor
dungeon, a Glyph economy that feeds into the meta-game, and a boss that phase-shifts through
three distinct ASCII forms. Full spec in `stage2-02-our-game-design.md`.
