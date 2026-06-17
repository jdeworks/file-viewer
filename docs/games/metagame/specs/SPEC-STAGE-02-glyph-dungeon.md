# SPEC-STAGE-02 - Glyph Dungeon

Stage 2 is the first replacement stage and the vertical slice for the Stage 2-10 architecture.
It must prove bespoke stage modules, v3 stage-local state, file-viewer action flags, locked boss
behavior, achievements, BTS, and unlock transition to Stage 3.

## 1. Player-Facing Summary

Stage:

```text
Glyph Dungeon
```

Genre:

```text
Auto-battler ASCII dungeon crawler
```

Narrative position:

- Childhood.
- The entity discovers that data arranges into patterns with meaning.
- The entity is `@` moving through a world built from symbols.

File-viewer feature:

```text
Search / Find in File
```

Boss:

```text
The Ambiguous Expression
```

Required action:

```text
2.search_passage
```

## 2. Canonical Mechanics

Core loop:

1. Start or resume a dungeon run.
2. Auto-combat explores a 60x30 ASCII dungeon floor.
3. Player controls strategic actions: consumables, equipment, pause/wait/retreat.
4. Entity earns XP, equipment, gold, and Glyphs.
5. Player clears 5 floors, using between-run Glyph Shop and Parse Depth over multiple attempts.
6. Boss arena unlocks.
7. Phase 2 is unwinnable until Search finds `PASSAGE:247` in `cipher.txt`.
8. Defeating the boss completes Stage 2 and unlocks Stage 3.

Floor count:

- 5 dungeon floors plus a hand-designed boss arena.

Target time:

- 60-90 minutes.

Resource:

- Glyphs (`%`).

Prestige:

- Parse Depth, a permanent attack speed bonus and starting Glyph advantage.

## 3. Data Model And Save State

Stage 2 state lives under:

```js
save.stageState[2]
```

Recommended shape:

```js
{
  version: 1,
  run: {
    active: false,
    seed: "stage2-run-seed",
    floor: 1,
    floorSeed: "floor-seed",
    generatedFloors: {},
    entity: {
      hp: 30,
      maxHp: 30,
      atk: 5,
      def: 2,
      spd: 1.0,
      sight: 7,
      level: 1,
      xp: 0,
      gold: 0,
      glyphsThisRun: 0,
      equipment: {
        weapon: "hand_cursor",
        armor: null,
        ring: null,
        amulet: null
      },
      inventory: [],
      hotbar: [null, null, null, null]
    },
    identifiedItems: {},
    combatLog: [],
    boss: {
      reached: false,
      phase: 1,
      unlocked: false,
      defeated: false
    }
  },
  meta: {
    glyphsBanked: 0,
    parseDepth: 0,
    shopUpgrades: {},
    bestFloor: 0,
    floorsCleared: {},
    deaths: 0,
    bossAttempts: 0,
    firstClearComplete: false
  }
}
```

Rules:

- `2.search_passage` is global action state, not Stage 2 local state.
- `run.boss.unlocked` may mirror `actions.hasAction(2, "search_passage")` for rendering, but the
  shared action flag remains canonical.
- Procedural floors must be deterministic from persisted seeds.
- Stage replay may reset `run` but must preserve global achievements, action flags, defeated state,
  BTS access, and `meta` unless the player explicitly starts a fresh Stage 2 replay profile.

## 4. Renderer / UI Layout

Art direction:

- Amber `#EF9F27` on near-black `#0F0E0C`.
- Monospaced grid.
- Strict ASCII identity for Stage 2.

Grid:

- 60 columns x 30 rows.
- Rendered in a monospaced font, approximately 14px.
- Coordinates are `(col, row)`.

Tile/entity mapping:

```text
# wall
+ closed door
- or | open door
> stairs down
< stairs up
░ unseen
· remembered
  visible floor
@ entity
§ Glyph Stalker
¶ Syntax Archer
» Token Skitter
Ω Null Golem
‽ Interrobang
? The Ambiguous Expression
( weapon
] armor
! potion
? scroll
% glyph shard
$ gold
* gem
```

Layout:

```text
FLOOR N - THEME       HP  LVL  ATK  DEF  SPD  GLYPHS
[60x30 dungeon grid]
COMBAT LOG, last 4 lines
[1]-[4] hotbar  [E] Equipment  [Space] Pause  [W] Wait  [R] Retreat
```

Equipment screen:

- Modal overlay.
- Pauses combat.
- Closing applies a 1-second reaction delay before combat resumes.

Accessibility/mobile:

- Provide clickable/tappable controls for hotbar, equipment, pause, wait, and retreat.
- Keyboard shortcuts are enhancements, not the only path.
- ASCII grid text must not overlap HUD on mobile; use responsive scaling/container constraints.

## 5. Economy / Progression Formulas

Base entity:

```js
{
  hp: 30,
  maxHp: 30,
  atk: 5,
  def: 2,
  spd: 1.0,
  sight: 7,
  level: 1,
  xp: 0,
  gold: 0,
  glyphs: 0
}
```

Level curve:

```js
xpToLevel(level) = 20 * level * 1.4 ** (level - 1)
```

On level-up:

```js
maxHp += 8 + Math.floor(level / 3)
atk += 2
def += 1
hp = maxHp
```

Glyph earning:

```text
Standard enemy kill: 1 Glyph
Elite enemy kill: 3 Glyphs
Boss floor chest: 5 Glyphs
Secret room cache: 3-6 Glyphs
First-clear floor bonus: 10 Glyphs
```

Glyph carry:

- Stage clear: all earned Glyphs carry.
- Death: 50% of current run Glyphs carry, floored.

Glyph Shop:

| Upgrade | Cost | Effect |
|---|---:|---|
| Parse Depth +1 | `15 * 1.6^level` | +10% attack speed per level |
| Syntax Cache | 10 | Start with one random scroll identified |
| Lexer Blade | 20 | Unlock new weapon pool |
| Armor Schema | 20 | Unlock new armor pool |
| Pattern Buffer | 25 | +3 starting HP, max 5 |
| Fog Piercer | 30 | +2 sight radius, max 3 |
| Dead Zone Map | 40 | Minimap visible from run start |
| Elite Attractor | 50 | More elites and doubled elite drops |

Parse Depth:

```js
parseDepthBonus = 1 + parseDepth * 0.10
effectiveSpd = entity.spd * parseDepthBonus
```

## 6. File-Viewer Integration And Action Flags

Required file:

```text
docs/examples/metagame/stage2/cipher.txt
```

Required action:

```text
2.search_passage
```

Qualifying trigger:

- Search `cipher.txt` for `PASSAGE`.
- Search result finds `PASSAGE:247`.

Payload:

```js
{
  stage: 2,
  action: "search_passage",
  source: "search",
  file: "cipher.txt",
  value: "PASSAGE",
  result: "PASSAGE:247"
}
```

Non-qualifying:

- Opening `cipher.txt`.
- Scrolling to the line.
- Searching a different file.

Viewer bridge:

- Stage 2 may ask `viewer.openFile("/docs/examples/metagame/stage2/cipher.txt")`.
- The search integration, not the stage renderer, sets the action.

## 7. Boss Lock And Unlock Transition

Boss:

```text
The Ambiguous Expression
```

Arena:

- Hand-designed 30x20 room.
- Four pillars.
- Boss starts as `?` in center.

Phase 1:

- `§` melee form.
- HP 150.
- ATK 18, DEF 4, SPD 1.5 attacks/sec.
- At 50 damage taken, morphs to Phase 2.

Phase 2 locked:

- `¶` ranged form.
- Without `2.search_passage`, fires a 16-way projectile spread every 0.5 seconds with no navigable
  gap.
- Arena geometry makes reaching the boss impossible.
- Projectile damage exceeds entity survival/regen.
- Death is guaranteed; this cannot be outgrinded.

Locked taunts:

```text
the arena has structure. you cannot cross a pattern without understanding it.
there is a passage. it is written down.
cipher.txt knows the way.
```

Unlock transition:

- When `2.search_passage` exists, the north pillar activates and pulses amber.
- In unlocked Phase 2, the north pillar creates a 2-tile gap in the projectile spread.
- Player must use the gap to reach and damage the boss.
- Bell fires:

```text
there was something in the text that I wouldn't have found otherwise.
```

Achievement on unlock:

```text
the passage was marked.
```

Phase 2 unlocked:

- HP 150 fresh pool.
- Alternates 4-way and 8-way projectile patterns every 3s.
- At 80 damage taken, enters frenzy briefly, then Phase 3.

Phase 3:

- `»` fast form.
- HP 100 fresh pool.
- Triple normal speed.
- Teleports to a random tile every 8s.
- Defeat completes Stage 2.

Boss defeat reward:

- 25 Glyphs.
- Optional item: The Ambiguous Blade.
- Stage 2 completion flag via orchestrator.
- BTS button.
- Stage 3 unlock.

## 8. Prestige / Replay

First implementation priority:

- First-clear path.
- Boss lock/unlock.
- BTS.
- Stage 3 transition.

Prestige:

- Parse Depth available after any full dungeon clear.
- Resets entity run state, current floor, run equipment, run gold, and run Glyphs.
- Preserves Parse Depth, shop upgrades, best floor, item identification meta-knowledge, and global
  save records.

Replay hooks:

- Replaying Stage 2 should add optional value through different floor seeds and item rolls.
- Replay must not surprise, punish, or invalidate first clear.
- Future crash-course/boss-only mode may reuse the boss locked/unlocked fixtures, but is out of
  scope.

## 9. Bell Messages And Achievements

