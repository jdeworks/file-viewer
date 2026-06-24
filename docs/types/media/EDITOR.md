# Editor Roadmap — Audio & Video

> Status note: this is now a historical/editor design document. The active
> work tracker is `STUDIO_TRACKER.md`.

---

## Audio

### Current state

- Native `<audio>` element with browser controls (play/pause, seek bar, volume, speed).
- Waveform canvas (waveform.js): renders first ~60 s of the file, click-to-seek via `currentTime`, animated playhead via RAF loop, toggleable panel.
- Web Audio `GainNode` connected per element; per-track gain slider (0–200 %) persisted to `localStorage`.
- Playlist mode when a folder contains multiple PLAYABLE files: prev/next, shuffle, click-to-play track list, ID3 tag enrichment (title + artist from first 256 KB head slice).
- Sleep timer with fade-out (5/15/30/45/60 min options).
- Media Session API: OS/lock-screen metadata and seek-backward/seek-forward handlers.
- Resume-position persistence via `persistence.js`.
- ffmpeg.wasm editor panel (opt-in, ~23 MB on first load) with: Trim, Extract Audio, Mute Video, Screenshot, Downscale, Volume, Speed, Convert WebM, Loudness Normalize, GIF Export, WebP Export, Thumbnail Strip, Remove Metadata, Embed Subtitles, Concatenate, Replace Audio.
- **Audio studio (shipped 2026-06-21)** — `spectrum-panel.js` + `spectrum-draw.js` + shared
  `audio-graph.js` (single `MediaElementSource` per element): live FFT spectrum, **overlaid
  original-vs-processed dual-analyser** view + legend, 9-band EQ + HPF/LPF, de-ess/broadcast/podcast
  presets, **LUFS readout + LUFS normalization** (makeup gain to −14/−16/−23, ±12 dB clamp). CPU-lazy
  (RAF only while playing + panel open). The forward plan for this area now lives in
  [STUDIO_ROADMAP.md](./STUDIO_ROADMAP.md) (tiered, client-side-scoped); the bullets below are the
  pre-studio roadmap — items already covered by the studio are marked ✅ SHIPPED.

### Viewer enhancements (no write-back needed)

- **Full waveform** — decode and render the entire file, not just the first 60 s. Use an OffscreenCanvas + Worker to decode in background without blocking UI. — M
- **Waveform zoom** — Ctrl+scroll or pinch to zoom the waveform canvas horizontally; the playhead stays centred. Map to the same `zoom` / `scrollLeft` pattern used in auto-audiobook's `AudioMixerView`. — M
- **Drag-select region** — mousedown + mousedrag on the waveform draws a highlighted region (start/end markers); displayed as start/end timestamps below the canvas. Used as the trim range for the ffmpeg Trim op without reopening the editor panel. — M
- ✅ SHIPPED — **Spectrum / frequency view** — toggle between waveform and real-time FFT spectrum. Implementation: `AnalyserNode` (fftSize=4096, smoothingTimeConstant=0.75), 80 log bars mapped 20Hz–20kHz (`freq = 20 * Math.pow(1000, i/80)`), color per bar `hsl(200-(i/80)*200, 65%, 25+norm*30%)`, frequency grid lines at 60/120/250/500/1k/2k/4k/8k/12kHz labeled in monospace. EQ curve overlay in `#4a9eff88` drawn from BiquadFilter math (low/highshelf + peaking approximations — no actual AudioNode needed for the curve). **CPU-conscious**: RAF loop starts only when the "Spectrum" tab is active and the audio element is playing; `cancelAnimationFrame` on tab hide / pause. Narratu source: `SpectrumAnalyzer.tsx` (1:1 portable to vanilla JS + Canvas). No lib needed. — S
- ✅ SHIPPED — **Live LUFS meter** — floating loudness number updated every 250ms during playback. Simplified formula: `rmsDb - 0.691` (K-weighting approximation sufficient for display). Show integrated LUFS over the full track in the info bar after the `decodeAudioData` decode. Color-code: green ≤ -14 LUFS, yellow -14 to -6, red above -6 (too loud). Only activate when the spectrum tab is selected. — S
- ✅ SHIPPED — **Band energy bands** — below the FFT canvas, show 8 labelled bars (Sub-bass 20-80Hz, Bass 80-250Hz, Low-mid 250-500Hz, Mid 500-2kHz, Presence 2-4kHz, Sibilance 4-6kHz, Brilliance 6-10kHz, Air 10-20kHz) computed from the same AnalyserNode frequencyData. Useful as a quick "is this file sibilant / bassy" diagnostic. Narratu reference: `audio-analysis.ts` `BandEnergy` interface and `analyzeAudio()`. — S
- **ID3 cover art** — extract embedded APIC frame from the ID3 tag and show it alongside the track name; already have `id3.js` for tag parsing, extend to return image bytes. — S
- **Chapter markers** — read ID3v2 CHAP/CTOC frames (podcasts, audiobooks) and render vertical tick marks on the waveform with chapter names on hover. — M
- **Speed presets** — add 0.75×/1.0×/1.25×/1.5×/2.0× buttons that set `audio.playbackRate`; complement the existing browser control. — S

