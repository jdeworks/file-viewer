# Build Runbook For Long-Running Implementation

Use this document to start the implementation goal after the research package is
approved. It is a concise operational prompt for the coding phase.

## Objective

Build a new modular, capability-gated media mixer package for file-viewer. The
first shippable slice is one-lane MP3/WAV Listen powered by the new shared
project/lane/element model, while preserving the architecture needed for
multi-track audio, video/image timeline elements, compare, project
import/export, and final render/export.

## Read First

Read these files in order before coding:

1. `00-scope-and-decisions.md`
2. `02-module-architecture.md`
3. `03-project-model.md`
4. `05-memory-performance.md`
5. `06-implementation-plan.md`
6. `08-acceptance-and-test-strategy.md`

Use the remaining research files for feature details:

- `01-feature-research.md`
- `04-rendering-interaction.md`
- `07-risks.md`

The old `docs/types/media/AUDIO_LANE_REQUIREMENTS.md` is audio-specific
supporting detail only. It is not the primary implementation direction.

## Do Not Do

- Do not extend the existing file-viewer audio Mix UI as the final mixer.
- Do not extend the existing file-viewer Compare UI as the final compare model.
- Do not extend the existing 2-lane video Timeline UI as the final video model.
- Do not make visible native audio controls part of the final one-lane audio
  Listen surface.
- Do not load ffmpeg just because the mixer mounted.
- Do not decode full media files just because the mixer mounted.
- Do not base completion on old prototype smoke selectors.
- Do not export project settings with embedded media bytes by default.

## Implementation Order

### Step 1: Pure Core

Create `docs/types/media/mixer/` with pure modules first:

- `mixer-model.js`
- `mixer-capabilities.js`
- `mixer-config.js`
- `mixer-hash.js`
- `mixer-import-export.js`
- `mixer-eq-schema.js`

The pure core should support:

- assets
- lanes
- lane descriptors
- elements
- capabilities
- selection
- compare state
- timing utilities
- project settings JSON export/import
- missing asset and relink state
- reapply choices
- EQ/master-bus schema

Validation:

- Add unit tests before UI integration.
- No DOM, canvas, AudioContext, or ffmpeg in this step.

### Step 2: Renderer Skeleton

Add renderer/interactions:

- `mixer-renderer.js`
- `mixer-hit-test.js`
- `mixer-interactions.js`
- `mixer-context-menu.js`
- `mixer-ui.js`
- `mixer-styles.css`

Render fake project data first:

- toolbar shell
- mode area
- ruler
- red playhead
- lane stack
- element blocks
- selection outline
- inspector placeholder

Validation:

- Add smoke coverage for mounting, zoom, seek, select, and inspector target.

### Step 3: One-Lane MP3/WAV Listen

Integrate through the media workspace as a reduced mixer context:

- opened MP3/WAV becomes one audio asset
- one source lane
- one source element
- waveform analysis within memory caps
- cursor/ruler/zoom/pan
- select/drag/trim
- gain/fades
- room-tone or pink-noise represented
- config-only project settings export/import

Validation:

- `sample.mp3` and `sample.wav` smoke.
- No visible native audio controls.
- Waveform-first lane visible.
- Click-to-seek and edit controls update model state.
- Settings export/import roundtrip.

### Step 4: Capability Notes

Implement capability-driven reduced UI before adding more features:

- ffmpeg disabled
- ffmpeg enabled but not loaded
- unsupported native preview
- WebAudio unavailable
- large file analysis capped

Validation:

- Disabled/opt-in states look intentional and list what works now.
- No broken/empty panels for gated features.

### Step 5: Expand Only After MVP Is Stable

Then add:

- multi-lane audio
- track EQ and master EQ UI
- decoded audio cache
- video/image elements
- seek-frame compositor for active visual lanes at the cursor
- compare mode over two selected elements/ranges
- final export/import UI
- prototype retirement

Follow `06-implementation-plan.md` and `08-acceptance-and-test-strategy.md` for
stage gates.

## Integration Notes

Prefer lazy integration through existing media workspace controller patterns:

- `renderer-mode-panels.js`
- `workspace-modes.js`

The new mixer should expose a controller shape like:

```js
mountMediaMixer(panel, intake, mediaElement, options) -> { destroy() }
```

`destroy()` must stop playback, cancel analysis, remove listeners, revoke owned
object URLs, disconnect WebAudio nodes, and release caches associated with the
mounted project.

## Testing Commands

Use targeted tests while developing:

```bash
node tests/media-mixer-model.test.mjs
node tests/media-mixer-import-export.test.mjs
node tests/media-mixer-capabilities.test.mjs
node tests/smoke-area.mjs media-studio
```

Before committing non-doc implementation work:

```bash
./scripts/check.sh --fast
```

Before push/merge:

```bash
./scripts/check.sh
```

The suggested test filenames may not exist yet. Create them when implementing
the corresponding stage.

## Completion Rule

Do not declare the modular mixer complete until
`08-acceptance-and-test-strategy.md` has direct evidence for every global and
stage-specific requirement in scope.

For the first MVP, completion means:

- pure model implemented and tested
- one-lane MP3/WAV mixer implemented and smoke-tested
- capability-gated reduced UI implemented and smoke-tested
- config-only settings export/import implemented and tested
- memory caps/lazy behavior implemented and tested
- old prototypes are not treated as proof of final behavior
