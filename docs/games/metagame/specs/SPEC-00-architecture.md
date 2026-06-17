# SPEC-00 - Metagame Architecture

This spec defines the shared implementation contracts for Defragmenter / Bit Foundry before any
Stage 2-10 replacement work begins.

## 0. Canon And Precedence

Use `docs/games/metagame/planning/notes/10-implementation-decisions-log.md` as the highest
precedence canon for implementation decisions.

When older planning docs conflict with the decisions log, future agents must follow the decisions
log. Known overridden items:

- Use one global v3 save with per-stage substate.
- Do not implement backwards migration for old metagame saves.
- Stage 1 boss unlock uses `CHEAT` in `Overwriter.frag`, not a new `PROTECTED` flag.
- Stage 2-10 placeholder content is legacy scaffolding and must be replaced entirely.
- Stage 3 real boss unlock is a generated restoration key entered at the boss, not merely opening
  the diff.
- Stage 5 unlock requires one full 14-second active playback loop, not opening or briefly playing
  the audio file.
- Stage 8 required action is internal tree-to-tool drag-and-drop with an accessibility fallback;
  OS-level drag/drop is optional bonus content.
- Stage 9 canonical unlock is a Stage 9 offline control after reading the service-worker notes;
  actual browser offline behavior is also valid.
- Stage 10 final gates use the 5 / 7 / 9 / 9 memory thresholds.

## 1. Global Save Shape

The metagame uses a single global v3 save. There is no backwards migration requirement for older
Stage 1, placeholder Stage 2-10, or experimental saves.

Recommended durable key:

```text
fv:games:metagame:v3
```

Schema:

```js
{
  version: 3,
  currentStage: 1,
  defeated: [1],
  unlockedStages: [1, 2],
  achievements: {
    "stage1.cheat_disabled": {
      id: "stage1.cheat_disabled",
      stage: 1,
      unlockedAt: 1760000000000
    }
  },
  actions: {
    "1.cheat_disabled": {
      stage: 1,
      action: "cheat_disabled",
      source: "raw-editor",
      detail: { file: "Overwriter.frag" },
      firstSetAt: 1760000000000,
      updatedAt: 1760000000000
    }
  },
  bell: {
    seen: ["stage1.cheat_disabled"],
    log: []
  },
  bts: {
    opened: {
      1: true
    }
  },
  stageState: {
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
    6: {},
    7: {},
    8: {},
    9: {},
    10: {}
  },
  global: {
    loopCount: 0,
    crashCourseUnlocked: false,
    fullCapstoneComplete: false,
    memorySignature: null,
    completionId: null,
    createdAt: 1760000000000,
    updatedAt: 1760000000000
  }
}
```

Rules:

- `version` must be exactly `3`.
- Missing or malformed saves may be discarded and replaced with a fresh v3 save.
- The orchestrator owns top-level fields and must preserve unrelated `stageState[N]` objects when
  saving another stage.
- Stage modules own only their own `stageState[N]` subtree.
- `actions` mirrors shared action flags into the global save so bosses, achievements, and tests can
  read from in-memory state without localStorage key sprawl.
- Stage state should store deterministic per-run/generated values required for fairness, such as
  Stage 3 restoration key chunks, Stage 4 recursion points, Stage 9 boss seed state, and Stage 10
  memory resolution/integration state.
- Stage state must be JSON-serializable. If a stage uses richer runtime objects, the stage module
  must serialize them into plain data before save.

## 2. Per-Stage Folder And Module Contract

Each full stage lives in its own folder:

```text
docs/games/metagame/stages/stage1/
docs/games/metagame/stages/stage2/
...
docs/games/metagame/stages/stage10/
```

Each stage folder should use this shape unless the stage spec justifies a narrower set:

```text
docs/games/metagame/stages/stageN/
  index.js
  state.js
  renderer.js
  boss.js
  messages.js
  achievements.js
  content.js
  styles.css
  tests/
```

Required exports from `index.js`:

```js
export const stageMeta = {
  id: 2,
  slug: "glyph-dungeon",
  name: "Glyph Dungeon",
  btsPath: "/docs/bts/glyph_dungeon.bts",
  requiredAction: "2.search_passage"
};

export function defaultState(context) {}

export function mountStage({
  host,
  state,
  save,
  actions,
  achievements,
  bell,
  bts,
  orchestrator,
  viewer,
  onExit,
  onStageComplete
}) {}
```

