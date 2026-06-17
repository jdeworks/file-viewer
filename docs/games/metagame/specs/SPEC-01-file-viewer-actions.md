# SPEC-01 - File Viewer Actions

This spec defines the real file-viewer actions that unlock each stage boss. It extends
`SPEC-00-architecture.md` and uses the decisions log as canon.

## 0. Shared Rules

All viewer integrations must use:

```js
import { setAction } from "./action-flags.js";
```

Action ids use this save shape:

```text
N.action_name
```

Durable localStorage fallback keys use:

```text
fv:games:action:stageN:action_name
```

Live events use:

```js
window.dispatchEvent(new CustomEvent("fv:games:action", {
  detail: { stage, action, source, file, value }
}));
```

Rules:

- Actions are idempotent.
- Actions fire only after the qualifying viewer behavior, not when a stage asks the viewer to open
  a file.
- Achievements fire when the action unlocks the boss, not on boss defeat.
- Boss unlocks must not auto-defeat bosses.
- Each integration must expose a deterministic test seam that can call the same code path as the
  UI event.

## 1. Stage 1 - Raw Edit / `CHEAT`

Required file:

```text
docs/examples/Overwriter.frag
```

Required action:

```text
1.cheat_disabled
```

Qualifying UI event:

- Player opens `Overwriter.frag` in the raw/text editor.
- Player edits or saves the file so the `CHEAT` line is disabled for this save.

Canonical parsing:

- Missing `CHEAT` line disables the cheat.
- `CHEAT=` disables the cheat.
- Falsey values disable: `false`, `0`, `no`, `off`, empty.
- Truthy values: `true`, `1`, `yes`, `on`.
- Once disabled, the cheat remains disabled permanently for that save, even if a later edit would
  make `CHEAT` truthy again.

Payload:

```js
{
  stage: 1,
  action: "cheat_disabled",
  source: "raw-editor",
  file: "Overwriter.frag",
  value: "false"
}
```

Achievement:

```text
protection disabled.
```

Testing seam:

- Pure parser test for missing, empty, falsey, truthy, and mixed-case values.
- Raw editor save-hook test asserts `1.cheat_disabled` is set only for `Overwriter.frag`.
- Boss test asserts the locked cheat state is sampled at fight/lobby boundary according to the
  Stage 1 canonicalization spec.

## 2. Stage 2 - Search / `PASSAGE`

Required file:

```text
docs/examples/metagame/stage2/cipher.txt
```

Required action:

```text
2.search_passage
```

Qualifying UI event:

- Player opens `cipher.txt`.
- Player performs a file-viewer search for `PASSAGE`.
- Search resolves to the canonical result `PASSAGE:247`.

Non-qualifying events:

- Opening `cipher.txt`.
- Scrolling manually to the answer.
- Searching any other file.
- Searching for another term that happens to reveal nearby text.

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

Achievement:

```text
the passage was marked.
```

Testing seam:

- Search module test invokes the same result-selection handler with `file=cipher.txt`,
  `query=PASSAGE`, and `match=PASSAGE:247`.
- Negative tests cover opening only, wrong query, wrong file, and manual scroll.

## 3. Stage 3 - Diff / Restoration Key

Required files:

```text
docs/examples/metagame/stage3/memory_v1.log
docs/examples/metagame/stage3/memory_v2.log
```

Soft/readiness action:

```text
3.diff_memory_opened
```

Required boss-unlock action:

```text
3.diff_key_restored
```

Qualifying UI event:

- Player opens `memory_v1.log` and `memory_v2.log` in diff mode.
- Diff displays changed chunks containing a generated multi-line restoration key.
- Player extracts the generated key from multiple diff hunks and enters it at the Stage 3 boss.

Canonical key behavior:

- Key is generated per save/run.
- Key pieces read top-to-bottom across multiple changed hunks, e.g. `<sec`, `ret`, `key>`.
- Key is not recoverable from either file alone.
- Opening both files or entering diff mode may set `3.diff_memory_opened`, but cannot unlock the
  boss.

Payload:

```js
{
  stage: 3,
  action: "diff_key_restored",
  source: "stage-boss",
  files: ["memory_v1.log", "memory_v2.log"],
  diffActionSeen: true,
  keyId: "run-local-id"
}
```

