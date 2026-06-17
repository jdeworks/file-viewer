# SPEC-04 - Codebase Prep

This audit prepares the existing codebase for the Defragmenter metagame implementation described
by `SPEC-00` through `SPEC-03`. It is intentionally non-implementation guidance.

Canon precedence remains:

1. `docs/games/metagame/planning/notes/10-implementation-decisions-log.md`
2. `docs/games/metagame/specs/SPEC-00-architecture.md`
3. `docs/games/metagame/specs/SPEC-01-file-viewer-actions.md`
4. `docs/games/metagame/specs/SPEC-02-content-manifest.md`
5. `docs/games/metagame/specs/SPEC-03-stage1-canonicalization.md`

## 1. Current Codebase Summary

The current metagame is a working legacy arcade module, not the target architecture.

- `docs/games/launcher.js`, `docs/games/hub.js`, and `docs/games/registry.js` lazily unlock and
  mount arcade games. This is a useful shell boundary and should remain.
- `docs/games/metagame/metagame.js` is a v2/legacy orchestrator. It mixes save loading,
  progression, debug controls, shared grind economy, Stage 1 routing, Stage 2-10 placeholder
  rendering, boss mounting, completion UI, and bell mounting.
- `docs/games/metagame/stages.js`, `stages2.js`, and `stages3.js` contain the deprecated Stage
  2-10 placeholder content called out by `SPEC-00`.
- Stage 1 is split into useful modules (`stage1.js`, `boss1.js`, `s1state.js`, `s1economy.js`,
  `s1bell.js`, `s1achievements.js`, `s1managers.js`, `s1reset.js`, `messages1.js`,
  `achievements1.js`, `bignum.js`, `sounds.js`) but those modules still assume the legacy
  orchestrator/save/bell contracts.
- `docs/core/rawpane.js` already contains a Stage 1 `CHEAT` hook, but it writes
  `fv:boss1:cheat`, mutates old save shapes, dispatches `fv:boss-cheat-disable`, and pushes legacy
  achievements/bell messages directly.
- `docs/core/folder.js` and `docs/core/filetree.js` already expose folder open, tree navigation,
  content search, and internal drag/drop primitives that can become action seams.
- `docs/types/media/renderer.js`, `docs/types/ebook/epub/renderer.js`, and
  `docs/core/meta-drawer.js` are parent-document interactive surfaces that can emit action flags
  without iframe messaging.
- Markdown detection currently recognizes `.md`-style extensions, not `.bts`.
- `docs/examples/` currently has only flat example files. `docs/examples/metagame/` and
  `docs/bts/` do not exist yet.

## 2. Files To Keep, Replace, Or Move

Keep as-is or with narrow integration changes:

- `docs/games/launcher.js`: keep lazy game loading and arcade unlock API.
- `docs/games/hub.js`: keep modal mount/destroy pattern; only adjust labels if the metagame title
  changes globally.
- `docs/games/registry.js`: keep game registry shape; keep `metagame` entry pointing at the new
  orchestrator path.
- `docs/games/snake/snake.js`, `docs/games/2048/g2048.js`: keep unchanged.
- `docs/core/app.js`: keep the viewer shell; add only bridge hooks needed by the metagame.
- `docs/core/rawpane.js`: keep raw editor behavior, replace only legacy Stage 1 cheat hook with the
  shared action flag seam.
- `docs/core/folder.js`: keep folder/search/tree logic; add action instrumentation seams and
  virtual-file support only where required.
- `docs/core/filetree.js`: keep tree rendering and drag state; expose action-friendly callbacks
  rather than embedding stage logic.
- `docs/core/meta-drawer.js`: keep drawer rendering; add a metadata-row visibility seam for Stage 7.
- `docs/core/offline.js`: keep normal offline cache UI; add Stage 9-specific control through a
  narrow bridge or stage-owned sidebar, not by repurposing the global offline pill.
- `docs/types/media/renderer.js`: keep renderer; add a testable loop-calibration event path for the
  Stage 5 file.