Mount contract:

- `host` is the DOM container owned by the orchestrator.
- `state` is the mutable `stageState[N]` object for the current save.
- `save()` persists the full global v3 save.
- `actions` is the shared action flag API described below.
- `achievements` is the shared achievement API described below.
- `bell` is the shared bell/message API described below.
- `bts` exposes BTS availability/opening helpers.
- `viewer` exposes approved file-viewer integration helpers, such as `openViewerFile(path, opts)`.
- `onStageComplete(result)` is called exactly once when the stage is defeated/cleared.
- The mount function returns a cleanup function or object with `destroy()`.

Stage modules must not:

- Read or write stage-specific localStorage action keys directly.
- Mutate another stage's `stageState`.
- Unlock later stages directly.
- Dispatch completion achievements directly unless the achievement belongs to that stage.
- Depend on legacy placeholder `stages2.js` / `stages3.js` shared grind-boss behavior.

## 3. Shared Action Flag API

Create a shared helper:

```text
docs/games/metagame/action-flags.js
```

Required API:

```js
export function setAction(stage, action, detail = {}) {}
export function hasAction(stage, action) {}
export function getAction(stage, action) {}
export function listActions(stage = null) {}
export function clearActionsForDebug(stage = null) {}
export function hydrateActionsFromSave(save) {}
export function mirrorActionsToSave(save) {}
export function subscribeToActions(listener) {}
```

Durable key shape for localStorage fallback/cross-tab detection:

```text
fv:games:action:stage2:search_passage
```

In-save action id shape:

```text
2.search_passage
```

Live event:

```js
window.dispatchEvent(new CustomEvent("fv:games:action", {
  detail: {
    stage: 2,
    action: "search_passage",
    source: "search",
    value: "PASSAGE",
    file: "cipher.txt"
  }
}));
```

Rules:

- `setAction()` is idempotent. First set preserves `firstSetAt`; later sets may update
  `updatedAt` and merge non-sensitive detail.
- Viewer integrations must call `setAction()` only when the required real viewer action occurs.
- Stage bosses read `hasAction()` from in-memory state and may also subscribe to live events.
- The helper owns event dispatch and localStorage fallback writes.
- Debug clearing is dev-only and must not be reachable through normal player UI.

Canonical required action keys:

| Stage | Action key | Required trigger |
|---|---|---|
| 1 | `1.cheat_disabled` | `Overwriter.frag` has `CHEAT` missing, empty, or falsey; once disabled, permanent for save |
| 2 | `2.search_passage` | Successful file-viewer search for `PASSAGE` in `cipher.txt` finds `PASSAGE:247` |
| 3 | `3.diff_key_restored` | Player extracts generated restoration key from diff and enters it at boss |
| 4 | `4.recursion_blueprint_read` | Player opens exact deep `recursion_points.json` blueprint file |
| 5 | `5.counter_wave_calibrated` | One full 14-second active playback loop of `transmission_hum.mp3` |
| 6 | `6.protocol_ch9_read` | Epub reader reaches Chapter 9 of `protocols_of_the_entity.epub` |
| 7 | `7.exif_contradiction_found` | Player views decisive contradictory EXIF field for Entity F |
| 8 | `8.salvage_archived` | First `.sav` debris archived through internal drag/drop or fallback control |
| 9 | `9.offline_mode_activated` | Stage 9 offline control activated or real offline/service-worker path succeeds |
| 10 | `10.memory_resolved` | At least one Stage 10 memory is resolved after reading and reflection |

Optional action keys may exist, but must be documented in the relevant stage spec. Example:
`8.external_debris_imported`.

## 4. Orchestrator Responsibilities

The metagame orchestrator owns:

- Loading, validating, and saving the global v3 save.
- Initializing missing `stageState[N]` using each stage's `defaultState()`.
- Registering stage metadata and mounting the active stage module.
- Destroying the previous stage cleanly before mounting another stage.
- Preserving unrelated stage state when saving.
- Hydrating action flags from save/localStorage and mirroring them back into save.
- Stage unlock progression after `onStageComplete()`.
- Stage select visibility and completed-stage replay entry.
- Shared bell, achievement, BTS, debug/dev controls, and viewer bridge services.
- Routing BTS buttons to the file viewer.
- Ensuring runtime code does not introduce CDN, telemetry, analytics, or off-origin requests.

