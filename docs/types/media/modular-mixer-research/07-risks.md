# Risks And Decisions

## Major Risks

### Scope Explosion

This direction is effectively a browser NLE foundation. OpenShot-like editing,
auto-audiobook audio semantics, Narratu EQ, compare, import/export, and
client-side memory safety are each substantial. The build must be staged.

Mitigation:

- Start with pure model and one-lane audio MVP.
- Keep current prototype surfaces until the new module covers them.
- Treat video/image composition as staged expansion.

### Browser Memory Limits

Full decode of long audio/video files can crash or freeze the browser.

Mitigation:

- metadata first
- capped/progressive waveform
- sparse thumbnails
- explicit heavy actions
- memory estimates before OfflineAudioContext/ffmpeg work
- no base64 media copies

### Seek-Frame Preview Accuracy

Accurate multi-track video composition in the browser is hard, but users need a
calculated still frame at the current seek position to place images and visual
transforms. Native frame sampling plus canvas composition may not perfectly
match ffmpeg final export.

Mitigation:

- label approximate preview
- scope the requirement to seek-frame orientation preview, not realtime
  multi-lane playback
- use ffmpeg for final render
- keep operations initially simple
- test exact export command generation separately

### Ffmpeg Availability

ffmpeg.wasm is optional, large, and memory-intensive.

Mitigation:

- capability warnings
- browser-native paths where possible
- project settings import/export always works without ffmpeg
- final video export disabled or limited when ffmpeg is unavailable
- config-gated UI states: available now, available after opt-in, unsupported

### State Duplication

Existing media studio modules already have independent state. Continuing to add
features there will make the migration harder.

Mitigation:

- create new `mixer/` module
- expose adapter functions for old panels only where needed
- migrate modes one by one
- do not evolve old mixer/compare/video timeline as final UX

### Import/Relink Reliability

Project settings export cannot include source media. Matching local files later
can be imperfect, especially with partial hashes.

Mitigation:

- include size/name/mtime/full-or-partial hash
- mark partial hashes clearly
- relink UI
- reapply modal with apply-all, ask-per-element, and do-not-change choices
- warn on mismatches

### Audio/Visual Cursor Sync

Multi-track audio scheduling and seek-frame visual preview need shared cursor
state. Drift or stale frame composition can make visual placement unreliable.

Mitigation:

- central timeline clock
- WebAudio clock for audio where possible
- explicit reschedule on seek
- recompute visual preview on seek and relevant edit changes

### Sample-Rate Drift

Hardcoded export/render sample rates can change pitch or duration, especially
for 48 kHz WAV/video audio.

Mitigation:

- carry sample rate through asset metadata, decoded buffers, playback, and
  export
- resample only when an export preset explicitly requires it
- add tests for 44.1 kHz and 48 kHz WAV handling

### Cache Invalidation Bugs

Track EQ, master EQ, fades, speed, trim, and sample-rate settings all affect
rendered audio. Incorrect cache keys can play or export stale audio.

Mitigation:

- centralize processing schemas
- generate cache keys from schemas
- keep processed and decoded caches separate
- add tests that changing each knob invalidates the expected cache entry

### Mobile Interaction Complexity

Drag, trim, pinch zoom, context menus, inspector, and preview are hard on small
screens.

Mitigation:

- touch-sized controls
- simplified mobile toolbar
- horizontal timeline pan
- inspector below timeline
- defer advanced dock layouts

## Open Decisions

- Should the first implementation expose a project bin, or keep it hidden until
  a second asset is added?
- Should visual preview be part of the first module shell, or added in the video
  stage?
- What file-size threshold moves waveform from full decode to capped/progressive
  analysis?
- What file-size threshold disables browser ffmpeg by default?
- Should project settings export use full SHA-256 for files below 64 MiB, 128
  MiB, or another threshold?
- Should the first version support keyframes in UI, or only in the data model?
- Should track-specific EQ be lane-level only at first, with element EQ added
  later?
- Should pink noise be a lane role, an element type, or both?
- Should room tone be a derived lane by default, explicit elements by default,
  or support both from the start?
- Should Compare create temporary compare elements or reference existing
  elements directly?
- Should final export initially support audio-only projects, with video final
  export as a later stage?

## Recommended Risk Position

Use a conservative staged route:

1. Pure model and JSON import/export.
2. One-lane audio mixer using the new model.
3. Multi-lane audio with pink noise, lane EQ, master EQ.
4. Video/image element model and preview warnings.
5. Compare as a mode over two selected elements.
6. Final export expansion.

This keeps the first implementation valuable for MP3/WAV while preserving the
OpenShot-style general editor direction.