- `docs/types/ebook/epub/renderer.js`: keep reader; add a chapter navigation action seam for Stage 6.
- `docs/types/image/metadata.js` and `docs/types/image/exif.js`: keep extraction, but extend for
  GPS/sidecar metadata if real PNG/JPEG EXIF is insufficient.
- `docs/types/markdown/*`: keep markdown renderer; extend detection/registration for `.bts`.
- `scripts/check.sh`, `scripts/gen-asset-manifest.mjs`, `scripts/loc-check.sh`, `scripts/vendor.sh`:
  keep. Manifest generation already bundles `examples/`, `games/`, and core files.

Move/adapt into the Stage 1 folder contract:

- `docs/games/metagame/stage1.js` -> `docs/games/metagame/stages/stage1/renderer.js`
- `docs/games/metagame/boss1.js` -> `docs/games/metagame/stages/stage1/boss.js`
- `docs/games/metagame/s1state.js` -> `docs/games/metagame/stages/stage1/state.js`
- `docs/games/metagame/s1economy.js` -> `docs/games/metagame/stages/stage1/economy.js`
- `docs/games/metagame/s1managers.js` -> `docs/games/metagame/stages/stage1/managers.js`
- `docs/games/metagame/s1reset.js` -> `docs/games/metagame/stages/stage1/reset.js`
- `docs/games/metagame/messages1.js` -> `docs/games/metagame/stages/stage1/messages.js`
- `docs/games/metagame/achievements1.js` and `s1achievements.js` ->
  `docs/games/metagame/stages/stage1/achievements.js`
- `docs/games/metagame/bignum.js` -> either `docs/games/metagame/shared/bignum.js` if reused by
  later stages, or `docs/games/metagame/stages/stage1/bignum.js` if Stage 1-only.
- `docs/games/metagame/sounds.js` -> `docs/games/metagame/shared/sounds.js` if reused, otherwise
  Stage 1-local.

Replace:

- `docs/games/metagame/metagame.js`: replace with the v3 orchestrator described in `SPEC-00`.
- `docs/games/metagame/stages.js`: replace with a registry/manifest loader for per-stage modules,
  or remove after the new registry is live.
- `docs/games/metagame/stages2.js`: remove placeholder Stage 5-7 content.
- `docs/games/metagame/stages3.js`: remove placeholder Stage 8-10 content.
- Legacy direct storage keys used by metagame code:
  - `fv:games:metagame`
  - `fv:games:metagame:complete`
  - `fv:games:mg:bell`
  - `fv:games:mg:bell:ack`
  - `fv:boss1:cheat`
  These should not be read by canonical implementation except during temporary cleanup/debug.

## 3. Proposed Folder Structure

Exact target shape:

```text
docs/games/metagame/
  metagame.js
  registry.js
  save.js
  action-flags.js
  achievements.js
  bell.js
  bts.js
  viewer-bridge.js
  virtual-files.js
  debug.js
  shared/
    bignum.js
    sounds.js
    dom.js
  stages/
    stage1/
      index.js
      state.js
      renderer.js
      boss.js
      messages.js
      achievements.js
      economy.js
      managers.js
      reset.js
      styles.css
      tests/
    stage2/
      index.js
      state.js
      renderer.js
      boss.js
      messages.js
      achievements.js
      content.js
      styles.css
      tests/
    stage3/
      index.js
      state.js
      renderer.js
      boss.js
      messages.js
      achievements.js
      content.js
      styles.css
      tests/
    stage4/
      index.js
      state.js
      renderer.js
      boss.js
      messages.js
      achievements.js
      content.js
      styles.css
      tests/
    stage5/
      index.js
      state.js
      renderer.js
      boss.js
      messages.js
      achievements.js
      content.js
      styles.css
      tests/
    stage6/
      index.js
      state.js
      renderer.js
      boss.js
      messages.js
      achievements.js
      content.js
      styles.css
      tests/
    stage7/
      index.js
      state.js
      renderer.js
      boss.js
      messages.js
      achievements.js
      content.js
      styles.css
      tests/
    stage8/
      index.js
      state.js
      renderer.js
      boss.js
      messages.js
      achievements.js
      content.js
      styles.css
      tests/
    stage9/
      index.js
      state.js
      renderer.js
      boss.js
      messages.js
      achievements.js
      content.js
      styles.css
      tests/
    stage10/
      index.js
      state.js
      renderer.js
      boss.js
      messages.js
      achievements.js
      content.js
      styles.css
      tests/
  specs/
  planning/
```

