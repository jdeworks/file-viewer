# User Workflows

This document describes the concrete workflows the modular mixer should support.
It complements the architecture and acceptance docs by describing what a user
actually sees and does.

## Workflow 1: Open A Simple MP3/WAV

Context:

- User opens `sample.mp3` or `sample.wav`.
- No extra assets have been added.
- ffmpeg may be disabled.

Expected experience:

- The page opens directly into a one-lane mixer context.
- No visible native audio controls.
- The first viewport shows identity, transport, ruler, red cursor, waveform
  lane, and selection controls.
- The single source element is selected by default or selectable with one click.
- The inspector shows start offset, in/out, duration, gain, fade in, fade out,
  waveform/analysis status, and room-tone/pink-noise settings.
- If ffmpeg is disabled, the UI still works for preview/edit settings and says
  what final export paths need opt-in.

Core actions:

- Click ruler or waveform to seek.
- Press play/pause/stop.
- Drag the source element to start later.
- Trim in/out.
- Adjust gain.
- Adjust fades.
- Enable or configure room tone.
- Export project settings JSON.

Proof targets:

- `sample.mp3` and `sample.wav` smoke coverage.
- Model state updates for every control.
- Settings JSON roundtrip.

## Workflow 2: Expand From Listen To Mix

Context:

- User starts from one open audio file.
- User opens Mix or drags a second audio file into the timeline.

Expected experience:

- The same project expands in place; it does not open a separate mixer product.
- Existing source lane remains.
- Additional lanes can appear for music, SFX, room tone, or imported sources.
- Every audio-capable element has waveform or a clear loading/unsupported state.
- Lane controls expose mute, solo, gain, and selection.
- Track EQ and master EQ are separate concepts.

Core actions:

- Add or drop another audio asset.
- Move elements independently.
- Trim elements independently.
- Adjust lane gain and element gain.
- Mute/solo lanes.
- Add or reveal pink-noise/room-tone lane or derived layer.
- Preview mix if WebAudio is available.
- Export project settings JSON even if final audio render is not available.

Proof targets:

- Multiple lanes use the same project model as one-lane Listen.
- No old arbitrary mixer state is required.
- Track/master EQ state separation is testable.

## Workflow 3: Open A Video File

Context:

- User opens a browser-playable video such as `sample.mp4` or `sample.webm`.

Expected experience:

- The file becomes an asset and a timeline element with `hasVideo` and, where
  applicable, `hasAudio`.
- The preview area shows a calculated still frame at the current cursor,
  composited from all active visual lanes.
- The timeline shows a video-capable element, with audio waveform where feasible.
- Inspector shows timing, trim, transform, opacity, and audio controls if
  `hasAudio`.
- The preview is for seek orientation and placement, not realtime multi-lane
  video playback.
- If exact final render needs ffmpeg, the export control explains that.

Core actions:

- Seek on the shared ruler.
- Recalculate the current-frame preview after seek.
- Trim video in/out.
- Adjust transform/opacity.
- Add image or audio elements.
- Save project settings JSON without rendering final media.

Proof targets:

- Video/image elements use the same lane/element model.
- ffmpeg-disabled state is coherent, not broken.

## Workflow 4: Drag An Image Onto The Timeline

Context:

- User has an audio or video project open.
- User drags an image into the mixer.

Expected experience:

- The image becomes an asset and a visual timeline element.
- It has `hasImage: true`, `hasVideo: false`, `hasAudio: false`.
- The user can set duration, start time, opacity, position, scale, crop, and
  rotation according to implemented stage.
- It layers visually above lower lanes.
- On seek or transform change, the current-frame preview shows the image in its
  composited position.
- It is included in project settings JSON.

Core actions:

- Drop image.
- Move image element on timeline.
- Change duration.
- Adjust transform.
- Save and reload settings.

Proof targets:

- Image element model is distinct from audio/video but shares timeline behavior.
- Project settings export/import preserves visual element settings.

## Workflow 5: Compare Two Objects

Context:

- User has two audio/video/image elements or drops a second file for comparison.

Expected experience:

- Compare mode selects A and B from the same project model.
- Stacked mode shows two aligned lanes/ranges.
- Overlay mode draws both over each other with opacity/color controls.
- A and B have independent offsets and ranges.
- Analysis is explicit and scoped to selected overlap.
- No hidden normalization or hidden timing changes occur.

Core actions:

- Choose A and B.
- Adjust offset for A or B.
- Adjust in/out for A or B.
- Switch stacked/overlay.
- Analyze selected overlap.

Proof targets:

- Compare state references existing elements/ranges.
- Offsets and ranges update overlap math.
- Compare does not create a parallel timing model.

## Workflow 6: Import A Project Settings File

Context:

- User opens a JSON settings file exported earlier.
- Source media files are not embedded.

Expected experience:

- The project loads edit decisions and asset identities.
- Missing media are shown clearly.
- The user can drag files back in or choose them.
- Matching uses available identity evidence: hash/fingerprint, size,
  lastModified, and name.
- When matches are found, the reapply modal appears.

Modal choices:

- Apply to all elements: bind matching files and apply all stored element/lane
  settings automatically.
- Ask per element: review each match before applying stored settings.
- Do not change media objects: add files to the asset bin but leave existing
  timeline placeholders unchanged.

Proof targets:

- Settings import works without source media.
- Drag/relink updates missing asset state.
- Each modal choice has deterministic model behavior.

## Workflow 7: Work With ffmpeg Disabled

Context:

- ffmpeg is not enabled or not loaded.

Expected experience:

- The mixer still opens and edits project state.
- Native-supported preview still works.
- One-lane audio editing still works where WebAudio/browser decode supports it.
- Project settings import/export still works.
- Final render actions that require ffmpeg are visible but disabled or marked
  "Enable", with concise notes.

Core note pattern:

- What works now.
- What enabling Media Transcoding unlocks.
- Whether the current file likely needs conversion/proxy/export support.

Proof targets:

- Reduced mode looks intentional.
- No broken panels or failing buttons.
- ffmpeg is not loaded until explicit opt-in/action.

## Workflow 8: Export Final Media

Context:

- User has edits in the mixer and chooses Export.

Expected experience:

- Export mode reads the same project/lane/element state as preview.
- It shows provenance: assets, offsets, trims, fades, gain, EQ, room tone,
  transforms, capabilities, and render path.
- It distinguishes settings export from final rendered media export.
- Browser-native export is used where safe and supported.
- ffmpeg export is offered only when enabled/available or shown as opt-in.

Core actions:

- Export settings JSON.
- Export audio-only mix where feasible.
- Export video/image composition when ffmpeg capability is available.
- Cancel long export.

Proof targets:

- Project settings export contains no media bytes.
- Final export plans are derived from shared state.
- ffmpeg-disabled export states are coherent.

## Workflow 9: Large File Guardrails

Context:

- User opens or drops a large audio/video file.

Expected experience:

- Metadata appears first.
- Waveform/thumbnails are capped, progressive, or explicitly user-triggered.
- UI does not freeze due to full decode/render.
- Heavy operations show estimates or warnings.
- Project settings editing remains available.

Core actions:

- Edit timing metadata.
- Trigger analysis explicitly when needed.
- Save project settings.
- Opt into ffmpeg or reject operation based on size/capability warnings.

Proof targets:

- No full-file decode by default for large files.
- Analysis caps are centralized in config.
- Cleanup releases object URLs, decode buffers, and playback/export resources.