### In-browser editing (download-on-save)

- **Multi-track mixer** — a new `mixer.js` module, ES module, no framework. Three lanes: Main (loaded file), Generated, Effects. Each lane: waveform strip rendered on `<canvas>`, gain slider, mute/solo buttons, fade-in/fade-out handles dragged at region edges. Playback via Web Audio: one `MediaElementSource` or `AudioBufferSourceNode` per lane routed through a shared `GainNode` → `AudioContext.destination`. Inspired directly by auto-audiobook's `AudioMixerView` + `MixerTrack` (canvas-draw loop, cursor, region drag, zoom via Ctrl+scroll). — L
- **Pink noise + test tones** — generated tracks in the mixer: `AudioContext.createOscillator()` (sine 440 Hz, 1 kHz), pink noise via `ScriptProcessorNode` or `AudioWorkletNode`; rendered as flat waveform strip. — S — Web Audio only, no lib
- **Trim** — already exists in the ffmpeg editor panel. The drag-select region (above) should pre-fill start/end timestamps. — S (integration only)
- **Fade in / Fade out** — ffmpeg `-af afade` wrapper; surfaced as duration sliders, added to the editor panel alongside Volume. — S — ffmpeg.wasm
- **Loudness normalize** — already exists (`normalize` op in editor-advanced.js). Surface a target LUFS input (default -16 LUFS for podcasts) passed as `-af loudnorm=I=<val>`. — S
- ✅ SHIPPED (live EQ; "bake to file" export still pending — see STUDIO_ROADMAP P1) — **9-band EQ with presets** — port directly from Narratu's `eq-engine.ts`. Signal chain: Source → HPF → 9×BiquadFilterNode → LPF → AnalyserNode → Destination. Bands: 60Hz (lowshelf), 120, 250, 500, 1k, 2k, 4k, 8k, 12kHz (highshelf), each ±15dB gain slider. HPF slider 20–200Hz (rolls off rumble); LPF slider 8k–20kHz (rolls off hiss). EQ presets from Narratu `eq-presets.ts`: 27 presets in categories (audiobook, broadcast, male/female voice, utility). Key utility presets: **De-esser** (cut 4kHz band by -4dB, 8kHz by -2dB), **Bass rolloff** (HPF=100Hz), **Warmth** (boost 120Hz +2dB, cut 2kHz -1dB). Live EQ is zero-latency (BiquadFilterNode parameters update immediately). **Bake to file**: export EQ'd audio via ffmpeg `-af equalizer=f=4000:width_type=o:width=2:g=-4,...` — one ffmpeg op per active band. — M (porting from Narratu)
- ✅ SHIPPED (overlaid original-vs-processed + legend; narratu's 4-stage raw→base→EQ→master-bus compare still pending) — **A/B comparison mode** — "A" slot stores a snapshot of EQ settings (9 gains + HPF + LPF). "B" slot is live. Toggle A/B in real time via `linearRampToValueAtTime` (50ms ramp). Overlay: both A and B spectrum curves drawn in different colors on the same canvas (A=`#4a9eff`, B=`#ff7043`). Difference shading between curves (green where B > A, red where B < A) makes processing effects visible. Also show side-by-side band energy bars for A vs B. Narratu source: `EqComparisonChart.tsx` and `use-processed-segment-stages.ts` (4-stage comparison: raw → base → EQ → master bus — port the raw→EQ comparison for before/after). Band zones for coloring bars: Sub-bass `#e07050`, Bass `#ff9800`, Low-mid `#ffc107`, Mid `#8bc34a`, Presence `#00bcd4`, Brilliance `#2196f3`, Air `#9c27b0`. — M
- **Export WAV** — encode decoded `AudioBuffer` to PCM WAV in a Worker using a hand-written WAV header (44-byte PCM header + raw float→int16 samples); no lib needed. — S
- **Export MP3 / OGG** — encode via ffmpeg.wasm: ffmpeg `-i input.wav -b:a 192k output.mp3`; already have the ffmpeg infrastructure in `transcoder.js`. — S (infrastructure already exists)
- **Region loop** — click a region in the mixer, toggle loop; Web Audio schedules repeated `AudioBufferSourceNode` with `.loop = true`. — S

### Full write-back editing (companion required)

- **Save mixed project** — write back a `.json` session file (lane descriptors, region offsets, gain, fades) alongside the audio files; requires the Tauri + Axum companion for disk writes.
- **Overwrite with mixed-down export** — replace the source file on disk with the mixed WAV/MP3 output; companion required to avoid blob-download friction.
- **Moving tracks between lanes** — drag a region from one mixer lane to another; drag-drop already handled in auto-audiobook's `MixerTrack` mousedown/mousemove logic; port to the vanilla-JS mixer. Session file persists layout.
- **Overlapping region detection** — when two regions on the same lane overlap, highlight in red and auto-duck or block drop; companion not strictly required but overlap state needs to survive navigation.

### Shared toolbar / modular note

The mixer panel should be a separate `mixer.js` ES module lazy-imported from `renderer.js` behind the same `enableFfmpeg` guard (or a new `enableMixer` flag). Keep `waveform.js` as the single-file preview and `mixer.js` as the multi-lane editor to avoid inflating the fast path. The `connectGain` helper in `waveform.js` is already reusable for per-lane gain routing. Auto-audiobook's zoom/scroll pattern (`msToPixels`, `scrollLeft`, Ctrl+scroll wheel handler) should be translated verbatim to vanilla JS.

---

## Video

### Current state

- Native `<video>` element with browser controls.
- Seek ±10 s buttons.
- Fullscreen button (calls `requestFullscreen()` on the container element).
- **Video studio (shipped 2026-06-21, `video-studio.js`)** — extended CSS filters (brightness,
  contrast, saturation, hue, blur, grayscale, invert) on the `<video>` element, plus an **audio
  mixer** that routes the video's audio through the SAME shared EQ graph (`audio-graph.js`) so the
  movie's audio gets the 9-band EQ / HPF-LPF / LUFS + overlaid spectrum (movie mixing = audio mixing).
- ffmpeg.wasm editor panel (same opt-in as audio) with: Trim, Mute, Screenshot, Downscale, Speed, Convert WebM, GIF Export, WebP Export, Thumbnail Strip, Remove Metadata, Embed Subtitles, Concatenate, Replace Audio.
- Resume-position persistence.
- Sleep timer (shared with audio).

### Viewer enhancements (no write-back needed)

- **Frame-step buttons** — step one frame forward/back: `video.currentTime += 1 / fps`; estimate fps from `getVideoPlaybackQuality()` or default 30. Add Prev Frame / Next Frame buttons to the existing `media-video-controls` row. — S
- **Picture-in-picture** — button calls `video.requestPictureInPicture()`; guard with `document.pictureInPictureEnabled` feature check; show only when supported. — S — browser PiP API, no lib
- **Speed control presets** — 0.5×/0.75×/1×/1.25×/1.5×/2× buttons setting `video.playbackRate`; surface in `media-video-controls` alongside seek buttons. — S
- **Timeline with chapter markers** — horizontal scrub bar below the video (replacing or augmenting the browser seekbar) with `<video>` `textTracks` chapter cues rendered as tick marks; also parse WebVTT chapter files if a `.vtt` sidecar is present in the folder. — M
- **Subtitle overlay** — load `.srt` file (dragged or from folder sidecar): parse with a small hand-written SRT parser (~30 lines), create a `<track kind="subtitles">` element and add as `<track>` child, or render as an absolutely-positioned `<div>` overlay timed to `timeupdate`. No lib needed for basic SRT. — M
- **Keyboard shortcuts** — Space: play/pause, Left/Right: ±5 s, `[`/`]`: ±frame, `f`: fullscreen, `p`: PiP. Attach `keydown` on the host div when focused. — S

### In-browser editing (download-on-save)

- **Trim video clip** — already in the ffmpeg editor panel. Add a dual-handle range UI on a thumbnail strip so the user can drag trim points visually (thumbnail strip is also already available as the "Thumbnail Strip" op). Wires start/end into the existing `trim` ffmpeg op. — M — ffmpeg.wasm (already present)
- **Add music / audio track** — multi-lane: video lane 0, audio/music lane 1. User drags an audio file onto lane 1; ffmpeg muxes: `ffmpeg -i video -i audio -c:v copy -shortest output.mp4`. Surface as a simplified two-lane timeline below the video (canvas-drawn, no full mixer needed). — M — ffmpeg.wasm
- **Subtitle burn-in** — embed `.srt` as hardcoded subtitles via `ffmpeg -vf subtitles=file.srt`; ffmpeg.wasm supports the `subtitles` filter when the `.srt` is registered as a virtual FS file. — M — ffmpeg.wasm
- **Video trim + audio replace** — already individually available; chain them: trim first, then replace audio in one ffmpeg invocation (`-i trimmed -i audio -map 0:v -map 1:a -shortest`). Expose as a combined "Trim + Replace Audio" preset in the editor panel. — S (ffmpeg args only)
- **Mute segments** — specify multiple time ranges to silence (`-af volume=enable='between(t,s,e)':volume=0`); UI: click-drag on a simple audio waveform strip below the video (reuse `waveform.js`). — M — ffmpeg.wasm + waveform.js
- **Downscale presets** — already exists (`downscale` op). Add labelled preset buttons (720p, 480p, 360p) that populate the resolution input. — S
- **Screenshot sequence** — extract N evenly-spaced frames as a ZIP of PNGs; ffmpeg `-vf fps=1/interval`; package into a blob ZIP (fflate or hand-rolled for a small set). — M — ffmpeg.wasm + fflate

### Full write-back editing (companion required)

- **Multi-lane video editor session** — persist a `.json` project (video clip path, music region, subtitle file path, trim range, filters) so the user can reopen and continue; requires companion for disk I/O.
- **Overwrite source file** — save the ffmpeg-processed file back to the original path on disk; companion required (blob download is the current fallback).
- **Chapter edit** — write a new MP4 chapter atom or WebVTT `.vtt` sidecar based on markers the user placed on the timeline; companion writes the sidecar file alongside the video.

### Shared toolbar / modular note

The video lane, audio/music lane, and subtitle lane share a lightweight timeline canvas (`timeline.js`) that is simpler than the full audio mixer — it only needs two lanes at most. Reuse `waveform.js`'s `drawWaveform` + `connectGain` for the audio lane. The ffmpeg.wasm infrastructure in `transcoder.js` already handles all mux/encode operations; new video editing features are primarily new ffmpeg argument sets passed to the existing `runOperation()` call, not new infrastructure.
