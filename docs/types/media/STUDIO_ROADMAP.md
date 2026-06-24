# Media Studio — Tiered Feature Roadmap (Audio + Video)

> Status note: this roadmap is design history and still useful for intent, but
> some item statuses are stale. Use `STUDIO_TRACKER.md` as the active multi-day
> queue and update it as increments land.

Benchmarked, tier-assigned build checklist for the viewer's audio/video "media studio".
Each feature cluster below is hand-off-ready for a build agent. Companion doc:
[STUDIO_AUDIOBOOK_QC.md](./STUDIO_AUDIOBOOK_QC.md) (narratu / auto-audiobook gap detail).

Baseline source read for this roadmap: `renderer.js`, `editor.js`, `editor-advanced.js`,
`transcoder.js`, `waveform.js`, `spectrum.js`, `EDITOR.md`.

---

## 1. Executive summary + tier model

The media area must stay **CPU-lazy**: the common case is "user just wants to play the
mp3 / watch the clip" with **zero** processing overhead. So features are split across three
tiers, and **nothing above Tier 0 may run, allocate an `AudioContext`, or fetch a heavy lib
until the user explicitly opts in**.

### Scope: client-side only — `🔒 backend` features are DEFERRED (skip now)

This app is **100 % client-side / offline / static** — everything runs in the browser
(Web Audio, CSS filters, ffmpeg.wasm all execute locally). **We do NOT want a backend or a
second companion for server-side processing right now.** `narratu` (our porting source) was
built **server-first**, so treat its server-oriented architecture as inspiration only — the
*features* we ported (EQ / spectrum / LUFS) run fine client-side, but anything that strictly
needs a server or an impractical-to-vendor ML model is **out of scope for now**.

