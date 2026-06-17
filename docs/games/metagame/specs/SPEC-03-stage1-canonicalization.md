# SPEC-03 - Stage 1 Canonicalization

This spec defines how the existing Stage 1 Bit Foundry implementation should be brought into the
shared metagame architecture. It is a prep/spec document only.

## 0. Canon Sources

Primary sources:

- `docs/games/metagame/planning/notes/10-implementation-decisions-log.md`
- `docs/games/metagame/specs/SPEC-00-architecture.md`
- `docs/games/metagame/specs/SPEC-01-file-viewer-actions.md`
- `docs/games/metagame/specs/SPEC-02-content-manifest.md`
- `docs/games/metagame/planning/implemented/04-game-plan.md`
- Current Stage 1 modules in `docs/games/metagame/`

When older Stage 1 docs conflict with the decisions log, follow the decisions log.

## 1. Naming Canon

Canonical stage:

```text
Stage 1 - Bit Foundry
```

Canonical boss:

```text
The Defragmenter
```

Legacy/non-canonical boss names:

- The Overwriter as boss name is deprecated.
- `Overwriter.frag` remains the required file name unless a later review explicitly renames the
  shipped file and updates all specs.

Rationale:

- The current plan's antagonist is process-like: unfair routines, optimization, cleanup, and
  defragmentation, not a cartoon villain.
- Keeping `Overwriter.frag` as the file name preserves current example-file continuity and the
  raw-edit clue path while allowing the boss identity to be The Defragmenter.

## 2. Boss Unlock Canon

Required action:

```text
1.cheat_disabled
```

Required file:

```text
docs/examples/Overwriter.frag
```

Canonical unlock:

- Stage 1 boss unlock uses `CHEAT` in `Overwriter.frag`.
- Missing `CHEAT` line disables the cheat.
- `CHEAT=` disables the cheat.
- Falsey values disable: `false`, `0`, `no`, `off`, empty.
- Truthy values: `true`, `1`, `yes`, `on`.
- Once disabled, the cheat is permanent for that save.

Deprecated/overridden:

- Do not introduce a separate `PROTECTED` flag as the canonical unlock.
- Existing local key `fv:boss1:cheat` is legacy implementation detail and should be replaced by
  the shared action flag/save contract.

Boss behavior target:

- Locked/cheating state must be unwinnable or effectively unbeatable by design.
- The boss should communicate that an unfair routine is active and hint toward the file.
- Unlocking the action removes the unfair routine for future fight attempts.
- The action does not auto-defeat the boss.

Implementation note:

- The current `boss1.js` samples a local cheat flag at fight start. The v3 implementation should
  sample `actions.hasAction(1, "cheat_disabled")` from the shared API instead.

## 3. Save Canon

Stage 1 currently uses:

```text
SAVE_KEY = fv:games:metagame
SAVE_VERSION = 2
base64-encoded Stage 1 state
```

Canonical future save:

```text
fv:games:metagame:v3
```

Rules:

- No backwards migration is required from v1/v2 Stage 1 saves.
- A missing or malformed save starts a fresh v3 save.
- Stage 1 state lives under `save.stageState[1]`.
- Global completion, achievements, actions, BTS, and bell records live at top level per `SPEC-00`.

Stage 1 stage-state shape should preserve the useful current economy fields:

```js
{
  bits: { m: 0, e: 0 },
  totalBits: { m: 0, e: 0 },
  owned: {},
  timedStates: {},
  managers: {},
  pullFactors: [],
  milestones: [],
  totalBought: 0,
  buyMult: 1,
  bossSeen: false,
  bossLossCount: 0,
  runStartedAt: 1760000000000,
  introStages: [],
  claimed: {},
  tabsUnlocked: false
}
```

Move out of Stage 1 local state:

- `version`
- `stage`
- `defeated`
- global `achievements`

Those belong to the global v3 save.

## 4. Module Layout Canon

Current useful modules may be moved under the Stage 1 folder contract:

```text
docs/games/metagame/stages/stage1/
  index.js
  state.js
  renderer.js
  boss.js
  messages.js
  achievements.js
  economy.js
  bignum.js
  managers.js
  reset.js
  styles.css
```

Existing modules that can be reused with adaptation:

- `bignum.js`
- `s1economy.js`
- `stage1.js`
- `boss1.js`
- `s1state.js`
- `achievements1.js`
- `s1achievements.js`
- `messages1.js`
- `s1bell.js`
- `s1managers.js`
- `s1reset.js`

Required mount contract:

```js
export function mountStage({
  host,
  state,
  save,
  actions,
  achievements,
  bell,
  bts,
  viewer,
  onExit,
  onStageComplete
}) {}
```

Stage 1 should no longer require the old shared orchestrator phase machine or old `stage()` lookup
to function.

## 5. UI And Tone Canon

Stage 1 may use restrained symbolic UI/icons. Stage 2 owns the strict ASCII identity.

Allowed:

- Current pixel reveal/grid language.
- Idle-clicker tabs and BigNum economy.
- Restrained icons already present in the Stage 1 implementation.

Tone:

- The Defragmenter should feel process-like and unfair.
- Avoid cartoon villain language in future revisions.
- Existing jokey taunts may be softened during the canonicalization pass if they undermine the
  process-like antagonist direction.

## 6. Achievements And Bell Canon

Viewer-tool achievement:

```text
protection disabled.
```

Achievement fires when `1.cheat_disabled` is first set.

Bell rules:

- Bell messages should use the shared bell API.
- Stage 1's current `s1bell.js` can inform the implementation but should not remain a separate
  persistence path once global v3 is active.
- Full Stage 10 capstone can enrich second-loop Stage 1 bell lines and add subtle visual traces.

## 7. BTS Canon

Required BTS file:

```text
docs/bts/bit_foundry.bts
```

Rules:

- Button appears after The Defragmenter is defeated.
- Button remains accessible from completed-stage UI/stage select.
- File opens in the file viewer as markdown via `.bts` support.

Required content themes:

- Idle/clicker genre and accumulation.
- Raw editor / file editing as the tool lesson.
- The `CHEAT` line as an unfair routine in a file the player can inspect.
- Birth/genesis narrative position.

## 8. Completion And Unlock Canon

Stage 1 is unlocked in a fresh v3 save.

Stage 1 completion:

- Defeating The Defragmenter adds `1` to global `defeated`.
- Defeating Stage 1 unlocks Stage 2.
- Stage 1 remains replayable.
- Replaying Stage 1 must not remove `1.cheat_disabled`, achievements, or BTS access.

Prestige/replay:

- Existing Stage 1 prestige mechanics may remain scoped to Stage 1 state.
- Prestige must not reset global action flags, achievements, defeated stages, or BTS access.
- Stage 10 second-loop enrichments should be additive and non-punishing.

## 9. Tests Required Before Stage 2 Implementation

Stage 1 canonicalization should add or update tests for:

- Fresh v3 save initializes Stage 1 under `stageState[1]`.
- Malformed old save is discarded without migration.
- Stage 1 save preserves unrelated top-level global fields and other stage state.
- `CHEAT` parser falsey/truthy/missing/empty behavior.
- `1.cheat_disabled` idempotency and permanence.
- Boss locked state reads shared action API, not stage-specific localStorage.
- Achievement fires on action unlock, not boss defeat.
- Defeating Stage 1 unlocks Stage 2 through the orchestrator.
- BTS button appears after boss defeat and opens `docs/bts/bit_foundry.bts`.

## 10. Non-Goals

- Do not implement old-save migration.
- Do not preserve placeholder Stage 2-10 compatibility.
- Do not rename every historical file reference unless a review explicitly approves it.
- Do not implement crash-course/boss-only mode.
- Do not begin Stage 2 code until shared specs and the audit/prep pass are reviewed.
