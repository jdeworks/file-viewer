# Implementation Decisions Log

This records decisions made while walking through `08-uncertainties-to-resolve.md`.

## P0 Architecture

- Use one global v3 save with per-stage substate.
- No backwards compatibility or migration needed for old saves.
- Store action flags in the global save and read them from the in-memory state.
- Use a shared action flag API; no stage-specific localStorage key sprawl.
- Use a folder per stage under `docs/games/metagame/stages/stageN/`.
- Replace current placeholder Stage 2-10 code entirely; git is enough history.

## P1 Stage 1 Canon

- Stage 1 boss unlock uses `CHEAT` in `Overwriter.frag`.
- Missing `CHEAT` line disables the cheat.
- `CHEAT=` also disables.
- Falsy values disable: `false`, `0`, `no`, `off`, empty.
- Truthy values: `true`, `1`, `yes`, `on`, but once disabled the cheat is permanent for that save.
- Defragmenter tone: process-like antagonist with unfair routines, not cartoon villain.
- Stage 1 can use restrained symbolic UI/icons; Stage 2 owns the strict ASCII identity.

## P1 Viewer Integrations

### Stage 2 Search

- Unlock requires successful file-viewer search for `PASSAGE` in `cipher.txt`.
- Merely opening `cipher.txt` does not count.
- Scrolling manually to the answer should be impractical and should not set the action flag.
- `cipher.txt` should be very long and may be generated/virtualized rather than stored as a huge
  static file, as long as the search system genuinely finds `PASSAGE:247`.
- Action key: `2.search_passage`.

### Stage 3 Diff

- Opening both memory files is not enough.
- Diff mode with `memory_v1.log` and `memory_v2.log` can set a soft/readiness flag, but not the
  boss unlock.
- The actual unlock requires extracting a generated multi-line restoration key from the diff and
  entering it at the boss.
- The key should be formed by changed chunks across multiple diff hunks, e.g. pieces that read from
  top to bottom as `<sec`, `ret`, `key>`.
- The key is generated per save/run so it cannot be looked up.
- The key should not be recoverable from one file alone; it should emerge from comparing versions.
- Real unlock action key: `3.diff_key_restored`.

### Stage 4 Folder Navigation / Blueprint

- `recursion_points.json` coordinates should be generated per run, not fixed.
- Fixed coordinates risk the player accidentally placing towers correctly before reading the file,
  which would break immersion.
- The generated coordinates are persisted in Stage 4 run state and used to generate the blueprint
  file content.
- Opening the exact deep file sets soft action key `4.recursion_blueprint_read`.
- Reading the blueprint does not auto-win; the player must place towers according to the generated
  points.
- Boss damage rules use the generated points.
- Towers near any recursion point can damage the boss; covering more points makes the fight easier.

### Stage 5 Audio

- `transmission_hum.mp3` is an audio counter-signal, not just a hidden song.
- Unlock requires one full 14-second active playback loop of `transmission_hum.mp3`.
- Merely opening the file or briefly pressing play does not count.
- The audio player should show a minimal moving waveform/loop visualization.
- The race HUD should show the Jammer suppression wave and, after calibration, the player's
  counter-wave canceling it.
- The mechanic does not require real DSP; waveform/counter-wave visuals can be deterministic and
  tied to the known 14-second pattern.
- Action key: `5.counter_wave_calibrated`.

### Stage 6 Epub

- Opening `protocols_of_the_entity.epub` alone is a soft discovery at most.
- Real unlock requires navigating to Chapter 9.
- Action key: `6.protocol_ch9_read`.
- No typed key is required; the proof of reading is applying the documented protocol rules in the
  boss fight.
- Boss exits permanent `PROTOCOL MISMATCH` after Chapter 9 is read, but still requires:
  - Phase 1: SYN first each turn.
  - Phase 2: ACK before Signal damage.
  - Phase 3: ACK each turn to avoid ongoing damage.
- The epub should remain useful as a live reference during the fight.

### Stage 7 EXIF

- Opening the image alone is not enough.
- Opening the metadata panel alone is not enough.
- Real unlock requires viewing the specific contradictory EXIF field for the decisive fake entity.
- Recommended contradiction: Entity F photo has GPS coordinates outside any known entity layer.
- Action key: `7.exif_contradiction_found`.
- The EXIF action marks Entity F as contradicted, but the player still needs to commit to Entity A.
- The boss remains a deduction/judgment moment, not an automatic solve.

### Stage 8 Drag-and-Drop / Salvage

- Required Stage 8 mechanic uses internal tree-to-tool drag-and-drop, not mandatory OS-level file
  dragging.
