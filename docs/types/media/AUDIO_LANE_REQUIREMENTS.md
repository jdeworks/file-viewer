# Media Studio Audio Lane Requirements

Status: superseded as the primary implementation direction by
`docs/types/media/modular-mixer-research/`.

This file remains useful as the audio-specific lane detail for the default
MP3/WAV case, but the current target is broader: a modular, capability-gated
media mixer that can run as one audio lane, multi-track audio, video/image
timeline, compare surface, and export/import project editor. New work should
start from the modular mixer research package and pull audio-specific details
from this file only where they remain compatible.

This document defines the target audio workspace for MP3/WAV samples in the
file-viewer media studio. It is a requirements and design alignment document,
not an implementation record.

The current file-viewer `Listen`, `Mix`, and `Compare` implementations are
prototype coverage only. The next implementation must start from the
auto-audiobook mixer files and behavior, then extend and optimize that model for
file-viewer's static, one-file-at-open use case. File-viewer alignment is an
adaptation step after the auto-audiobook model is understood; it is not the
design source.

## Source References

Primary auto-audiobook references:

- `/home/jens/repos/auto-audiobook/src/components/ListenPage.tsx`
- `/home/jens/repos/auto-audiobook/src/components/AudioMixerView.tsx`
- `/home/jens/repos/auto-audiobook/src/components/MixerTrack.tsx`
- `/home/jens/repos/auto-audiobook/src/components/MixerToolbar.tsx`
- `/home/jens/repos/auto-audiobook/src/components/MixerRuler.tsx`
- `/home/jens/repos/auto-audiobook/src/stores/mixer-store.ts`
- `/home/jens/repos/auto-audiobook/src/utils/mixer-playback.ts`
- `/home/jens/repos/auto-audiobook/src/utils/mixer-export.ts`
- `/home/jens/repos/auto-audiobook/src/engine/audio-processor.ts`

Equalizer and tune references:

- `/home/jens/repos/narratu/apps/web/src/components/workspace/EqPanel.tsx`
- `/home/jens/repos/narratu/apps/web/src/components/workspace/EqBandSlider.tsx`
- `/home/jens/repos/narratu/apps/web/src/components/workspace/SpectrumAnalyzer.tsx`
- `/home/jens/repos/narratu/apps/web/src/components/workspace/EqComparisonChart.tsx`
- `/home/jens/repos/narratu/apps/web/src/utils/eq-types.ts`
- `/home/jens/repos/narratu/apps/web/src/utils/eq-engine.ts`
- `/home/jens/repos/narratu/apps/web/src/utils/eq-presets.ts`

Existing file-viewer roadmap references:

- `docs/types/media/STUDIO_TRACKER.md`
- `docs/types/media/STUDIO_ROADMAP.md`

## Product Intent

Opening a sample MP3/WAV should feel like opening a compact audio editor, not a
native media player followed by optional tools. The first viewport must expose
the media identity, transport, timeline ruler, visible waveform lane, red seek
cursor, and contextual controls.

The default state starts with one visible source lane. The same lane model then
expands:

- `Listen` is the one-lane case.
- `Mix` is the multi-lane expansion of that same workspace.
- `Compare` is the two-lane specialization of that same workspace, with stacked
  and overlay presentations.
- `Tune`, `QC`, and `Export` operate on the selected lane, selected region, or
  master mix from the same model.

There must not be a separate arbitrary mixer UI that competes with the default
audio surface. The top media lane toolbar remains the command surface for the
workspace, and mode changes alter the lane stack in place.

## Non-Negotiable Principles

- The visible audio surface is waveform-first.
- Native `<audio>` controls are not part of the visible product surface. There
  should be no visible browser audio controls in the media studio. If a native
  media element is technically retained, it is an internal implementation detail
  only and must not shape the UI.
- Every visible track has waveform analysis or an explicit loading/empty state.
- A single semantic lane model backs `Listen`, `Mix`, and `Compare`.
- Track selection is first-class. Clicking a lane or region selects it and
  updates contextual controls.
- Zoom, pan, cursor, offsets, trims, gain, fades, noise/room-tone semantics, QC,
  and export all read from the same timeline state.