Runtime content target:

```text
docs/examples/
  Overwriter.frag
  metagame/
    stage2/
      cipher.txt
    stage3/
      memory_v1.log
      memory_v2.log
    stage4/
      waves.json
      enemies.json
      towers/
        pulse_node.json
        scatter_array.json
        upgrades/
          tier1_blueprints/
          tier2_blueprints/
          tier3_blueprints/
            recursion_points.json
    stage5/
      transmission_hum.mp3
    stage6/
      protocols_of_the_entity.epub
    stage7/
      entity_a_verification.png
      entity_f_verification.png
      entity_dossiers.json
    stage8/
      entropy_model.txt
      node_map.json
    stage9/
      service-worker-notes.txt
    stage10/
      stage_01_genesis.txt
      stage_02_syntax.txt
      stage_03_memory.txt
      stage_04_pattern.txt
      stage_05_signal.txt
      stage_06_protocol.txt
      stage_07_identity.txt
      stage_08_entropy.txt
      stage_09_observation.txt
      stage_10_awakening.txt
docs/bts/
  bit_foundry.bts
  glyph_dungeon.bts
  memory_grid.bts
  fractal_bastion.bts
  signal_racer.bts
  protocol_codex.bts
  identity_arbiter.bts
  entropy_field.bts
  observer_state.bts
  awakening.bts
```

Generated/virtual files should be represented through `virtual-files.js` and a viewer bridge rather
than committed when per-save randomness is required.

## 4. Save, Action, Bell, And BTS Integration Points

Save integration:

- New owner: `docs/games/metagame/save.js`.
- Durable key: `fv:games:metagame:v3`.
- `metagame.js` should call `loadSave()`, initialize missing stage state from stage
  `defaultState(context)`, and pass the owned `stageState[N]` object into `mountStage()`.
- Saving must preserve unrelated top-level fields and unrelated `stageState[N]` objects.
- Old `s1state.js` logic is useful for Stage 1 defaults and BigNum serialization, but its v1/v2
  migration and base64 save format should not survive canonicalization.

Action integration:

- New owner: `docs/games/metagame/action-flags.js`.
- Viewer-facing modules should not import stage modules. They should call a small bridge helper,
  for example `recordMetagameActionIfMatched({ source, file, path, ... })`, which delegates to
  `setAction(stage, action, detail)`.
- The helper should dispatch `fv:games:action`; direct dispatch in individual viewers should be
  avoided so idempotency and localStorage fallback stay centralized.
- Test seams should call the same exported action-check function used by UI event handlers.

Bell integration:

- New owner: `docs/games/metagame/bell.js`.
- `s1bell.js` is a source of display behavior and message cadence, but its save key
  `fv:games:mg:bell` should be replaced by `save.bell`.
- Action recognition, achievement announcements, boss lock transitions, and BTS availability should
  go through the shared bell API.

BTS integration:

- New owner: `docs/games/metagame/bts.js`.
- `.bts` should render through markdown by updating markdown detection/registration.
- `viewer-bridge.js` should expose `openBts(path, options)` and route it through normal viewer
  loading where possible.
- Completed stage UI/stage select should show BTS only after the stage is defeated, reading
  `save.defeated` and `save.bts.opened`.

## 5. Viewer Action Hook Map

Stage 1 raw edit:

- Current hook: `docs/core/rawpane.js:onRawEdited()`.
- Replace legacy parser with a pure parser plus a hook that only sets `1.cheat_disabled` for
  `Overwriter.frag`.
- Remove direct writes to `fv:boss1:cheat` and direct legacy achievement mutation.