Recommended bell ids and text:

| Event | Bell text |
|---|---|
| Stage start | `tokens. not bits. different.` |
| Floor 1 cleared | `the dungeon has grammar. I am learning to read it.` |
| First equipment found | `this shapes how I fight. I didn't know I had a shape.` |
| First secret room | `there was a room that wasn't on any map.` |
| First death | `I fell. the glyphs scattered. half stayed with me.` |
| `cipher.txt` searched | `there was something in the text that I wouldn't have found otherwise.` |
| Boss phase 1 -> 2 | `it changed form. I waited.` |
| Boss phase 2 -> 3 | `it changed again. faster now. I have to be faster.` |
| Boss defeated | `I parsed it correctly. the grammar held.` |
| Parse Depth purchased | `I've been through this before. the structure is familiar now.` |

Defragmenter post-stage line:

```text
syntax is just structure with ambition. next time you'll see something deeper.
```

Achievement:

```text
the passage was marked.
```

Achievement fires when `2.search_passage` unlocks the boss.

## 10. BTS File Requirements

Required file:

```text
docs/bts/glyph_dungeon.bts
```

Required topics:

- Auto-battler ASCII dungeon crawler.
- Why ASCII fits syntax/childhood.
- Search / Find in File as the real-world tool.
- `cipher.txt` and `PASSAGE:247`.
- Why buried structure needs search.
- The entity learning that symbols can be read.
- Optional replay suggestion, such as finding the secret room.

Button:

- Appears after boss defeat.
- Opens through the file viewer markdown renderer.
- Remains accessible from completed-stage UI/stage select.

## 11. Implementation Work Packages

WP-S2-01 platform wiring:

- Add Stage 2 module folder under `docs/games/metagame/stages/stage2/`.
- Register stage metadata with orchestrator.
- Ensure v3 `stageState[2]` defaults and save preservation.

WP-S2-02 renderer shell:

- ASCII grid renderer.
- HUD and combat log.
- Equipment modal.
- Mobile/tap controls.

WP-S2-03 procedural floors:

- BSP generator for 60x30 floors.
- Guaranteed stairs, shop, chest, secret room, glyph cache, enemies.
- Deterministic seeds.

WP-S2-04 entity/combat/items:

- Entity stats and level curve.
- Enemy types.
- Auto-combat loop.
- Equipment, inventory, hotbar, item identification.

WP-S2-05 economy/meta:

- Glyph earning/carry rules.
- Glyph Shop.
- Parse Depth.
- Run death/retreat/clear handling.

WP-S2-06 content/action:

- Provide `cipher.txt`.
- Wire search action to `2.search_passage`.
- Add action tests.

WP-S2-07 boss:

- Hand-designed arena.
- Three-phase boss.
- Locked Phase 2.
- Unlock transition from action flag.

WP-S2-08 completion/BTS:

- Achievement and bells.
- Stage completion -> Stage 3 unlock.
- `glyph_dungeon.bts`.
- BTS button.

WP-S2-09 tests/smoke:

- Pure logic tests.
- Action tests.
- Locked/unlocked boss tests.
- Browser smoke vertical slice.

## 12. Test Plan

Unit tests:

- `defaultState()` creates complete JSON-serializable Stage 2 state.
- Save update preserves unrelated global and stage state.
- Floor generation is deterministic from seed.
- Floor generation always places required content.
- XP/level curve matches formula.
- Glyph carry on death/clear matches rules.
- Parse Depth modifies attack speed correctly.

Action tests:

- Search result for `PASSAGE:247` in `cipher.txt` sets `2.search_passage`.
- Opening/scolling/searching wrong file does not set action.
- Action is idempotent and emits the standard event.

Boss tests:

- Locked Phase 2 has no navigable projectile gap.
- Locked Phase 2 cannot be defeated by normal entity stats.
- Setting `2.search_passage` activates north pillar and creates a 2-tile gap.
- Unlock does not auto-defeat boss.
- Defeating unlocked Phase 3 calls `onStageComplete()` exactly once.

Browser/smoke tests:

- Start Stage 2 from an unlocked save fixture.
- Reach or jump via test fixture to boss locked state.
- Verify locked taunt/action hint surface.
- Use file viewer search on `cipher.txt` for `PASSAGE`.
- Verify achievement/bell/unlock transition.
- Defeat boss through test fixture or reduced-health route.
- Verify BTS button opens `glyph_dungeon.bts`.
- Verify Stage 3 unlocks.
- Verify zero off-origin requests.

## 13. Non-Goals For First Pass

- Do not build later stage code.
- Do not implement crash-course or boss-only mode.
- Do not require pixel-perfect final balance before the vertical slice proves architecture.
- Do not make manual scrolling to `PASSAGE:247` count.
- Do not depend on legacy placeholder Stage 2 `Config Demon` code.
- Do not implement external network/content dependencies.