- Runtime remains static-client only, with zero off-origin requests.
- Heavy full-file decode, ffmpeg work, and long analysis stay lazy and explicit.

## Auto-Audiobook Behaviors To Preserve

The auto-audiobook mixer is a compact workbench:

- A bounded mixer container.
- A top toolbar with transport, cursor time, zoom controls, and timeline actions.
- A shared horizontal scroll/zoom timeline.
- A ruler row above tracks.
- Fixed left lane labels.
- Canvas-rendered tracks.
- A thin red playhead/cursor.
- Click-to-seek on the ruler and tracks.
- Direct manipulation of timing by dragging segments or regions.
- Selection-driven detail panels below the lane stack.

The auto-audiobook semantic tracks are:

- `Speakers`: speech segments with offsets, gaps, durations, speaker colors, and
  waveform peaks.
- `Noise`: compact lane showing gap/room-tone intervals before speech.
- `Music`: regions with offsets, duration, loop, gain, fades, and waveform peaks.
- `SFX`: same region model as music, but visually separate.

File-viewer does not need to expose those exact names everywhere, but it must
keep the same semantics. A single opened MP3/WAV starts as the single-track
version of the auto-audiobook mixer, with one `Source` or `Primary` lane. `Mix`
reveals room tone, music, SFX, and added source lanes as the multi-track
expansion.

## Shared Audio Lane Model

The implementation should introduce a shared audio lane module rather than
growing the current Listen/Mix/Compare UI modules. The model should be derived
from auto-audiobook's `mixer-store.ts`, `AudioMixerView.tsx`,
`MixerTrack.tsx`, `MixerToolbar.tsx`, `mixer-playback.ts`, and
`mixer-export.ts`, then adapted for file-viewer source files.

### Workspace State

Required state:

- `lanes`: ordered list of audio lanes.
- `regions`: ordered list of timeline regions belonging to lanes.
- `cursorMs`: current timeline cursor.
- `zoom`: pixels per second, with bounded min/max.
- `scrollLeft`: horizontal timeline scroll.
- `durationMs`: visible timeline duration after offsets and regions.
- `playbackState`: stopped, playing, paused, loading.
- `selectedLaneId`: selected lane.
- `selectedRegionId`: selected region, if any.
- `mode`: Listen, Tune, QC, Export, Compare, Mix.
- `compare`: selected A/B lane or region ids, overlay mode, opacity, offsets,
  normalization choice, selected analysis range.
- `master`: master gain, limiter/export preset state, and master analysis.

### Lane Shape

Each lane should support:

- `id`
- `role`: source, speaker, room-tone, noise, music, sfx, compare-a, compare-b,
  master-preview, or imported-source.
- `label`
- `color`
- `height`
- `source`: blob/file reference where applicable.
- `sourceDurationMs`
- `timelineOffsetMs`
- `inMs`
- `outMs`
- `gain`
- `mute`
- `solo`
- `collapsed`
- `locked`
- `analysis`: waveform summary, peaks, RMS/peak stats, sample rate, channel
  count, analysis status.
- `tune`: EQ, HPF, LPF, bypass, preset, dynamics where applicable.

### Region Shape

Regions represent editable spans on a lane:

- `id`
- `laneId`
- `kind`: source, speech, room-tone-gap, room-tone-bed, music, sfx, generated,
  compare-window.
- `offsetMs`
- `durationMs`
- `sourceInMs`
- `sourceOutMs`
- `rawDurationMs`
- `gain`
- `fadeInMs`
- `fadeOutMs`
- `loop`
- `peaks`
- `metadata`

The default one-track Listen view may have one source region spanning the file.
Mix mode may add music/SFX regions. Compare mode may create A/B compare regions
without duplicating the underlying source analysis.

### Timing Utilities

The shared module must expose the same core conversions used by auto-audiobook:

- `msToPixels(ms, zoom)`
- `pixelsToMs(px, zoom)`
- timeline range clamping
- overlap math for compare windows
- selected region bounds
- rendered viewport bounds from `scrollLeft`, `zoom`, and container width

## Wave Analysis