Stage 2 search:

- Current seam: `docs/core/folder.js:searchTreeContents()` searches loaded folder contents on Enter.
- Needed: exact-file content-search result hook for `docs/examples/metagame/stage2/cipher.txt`
  resolving `PASSAGE:247`.
- Likely touched files: `docs/core/folder.js`, `docs/core/examples.js`,
  `docs/games/metagame/action-flags.js`, Stage 2 content/tests.

Stage 3 diff:

- Current seams: raw mode diff buttons in `docs/core/rawpane.js`, compare flow in
  `docs/core/compare.js`, move-aware diff in `docs/core/movediff-view.js`.
- Needed: soft flag when exact generated pair is opened in diff mode, and boss-owned validation for
  `3.diff_key_restored`.
- Do not make opening diff auto-unlock the boss.

Stage 4 file tree:

- Current seam: `docs/core/folder.js:openTreeFile(node)` and `docs/core/filetree.js:setActive()`.
- Needed: exact path open action for `recursion_points.json` and virtual content provider using
  persisted Stage 4 recursion points.

Stage 5 audio:

- Current seam: `docs/types/media/renderer.js` owns the native `<audio>` element.
- Needed: continuous active playback tracker for one full 14-second loop of
  `transmission_hum.mp3`; opening, seeking, or brief play must not qualify.

Stage 6 epub:

- Current seam: `docs/types/ebook/epub/renderer.js:show(index, frag)`.
- Needed: chapter navigation hook that sets `6.protocol_ch9_read` only when the canonical file
  reaches Chapter 9.

Stage 7 metadata:

- Current seam: `docs/core/meta-drawer.js:buildMetadata()` renders rows returned by
  `docs/types/image/metadata.js`.
- Needed: row-visibility hook when the decisive `GPSInfo` contradiction row for Entity F is
  rendered or focused.
- `docs/types/image/exif.js` currently does not parse GPS tags. Either extend it or provide a local
  sidecar consumed by `metadata.js`.

Stage 8 internal drag/drop:

- Current seam: `docs/core/filetree.js` supports drag state and `TREE_DRAG_TYPE`.
- Needed: stage-owned virtual tree for `/entropy/debris/` and an in-stage `Active Archive` drop
  target. Use shared tree primitives where possible, but do not require OS drag/drop.

Stage 9 offline:

- Current seam: `docs/core/offline.js` owns global offline precache.
- Needed: Stage 9-specific offline control exposed after reading `service-worker-notes.txt`.
  Implement as stage UI or viewer bridge control. Avoid changing the semantics of the global
  "Save offline" pill.

Stage 10 examples gallery:

- Current seam: `docs/core/examples.js` loads `docs/examples/index.json`.
- Needed: memory file open/read tracking and reflection resolution owned by Stage 10. Opening a
  memory file can set read state; resolving/integrating stays in Stage 10 state.

## 6. Legacy Stage 2-10 Removal Plan

1. Land shared v3 scaffolding (`save.js`, `action-flags.js`, `achievements.js`, `bell.js`,
   `bts.js`, `viewer-bridge.js`, `registry.js`) while the old metagame still imports.
2. Move/adapt Stage 1 into `stages/stage1/` and update the orchestrator to mount Stage 1 through
   the new contract.
3. Replace `metagame.js` with the v3 orchestrator after Stage 1 has parity tests.
4. Remove `stages.js`, `stages2.js`, and `stages3.js` once no imports reference them.
5. Remove old localStorage key reads/writes from runtime paths. Do not implement migration; a fresh
   v3 save is canonical.
6. Remove placeholder Stage 2-10 smoke assertions and replace them with the canonical Stage 2
   vertical slice first.
7. Let git history preserve old placeholders. Do not keep "legacy" alternate UI paths after the
   canonical stages are implemented.

Temporary coexistence is acceptable only while a package is actively moving code. Any temporary
adapter should be deleted in the same work package or explicitly listed as follow-up debt.

## 7. Current Risks