Achievement:

```text
I found the difference.
```

Testing seam:

- Pure generator test proves key pieces appear only in diffable changed hunks.
- Diff view test asserts soft flag on opening the exact pair in diff mode.
- Boss input test asserts only the generated key sets `3.diff_key_restored`.

## 4. Stage 4 - Folder Navigation / Blueprint

Required file:

```text
docs/examples/metagame/stage4/towers/upgrades/tier3_blueprints/recursion_points.json
```

Required action:

```text
4.recursion_blueprint_read
```

Qualifying UI event:

- Player uses the file tree/sidebar to navigate to the exact deep blueprint file.
- Player opens `recursion_points.json`.

Canonical content behavior:

- Recursion point coordinates are generated per run and persisted in Stage 4 state.
- The opened blueprint content must reflect those persisted coordinates.
- Reading the file does not auto-win; the player must place towers near the generated points.

Payload:

```js
{
  stage: 4,
  action: "recursion_blueprint_read",
  source: "file-tree",
  file: "recursion_points.json",
  path: "/stage4/towers/upgrades/tier3_blueprints/recursion_points.json",
  pointSetId: "run-local-id"
}
```

Achievement:

```text
I looked deeper.
```

Testing seam:

- File-tree open handler test asserts only the exact path sets the action.
- Generated content test asserts file coordinates and boss vulnerability points share state.

## 5. Stage 5 - Audio / Counter-Wave Calibration

Required file:

```text
docs/examples/metagame/stage5/transmission_hum.mp3
```

Required action:

```text
5.counter_wave_calibrated
```

Qualifying UI event:

- Player opens `transmission_hum.mp3` in the audio player.
- Player actively plays one complete 14-second loop.

Non-qualifying events:

- Opening the audio file.
- Pressing play briefly.
- Seeking to the end without active playback.
- Background tab playback that is paused by browser policy before a full loop completes.

Payload:

```js
{
  stage: 5,
  action: "counter_wave_calibrated",
  source: "audio-player",
  file: "transmission_hum.mp3",
  durationMs: 14000,
  loopCompleted: true
}
```

Achievement:

```text
I listened before I drove.
```

Testing seam:

- Audio controller test uses fake timers and playback events to prove the flag requires continuous
  active playback totaling one loop.
- Race HUD test asserts the counter-wave visualization appears after calibration.

## 6. Stage 6 - Epub / Chapter 9

Required file:

```text
docs/examples/metagame/stage6/protocols_of_the_entity.epub
```

Required action:

```text
6.protocol_ch9_read
```

Qualifying UI event:

- Player opens the epub in the file viewer epub reader.
- Player navigates to Chapter 9.

Non-qualifying events:

- Opening the epub without reaching Chapter 9.
- Reading other chapters or appendix content only.

Payload:

```js
{
  stage: 6,
  action: "protocol_ch9_read",
  source: "epub-reader",
  file: "protocols_of_the_entity.epub",
  chapter: 9
}
```

Achievement:

```text
I read the fine print.
```

Testing seam:

- Epub reader test asserts chapter navigation to 9 sets the action once.
- Boss tests prove Chapter 9 removes permanent `PROTOCOL MISMATCH` but still requires the documented
  phase rules: SYN first in Phase 1, ACK before Signal damage in Phase 2, ACK each turn in Phase 3.

## 7. Stage 7 - Image Metadata / EXIF Contradiction

Required file:

```text
docs/examples/metagame/stage7/entity_f_verification.png
```

Required action:

```text
7.exif_contradiction_found
```

Qualifying UI event:

- Player opens the decisive fake entity photo in the image viewer.
- Player opens or expands the metadata/EXIF panel.
- Player views the specific contradictory EXIF field.

Canonical contradiction:

- Entity F's photo has GPS coordinates outside any known entity layer.
- The action marks Entity F as contradicted.
- The player still must commit to Entity A in the boss.

Payload:

```js
{
  stage: 7,
  action: "exif_contradiction_found",
  source: "image-metadata",
  file: "entity_f_verification.png",
  field: "GPSInfo",
  entity: "F"
}
```

Achievement:

```text
I looked beyond the surface of the image.
```

Testing seam:

- Metadata panel test asserts opening the image alone and opening a generic panel are insufficient.
- Field visibility test asserts the action fires when the contradictory field row is rendered or
  focused.
- Boss test proves Entity A must still be selected.

## 8. Stage 8 - Internal Drag/Drop Salvage

Required virtual folder tree:

```text
/entropy/
  active_archive/
  debris/
    node_*_cycle*.sav
```

Required action:

```text
8.salvage_archived
```

Optional action:

```text
8.external_debris_imported
```

Qualifying UI event:

- Player archives a generated `.sav` debris file by dragging it from `/entropy/debris/` to the
  in-stage `Active Archive` drop target.
- Mobile/accessibility fallback: player selects a debris file and taps an `Archive` control.

Non-qualifying events:

- Seeing debris appear.
- Opening a `.sav` file without archiving it.
- Dragging a non-`.sav` file.

Optional bonus:

- External OS drag/drop, file picker, or folder picker can set `8.external_debris_imported`.
- Optional import should grant a limited bonus, preferably reduced debris decay for a few cycles.
- Optional import must not be required for Heat Death.

Payload:

```js
{
  stage: 8,
  action: "salvage_archived",
  source: "internal-drag-drop",
  file: "node_p1_cycle14.sav",
  from: "/entropy/debris/",
  to: "/entropy/active_archive/",
  fallback: false
}
```

Achievement:

```text
I sorted the wreckage.
```

Testing seam:

- Drag/drop handler test asserts the internal action and fallback call the same archive function.
- Mobile test asserts the fallback is reachable without pointer drag.
- Boss fairness test asserts first Heat Death failure can rewind to warning checkpoint rather than
  forcing a full restart.

## 9. Stage 9 - Offline / Service Worker

Required file:

```text
docs/examples/metagame/stage9/service-worker-notes.txt
```

Required action:

```text
9.offline_mode_activated
```

Qualifying UI event:

- Player opens/reads `service-worker-notes.txt`.
- The Stage 9 sidebar/file-viewer control `Activate Offline Mode (Stage 9)` becomes visible.
- Player clicks the control.

Alternate qualifying path:

- Real browser offline/service-worker behavior succeeds and produces the same action.

Canonical boss behavior:

- Before unlock, boss seed/rotation is random and unlearnable.
- After unlock, boss seed/rotation is fixed and predictable.
- First implementation may simulate the seed endpoint in game logic, but the BTS must explain the
  real service-worker/cache mapping.

Payload:

```js
{
  stage: 9,
  action: "offline_mode_activated",
  source: "offline-control",
  file: "service-worker-notes.txt",
  mode: "simulated-cache"
}
```

Achievement:

```text
I learned the shape of the silence.
```

Testing seam:

- Sidebar control test asserts reading the notes reveals the control and clicking it sets the action.
- Boss seed test asserts online/locked seed changes unpredictably and offline/unlocked seed is fixed.
- Service worker integration test may be separate from the first simulated implementation.

## 10. Stage 10 - Examples Gallery / Memory Resolution

Required base files:

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

Required action:

```text
10.memory_resolved
```

Per-memory state:

```text
unread -> read -> resolved -> integrated
```

Qualifying UI events:

- Opening a prior-stage memory file marks that memory `read`.
- Answering its reflection prompt marks that memory `resolved`.
- Completing the optional prior-tool echo marks that memory `integrated`.
- The first resolved memory sets `10.memory_resolved`.

Canonical thresholds:

- 5 resolved memories unlock the final question.
- 7 resolved memories enrich the Defragmenter response.
- 9 resolved memories complete the memory route.
- 9 integrated memories complete the full capstone route.

Payload:

```js
{
  stage: 10,
  action: "memory_resolved",
  source: "examples-gallery",
  file: "stage_02_syntax.txt",
  memory: "syntax",
  resolvedCount: 1
}
```

Achievement:

```text
I read my own history.
```

Full capstone achievement:

```text
I assembled all of it.
```

Testing seam:

- Gallery open test asserts read state does not count as resolved.
- Reflection prompt test asserts any valid stance answer resolves the memory.
- Threshold test asserts final choices unlock at 5, enrichment at 7, memory route at 9, and full
  capstone only at 9 integrated memories.