Wave analysis is required for every visible audio track.

Requirements:

- The source lane draws a real waveform for MP3/WAV after decode or capped
  analysis.
- Imported mix lanes draw their own waveforms.
- Music and SFX regions draw waveform peaks inside the region block.
- Compare stacked and overlay views draw both selected waveforms.
- Empty lanes show an explicit empty state such as "Drop audio" or "No region".
- Loading lanes show progress or a loading state, not a blank canvas.

Analysis should include:

- duration
- sample rate
- channel count
- min/max peak buckets for drawing
- RMS or loudness-adjacent summary where available
- peak amplitude
- optional noise-floor/loudness data for QC when requested

Large files must not force expensive full-file analysis before interaction.
Initial waveform generation may be capped or progressive, but visible lanes must
make the analysis state clear.

## Room Tone And Pink Noise Semantics

Room tone is not an arbitrary generator track bolted onto the mixer. It follows
the auto-audiobook gap/noise model:

- Speech/source timeline gaps can be filled with subtle pink noise.
- The default target room-tone level should follow auto-audiobook's export
  behavior, approximately `-52 dB`.
- Room tone may be represented as a compact lane in Mix mode and as a bed/gap
  overlay in default Listen mode.
- Gaps are semantic timeline intervals with a level and source type, not just
  visual decoration.
- Export must be able to render room-tone bed/gaps deterministically.

Default Listen should still start as one visible source lane. Room tone controls
may appear in the contextual detail panel and the bed/gap may be drawn as a
subtle overlay or compact disclosure, but opening a simple file should not
immediately look like a four-track session.

## Page Layout For Opening Sample MP3/WAV

The page opened for `sample.mp3` or `sample.wav` must use this structure:

1. Compact media identity row:
   - filename
   - format summary when known
   - current time / total duration
   - analysis/playback status

2. Top media lane toolbar:
   - mode segmented control: Listen, Tune, QC, Export, Compare, Mix
   - transport: jump/start, play/pause, stop
   - cursor time input/readout
   - zoom fit, zoom out, zoom slider, zoom in, zoom percent
   - mode-specific compact commands

3. Timeline workbench:
   - ruler row
   - lane stack
   - horizontal scrollbar or equivalent pan affordance
   - red cursor drawn through ruler and visible lanes

4. Selection/detail panel:
   - changes when selecting lane, source region, music/SFX region, compare pair,
     master, or export target
   - holds the ordinary controls for the selected object

5. Optional heavy panels:
   - Tune spectrum/EQ
   - QC report
   - export provenance/progress
   - these are mode surfaces inside the same workspace, not unrelated widgets.

The first viewport should show the toolbar, ruler, waveform lane, and at least
the top of the detail panel on normal desktop viewports.

## Shared Interaction Requirements

### Cursor And Seeking

- Clicking the ruler seeks.
- Clicking empty lane background seeks.
- Clicking a region selects it; clicking with a seek modifier or on the
  non-handle body may also move the cursor according to final interaction rules.
- The red cursor is visible across all lanes and overlay views.
- During playback, the cursor moves smoothly from scheduled WebAudio time.
- Seeking during playback restarts scheduling from the selected cursor time.

### Transport

- Play/pause and stop are always available in the toolbar.
- Stop returns playback to the previous start cursor or zero according to the
  final interaction rule, but it must be deterministic.
- Playback must use the auto-audiobook WebAudio scheduling model for timeline
  correctness once more than one lane is active.
- Any native media element is internal only. It must not contribute visible
  controls or a visible browser playback row.

### Zoom And Pan

- Fit timeline.
- Zoom in/out buttons.
- Zoom slider with percent or px/s readout.
- Ctrl/meta-wheel zooms around the pointer.
- Trackpad/wheel pans horizontally.
- Touch supports single-finger horizontal pan and two-finger pinch zoom.
- The current zoom and scroll state are shared by Listen, Mix, and Compare.

### Direct Manipulation

- Dragging a source/region changes its timeline offset.
- Trim handles adjust in/out or sourceIn/sourceOut.
- Fade handles or controls adjust fade-in and fade-out durations.
- Selected items show a clear outline.
- Keyboard arrow keys nudge selected offsets or trim handles by a small step
  such as 50 ms, with modifiers for larger steps.
