# Acceptance And Test Strategy

This document defines how to prove the modular media mixer implementation is
actually complete at each stage. It is intentionally evidence-oriented: a stage
is not done because the UI looks plausible; it is done when the relevant model,
runtime behavior, and tests prove the requirement.

## Evidence Rules

- Prefer pure unit tests for model, timing, capabilities, serialization,
  hashing, ffmpeg plan generation, and cache keys.
- Prefer smoke tests for rendered workspace behavior, user interaction, mode
  gating, teardown, and sample media flows.
- For memory-sensitive work, add assertions for lazy loading, decode caps,
  cleanup, and object URL/AudioContext release where practical.
- For ffmpeg-gated features, test both disabled and enabled/planned states when
  feasible:
  - disabled state shows a coherent reduced feature set and opt-in note
  - enabled state exposes the operation or ffmpeg plan
- Do not use old prototype selectors as proof of new mixer behavior. Tests must
  assert the new modular mixer grammar.
- A passing smoke test only proves the covered behavior. It does not prove full
  stage completion unless every acceptance item for that stage is covered.

## Global Acceptance

The modular mixer is acceptable only when these are true:

- A new modular mixer package owns the final timeline/mixer model.
- The old file-viewer Mix, Compare, and video Timeline prototypes are not the
  final architecture.
- The same project/lane/element model powers audio, video, image, generated,
  compare, import/export, and reduced-mode workflows.
- Capability/config gating is central and visible in the UI.
- Project settings export/import is config-only by default.
- Dragged/relinked media can reapply imported settings with the required modal
  choices.
- Memory policy is implemented, not just documented.
- ffmpeg remains opt-in and lazy.
- Zero off-origin runtime request guarantees remain intact.

## Stage 0 Acceptance: Requirements

Evidence:

- Research package reviewed.
- MVP boundary accepted.
- Capability policy accepted.
- Project import/relink/reapply policy accepted.
- Memory cap policy accepted.
- Open decisions in `07-risks.md` triaged into "must decide before Stage 1" and
  "can defer".

No code implementation should start until these are agreed.

## Stage 1 Acceptance: Pure Model And Serialization

Required proof:

- Unit tests create projects from audio, video, image, generated, and mixed
  asset metadata.
- Lane descriptor registry supports explicit and derived lanes.
- Elements support `hasAudio`, `hasVideo`, and `hasImage`.
- Timing utilities cover move, trim, split, source in/out, placement duration,
  raw duration, and loop placement.
- Compare state computes shifted overlap from two elements/ranges.
- Capability matrix returns available, opt-in, and unsupported actions.
- EQ/master-bus schema roundtrips without losing band/filter state.
- Project settings export omits media bytes.
- Project settings import validates schema/version.
- Missing asset detection works.
- Relink matching uses file identity evidence.
- Reapply modal outcomes are represented in pure state transitions.

Suggested test files:

- `tests/media-mixer-model.test.mjs`
- `tests/media-mixer-import-export.test.mjs`
- `tests/media-mixer-capabilities.test.mjs`

## Stage 2 Acceptance: Renderer Skeleton

Required proof:

- Smoke or DOM tests mount the mixer shell with fake project data.
- Toolbar, ruler, red playhead, lane stack, lane labels, element blocks, and
  inspector placeholder render.
- Zoom changes timeline scale.
- Pan/scroll changes visible viewport.
- Click-to-seek updates cursor state.
- Selecting lane/element updates inspector target.
- Hit-test regions distinguish body, trim handles, fade handles, empty lane,
  and ruler.
- The renderer consumes snapshots and does not own product mode state.

Suggested test files:

- `tests/areas/media-studio-mixer-shell.mjs`
- `tests/media-mixer-hit-test.test.mjs`

## Stage 3 Acceptance: One-Lane Audio MVP

Required proof for `sample.mp3` and `sample.wav`:

- Opens in the new modular mixer Listen context.
- No visible native audio controls.
- One source lane is visible.
- Ruler is visible.
- Red cursor is visible.
- Waveform is visible or shows an explicit analysis/loading state that resolves
  for sample files.
- Click-to-seek changes cursor/time.
- Play/pause/stop works.
- Zoom/pan works.
- Dragging/moving source timing updates state.
- Trim handles or trim inputs update in/out state.
- Gain updates state.
- Fade-in/fade-out update state.
- Pink-noise/room-tone is represented in the project model and UI.
- Settings JSON export/import roundtrips the one-lane edit state.
- Capability note appears when an export path needs ffmpeg and ffmpeg is
  disabled.

Suggested test files:

- `tests/areas/media-studio-mixer-audio-listen.mjs`
- `tests/media-mixer-waveform.test.mjs`