Such features are marked **`🔒 backend`** below. They are *not* deleted — they're fenced off
so the buildable-now set is crisp; we analyse / add them later if we choose. The fence is:
a feature is `🔒 backend` if it needs **(a)** a deep-learning model too large to vendor
under the zero-off-origin rule (ML de-noise, adaptive leveler, per-speaker voice AutoEQ),
**(b)** ASR/NLP (cut fillers/coughs, TTS), or **(c)** a persistent server process / account
(batch jobs, multi-user). Everything else — including the new **diff / compare view** — is
buildable client-side and stays in the active plan. Note also: **EQ presets are
low-priority** (a minor enhancement; the engine matters, the preset library doesn't).

| Tier | Name | When it runs | Overhead | Lib |
|------|------|--------------|----------|-----|
| **0** | **Plain playback** | always (default) | none beyond a native `<audio>/<video>` + blob URL | none |
| **1** | **Common / playback optimization** | one click, no panel | a single `AudioContext` graph or CSS `filter` string; no decode-to-buffer, no FFT unless a meter is shown | Web Audio / CSS only — **no vendored lib** |
| **2** | **Studio** | explicit "Open Studio" / "Enable ffmpeg" | full decode, FFT loops, multi-lane timeline, offline ffmpeg render | **ffmpeg.wasm (~23 MB, already vendored, heavy/opt-in)** + optional WAV/MP3 encoders |

### The common-vs-studio boundary (the split the user asked for)

The dividing question is **"does it cost the user a wait or a download?"**

- **Tier 1 = cheap & instant & non-destructive.** Real-time Web Audio nodes
  (`GainNode`, `BiquadFilterNode`) and CSS `filter` are effectively free, update with
  zero latency, and need no file decode or library. These should be **commonly offered**
  inline (a small toolbar), *before* anyone opens a studio: volume normalize, bass/treble
  or a simple EQ, loop, speed, a simple fade in/out, brightness/contrast/saturation.
  A user tuning playback should never see a 23 MB download or a "rendering…" spinner.
- **Tier 2 = heavy, destructive, or analytical.** Anything that (a) needs ffmpeg.wasm to
  *encode a new file*, (b) decodes the whole file into an `AudioBuffer`, (c) runs
  continuous FFT/analysis loops, or (d) manages multiple clips/lanes on a timeline. These
  are studio-only, opened on demand, and are allowed to be slow and download libs.

Rule of thumb for assigning a new feature: **if it can be done live with a Web Audio node
or a CSS filter and changes only playback (not a saved file), it is Tier 1. If it produces
a new file or needs sustained analysis, it is Tier 2.**

### What is already implemented (baseline for gap analysis)

- **Tier 0 (done):** native element streaming off a blob URL (no size ceiling), resume
  position, sleep timer w/ short fade, Media Session OS controls, playlist + ID3 enrich.
- **Tier 1 (partial):** per-track `GainNode` gain slider (0–200 %) persisted; video CSS
  filter panel. The just-built media-studio pass added the live EQ/HPF/LPF graph but wired
  it behind the Spectrum panel — see Tier-2 note.
- **Tier 2 (partial, just built in a separate worktree, not yet on `dev`):** shared
  WebAudio graph (single `MediaElementSource`), live FFT spectrum, **overlaid
  original-vs-processed dual-analyser spectrum + legend**, 9-band EQ, HPF/LPF,
  de-ess/broadcast/podcast presets, **LUFS readout + LUFS normalization** (apply makeup
  gain to −14/−16/−23 target, ±12 dB clamp — *FFT-RMS approximation, NOT full ITU-R
  BS.1770 K-weighting/gating*), **video studio** (extended CSS filters + audio-mixer EQ
  routing the `<video>` audio through the same graph).
- **Tier 2 ffmpeg ops (done):** trim, extract audio, mute, screenshot, downscale, volume,
  speed, convert WebM, loudness normalize (`loudnorm`), GIF/WebP export, thumbnail strip,
  remove metadata, embed subtitles, concat, replace audio.
- **NOT done (deferred):** **export of the processed/EQ'd audio** — needs an offline
  ffmpeg `-af` render of the live graph. This is the single biggest gap (see Build P1).

---

## 2. Feature checklist

Legend — **Dom**: A=audio, V=video, B=both. **Lib**: ✗ none / ⚑ ffmpeg.wasm / ⊕ small
encoder. **Cx**: S/M/L. **Status**: ✅ done · 🟡 in-progress/just-built · ⛔ missing ·
**🔒 backend** = needs a server / impractical-to-vendor ML model → **DEFERRED, skip now**
(see scope note in §1). Everything not marked 🔒 is buildable client-side.

### Tier 0 — Plain playback (default, zero overhead)

| Feature | Dom | Lib | Cx | Status | Approach |
|---|---|---|---|---|---|
| Native play/pause/seek/volume | B | ✗ | S | ✅ | native element controls |
| Stream big files off File handle (no memory ceiling) | B | ✗ | S | ✅ | blob URL, `preload=metadata` |
| Resume position | B | ✗ | S | ✅ | `persistence.js` |
| Sleep timer (+ short fade) | A | ✗ | S | ✅ | timer + gain ramp |
| Media Session OS/lock-screen controls | B | ✗ | S | ✅ | Media Session API |
| Playlist + ID3 title/artist | A | ✗ | M | ✅ | folder siblings + `id3.js` |
| Picture-in-picture | V | ✗ | S | ⛔ | `video.requestPictureInPicture()`, feature-gated |

### Tier 1 — Common / playback optimization (one click, no studio, no lib)

| Feature | Dom | Lib | Cx | Status | Approach |
|---|---|---|---|---|---|
| Per-track volume / gain (0–200 %) | A | ✗ | S | ✅ | `GainNode` slider, persisted |
| **Volume normalize (quick)** | A | ✗ | S | ⛔ | one-pass peak/RMS scan → set `GainNode`; *not* a re-encode (live only) |
| **Simple bass/treble (2-band) or 3-band tone** | A | ✗ | S | ⛔ | 2–3 `BiquadFilterNode` (lowshelf/highshelf [+peaking]); the cheap subset of the 9-band EQ, offered inline |
| **Simple fade in / fade out (playback)** | A | ✗ | S | ⛔ | `gain.linearRampToValueAtTime` at start/near-end; live, non-destructive |
| **Loop / region loop (A–B repeat)** | B | ✗ | S | ⛔ | set `loop`, or `timeupdate` seek-back between A/B markers |
| Speed presets (0.5–2×) | B | ✗ | S | ⛔ | `playbackRate` buttons (native already exposes a slider) |
| Brightness / contrast / saturation | V | ✗ | S | ✅ | CSS `filter` panel |
| **More CSS color filters (hue/blur/grayscale/invert)** | V | ✗ | S | 🟡 | extended CSS filter set (just-built video studio) |
| **Frame-step (±1 frame)** | V | ✗ | S | ⛔ | `currentTime += 1/fps` |
| **Keyboard shortcuts (space / arrows / f / p)** | B | ✗ | S | ⛔ | `keydown` on focused host |
| **Subtitle sidecar (.srt/.vtt) overlay** | V | ✗ | M | ⛔ | parse SRT → `<track>` or timed `<div>` (display only; burn-in is Tier 2) |
| Cover art (ID3 APIC) | A | ✗ | S | ⛔ | extend `id3.js` to return image bytes |
| Chapter markers (ID3 CHAP / WebVTT) display | B | ✗ | M | ⛔ | tick marks on scrub bar |
| **Live LUFS / level meter (toggle)** | A | ✗ | S | 🟡 | edge case: it *is* an FFT loop, so only when meter toggled on; cheap enough to offer inline |

> Note: the **live EQ + HPF/LPF graph already built** is Tier-1-grade tech (zero-latency
> Web Audio, no lib) but is currently only reachable inside the Tier-2 Spectrum panel. A
> small refactor (Build P0) should expose a **collapsed "tone" subset inline** while
> keeping the full 9-band + spectrum in the studio.

### Tier 2 — Studio (on demand only; heavy/analytical/destructive)

| Feature | Dom | Lib | Cx | Status | Approach |
|---|---|---|---|---|---|
| Single `MediaElementSource` shared graph | B | ✗ | M | 🟡 | one source per element, reused |
| Live FFT spectrum (log bars + grid) | A | ✗ | M | 🟡 | `AnalyserNode` 4096, RAF only when visible+playing |
| **Overlaid original-vs-processed spectrum + legend** | A | ✗ | M | 🟡 | dual analysers (pre/post EQ) |
| 9-band EQ + HPF/LPF + presets | A | ✗ | M | 🟡 | 9 `BiquadFilterNode` + shelves |
| Band-energy meter (8 named zones) | A | ✗ | S | 🟡 | grouped FFT bins |
| A/B EQ compare (store/recall + diff shading) | A | ✗ | M | 🟡 | snapshot gains, ramp switch |
| **Diff / compare view (original vs processed, A/B)** | B | ✗ | M | 🟡 | client-side; partly done via overlaid dual-analyser spectrum + A/B diff shading — extend to a full side-by-side/over-under compare (sync scrub, instant A/B toggle). A wanted net-new, NO backend |
| LUFS readout (approx) | A | ✗ | S | 🟡 | FFT-RMS − 0.691 (NOT BS.1770) |
| LUFS normalize live (makeup gain to target) | A | ✗ | S | 🟡 | set `GainNode` to hit −14/−16/−23, ±12 clamp |
| **Mastering-grade integrated LUFS (BS.1770 K-weighting + gating)** | A | ✗ | M | ⛔ | offline pass over decoded buffer; K-weight pre-filter + 400 ms blocks + −10 LU relative gate |
| Video extended filters + audio-mixer EQ | V | ✗ | M | 🟡 | CSS filters + route `<video>` audio through EQ graph |
| **Compressor / limiter** | A | ✗ | M | ⛔ | `DynamicsCompressorNode` (live) → Tier 2; bake via ffmpeg `acompressor`/`alimiter` |
| **Noise gate** | A | ✗ | M | ⛔ | live via gain follower, or ffmpeg `agate` on export |
| **De-noise (broadband / hum)** | A | ⚑ | L | ⛔ | ffmpeg `afftdn` / `anlmdn` / `highpass`; no real-time WebAudio denoiser without a vendored model |
| **Trim region from waveform drag** | B | ⚑ | M | ⛔ | drag-select on waveform → prefill ffmpeg trim |
| **Multi-track "swim lanes" mixer** | A | ⊕ | L | ⛔ | new `mixer.js`; lanes w/ gain/mute/solo/fade handles; mixdown via OfflineAudioContext → WAV |
| **Multi-clip video timeline (2-lane: video+music)** | V | ⚑ | L | ⛔ | `timeline.js`; mux via ffmpeg |
| **Test tones / pink noise generators** | A | ✗ | S | ⛔ | `OscillatorNode` / `AudioWorkletNode` |
| **Export processed audio (the deferred gap)** | A | ⚑ | M | ⛔ | render live graph to ffmpeg `-af` chain; see Build P1 |
| Export WAV (PCM) | A | ⊕ | S | ⛔ | hand-written 44-byte header in a Worker, no lib |
| Export MP3/OGG/AAC | A | ⚑ | S | ⛔ | ffmpeg `-c:a libmp3lame/libvorbis/aac` |
| Loudness-target normalize on export | A | ⚑ | S | 🟡 | ffmpeg `loudnorm=I=…:TP=…:LRA=…` |
| ffmpeg ops (trim/mute/downscale/speed/gif/webp/concat/…) | B | ⚑ | — | ✅ | `transcoder.js runOperation()` |

---

## 3. Fades & export (explicit)

### Fades

| Fade | Dom | Tier | Lib | Approach |
|---|---|---|---|---|
| **Audio fade in / out (playback)** | A | **1** | ✗ | `gain.linearRampToValueAtTime` on the shared `GainNode`; live, no file written |
| **Audio fade in / out (baked)** | A | **2** | ⚑ | ffmpeg `afade=t=in:st=0:d=N`, `afade=t=out:st=END-N:d=N` |
| **Audio crossfade (between two clips)** | A | **2** | ⊕/⚑ | needs ≥2 clips → mixer lane; live via two ramped gains, baked via ffmpeg `acrossfade=d=N` |
| **Video fade to / from black** | V | **2** | ⚑ | ffmpeg `fade=t=in:st=0:d=N` / `fade=t=out:st=…:d=N` (visual fade is editing → must encode) |
| **Video dissolve / crossfade (between two clips)** | V | **2** | ⚑ | ffmpeg `xfade=transition=fade:duration=N:offset=…` (also `fadeblack`, `dissolve`, `wipe*`) |
| CSS-only fade for *playback* (cosmetic) | V | 1 | ✗ | animate element `opacity` — cosmetic only, not saved |

Boundary: a **playback fade** (you hear/see it now, nothing saved) is Tier 1. A **baked
fade** (a new file) or **any cross-clip fade** (needs a second clip / timeline) is Tier 2.

### Export options (all Tier 2 — they write a new file via ffmpeg.wasm)

ffmpeg.wasm is **single-threaded** (`@ffmpeg/core-st`, no SAB/COOP-COEP) and already
vendored (~23 MB, heavy/opt-in). Realistic in-browser export matrix:

| Axis | Options we can offer |
|---|---|
| **Audio containers/codecs** | MP3 (`libmp3lame`), OGG/Vorbis (`libvorbis`), Opus (`libopus`), AAC/M4A (`aac`), FLAC, WAV (PCM — also doable without ffmpeg) |
| **Video containers/codecs** | MP4/H.264 (`libx264`, `-preset ultrafast`), WebM (`libvpx-vp9` + `libopus`), GIF, animated WebP |
| **Bitrate** | `-b:a` (e.g. 128/192/256/320k) ; `-q:a` VBR ; `-crf` for video |
| **Sample rate** | `-ar` (e.g. 44100 — **ACX requires 44.1 kHz**, 48000) |
| **Channels** | `-ac 1` (mono — **ACX requires mono**) / `-ac 2` |
| **Loudness-target on export** | `loudnorm=I=<LUFS>:TP=<truepeak>:LRA=<range>` — two-pass for accuracy; presets: Podcast −16, Audiobook/ACX −18…−20, Broadcast −23 |
| **Fades on export** | `afade` / `fade` / `acrossfade` / `xfade` (see above) |
| **Metadata** | strip (`-map_metadata -1`) or write title/artist/chapters |

**Export presets to ship (Tier 2):** "Podcast MP3 (−16 LUFS, 44.1k, 192k)",
"Audiobook MP3 (ACX: mono, 44.1k, 192k CBR, −20 LUFS, −3 dB TP)", "Web video (MP4 720p)",
"Small clip (WebM)". Presets are the UX that makes the export matrix usable.

---

## 4. Gap analysis vs narratu + auto-audiobook

### narratu (the porting source)

`narratu` is not a public product; it is the source repo our spectrum/EQ code was ported
from (`eq-engine.ts`, `eq-presets.ts`, `SpectrumAnalyzer.tsx`, `EqComparisonChart.tsx`,
`audio-analysis.ts`, `use-processed-segment-stages.ts`). Its analysis/EQ surface is an
audiobook-narration mastering UI. We have ported most of it. Remaining gaps:

| narratu feature | Have? | Note |
|---|---|---|
| 9-band EQ + HPF/LPF | 🟡 | ported (just-built) |
| Spectrum analyzer + log grid | 🟡 | ported |
| Band-energy zones | 🟡 | ported |
| **27 EQ presets** (audiobook/broadcast/male/female/utility categories) | ⛔ | **LOW priority** — only 8 of 27 ported; presets are a minor enhancement, the engine is what matters. Port more only when idle |
| EQ A/B comparison chart w/ diff shading | 🟡 | ported (store/recall A) |
| **4-stage compare: raw → base → EQ → master bus** | ⛔ | only raw→EQ ported; master-bus stage (post-comp/limiter) missing |
| LUFS readout | 🟡 | approx only |

### auto-audiobook / Auphonic-class processing (the functional benchmark)

Auphonic is the reference "auto" audiobook/podcast post-processor. Mapped to us:

| Auphonic / auto-audiobook feature | Have? | Tier if built | Note |
|---|---|---|---|
| Loudness normalization (LUFS/RMS, EBU R128/ACX) | 🟡 | 1 (live) / 2 (export) | live makeup-gain done; ACX RMS-target export missing |
| True-peak limiter (oversampled) | ⛔ | 2 | ffmpeg `alimiter`/`loudnorm TP`; live `DynamicsCompressorNode` approx — client-side ✓ |
| Adaptive leveler (speaker-to-speaker balance) | ⛔ | 2 | client-side approx via ffmpeg `dynaudnorm`; true ML leveler is 🔒 backend |
| Dynamic/static/classic **de-noise** + **de-hum** | ⛔ | 2 | client-side ✓ via ffmpeg `afftdn`/`anlmdn`/`highpass`; **deep-ML denoise = 🔒 backend** (no model vendorable) |
| High-pass filtering | 🟡 | 1 | HPF node exists — client-side ✓ |
| Voice AutoEQ (per-speaker spectral fit) | 🔒 | — | **🔒 backend** — needs per-speaker ML; manual EQ is our client-side analog |
| De-plosive / de-esser | 🟡 | 1/2 | de-ess preset exists; de-plosive missing — client-side ✓ |
| **Cut silence** | ⛔ | 2 | ffmpeg `silenceremove` — client-side ✓; **high value for audiobooks** |
| Cut fillers / coughs | 🔒 | — | **🔒 backend** — needs ML/ASR (no off-origin, no model vendorable) |
| **Chapterization / per-chapter files + room tone** | ⛔ | 2 | ACX wants head/tail room tone + per-chapter MP3 — see QC doc |
| **ACX QC report (RMS / peak / noise-floor pass-fail)** | ⛔ | 2 | measurable in-browser; big differentiator — see QC doc |

> **🔒 backend (deferred, skip now):** TTS / manuscript→audio generation, cut fillers/coughs
> (ASR), per-speaker voice AutoEQ, and deep-ML de-noise — all need a model too large to
> vendor or a server. Everything else in these tables is client-side-buildable. Revisit the
> 🔒 set later only if we decide to add a backend (we currently do **not** want one).

Full ACX spec, QC metrics, and the audiobook-specific build packages are in
[STUDIO_AUDIOBOOK_QC.md](./STUDIO_AUDIOBOOK_QC.md).

### Standard DAW / NLE gaps (general benchmark)

- **DAW missing:** compressor, limiter, noise gate, de-noise, crossfade, multitrack mixer,
  test-tone/noise gen, baked fades. (Normalize/EQ/HPF/trim/speed we have.)
- **NLE missing:** visual trim handles on a thumbnail strip, fade-to-black, dissolve/xfade
  transitions, speed ramp (variable), crop/rotate, LUTs, audio ducking, frame-step,
  subtitle burn-in UI, export presets. (Basic cut/trim/downscale/mute/concat/replace-audio
  we have via ffmpeg.)

---

## 5. Build-task breakdown (hand-off packages)

Ordered by leverage. Each = one future subagent task. Files are under
`docs/types/media/`. Keep every file ≤500 LOC (soft 300); new concerns → new modules.

**P0 — Expose Tier-1 "tone" inline (refactor, no new tech).** *Tier 1.*
Lift a collapsed 2–3-band tone + volume-normalize + simple fade + loop strip out of the
Spectrum panel into an always-available inline toolbar; keep the full 9-band/spectrum in
the studio. Files: `renderer.js`, small new `tone-inline.js`, reuse `spectrum.js` engine.
Lib: none. **Why first:** delivers the user's "common before studio" ask with code we
already have.

**P1 — Export the processed/EQ'd audio (the deferred gap).** *Tier 2.* ⚑
Serialize the live graph (9 EQ gains + HPF + LPF + normalize target + fades) into an
ffmpeg `-af` chain (`equalizer=…`, `highpass`, `lowpass`, `loudnorm`, `afade`) and render
offline; output via the export matrix (§3). Files: `transcoder.js` (new `bakeAudio` op),
`spectrum.js` (export current settings), `editor.js` (export UI). Lib: ffmpeg.wasm.
**Why:** closes the single biggest known gap; makes the whole studio non-throwaway.

**P2 — Export presets + container/bitrate/sr/channels/loudness UI.** *Tier 2.* ⚑
The §3 matrix as a small preset picker (Podcast/ACX/Web-video/Clip) + advanced overrides.
Files: `editor.js`, `editor-advanced.js`, `transcoder.js`. Lib: ffmpeg.wasm.

**P3 — Fades & transitions (baked).** *Tier 2.* ⚑
`afade`/`fade` in/out ops + `acrossfade`/`xfade` once 2 clips exist (depends on P5/P6).
Single-clip fades land first (no timeline needed). Files: `transcoder.js`,
`editor-advanced.js`.

**P4 — Dynamics: compressor / limiter / gate (+ de-noise).** *Tier 2.* ⚑/✗
Live `DynamicsCompressorNode` preview; bake via ffmpeg `acompressor`/`alimiter`/`agate`/
`afftdn`. Files: new `dynamics.js`, `transcoder.js`. Lib: ffmpeg.wasm for bake.

**P5 — Multi-track audio mixer ("swim lanes").** *Tier 2.* ⊕/⚑  L
New `mixer.js`: lanes (main/generated/effects), per-lane gain/mute/solo, draggable
fade/region handles, zoom via Ctrl+scroll, test-tone/pink-noise generators. Mixdown via
`OfflineAudioContext` → WAV (no lib) or ffmpeg for MP3. Reuse `waveform.js` draw +
`connectGain`. Files: new `mixer.js`, `waveform.js`. **Largest package — split into
mixer-UI + mixer-engine sub-modules to stay under LOC cap.**

**P6 — Video timeline (2-lane) + transitions + visual trim.** *Tier 2.* ⚑  L
New `timeline.js`: video lane + music lane, thumbnail-strip trim handles, drag music in →
ffmpeg mux, fade-to-black + xfade dissolve. Files: new `timeline.js`, `transcoder.js`.

**P7 — Tier-1 video/UX quick wins.** *Tier 0/1.* ✗
PiP, frame-step, speed presets, keyboard shortcuts, SRT/VTT sidecar overlay, ID3 cover
art, chapter-marker display. Cheap, no lib, high polish. Files: `renderer.js`,
small `subtitles.js`, `id3.js`.

**P8 — Mastering-grade LUFS + audiobook QC + ACX export.** *Tier 2.* ⚑
Real BS.1770 K-weighting + gating over the decoded buffer; silence-cut (`silenceremove`);
chapterization + room-tone; **ACX QC pass/fail report**. Full detail and sub-tasks in
[STUDIO_AUDIOBOOK_QC.md](./STUDIO_AUDIOBOOK_QC.md). Files: new `loudness.js`, `qc.js`,
`transcoder.js`.

### Suggested order
P0 → P1 → P2 → P3 → P7 (quick wins in parallel) → P4 → P5 → P6 → P8.
P0–P3 make the *existing* studio shippable & exportable; P4–P8 add depth.

### Constraints every package must honor
- **Zero off-origin at runtime** — no new CDN; any new lib must be vendored into
  `docs/vendor/` and (if heavy) flagged opt-in. Most packages need **no new lib** (Web
  Audio / CSS) or reuse the already-vendored ffmpeg.wasm; only WAV/MP3 encode is "new" and
  is hand-writable / covered by ffmpeg.
- **CPU-lazy** — no `AudioContext`, FFT loop, decode, or ffmpeg load until opt-in. RAF
  loops run only when a panel is visible AND playing (existing `spectrum.js` policy).
- **Author modular, ship bundled** — detectors stay in the build-time bundle; renderers &
  studio modules stay lazy (`import()` on demand). See `CLAUDE.md`.

---

## 6. Sources

- Auphonic — Singletrack post-production algorithms (leveler, loudness, true-peak limiter,
  denoisers, AutoEQ, de-plosive, cut silence/fillers/coughs): <https://auphonic.com/help/algorithms/singletrack.html>
- Auphonic — RMS loudness normalization for Audible/ACX: <https://auphonic.com/blog/2026/01/15/rms-loudness-normalization-for-audible-acx/>
- ACX technical requirements (−23…−18 RMS, −3 dB peak, −60 dB noise floor, 44.1 kHz mono, 192 k CBR, room tone): <https://tomevox.com/blog-acx-requirements>, <https://chapterpass.com/blog/acx-audio-requirements>, <https://www.trevorohare.com/blog/understanding-the-acx-submission-requirements-for-audio>
- Audiobook mastering RMS/LUFS/noise-floor guide: <https://narrationbox.com/blog/audiobook-mastering-rms-lufs-noise-floor-acx-guide>
- Standard DAW dynamics (compressor/limiter/expander/gate): <https://www.izotope.com/en/learn/audio-dynamics-101-compressors-limiters-expanders-and-gates.html>
- Fades & crossfades (Ardour manual): <https://manual.ardour.org/editing-and-arranging/create-region-fades-and-crossfades/>
- Adobe Audition clip volume / fade / crossfade & multitrack: <https://helpx.adobe.com/audition/using/clip-volume-matching-fading-mixing.html>
- Video NLE feature/transition glossary (cut/fade/dissolve/crossfade/crop): <https://riverside.com/video-editor/video-editing-glossary>, <https://en.wikipedia.org/wiki/Video_editing_software>
- narratu: internal porting source (not public) — surfaced via `EDITOR.md` and ported into `spectrum.js`.
