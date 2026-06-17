# SPEC-02 - Content Manifest

This spec defines the static, generated, and virtual content needed by the metagame. It extends
`SPEC-00-architecture.md` and `SPEC-01-file-viewer-actions.md`.

## 0. Content Rules

- Runtime content must be local to the repo/app. No CDN, telemetry, analytics, or off-origin fetches.
- Static files that the file viewer can open should live under `docs/examples/`.
- BTS files live under `docs/bts/`.
- Generated or virtual files must appear in the file viewer as if they are normal files, but their
  source of truth is the global v3 save and stage module state.
- Any static file added for runtime use must be included in `docs/asset-manifest.json` by the normal
  manifest generation flow.
- Test fixtures should be small and deterministic unless a stage spec explicitly requires a large
  generated file.

## 1. Directory Layout

Recommended examples layout:

```text
docs/examples/metagame/
  stage1/
  stage2/
  stage3/
  stage4/
  stage5/
  stage6/
  stage7/
  stage8/
  stage9/
  stage10/
```

Stage 1 keeps the historical player-facing file path:

```text
docs/examples/Overwriter.frag
```

The examples index/category system should expose metagame files without burying ordinary file
viewer examples. Use a `Metagame` or hidden/dev category as appropriate for discovery flow.

## 2. BTS Files

Required files:

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

- `.bts` renders through the markdown renderer.
- Each file targets 400-600 words.
- Each file follows the BTS template from `boss-lock-and-bts-system.md`.
- BTS is available after the stage boss is defeated and remains accessible from completed-stage UI.
- Stage 8 BTS must explain why internal drag/drop is required and OS drag/drop is optional.
- Stage 9 BTS must explain the service-worker/cache mapping even if the first implementation uses
  simulated seed logic.

## 3. Stage 1 Files

Required static file:

```text
docs/examples/Overwriter.frag
```

Content requirements:

- Text/plain corrupted memory/defrag dump, roughly 60 lines.
- Contains exactly one discoverable `CHEAT` line in the default file, around line 30-40.
- Default line should be truthy, e.g. `CHEAT=true`.
- The raw editor action parser must treat missing/empty/falsey `CHEAT` as disabled.
- The boss name is The Defragmenter; `Overwriter.frag` remains the file name for legacy/narrative
  continuity unless `SPEC-03` changes it.

Manifest:

- Register in examples index with mime `text/plain`.
- Include in asset manifest.

## 4. Stage 2 Files - Glyph Dungeon

Required static or generated file:

```text
docs/examples/metagame/stage2/cipher.txt
```

Content requirements:

- Very long combat/cipher log.
- Search for `PASSAGE` must find canonical value `PASSAGE:247`.
- Manual scrolling to the answer should be impractical.
- The file may be generated/virtualized instead of stored as a huge static file, provided the
  file-viewer search system genuinely searches the rendered/source text and returns `PASSAGE:247`.

Optional support files:

```text
docs/examples/metagame/stage2/glyph_dungeon_map.txt
docs/examples/metagame/stage2/boss_arena_notes.txt
```

Manifest:

- If static, include in examples index and asset manifest.
- If generated, document generator and tests in the Stage 2 implementation.

## 5. Stage 3 Files - Memory Grid

Required generated pair:

```text
docs/examples/metagame/stage3/memory_v1.log
docs/examples/metagame/stage3/memory_v2.log
```

Content requirements:

- Both files are generated per save/run from Stage 3 state.
- Diff hunks contain restoration key pieces across multiple changed chunks.
- Either file alone must be insufficient to recover the full key.
- The key id/pieces must be persisted in `stageState[3]`.

Optional support files:

```text
docs/examples/metagame/stage3/nonogram_notes.txt
docs/examples/metagame/stage3/register_archive.log
```

Manifest:

- Generated files do not need static manifest entries, but the virtual-file provider must be
  covered by tests.