- Right-click must override the browser context menu on the lane canvas and use
  an auto-audiobook-style menu rendered above the workbench.
- Context menu actions start with the auto-audiobook set: select segment/region,
  split here for regions, delete for regions, and set cursor here.
- File-viewer-specific context actions, such as analyze selected range, use as
  Compare A, use as Compare B, use range for QC, or export selected range, are
  allowed only as extensions to that auto-audiobook menu model.

### Selection

- Clicking a lane label selects the lane.
- Clicking a region selects the region.
- Selection updates the detail panel.
- Selection must be visually obvious in the lane stack.
- Exactly one primary selection is active at a time, with optional compare A/B
  slots as separate state.

## Listen Mode

Listen is the default mode for a single MP3/WAV.

Visible default:

- one primary source lane
- ruler
- red seek cursor
- click-to-seek waveform canvas
- compact transport and zoom in the top toolbar
- no visible native audio player

Source lane drawing:

- waveform fills the lane
- selected source region is outlined
- in/out trim range is visible
- muted/trimmed portions are visually de-emphasized
- start-later offset is shown as leading empty timeline space before the source
- fade-in and fade-out regions are shaded or curved
- room-tone bed/gap overlay is visible when enabled

Detail controls for the selected source lane/region:

- start/later-start offset
- in time
- out time
- selected duration
- total source duration
- gain/volume
- fade in
- fade out
- room-tone/pink-noise enable
- room-tone level
- reset timing
- analysis status

Listen must not be a separate simple waveform widget that later hands off to a
different mixer. It is the first lane in the same model used by Mix and Compare.

## Mix Mode

Mix mode expands the same workspace in place. It does not open a separate mixer
view below the media tools.

Default Mix lane stack:

- Primary/source or speakers lane
- Noise/room-tone lane
- Music lane
- SFX lane

Additional source lanes may be added by dropping files or using an add-lane
command, but the initial grammar should stay semantic rather than arbitrary.

Mix requirements:

- The toolbar mode remains `Mix`.
- The ruler and red cursor remain shared.
- Existing Listen source lane remains in place.
- Room tone appears as compact gap/bed lane or lane overlay.
- Music and SFX lanes support dropped/imported regions.
- Every non-empty region has waveform peaks.
- Empty music/SFX lanes have an explicit empty affordance.
- Selecting a track customizes that track in the detail panel.
- Selecting a region customizes that region in the detail panel.

Music/SFX region controls:

- start offset
- source in/out or clip trim
- duration
- gain/volume
- loop
- fade in
- fade out
- delete
- duplicate where useful

Lane controls:

- gain
- mute
- solo
- collapse/expand
- color/role label where useful
- analysis status

Master controls:

- master gain
- limiter/export target summary
- preview/output duration

## Compare Mode

Compare mode is a two-lane specialization of the same lane model.

Core requirements:

- User chooses Compare A and Compare B from existing lanes/regions, or drops a
  second file to create a compare lane.
- Stacked mode shows two independently movable waveform lanes sharing the ruler
  and cursor.
- Overlay mode draws both waveforms over each other with distinct colors and
  opacity controls.
- Both lanes have independent offsets.
- Both lanes have independent in/out ranges.
- The overlap window is computed from the shifted offsets and ranges.
- Analysis is explicit and scoped to the selected overlap/range.

Compare controls:

- choose A
- choose B
- stacked/overlay switch
- A offset
- B offset
- nudge A/B earlier/later
- A in/out
- B in/out
- overlay opacity
- optional normalization toggle, off by default and clearly labeled
- analyze selected overlap

Compare drawing:

- Stacked mode uses two lane rows.
- Overlay mode draws both waveforms in the same timeline coordinates.
- Missing/non-overlap areas are visually indicated.
- The red cursor remains shared.
- A/B colors remain consistent between stacked and overlay modes.

Compare must not be implemented as a separate side-by-side control surface that
duplicates timing logic. It uses the shared lane state and renderer.