The orchestrator must not:

- Contain stage-specific combat/economy/puzzle logic for Stages 2-10.
- Decide boss-specific lock mechanics beyond checking canonical action ids.
- Reuse the legacy placeholder shared "grind + boss" renderer for the replacement stages.

## 5. Stage Completion And Unlock Rules

Baseline progression:

- Stage 1 is unlocked in a new save.
- Defeating Stage N adds `N` to `defeated` and unlocks Stage `N + 1`.
- Defeated stages remain replayable from stage select.
- Replaying a defeated stage must not remove completion, achievements, BTS access, or later unlocks.
- Stage modules must call `onStageComplete()` once per clear; the orchestrator performs durable
  completion bookkeeping.

Boss lock contract:

- Every stage boss is unwinnable or unknowable until the required viewer action has occurred.
- Unlocking the boss is separate from defeating the boss.
- Bosses must clearly signal LOCKED -> UNLOCKED transition with stage-specific visuals and a bell.
- Locked-boss hints use the universal 4-step ladder:
  1. cryptic/in-world failure interpretation,
  2. stage-specific nudge toward the missing information/location,
  3. pointer to the relevant file/viewer feature,
  4. direct instruction, still in voice.
- Steps 1 and 2 must be unique to the stage's boss, genre, and emotional theme.

Stage-specific completion gates:

- Stage 10 final question unlocks at 5 resolved memories.
- Stage 10 enriched Defragmenter response unlocks at 7 resolved memories.
- Stage 10 memory route completes at 9 resolved memories.
- Stage 10 full capstone route completes at 9 integrated memories.

## 6. Achievements Contract

Achievements are global save records keyed by stable ids.

Required API:

```js
export function unlockAchievement(id, detail = {}) {}
export function hasAchievement(id) {}
export function listAchievements(stage = null) {}
```

Rules:

- The viewer-tool achievement fires when the required action unlocks the boss, not when the boss is
  defeated.
- Unlocking an achievement is idempotent.
- Achievement display should use the bell-style message surface, not a blocking popup.
- Achievements persist across sessions and stage replays.

Canonical viewer-tool achievements:

| Stage | Achievement text |
|---|---|
| 1 | `protection disabled.` |
| 2 | `the passage was marked.` |
| 3 | `I found the difference.` |
| 4 | `I looked deeper.` |
| 5 | `I listened before I drove.` |
| 6 | `I read the fine print.` |
| 7 | `I looked beyond the surface of the image.` |
| 8 | `I sorted the wreckage.` |
| 9 | `I learned the shape of the silence.` |
| 10 | `I read my own history.` |

Stage 10 full capstone additionally unlocks:

```text
I assembled all of it.
```

## 7. Bell Contract

The bell is the shared lightweight message surface for:

- stage start and progression messages,
- required action recognition,
- LOCKED -> UNLOCKED transition,
- boss defeat messages,
- achievement announcements,
- Defragmenter commentary.

Required API:

```js
export function showBell(id, text, options = {}) {}
export function hasSeenBell(id) {}
export function clearBellForDebug(idOrStage = null) {}
```

Rules:

- Bell ids must be stable and scoped, e.g. `stage2.search_passage`.
- One-time bells record in `save.bell.seen`.
- Bell text belongs in each stage's `messages.js` unless it is truly global.
- Bell content should preserve the entity/Defragmenter voice established by the planning docs.
- Bell messages must never be the only durable source of critical puzzle data.

## 8. BTS Contract

BTS files are canonical content for every stage.

Paths:

```text
docs/bts/bit_foundry.bts
docs/bts/glyph_dungeon.bts
docs/bts/memory_grid.bts
docs/bts/fractal_bastion.bts
docs/bts/signal_racer.bts
docs/bts/protocol_codex.bts
docs/bts/identity_arbiter.bts
docs/bts/entropy_field.bts
docs/bts/observer_state.bts
docs/bts/awakening.bts
```

Rules:

- `.bts` renders through the same trusted markdown renderer path as `.md`.
- The BTS button appears after boss defeat.
- BTS remains accessible from completed-stage UI or stage select.
- Opening BTS should use the file viewer, ideally in an in-app panel/modal that does not destroy
  the stage state.