## Stage 4 Acceptance: Multi-Lane Audio

Required proof:

- Multiple audio-capable lanes can be added.
- Drag/drop audio assets creates elements on lanes.
- Pink-noise/room-tone can exist as a lane, generated element, or derived lane
  according to the accepted design.
- Mute/solo/gain operate per lane.
- Element gain/fades operate separately from lane gain.
- Track EQ and master EQ are distinct state and distinct processing stages.
- Only one spectrum analyzer is active by default.
- WebAudio scheduled playback respects offsets, trims, gain, fades, mute/solo,
  and room tone.
- Decoded audio cache has a byte budget and eviction behavior.
- Processed cache keys include every relevant audio setting.
- Audio mix export/provenance reads the same timeline state.

Suggested test files:

- `tests/areas/media-studio-mixer-audio-multi.mjs`
- `tests/media-mixer-audio-cache.test.mjs`
- `tests/media-mixer-audio-render.test.mjs`

## Stage 5 Acceptance: Video/Image Elements

Required proof:

- Video assets create elements with `hasVideo` and, when applicable, `hasAudio`.
- Image assets create visual elements with editable duration.
- Video/image lanes render stable placeholders, thumbnails, or preview blocks.
- Visual transforms update model state.
- Opacity/fades update model state.
- Seek-frame preview composites active visual lanes at the current cursor.
- Image placement after transform is visible in the calculated frame preview.
- Realtime multi-lane video playback is not required for acceptance.
- Video elements expose audio controls when `hasAudio` is true.
- Unsupported or non-native-preview formats show conversion/proxy warnings.
- With ffmpeg disabled, video/image editing still looks coherent and project
  settings export/import remains available.

Suggested test files:

- `tests/areas/media-studio-mixer-video-image.mjs`
- `tests/media-mixer-visual-model.test.mjs`

## Stage 6 Acceptance: Compare Mode

Required proof:

- Compare A/B can be chosen from existing elements or dropped assets.
- Stacked view renders two selected lanes/ranges.
- Overlay view draws both selected waveforms or visual previews in shared
  coordinates.
- A/B offsets update model state and rendered overlap.
- A/B in/out ranges update model state and rendered overlap.
- Audio normalization is off by default and user-controlled.
- Analyze selected overlap is explicit.
- Compare does not create a parallel timing model.

Suggested test files:

- `tests/areas/media-studio-mixer-compare.mjs`
- `tests/media-mixer-compare.test.mjs`

## Stage 7 Acceptance: Export And Import UI

Required proof:

- Project settings export writes JSON with schema/version, assets, hashes,
  lanes, elements, effects, keyframes, compare, and master settings.
- Settings export contains no media bytes by default.
- Settings import validates schema/version and reports missing media.
- Dragging matching files relinks missing assets.
- Reapply modal offers:
  - Apply to all elements.
  - Ask per element.
  - Do not change media objects.
- Each modal choice produces the expected project state.
- Final audio export uses the shared timeline state.
- Final video export is available only when capability/config allows it.
- ffmpeg-disabled video export shows an opt-in note, not a broken action.
- Export provenance lists assets, trims, offsets, fades, gain, EQ, room tone,
  transforms, capabilities, and render path.

Suggested test files:

- `tests/areas/media-studio-mixer-import-export.mjs`
- `tests/media-mixer-project-json.test.mjs`
- `tests/media-mixer-export-plan.test.mjs`

## Stage 8 Acceptance: Prototype Retirement

Required proof:

- Old audio mixer UI is removed or no longer mounted as final UX.
- Old compare UI is removed or no longer mounted as final UX.
- Old video timeline UI is removed or no longer mounted as final UX.
- Existing media modes route through the modular mixer where relevant.
- Smoke tests assert new mixer selectors and behavior.
- No tests preserve old prototype UI as required behavior.
- `./scripts/check.sh --fast` passes.
- Full `./scripts/check.sh` passes before merge/release.

## Sample Coverage Matrix

Required sample coverage:

- `sample.mp3`: one-lane audio listen, waveform, edit state, project settings.
- `sample.wav`: WAV metadata/sample-rate, waveform, edit state, project
  settings.
- `sample.mp4` or `sample.webm`: video element with `hasVideo` and `hasAudio`
  where applicable.
- `Sample.avi` or another non-native/needs-conversion sample: reduced mode and
  opt-in conversion warning.
- image sample from existing examples: image element, duration, transform.
- two-source compare fixture: stacked and overlay compare.

## Completion Audit Template

Before declaring the mixer complete, record:

- requirement
- evidence path or command
- result
- coverage strength: direct, partial, or missing
- follow-up if partial/missing

The implementation task should not mark completion until every global and
stage-specific required item has direct evidence.