## Tune Mode

Tune applies to the selected lane/region by default. If master is selected,
Tune applies to the master bus.

The equalizer presentation should follow Narratu:

- spectrum analyzer at the top
- 9-band EQ sliders
- HPF and LPF controls
- A/B bypass
- Reset
- active preset badge
- category presets
- recommended preset when available
- comparison chart when before/after analysis exists

EQ bands:

- 60 Hz, Sub
- 120 Hz, Bass
- 250 Hz, Low-mid
- 500 Hz, Mid
- 1 kHz, Upper-mid
- 2 kHz, Presence
- 4 kHz, Sibilance
- 8 kHz, Air
- 12 kHz, Ultra-high

Preset categories should include practical file-viewer equivalents of Narratu's:

- Audiobook
- Speech
- Broadcast
- Utility
- Male
- Female
- Character only if there is real speaker metadata

Tune detail behavior:

- If a lane is selected, show lane EQ and processing.
- If a region is selected, show region gain/fade first and region tune controls
  where supported.
- If master is selected, show master bus EQ/dynamics/export preview controls.
- Bypass must be audible and visible without destroying the current settings.
- Presets are intent-first; raw parameters remain available but should not be
  the only entry point.

## QC Mode

QC is lane-aware and master-aware.

Default target:

- In Listen, QC defaults to the selected source lane/region.
- In Mix, QC defaults to the master mix unless a lane or region is explicitly
  selected.
- In Compare, QC can inspect A, B, or the selected overlap, but it should not
  silently compare different ranges.

QC checks should include:

- duration
- sample rate
- channel count
- RMS or loudness where available
- integrated LUFS where available
- sample peak
- estimated true peak where available
- noise floor
- head silence
- tail silence
- clipping risk
- export target compatibility

QC presentation:

- report-card rows with pass/warn/fail/unknown state
- measured value
- target value
- concise fix/action
- target selector such as ACX, podcast, source-preserving, custom
- clear indication of which lane/region/master was analyzed

QC should reuse the lane analysis cache where possible and run heavier analysis
only on explicit action.

## Export Mode

Export consumes the shared lane state.

Export targets:

- selected source/region
- selected lane
- compare A/B selected ranges where applicable
- full mix/master

Export requirements:

- source-preserving defaults where possible
- explicit ACX/podcast/custom presets
- provenance summary showing lane graph, trims, offsets, gain, fades, room
  tone, EQ, dynamics, and master bus
- explicit output duration
- explicit sample rate/channels/bitrate when transcoding
- lazy ffmpeg load only when export is requested
- deterministic room-tone generation for enabled gaps/beds

Auto-audiobook mixdown behavior to preserve:

- fill output with subtle pink noise bed when room tone is enabled
- place speech/source regions at their offsets
- apply in/out trims
- apply gain and fade envelopes
- mix music/SFX additively at region offsets
- apply music/SFX loop, gain, fade-in, and fade-out
- avoid hidden gain multipliers

Export mode should not maintain a parallel timing model. It serializes the lane
model.

## Visual Design Notes

The workspace should visually resemble the auto-audiobook mixer more than the
current file-viewer prototype.

Required presentation:

- compact bordered workbench
- toolbar attached to the workbench
- ruler directly below toolbar
- fixed or visually stable left lane label gutter
- canvas lanes with stable heights
- red cursor line through every visible lane
- selected regions with clear outline
- muted/trimmed regions de-emphasized
- role-specific colors for source, room tone, music, SFX, compare A, compare B
- contextual detail panel attached below the lane stack

Suggested lane heights:

- source/speech: about 80 px
- room tone/noise: about 28-36 px
- music: about 48-56 px
- SFX: about 48-56 px
- compare lanes: about 72-88 px each

Design constraints:

- Dense, utilitarian, work-focused layout.
- No marketing or hero treatment.
- No visible native audio player.
- Do not put unrelated cards inside cards.
- Avoid decorative backgrounds and large empty panels.
- Use icons for transport and zoom where practical.
- Text must fit on mobile and desktop.
- Controls should remain reachable with touch-sized hit targets.
- On mobile, the toolbar may wrap, but the timeline should remain horizontally
  pannable and pinch-zoomable.

