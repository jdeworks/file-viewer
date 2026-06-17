# Canonical Contracts Before Implementation Specs

This note records which parts of the planning set should be treated as canon when writing
implementation specs for agents.

## Scope Canon

- Full hidden anthology/metagame, not a tiny easter egg.
- Target stage length: **40 minutes to 2 hours**.
- Later crash-course / boss-only mode is a future extension, not part of the first full-stage build.
- Stages can be deep systems with prestige, optional mastery, and replay texture.

## Design Canon

Use the individual `stageN-02-our-game-design.md` files plus `boss-lock-and-bts-system.md` as
the primary source for Stages 2-10.

Use `implemented/04-game-plan.md` plus the current `file-viewer/docs/games/metagame` Stage 1 code
as primary source for Stage 1.

Treat `defragmenter_stage_design_v2.md` as the high-level narrative map, not exact mechanics. It
still contains older "helpful but not required" file-viewer mechanics. The canonical version is:

> every stage boss lock is unbeatable or unknowable until the required viewer feature is used.

## Legacy Code Canon

The current repo contains old placeholder Stage 2-10 content:

- `Config Demon`
- `Kernel Panic`
- `Hex Hydra`
- `Time Lord`
- `Phantom Server`
- `Duplicant`
- `Redactor`
- `Query Golem`
- `Archivist`

These are **legacy scaffolding**, not canon for the new plan. They can be mined for UI patterns or
mount/destroy contracts, but should be replaced by the new stage renderers and stage data.

## File-Viewer Action Contract

Stage 1 already proves a useful pattern:

- app feature observes a real viewer action,
- app writes a durable localStorage flag,
- app dispatches a custom event,
- game/boss reads the flag or listens for the event,
- achievement/bell fires once.

Generalize this for all stages.

Recommended action key shape:

```js
// durable flags
localStorage.setItem('fv:games:action:stage2:search_passage', '1');

// optional live event
window.dispatchEvent(new CustomEvent('fv:games:action', {
  detail: { stage: 2, action: 'search_passage', source: 'search', value: 'PASSAGE' }
}));
```

Recommended helper module:

```text
docs/games/metagame/action-flags.js
```

Responsibilities:

- `setAction(stage, action, detail?)`
- `hasAction(stage, action)`
- `clearActionsForDebug(stage?)`
- event dispatch
- idempotency

File-viewer modules should not each invent their own key names.

## Save-State Contract

Stage 1 currently owns a special BigNum/base64 save path. Stages 2-10 need a consistent state model
before agents start.

Recommended top-level structure:

```js
{
  version: 3,
  stage: 4,
  defeated: [1, 2, 3],
  achievements: [],
  actions: {},          // optional mirror of action flags
  stageState: {
    1: { ... },
    2: { ... },
    3: { ... }
  },
  global: {
    loopCount: 0,
    crashCourseUnlocked: false
  }
}
```

Stage modules should own their own `defaultState`, `migrate`, `serialize` if needed, and the
orchestrator should preserve unrelated stage state.

## Stage Module Contract

Each full stage should become a bespoke module, like Stage 1:

```text
docs/games/metagame/stage2.js
docs/games/metagame/stage3.js
...
docs/games/metagame/stage10.js
```

Recommended mount contract:

```js
mountStageN({
  host,
  state,
  save,
  actionFlags,
  bell,
  onExit,
  onStageComplete,
  openViewerFile,
  attachChrome,
})
```

The current shared "grind + boss" renderer is too small for the new stage designs. Keep it only as
legacy until replaced.

## BTS Contract

BTS is canon and should be part of every stage spec:

- `.bts` files live under `docs/bts/`.
- `.bts` renders as markdown.
- Button appears after boss defeat.
- Button remains accessible from stage completion/stage select.
- Achievement for viewer-tool use fires on unlock/action, not boss defeat.

## Stage 10 Canon Update

Replace the current "open one gallery file to unlock choices" with the memory-assembly direction
unless we decide otherwise.

Canonical working version:

- Examples Gallery is the Stage 10 map.
- Prior-stage memory files stabilize visual layers.
- 3 resolved memories unlock final choice.
- 6 resolved memories enrich responses.
- 9 resolved memories plus optional tool echoes complete the capstone route.