- Save shape conflict: current code writes both base64 v2 Stage 1 saves and plain JSON Stage 2-10
  saves under `fv:games:metagame`.
- Legacy cheat state is split between `fv:boss1:cheat`, old achievements, old bell storage, and boss
  fight sampling.
- `metagame.js` is a high-conflict file because it owns orchestration, progression, debug, UI,
  Stage 1 special cases, and legacy completion.
- `stages.js`, `stages2.js`, and `stages3.js` include many placeholder names and mechanics that
  conflict with canon and may accidentally survive if replacement is incremental but not strict.
- `rawpane.js` currently treats any filename matching `/overwriter/i` as Stage 1 relevant. The
  canonical hook should require the exact file identity.
- `docs/examples/index.json` has a flat category list and currently hides `Overwriter.frag` after
  cheat disable. Canonical replay should not hide required files merely because an action is set.
- `.bts` will not render as markdown until detection/registration is updated.
- Generated/virtual files are not represented today; stages that require per-save content need a
  provider that looks like normal viewer content without static manifest entries.
- Current smoke tests encode placeholder Stage 2 and Stage 3 behavior, so they will fail during
  canonical replacement unless updated in the same work package.
- Many metagame files exceed the LOC soft target. Moving by package should reduce file size rather
  than expanding `metagame.js`.
- Network trust must be preserved. Renderer additions must not introduce CDN, telemetry, analytics,
  external links that auto-load, or off-origin resource requests.

## 8. Test Strategy

Shared unit tests:

- Save creation/validation for v3, malformed-save fallback, stage-state preservation, and no old
  migration path.
- Action flags: idempotency, `firstSetAt`, `updatedAt`, detail merge, event dispatch,
  localStorage fallback, save hydration, save mirroring, and debug clearing.
- Achievements: idempotency, action-triggered unlocks, and stage filtering.
- Bell: one-time messages, log behavior, and save persistence.
- Stage registry validation: every registered stage exports `stageMeta`, `defaultState`, and
  `mountStage`.
- `.bts` detection as markdown.

Stage 1 canonical tests before Stage 2 implementation:

- `CHEAT` parser covers missing, empty, falsey, truthy, and mixed-case values.
- Raw edit hook sets `1.cheat_disabled` only for `Overwriter.frag`.
- Permanence: once disabled, later truthy edits do not clear the action.
- Boss locked state reads `actions.hasAction(1, "cheat_disabled")`, not `fv:boss1:cheat`.
- Achievement `protection disabled.` fires on action unlock, not boss defeat.
- Defeating The Defragmenter unlocks Stage 2 via the orchestrator and exposes BTS.

Viewer integration tests:

- Stage 2 search handler with exact query/file/result and negative cases.
- Stage 3 diff soft flag and boss key validation.
- Stage 4 exact tree path open plus generated coordinate consistency.
- Stage 5 fake-timer loop playback, including seek/brief-play negative cases.
- Stage 6 chapter navigation to Chapter 9.
- Stage 7 metadata row visibility for `GPSInfo` contradiction.
- Stage 8 drag/drop and select-archive fallback through the same archive function.
- Stage 9 offline control reveal/action; real service-worker behavior can be a later integration
  test.
- Stage 10 memory read/resolved/integrated state transitions.

Browser/smoke tests:

- Preserve current core viewer smoke coverage and zero off-origin assertion.
- Replace placeholder metagame Stage 2-10 tests with canonical Stage 2 vertical slice:
  stage renderer, search action, locked boss, unlocked transition, achievement, boss defeat, BTS,
  and Stage 3 unlock.
- Add a focused BTS smoke path once `.bts` support exists.
- Add mobile/accessibility coverage for Stage 8 archive fallback.

Validation command remains:

```sh
./scripts/check.sh
```

## 9. Multi-Agent Work Packages

Package A - Shared v3 foundation:

- Owns `save.js`, `action-flags.js`, `achievements.js`, `bell.js`, `bts.js`, `registry.js`,
  `viewer-bridge.js`, `virtual-files.js`, and shared tests.
