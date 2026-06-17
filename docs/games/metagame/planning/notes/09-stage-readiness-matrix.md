# Stage Readiness Matrix

This is a quick triage view for deciding when to move from design notes to implementation specs.

## Legend

- **Ready** - enough design exists to write an implementation spec after platform contracts are set.
- **Needs canon** - design exists but has contradictions to resolve.
- **Needs platform** - blocked mainly by shared architecture/file-viewer integration.
- **Needs design** - core design still needs more detail.

## Matrix

| Stage | Current readiness | Main blocker | Notes |
|---|---|---|---|
| 1 - Bit Foundry | Needs canon | Boss fiction + save migration | Code exists and is far ahead. Need to settle `CHEAT` vs `PROTECTED`, Defragmenter tone, terminal icons, global save v3. |
| 2 - Glyph Dungeon | Ready after platform | Search action detection | Gameplay spec is coherent. Good vertical slice candidate for proving Stage 2+ architecture. |
| 3 - Memory Grid | Ready after platform | Diff action detection + puzzle pool tooling | Needs uniqueness-verified puzzle generation. Otherwise strong. |
| 4 - Fractal Bastion | Ready after platform | Folder/blueprint action detection | Needs data-heavy spec split: towers, enemies, waves, L-system paths, blueprint files. |
| 5 - Signal Racer | Ready after platform | Audio action detection | Need decide whether unlock requires play start or full 14-second cycle. Consider waveform/telemetry display. |
| 6 - Protocol Codex | Ready after platform | Epub chapter detection + card test harness | Mechanically large. Needs pure deck/combat logic spec and deterministic test scenarios. |
| 7 - Identity Arbiter | Ready after platform | EXIF action detection | Strong theme/tool fit. Need decide whether guessing is refused or allowed to fail. |
| 8 - Entropy Field | Needs fairness decision | Drag/drop contract + Heat Death recovery | Design is strong, but full-run miss penalty needs final call. |
| 9 - Observer State | Needs platform | Offline/service worker activation | Strong mechanics. Must make manual offline activation canonical for reliability. |
| 10 - Awakening | Needs design consolidation | Memory assembly finalization | Use `05-stage-10-memory-assembly-design.md` as working direction; needs canonical rewrite of original Stage 10 spec. |

## Best Next Spec Order

1. `SPEC-00-architecture.md`
2. `SPEC-01-file-viewer-actions.md`
3. `SPEC-03-stage1-canonicalization.md`
4. `SPEC-STAGE-02-glyph-dungeon.md`
5. `SPEC-02-content-manifest.md`

Reason: Stage 2 is the safest first full-stage vertical slice. It exercises a bespoke renderer,
stage-local state, file-viewer action detection, locked boss, BTS, and stage transition without
the high implementation complexity of deck-building, service workers, or drag-and-drop.