## 6. Stage 4 Files - Fractal Bastion

Required file tree:

```text
docs/examples/metagame/stage4/
  waves.json
  enemies.json
  towers/
    pulse_node.json
    scatter_array.json
    upgrades/
      tier1_blueprints/
        pulse_overload.json
        scatter_frag.json
      tier2_blueprints/
        attractor_well.json
        null_pattern.json
      tier3_blueprints/
        extractor_compound.json
        resonance_harmony.json
        recursion_points.json
```

`recursion_points.json` requirements:

- Generated per run from persisted Stage 4 state.
- Contains `boss_vulnerability`, a note explaining recursion-point targeting, and generated
  `recursion_points`.
- Opening this exact file sets `4.recursion_blueprint_read`.
- Boss damage rules use the same persisted point set.

Blueprint files:

- Static JSON files can unlock normal level-3 tower upgrades.
- Boss unlock only belongs to `recursion_points.json`.

Manifest:

- Static blueprint files go in examples index and asset manifest.
- Generated `recursion_points.json` uses the virtual-file provider.

## 7. Stage 5 Files - Signal Racer

Required file:

```text
docs/examples/metagame/stage5/transmission_hum.mp3
```

Content requirements:

- Audio counter-signal with a deterministic 14-second loop.
- The file may be a generated placeholder during first implementation if the audio player can play
  it locally and tests can verify loop timing.
- The audio player should show a minimal moving waveform/loop visualization.
- Race HUD must show Jammer suppression wave and, after calibration, the player's counter-wave.

Optional support files:

```text
docs/examples/metagame/stage5/race_telemetry.log
docs/examples/metagame/stage5/jammer_pattern.txt
```

Manifest:

- Include audio file in asset manifest.
- Do not stream from outside the app.

## 8. Stage 6 Files - Protocol Codex

Required file:

```text
docs/examples/metagame/stage6/protocols_of_the_entity.epub
```

Content requirements:

- Epub has at least 9 chapters.
- Chapter 9 documents The Refused Connection and the phase rules:
  - Phase 1: SYN first each turn.
  - Phase 2: ACK before Signal damage.
  - Phase 3: ACK each turn to avoid ongoing damage.
- The epub should remain useful as a live reference during the fight.

Optional support files:

```text
docs/examples/metagame/stage6/protocol_combo_table.md
docs/examples/metagame/stage6/relic_catalog.md
```

Manifest:

- Include epub and any support files in asset manifest.

## 9. Stage 7 Files - Identity Arbiter

Required files:

```text
docs/examples/metagame/stage7/entity_a_verification.png
docs/examples/metagame/stage7/entity_f_verification.png
docs/examples/metagame/stage7/entity_dossiers.json
```

Content requirements:

- Entity F image must contain or simulate an EXIF `GPSInfo` value outside known entity layers.
- Entity A image metadata must be consistent.
- Opening the image is insufficient; the contradictory metadata field must be visible.
- If browser image metadata extraction cannot preserve real EXIF from the asset, provide a local
  metadata sidecar consumed by the image viewer metadata panel.

Optional support files:

```text
docs/examples/metagame/stage7/registration_database.json
docs/examples/metagame/stage7/activity_log.csv
```

Manifest:

- Include images, sidecars, and dossiers in asset manifest.

## 10. Stage 8 Files - Entropy Field

Required virtual tree:

```text
/entropy/
  active_archive/
  debris/
    node_{id}_cycle{n}.sav
```

Content requirements:

- `.sav` debris files are generated when nodes fail.
- Debris has a 2-cycle decay timer unless stage state/modifiers say otherwise.
- Dragging a `.sav` from `/entropy/debris/` to `/entropy/active_archive/` archives salvage.
- Select-and-archive fallback must exist for mobile/accessibility.
- External OS import is optional and sets `8.external_debris_imported`.

Optional static support files:

```text
docs/examples/metagame/stage8/entropy_model.txt
docs/examples/metagame/stage8/node_map.json
```

Manifest:

- Static support files go in asset manifest.
- Virtual debris files are driven by Stage 8 state and tests.

## 11. Stage 9 Files - Observer State

Required file:

```text
docs/examples/metagame/stage9/service-worker-notes.txt
```

Required virtual/cache resources:

```text
/api/stage9/level/{id}/seed
/api/stage9/level/default-seed
```

Content requirements:

- Reading `service-worker-notes.txt` reveals `Activate Offline Mode (Stage 9)`.
- The canonical player path is the Stage 9 offline control.
- Real offline/service-worker behavior can also set `9.offline_mode_activated`.
- First implementation may simulate the seed endpoint in game logic.

Manifest:

- Include notes file in examples index and asset manifest.
- If real service-worker resources are added, include default seed/cache assets in the service
  worker cache list.

## 12. Stage 10 Files - Awakening

Required base memory files:

```text
docs/examples/metagame/stage10/stage_01_genesis.txt
docs/examples/metagame/stage10/stage_02_syntax.txt
docs/examples/metagame/stage10/stage_03_memory.txt
docs/examples/metagame/stage10/stage_04_pattern.txt
docs/examples/metagame/stage10/stage_05_signal.txt
docs/examples/metagame/stage10/stage_06_protocol.txt
docs/examples/metagame/stage10/stage_07_identity.txt
docs/examples/metagame/stage10/stage_08_entropy.txt
docs/examples/metagame/stage10/stage_09_observation.txt
docs/examples/metagame/stage10/stage_10_awakening.txt
```

Optional completionist/tool echo files:

```text
docs/examples/metagame/stage10/stage_01_source_excerpt.js
docs/examples/metagame/stage10/stage_02_cipher_retrospective.txt
docs/examples/metagame/stage10/stage_03_memory_before.log
docs/examples/metagame/stage10/stage_03_memory_after.log
docs/examples/metagame/stage10/stage_04/pattern/nested/recursion_note.json
docs/examples/metagame/stage10/stage_05_signal_hum.mp3
docs/examples/metagame/stage10/stage_06_protocol_appendix.epub
docs/examples/metagame/stage10/stage_07_identity_photo.png
docs/examples/metagame/stage10/stage_08/debris/memory_frag_*.sav
docs/examples/metagame/stage10/stage_09_observation.cached.txt
```

Generated completion files:

```text
/outside/outside.txt
/outside/note_from_the_builder.md
/outside/completion_certificate.txt
```

Rules:

- Base memory files form the Stage 10 map.
- Opening a base memory marks it read; reflection prompt resolution marks it resolved.
- Optional echo files can mark memories integrated.
- `stage_10_awakening.txt` is locked until the stage's Act 3/final sequence.
- Completion certificate is local/downloadable/openable in the file viewer and includes name
  if provided, route, ending, timestamp, completion id/checksum, and memory signature.
- Optional external share/submit link is allowed only as explicit user-click action. No embedded
  tokens, no auto-PR, no automatic outside communication.

Manifest:

- Include static memory and echo files in asset manifest.
- Generated `/outside/` files are local virtual/download content.

## 13. Asset Manifest And Offline Cache

Any implementation that adds or changes static runtime content must run the existing manifest
generation path through:

```sh
./scripts/check.sh
```

Expected checks:

- `docs/asset-manifest.json` includes new local static assets.
- Smoke test continues to assert zero off-origin requests.
- Service-worker/offline cache contains required local assets when applicable.
- Generated/virtual files have deterministic providers and tests instead of static manifest entries.

## 14. Crash-Course Reuse

Crash-course / boss-only mode is future work. Content should still be organized so later boss-only
entry can reuse:

- required action files,
- boss fixture files,
- BTS files,
- generated state providers,
- achievement and bell content.

Do not implement crash-course content routing in the first pass.