## Rendering Module Requirements

The implementation should create a shared renderer rather than separate drawing
logic for Listen, Mix, and Compare.

Renderer responsibilities:

- draw ruler ticks and labels from zoom/scroll
- draw red cursor
- draw source waveform
- draw region blocks
- draw fade envelopes
- draw trim de-emphasis
- draw room-tone gaps/beds
- draw music/SFX waveform regions
- draw compare stacked lanes
- draw compare overlay lanes
- draw selection outlines
- hit-test cursor, body, trim handles, fade handles, and region edges

The renderer should accept viewport state and lane/region state. It should not
own product mode state.

## Playback Module Requirements

Playback should follow auto-audiobook's scheduling model:

- schedule all audible regions from `cursorMs`
- use AudioContext time as the playback clock
- update cursor with requestAnimationFrame
- apply region gain and lane gain
- apply fade-in and fade-out automation
- honor mute and solo
- support seek while playing by rescheduling
- stop cleanly and release sources

The one-lane Listen case should still use the same timeline/playback model. It
may share decode helpers with browser APIs internally, but there is no separate
native-player interaction path and no visible browser playback control.

## Testing Requirements

Smoke and unit coverage should prove the shared model, not preserve old
prototype selectors.

Default `sample.mp3` and `sample.wav` smoke coverage:

- no visible native audio player
- waveform-first lane is visible
- toolbar, ruler, and red cursor are visible
- cursor moves during playback
- click-to-seek changes cursor/time
- stop works
- zoom controls exist and change lane scale
- start/later-start control exists and updates state
- in/out controls exist and update state
- gain/volume control exists and updates state
- fade-in/fade-out controls exist and update state
- room-tone or pink-noise option is represented
- selecting the source lane/region opens contextual controls

Mix smoke coverage:

- clicking Mix expands the same workbench in place
- source lane remains
- room-tone/noise lane or compact semantic representation appears
- music lane appears
- SFX lane appears
- selecting a track updates the detail panel
- selecting a music/SFX region updates region controls
- no old arbitrary mixer surface is required by the test

Compare smoke coverage:

- Compare can choose or create two lanes
- stacked mode shows two waveform lanes
- overlay mode draws both waveforms over each other
- A/B offsets update state and drawing
- in/out ranges update state and overlap
- analyze selected overlap is explicit

Tune smoke coverage:

- selecting a lane and opening Tune shows Narratu-style EQ structure
- spectrum canvas exists
- 9 EQ bands exist with labels/frequencies
- HPF/LPF exist
- A/B bypass and Reset exist
- applying a preset updates state

QC/export smoke coverage:

- QC reports selected lane/region/master target
- export provenance reflects lane trims, offsets, gain, fades, room tone, and
  tune/master settings
- export mode does not use a parallel timing state

## Migration Plan

1. Treat this document as the alignment gate.
2. Create the shared audio lane model and pure timing utilities.
3. Create the shared ruler/lane rendering module.
4. Replace default Listen with the one-lane version of the shared workbench.
5. Rebuild Mix as in-place expansion of the same lane stack.
6. Rebuild Compare as the two-lane specialization with stacked and overlay
   drawing.
7. Rework Tune so the Narratu-style EQ applies to the selected lane/master.
8. Rework QC and Export so they consume the lane model.
9. Replace old prototype tests with shared lane model tests and focused smoke
   coverage.
10. Remove obsolete prototype UI only after the new shared surfaces cover the
    same workflows.

## Open Decisions For Review

- Should default Listen show a compact room-tone lane immediately, or only show
  room-tone as an overlay/control until Mix is opened?
- Should the source lane label be `Source`, `Primary`, `Speech`, or derived from
  media type?
- Should stop return to zero or to the last manual start cursor?
- Should Tune controls live in the bottom detail panel, a right drawer, or a
  mode-height panel below the lane stack?
- Should Compare A/B be lane-level by default, region-level by default, or allow
  both equally?
- What is the default zoom for a one-track file: fit entire file, or fixed px/s
  with horizontal scroll?
