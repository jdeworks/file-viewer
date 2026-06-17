# Implementation Spec Plan for Multi-Agent Work

This is a planning note for the specs we should write before touching the actual repo.

## Goal

Produce implementation-ready specs that can be handed to multiple agents without them making
conflicting architecture decisions.

The specs should define contracts, file paths, state shape, action flags, test expectations, and
the build order. They should not require every agent to reread all design docs.

## Spec Package

### 1. `SPEC-00-architecture.md`

Purpose: shared contracts.

Must include:

- orchestrator responsibilities,
- per-stage module contract,
- save-state schema v3,
- action flag helper API,
- bell/message API,
- achievement API,
- stage completion/unlock rules,
- debug/dev controls,
- testing expectations.

### 2. `SPEC-01-file-viewer-actions.md`

Purpose: real file-viewer feature integrations.

Must include one subsection per stage:

- Stage 1 raw edit / `CHEAT`
- Stage 2 search / `PASSAGE`
- Stage 3 diff opened
- Stage 4 nested blueprint opened
- Stage 5 audio file played
- Stage 6 epub Chapter 9 read
- Stage 7 EXIF metadata inspected
- Stage 8 drag-and-drop salvage
- Stage 9 offline/cache activated
- Stage 10 examples gallery memory read/resolved

Each subsection should define:

- file paths,
- UI event that counts,
- action flag key,
- event payload,
- idempotency behavior,
- achievement trigger,
- testing seam.

### 3. `SPEC-02-content-manifest.md`

Purpose: all generated/static files.

Must include:

- examples gallery additions,
- stage-specific folders/files,
- audio file placeholders,
- epub fixtures,
- image metadata fixture requirements,
- `.bts` files,
- asset manifest/offline cache requirements,
- how crash-course mode will later reuse boss files.

### 4. `SPEC-03-stage1-canonicalization.md`

Purpose: settle Stage 1 contradictions before Stage 2 work.

Must decide:

- Defragmenter vs Overwriter naming,
- `CHEAT` vs `PROTECTED`,
- emoji vs terminal glyphs,
- current click-contest boss accepted or revised,
- Stage 1 save v2 -> global save v3 migration.

### 5. Stage Specs `SPEC-STAGE-02` through `SPEC-STAGE-10`

Each stage spec should use the same template:

```text
1. Player-facing summary
2. Canonical mechanics
3. Data model and save state
4. Renderer/UI layout
5. Economy/progression formulas
6. File-viewer integration and action flags
7. Boss lock and unlock transition
8. Prestige/replay
9. Bell messages and achievements
10. BTS file requirements
11. Implementation work packages
12. Test plan
13. Non-goals for first pass
```

### 6. `SPEC-CRASH-COURSE-FUTURE.md`

Purpose: park the future extension.

It should record the intended direction but explicitly mark it out of scope until full stages exist.

## Recommended Build Order

### Phase A - Platform

1. Architecture spec.
2. Generic action flag helper.
3. Global save v3 migration plan.
4. BTS renderer/file-type support.
5. Stage module loading contract.

No stage should start before these are stable.

### Phase B - Canonicalize Stage 1

1. Bring Stage 1 docs/code into one story.
2. Decide naming and boss-lock exact fiction.
3. Add any missing tests for Stage 1 economy/save/action flag.
4. Ensure Stage 1 can be used as template for later stages.

### Phase C - Vertical Slice Stage 2

Build Stage 2 as the first non-idle bespoke stage. It proves:

- dedicated stage renderer,
- stage-local state,
- file-viewer action flag from search,
- locked boss,
- BTS button,
- transition to next stage.

### Phase D - Parallel Stage Builds

After Stage 2 proves the pattern, parallelize:

- Stage 3 and Stage 4 can proceed together.
- Stage 5 and Stage 7 can proceed together.
- Stage 6 should probably be isolated because deck-builder logic is complex.
- Stage 8 should be isolated because drag-and-drop/sidebar integration is unique.
- Stage 9 should be isolated because service worker/offline behavior is fragile.
- Stage 10 should wait until the action/file/gallery framework and prior stage file manifests exist.

## Agent Boundaries

Recommended agent ownership:

- **Platform agent**: orchestrator, save, action flags, BTS, stage registry.
- **Viewer integration agent**: search/diff/audio/epub/EXIF/offline/drag/drop/gallery hooks.
- **Stage agents**: one per stage, owning renderer + game logic + tests.
- **Content agent**: examples, BTS prose, fixture files, manifest.
- **QA agent**: Playwright flows, save migration, action flag tests, mobile layout.

Avoid having multiple agents edit the same core files without a merge plan.