- Likely touches `docs/games/metagame/metagame.js` lightly for temporary wiring only.
- Should not alter Stage 2-10 placeholder behavior except through shared no-op-safe APIs.

Package B - Stage 1 canonicalization:

- Owns moving/adapting Stage 1 modules into `stages/stage1/`.
- Likely touches `stage1.js`, `boss1.js`, `s1state.js`, `s1economy.js`, `s1bell.js`,
  `s1achievements.js`, `s1managers.js`, `s1reset.js`, `messages1.js`, `achievements1.js`,
  `bignum.js`, `sounds.js`, and new Stage 1 tests.
- Coordinates with Package C for the raw edit action hook.

Package C - Viewer action bridge:

- Owns non-stage viewer hooks.
- Likely touches `docs/core/rawpane.js`, `docs/core/folder.js`, `docs/core/filetree.js`,
  `docs/core/compare.js`, `docs/types/media/renderer.js`, `docs/types/ebook/epub/renderer.js`,
  `docs/core/meta-drawer.js`, `docs/types/image/metadata.js`, `docs/types/image/exif.js`,
  `docs/core/offline.js`, and related tests.
- Should keep stage-specific constants centralized in metagame action matching data, not scattered
  through core modules.

Package D - Content and BTS foundation:

- Owns `docs/examples/metagame/`, `docs/bts/`, `.bts` markdown detection, examples index
  categorization, and manifest validation.
- Likely touches `docs/types/markdown/detect.js`, `docs/examples/index.json`,
  `docs/asset-manifest.json`, and possibly test fixtures.

Package E - Orchestrator replacement and legacy removal:

- Owns replacing `metagame.js`, deleting `stages.js`, `stages2.js`, `stages3.js`, and updating
  smoke tests away from placeholders.
- Must land after Package A and Stage 1 parity from Package B.

Package F - Canonical Stage 2 vertical slice:

- Owns `stages/stage2/`, `docs/examples/metagame/stage2/cipher.txt` or its virtual generator,
  Stage 2 tests, and the canonical Stage 2 smoke path.
- Should not depend on placeholder Stage 2 files or names.

Later packages:

- One package per Stage 3-10 vertical slice, each owning its stage folder, content, viewer-action
  tests for that stage, BTS text, and smoke additions only where needed.

## 10. Merge And Conflict Risks

- `docs/games/metagame/metagame.js` is the highest conflict file. Keep Package A changes minimal
  until Package E replaces it.
- `docs/core/rawpane.js` is shared by Stage 1 action work and normal editor behavior. Isolate the
  parser/action helper to reduce review risk.
- `docs/core/folder.js` and `docs/core/filetree.js` may be touched by Stage 2, Stage 4, Stage 8,
  and general virtual-file work. Package C should establish a generic action/virtual seam before
  individual stages branch out.
- `docs/types/media/renderer.js`, `docs/types/ebook/epub/renderer.js`, and
  `docs/core/meta-drawer.js` are active user-facing renderers. Stage-specific hooks must be
  inert for normal files.
- `docs/examples/index.json` and `docs/asset-manifest.json` will conflict across content packages.
  Batch content additions by stage and regenerate the manifest in the package that changes assets.
- Smoke tests in `tests/areas/games.mjs` currently assert legacy placeholder behavior. Package E
  and Package F should coordinate to avoid a window where tests expect removed UI.
- The untracked `docs/games/metagame/planning/` and `docs/games/metagame/specs/` directories mean
  future agents should check git state before assuming spec files are committed.

## 11. Recommended Implementation Order

1. Shared v3 foundation and tests.
2. `.bts` markdown support plus empty/placeholder BTS file routing tests.
3. Stage 1 folder move and v3 save canonicalization.
4. Raw editor `CHEAT` action replacement.
5. V3 orchestrator replacement and legacy placeholder removal.
6. Canonical Stage 2 vertical slice.
7. Stage 3-10 packages, one stage at a time.

Do not begin feature implementation until this prep spec and the prior specs are reviewed.
