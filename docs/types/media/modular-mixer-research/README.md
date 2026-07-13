# Modular Media Mixer Research Package

Status: approved on 2026-06-26; Stage 1-8 implementation is complete. Use
`14-review-summary.md` for the short read, `10-review-checklist.md` for the
historical approval record, and the repository [`TASKS.md`](../../../../TASKS.md)
for all unfinished work.

This folder defines the research baseline for a new modular media mixer/editor
inside the file-viewer media studio.

The direction changed from "polish the MP3 Listen lane" to "build a reusable
timeline/mixer module first, then use it in reduced forms depending on context".
The default MP3 case becomes one source element on one lane in the same tool
that can later expand into multi-track audio/video/image composition, compare,
export, and importable project edits.

## Documents

- `00-scope-and-decisions.md`: primary source-of-truth summary, MVP boundary,
  non-negotiable decisions, deferrals, and review gate.
- `01-feature-research.md`: feature inventory from OpenShot, auto-audiobook,
  Narratu, and the current file-viewer prototype.
- `02-module-architecture.md`: proposed module boundaries and integration shape.
- `03-project-model.md`: lanes, elements, media capabilities, effects,
  keyframes, selection, import/export config, and hashing.
- `04-rendering-interaction.md`: timeline rendering, dragging, trimming,
  context menus, transforms, filters, compare, and preview behavior.
- `05-memory-performance.md`: client-side memory, decode, waveform, thumbnail,
  ffmpeg, cleanup, and failure policies.
- `06-implementation-plan.md`: staged build plan for a long-running goal task.
- `07-risks.md`: major technical/product risks and decisions to settle before
  implementation.
- `08-acceptance-and-test-strategy.md`: evidence-based acceptance criteria,
  stage gates, sample coverage, and suggested test files.
- `09-build-runbook.md`: concise implementation handoff for a long-running
  coding task after the research package is approved.
- `10-review-checklist.md`: compact historical approval record.
- `11-source-traceability.md`: requirement-to-source matrix tying the package
  back to OpenShot, auto-audiobook, Narratu, and current file-viewer evidence.
- `12-user-workflows.md`: concrete user flows for one-lane audio, mix, video,
  image, compare, project import/relink, reduced capability mode, export, and
  large-file guardrails.
- `14-review-summary.md`: compact reviewer summary for approval or amendment.

## Core Thesis

Build a general, capability-aware timeline/mixer module:

- Any imported object becomes a timeline element.
- Each element declares `hasAudio`, `hasVideo`, `hasImage`, and decode/export
  capabilities.
- Features are capability/config gated. If ffmpeg or another optional library is
  unavailable, the editor still presents a coherent reduced tool and states what
  works now versus what opt-in unlocks.
- Audio-capable elements can render waveforms, use track-specific EQ, and
  participate in audio mixdown.
- Video/image-capable elements can render thumbnails/proxies, transforms,
  animations, filters, overlays, and transitions.
- Lanes are reusable for one-track audio, multi-track sessions, compare pairs,
  image overlays, video timelines, and export staging.
- Full render/export is produced through browser APIs when possible and ffmpeg
  when enabled or required.
- The lightweight project export is a JSON settings file containing file
  identities/hashes and edit settings, not embedded media bytes.
- Reopening a settings file later can reapply edits when the user drags matching
  media files back in.

## Non-Goals For The Research Phase

- No implementation changes.
- No UI replacement yet.
- No ffmpeg dependency change yet.
- No commit/push without explicit approval.

## Source Anchors

- OpenShot user guide:
  - https://www.openshot.org/static/files/user-guide/main_window.html
  - https://www.openshot.org/static/files/user-guide/clips.html
  - https://cdn.openshot.org/static/files/user-guide/effects.html
- Auto-audiobook:
  - `/home/jens/repos/auto-audiobook/src/components/AudioMixerView.tsx`
  - `/home/jens/repos/auto-audiobook/src/components/MixerTrack.tsx`
  - `/home/jens/repos/auto-audiobook/src/components/MixerToolbar.tsx`
  - `/home/jens/repos/auto-audiobook/src/stores/mixer-store.ts`
  - `/home/jens/repos/auto-audiobook/src/utils/mixer-playback.ts`
  - `/home/jens/repos/auto-audiobook/src/utils/mixer-export.ts`
  - `/home/jens/repos/auto-audiobook/src/engine/audio-processor.ts`
- Narratu:
  - `/home/jens/repos/narratu/apps/web/src/components/workspace/EqPanel.tsx`
  - `/home/jens/repos/narratu/apps/web/src/utils/eq-engine.ts`
  - `/home/jens/repos/narratu/apps/web/src/utils/eq-presets.ts`
- File-viewer prototype at research time (`mixer-engine.js`, `timeline.js`, and
  `compare-ui.js` were later retired in Stage 8; implementation history is in
  Git):
  - `docs/types/media/renderer.js`
  - `docs/types/media/mixer-engine.js` (retired/deleted)
  - `docs/types/media/timeline.js` (retired/deleted)
  - `docs/types/media/compare-ui.js` (retired/deleted)
  - `docs/types/media/studio-export.js`