- Generated `.sav` debris appears in a viewer-like folder tree/sidebar under `/entropy/debris/`.
- Player archives salvage by dragging `.sav` files into an in-stage `Active Archive` drop target.
- Mobile/accessibility fallback is required: select debris file and tap `Archive`, or equivalent.
- First successful internal archive action sets required action key `8.salvage_archived`.
- Heat Death requires enough archived salvage; external OS drag/drop is not required for the boss.
- External OS drag/drop / file picker / folder picker during Stage 8 can set optional action key
  `8.external_debris_imported`.
- Optional external import grants a bonus, preferably reduced debris decay for a few cycles.
- First Heat Death failure should rewind to a warning checkpoint rather than force full stage
  restart.
- BTS should explicitly discuss this design compromise: real drag/drop is device-dependent, so the
  critical lesson uses internal drag/drop with fallback while external drag/drop remains optional.

### Stage 9 Offline / Service Worker

- Canonical unlock path is a Stage 9 sidebar/file-viewer offline control, not requiring the user to
  disable their OS/network connection.
- Player should open/read `service-worker-notes.txt`; this reveals `Activate Offline Mode (Stage 9)`.
- Clicking the control sets action key `9.offline_mode_activated`.
- Actual browser offline/service-worker behavior can also set the same action as a valid path.
- Boss seed/rotation is random and unlearnable before unlock; after unlock it is fixed/predictable.
- First implementation may simulate the seed endpoint in game logic; BTS explains the real service
  worker/cache mapping.

### Stage 10 Memory Assembly

- Stage 10 memory files have three states:
  - `read`: gallery file opened; visual layer stabilizes.
  - `resolved`: player answers an introspective reflection prompt.
  - `integrated`: optional prior-tool echo completed.
- Final choice is gated by resolved memories, not merely opened files.
- Reflection prompts must not be comprehension checks or obvious moral scoring.
- Each answer should be a valid emotional interpretation of what the entity carries forward.
- Stage 10 needs a dedicated writing/content pass; the reflection questions are core design, not
  filler UI.

## P2 Gameplay / Fairness

### Boss Hint Cadence

- Use a universal 4-step locked-boss hint ladder with stage-specific writing.
- Step 1: cryptic/in-world failure interpretation.
- Step 2: stage-specific nudge toward the missing information/location.
- Step 3: points to the relevant file/viewer feature.
- Step 4: direct instruction, still in voice.
- Steps 1 and 2 must not use a stale formula. They should be unique to the stage's genre, boss,
  and emotional theme.

### Prestige / Replay

- Every stage spec includes a prestige design.
- First implementation priority is first-clear path, boss lock, and BTS.
- Prestige/replay pass can come after the first-clear path is stable.
- Replay should add value but should not surprise, punish, or invalidate the player's first clear.
- BTS appears after boss defeat and can frame replay options.
- Future crash-course / boss-only mode should reuse boss locks/content; specs should include hooks
  but not implement crash-course now.

### Stage 8 Failure Fairness

- Heat Death remains a preparation test: no emergency boss-room salvage.
- Failing Heat Death due to insufficient salvage should not force a full stage restart by default.
- Create a warning checkpoint around 5 cycles before Heat Death.
- On failure, offer reload warning checkpoint, restart stage, or return to stage select.
- After checkpoint reload, salvage/debris warnings can become stronger and more explicit.

### Stage 10 Thresholds / Rewards

- Use 5 / 7 / 9 / 9 thresholds:
  - 5 resolved memories unlock the final question.
  - 7 resolved memories enrich the Defragmenter response.
  - 9 resolved memories complete the memory route.
  - 9 integrated memories complete the full capstone route.
- Full capstone reward is emotional/visual, not a major power bonus.
- Full capstone route unlocks:
  - achievement `I assembled all of it.`
  - richer `stage_10_awakening.txt`
  - richer second-loop Stage 1 bell lines
  - subtle Stage 1 visual trace/checksum of the 9 integrated memories
- All endings unlock a credits / thanks-for-playing screen.
- Full capstone route additionally allows optional name entry and local completion certificate
  generation.
- Certificate is downloadable/openable in the file viewer and includes name, route, ending,
  timestamp, completion id/checksum, and memory signature.
- Optional external "submit/share completion" link is allowed, but no auto-PR, no embedded tokens,
  and no automatic outside communication.
- ASCII/terminal celebration is appropriate for the full route.
- Understand ending opens annotated narrative Stage 1 source first.
- Annotated source includes optional access/link to the real Stage 1 source.
- Full capstone route may personalize annotated comments with the player's memory signature.
- Expand ending creates local outside files first, e.g. `/outside/outside.txt` and optionally
  `/outside/note_from_the_builder.md`.
- No automatic external navigation or outside communication.
- Optional links to docs/repo/dev note are allowed only as explicit user-click actions, preserving
  the "no connection outside unless chosen" promise.
