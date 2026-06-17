# Autonomous Implementation Handoff

Use this note after `SPEC-00` through `SPEC-04` exist and have been reviewed. This is a handoff
prompt and coordination guide only; it does not authorize skipping the specs.

## Read First

Canon docs:

- `docs/games/metagame/planning/notes/10-implementation-decisions-log.md`
- `docs/games/metagame/specs/SPEC-00-architecture.md`
- `docs/games/metagame/specs/SPEC-01-file-viewer-actions.md`
- `docs/games/metagame/specs/SPEC-02-content-manifest.md`
- `docs/games/metagame/specs/SPEC-03-stage1-canonicalization.md`
- `docs/games/metagame/specs/SPEC-04-codebase-prep.md`

Implementation must follow those files when older planning docs or current code disagree.

## Recommended Starting Prompt

```text
We are in ~/repos/file-viewer.

Run autonomous implementation for Defragmenter using multiple agents, but keep changes coordinated.

Canon docs:
- docs/games/metagame/planning/notes/10-implementation-decisions-log.md
- docs/games/metagame/specs/SPEC-00-architecture.md
- docs/games/metagame/specs/SPEC-01-file-viewer-actions.md
- docs/games/metagame/specs/SPEC-02-content-manifest.md
- docs/games/metagame/specs/SPEC-03-stage1-canonicalization.md
- docs/games/metagame/specs/SPEC-04-codebase-prep.md

Mode:
- One overwatcher coordinates architecture, reviews agent outputs, and prevents contract drift.
- Use up to 4 implementation agents.
- Agents should work mostly independently by package/stage.
- Do not let multiple agents edit the same core file without overwatcher sequencing.
- Implement in batches, verify after each batch, and produce a final summary.
- Do not preserve placeholder Stage 2-10 behavior unless explicitly needed as a short-lived migration aid.
- Do not implement old save migration. Missing or malformed old saves should become fresh v3 saves.

Initial batch:
1. Platform agent: save v3, action flags, achievement/bell APIs, stage registry/module contract, BTS shell, viewer bridge shell.
2. Stage 1 agent: canonicalize Stage 1 into the new architecture and replace old save/bell/action paths.
3. Viewer integration agent: action hooks for raw/search/diff/audio/epub/EXIF/offline/gallery as stubs or first working hooks, with deterministic test seams.
4. Stage 2 agent: Glyph Dungeon vertical slice using the new contracts.

Do not start Stages 3-10 until Stage 2 proves the architecture.

Before editing, produce a concrete task plan with file ownership per agent.
Then implement in sequenced batches, run tests/checks, and report blockers.
```

## Sequencing Guidance

Start with foundation and Stage 1 canonicalization, not Stage 2 gameplay alone.

Recommended batch order:

1. Shared v3 foundation:
   `save.js`, `action-flags.js`, `achievements.js`, `bell.js`, `bts.js`, `registry.js`,
   `viewer-bridge.js`, and shared tests.
2. `.bts` markdown support and a minimal BTS opening path.
3. Stage 1 move/canonicalization into `docs/games/metagame/stages/stage1/`.
4. Replace the raw editor `CHEAT` hook with canonical `1.cheat_disabled`.
5. Replace the legacy orchestrator and remove placeholder Stage 2-10 imports.
6. Build the Stage 2 vertical slice.

The first implementation round should not attempt all ten stages. Stage 2 is the architecture
proof: real viewer action, locked boss, unlock transition, achievement, defeat, BTS, and Stage 3
unlock.

## File Ownership Rules

The overwatcher should sequence edits to these shared/high-conflict files:

- `docs/games/metagame/metagame.js`
- `docs/core/rawpane.js`
- `docs/core/folder.js`
- `docs/core/filetree.js`
- `docs/core/compare.js`
- `docs/types/media/renderer.js`
- `docs/types/ebook/epub/renderer.js`
- `docs/core/meta-drawer.js`
- `docs/examples/index.json`
- `docs/asset-manifest.json`
- `tests/areas/games.mjs`

Recommended ownership:

- Platform agent owns new shared metagame modules and shared tests.
- Stage 1 agent owns `docs/games/metagame/stages/stage1/` and legacy Stage 1 module removal/moves.
- Viewer integration agent owns core/type renderer hooks, but only after the platform action API is
  available.
- Stage 2 agent owns `docs/games/metagame/stages/stage2/`, Stage 2 content, and Stage 2 tests.

No agent should edit another agent's owned file without overwatcher approval.

## Green Light Criteria For Stage 3-10

Do not begin Stage 3-10 implementation until all are true:

- Fresh v3 save initializes and persists.
- Stage 1 mounts through the new stage contract.
- `1.cheat_disabled` is set by the raw editor through the shared action API.
- Stage 1 boss reads the shared action API, not `fv:boss1:cheat`.
- Stage 2 has a working vertical slice through search action, locked/unlocked boss behavior,
  achievement, boss defeat, BTS, and Stage 3 unlock.
- `./scripts/check.sh` or an explicitly documented subset has been run.

## Review Notes

Current readiness is good for implementation, but only if the first round is architectural:

- The specs now remove most contract ambiguity.
- The current runtime is still legacy-shaped.
- Direct Stage 2 work before v3 save/action/stage registry foundations is likely to create rework.
- Placeholder Stage 2-10 code should be replaced, not adapted into canon.
