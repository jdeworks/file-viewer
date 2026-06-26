# Review Checklist And Decision Log

Use this file to review and approve the modular media mixer research package
before implementation starts. The goal is not to eliminate every future design
choice; it is to make sure the build starts with a shared direction, accepted
MVP, and explicit risk posture.

## Package Review

Mark each reviewed document:

- [ ] `00-scope-and-decisions.md`
- [ ] `01-feature-research.md`
- [ ] `02-module-architecture.md`
- [ ] `03-project-model.md`
- [ ] `04-rendering-interaction.md`
- [ ] `05-memory-performance.md`
- [ ] `06-implementation-plan.md`
- [ ] `07-risks.md`
- [ ] `08-acceptance-and-test-strategy.md`
- [ ] `09-build-runbook.md`
- [ ] `10-review-checklist.md`
- [ ] `11-source-traceability.md`
- [ ] `12-user-workflows.md`
- [ ] `13-package-audit.md`
- [ ] `14-review-summary.md`

## Required Approval Before Stage 1

These must be accepted or amended before coding begins:

- [ ] Build a new modular mixer package under `docs/types/media/mixer/`.
- [ ] Treat current file-viewer Mix, Compare, and video Timeline as prototypes,
  not the final architecture.
- [ ] Use one shared project/lane/element model for audio, video, image,
  generated, compare, import/export, and reduced-mode workflows.
- [ ] Use capability/config gating for optional features.
- [ ] Keep ffmpeg opt-in and lazy.
- [ ] Make reduced feature states intentional and useful when ffmpeg or browser
  support is unavailable.
- [ ] Keep project settings export config-only by default, without embedded
  media bytes.
- [ ] Support missing-media relink and the reapply modal choices:
  - Apply to all elements.
  - Ask per element.
  - Do not change media objects.
- [ ] Treat memory safety as a hard requirement.
- [ ] Accept the first MVP as one-lane MP3/WAV Listen plus pure model,
  capability state, project settings import/export, and smoke/unit coverage.

## Recommended Defaults For Open Decisions

These defaults are proposed so Stage 1 can start. Amend them here if the review
chooses a different route.

### Project Bin

Decision:

- [ ] Use recommended default.
- [ ] Amend before implementation.

Recommended default: keep the project bin hidden in the one-lane audio MVP until
a second asset is added or the user opens Mix/Import. The asset model still
exists from Stage 1.

Reason: simple MP3/WAV should remain lane-first, while multi-asset workflows
still have a clear expansion path.

### Visual Preview Shell

Decision:

- [ ] Use recommended default.
- [ ] Amend before implementation.

Recommended default: add the preview region and seek-frame compositor model to
the shell. The first audio MVP can collapse or hide it, but the video/image
stage must implement calculated current-frame composition from active visual
lanes. Do not require realtime multi-lane video playback.

Reason: users need orientation frames to place images and transforms accurately,
while realtime composed playback is too heavy for the early browser client.

### Waveform Analysis Threshold

Decision:

- [ ] Use recommended default.
- [ ] Amend before implementation.

Recommended default: full decode for small audio only, capped/progressive
analysis for larger files. Start with conservative constants in code and tune
after measuring. The constants must be centralized in `mixer-config.js`.

Reason: exact limits depend on existing sample behavior and browser memory, but
the policy must be implemented from the start.

### Browser Ffmpeg Input Threshold

Decision:

- [ ] Use recommended default.
- [ ] Amend before implementation.

Recommended default: centralize a maximum browser ffmpeg input byte threshold in
`mixer-config.js`; above it, require explicit user confirmation or refuse with a
clear message.

Reason: ffmpeg.wasm memory failures should be designed around, not discovered
by crashing.

### Project File Hashing

Decision:

- [ ] Use recommended default.
- [ ] Amend before implementation.

Recommended default: full SHA-256 for small files, partial SHA-256 for large
files using first/middle/last byte windows plus size and lastModified. Store the
algorithm name in the project JSON.

Reason: config-only project files need useful matching without forcing huge
full-file reads.

### Keyframes

Decision:

- [ ] Use recommended default.
- [ ] Amend before implementation.

Recommended default: include keyframes in the data model from Stage 1; defer
keyframe UI until after the one-lane audio MVP.

Reason: model compatibility now, UI scope control early.

### Track EQ Scope

Decision:

- [ ] Use recommended default.
- [ ] Amend before implementation.

Recommended default: implement lane-level EQ and master EQ first; element-level
EQ can be added later using the same schema.

Reason: lane/master EQ covers the main workflow and avoids excessive graph
complexity in the first MVP.

### Pink Noise And Room Tone

Decision:

- [ ] Use recommended default.
- [ ] Amend before implementation.

Recommended default: support room tone as a derived lane by default and allow
explicit pink-noise generated elements later. The model should be able to
represent both.

Reason: matches auto-audiobook gap semantics while preserving a general mixer
path.

### Compare References

Decision:

- [ ] Use recommended default.
- [ ] Amend before implementation.

Recommended default: Compare references existing elements/ranges directly
rather than creating separate timing copies. Temporary compare view state can
hold offsets/ranges.

Reason: prevents a parallel timing model.

### Final Export Scope

Decision:

- [ ] Use recommended default.
- [ ] Amend before implementation.

Recommended default: final export first supports config-only project settings
and audio-only render paths. Video final export follows after video/image
elements and ffmpeg capability gating are stable.

Reason: the MVP should prove the model and one-lane audio without taking on
full video render complexity immediately.

## Sign-Off

Reviewer: user

Date: 2026-06-26

Decision:

- [x] Approved for Stage 1 implementation.
- [ ] Approved with amendments recorded below.
- [ ] Not approved; revise the research package first.

Amendments:

- 

## Stage 1 Start Conditions

Do not begin Stage 1 until:

- [x] Required approvals are complete.
- [x] Any amendments are reflected in the relevant research docs.
- [x] `09-build-runbook.md` still matches the accepted MVP.
- [x] `08-acceptance-and-test-strategy.md` still matches the accepted evidence
  standard.