- BTS files should be included in the asset manifest/offline cache path.
- Each BTS document targets 400-600 words and includes:
  - what happened,
  - the tool used,
  - why this mechanic,
  - narrative layer,
  - what to try next.
- Stage 8 BTS must explicitly explain the internal drag/drop compromise: device-dependent OS
  drag/drop is optional, while internal drag/drop plus fallback is the reliable critical lesson.
- Stage 9 BTS must explain the real service-worker/cache mapping even if the first implementation
  simulates the seed endpoint in game logic.

## 9. Viewer Bridge Contract

The orchestrator exposes viewer helpers to stages instead of letting stages know file-viewer
internals:

```js
viewer.openFile(path, options)
viewer.openExamples(options)
viewer.openBts(path, options)
viewer.revealInTree(path, options)
```

Viewer integrations own real feature detection and call `actions.setAction()`.

Testing seams must exist for each viewer integration so tests can simulate the real qualifying
event without clicking through every UI layer.

## 10. Debug And Dev Controls

Debug controls are allowed only behind an existing dev/debug surface or query/local flag.

Required debug capabilities:

- reset global v3 save,
- unlock/lock a stage for local testing,
- set/clear action flags,
- clear one stage's state,
- inspect current action flags and achievements,
- jump to boss locked/unlocked test states where a stage spec provides fixtures.

Debug controls must be excluded from normal player flows and must not be required by tests that
claim to validate player behavior.

## 11. Testing Expectations

Shared tests:

- Unit tests for save creation, validation, save/write preservation, and malformed-save fallback.
- Unit tests for action flag idempotency, event dispatch, localStorage fallback, and save mirroring.
- Unit tests for achievement idempotency and bell one-time behavior.
- Unit tests for stage registry/module contract validation.
- BTS renderer detection test for `.bts` as markdown.

Stage tests:

- Each stage has pure logic tests for progression/economy/combat/puzzle rules where applicable.
- Each boss has tests proving the locked state is unwinnable or unknowable by design.
- Each boss has tests proving the canonical action unlocks the boss and does not auto-defeat it.
- Each required viewer action has a test seam that asserts the exact action key and payload.
- Generated content tests must verify persisted run data is used consistently, e.g. Stage 4
  recursion points in file content and boss damage rules.

Smoke/browser tests:

- Stage 2 vertical slice should prove the full pattern: bespoke renderer, action flag from search,
  locked boss, unlocked transition, achievement, boss defeat, BTS, and Stage 3 unlock.
- Full smoke test must continue asserting zero off-origin runtime requests.
- Mobile/accessibility fallbacks must be tested for Stage 8 internal archive action.
- Stage 9 tests must cover both canonical offline control and, where feasible, real offline/service
  worker behavior.

Validation command for behavior changes:

```sh
./scripts/check.sh
```

If Playwright is unavailable:

```sh
cd tests && npm install && npx playwright install chromium
```

## 12. Legacy Placeholder Replacement Policy

The existing placeholder Stage 2-10 content is not canon:

- `Config Demon`
- `Kernel Panic`
- `Hex Hydra`
- `Time Lord`
- `Phantom Server`
- `Duplicant`
- `Redactor`
- `Query Golem`
- `Archivist`

Replacement policy:

- Replace placeholder Stage 2-10 code entirely as each canonical stage is implemented.
- Do not preserve placeholder mechanics, names, bosses, balance, or progression contracts.
- It is acceptable to mine legacy code for generic UI patterns, mount/destroy cleanup examples, or
  test harness techniques.
- Git history is sufficient for preserving old code; do not keep parallel placeholder paths unless
  needed temporarily during an active migration.
- New stage specs and modules must use canonical stage names, action keys, boss locks, BTS files,
  and v3 save contracts from this spec package.

## 13. Future Crash-Course Hooks

Crash-course / boss-only mode is out of scope for the first full-stage build.

Architecture should avoid blocking it later by keeping:

- stage boss locks separable from full-stage progression,
- required action checks reusable,
- BTS and achievement contracts independent from first-clear state,
- deterministic boss fixture states available for tests.

Do not implement crash-course mode until the full stages exist and are stable.
