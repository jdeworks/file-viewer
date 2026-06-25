# Audiobook QC & Mastering — narratu / auto-audiobook deep dive

Companion to [STUDIO_ROADMAP.md](./STUDIO_ROADMAP.md). Detail for the audiobook-specific
loudness/QC standards we benchmark against.

Status note: the first ACX QC/export workflow has shipped in the media studio and is
tracked in `STUDIO_TRACKER.md`. This file now describes the remaining mastering-grade
depth: true-peak/oversampled peak, stronger denoise/de-hum/de-plosive tools, chapterized
exports, and richer Narratu-style compare polish.

---

## 1. Why audiobooks are a distinct target

The viewer already opens `.m4b`/`.mp3` audiobooks and now has ACX-oriented QC/export
surfaces. The remaining opportunity is making that workflow mastering-grade: chapter-aware,
clear about sample peak versus true peak, and strong enough to guide authors from diagnosis
to final per-chapter files without leaving the offline browser app.

---

## 2. The ACX spec (the benchmark to measure against)

| Metric | Requirement | How we measure / produce it |
|---|---|---|
| **RMS loudness** | each file **−23 dB to −18 dB RMS** | RMS over decoded buffer (offline pass) |
| **Peak** | **≤ −3 dBFS** (true-peak ideally) | sample peak shipped; true-peak still needs oversample/ffmpeg-backed pass |
| **Noise floor** | **≤ −60 dBFS** in silent sections | find quietest sustained window; RMS of it. *Most common ACX rejection.* |
| **Sample rate** | **44.1 kHz** | ffmpeg `-ar 44100` |
| **Channels** | **mono** | ffmpeg `-ac 1` |
| **Codec** | **MP3 192 kbps CBR** | ffmpeg `-c:a libmp3lame -b:a 192k` |
| **Head silence** | **0.5–1 s room tone** | pad/trim head |
| **Tail silence** | **1–5 s room tone** | pad/trim tail |
| **Per-chapter files** | one file per chapter | chapterized export |

(ACX states loudness in **RMS**; LUFS targets people quote — Podcast −16 LUFS, ACX ≈ −20
LUFS — are the perceptual analog. Report both.)

---

## 3. narratu surface vs ours (porting completeness)

`narratu` is the (non-public) repo our analysis/EQ UI was ported from. Mapped to current
`spectrum.js`:

| narratu module | Ported? | Gap |
|---|---|---|
| `eq-engine.ts` (9-band + HPF/LPF chain) | ✅ | — |
| `SpectrumAnalyzer.tsx` (log bars + grid) | ✅ | — |
| `audio-analysis.ts` `BandEnergy` (8 zones) | ✅ | — |
| `EqComparisonChart.tsx` (A/B + diff shading) | ✅ partial | store/recall and overlaid original-vs-processed views exist; full staged compare is still richer in source |
| `eq-presets.ts` (categorized speech/mastering presets) | ✅ partial | generic speech/mastering presets have been expanded; only port more when they improve the intent-first surface |
| `use-processed-segment-stages.ts` (**raw → base → EQ → master-bus** 4-stage compare) | ⛔ | only simpler compare exists; richer stage compare belongs after the mastering chain is complete |

**Action:** do not blindly port every preset. Finish the mastering chain first, then add
only generic presets and compare stages that make the export result easier to understand.

---

## 4. auto-audiobook (Auphonic-class) feature mapping

| Auphonic algorithm | Our plan | Tier | Lib | Note |
|---|---|---|---|---|
| Loudness normalization (LUFS/RMS, R128) | live makeup-gain ✅ + ffmpeg `loudnorm` export ✅ partial | 1/2 | ⚑ | improve true-peak/two-pass clarity where practical |
| True-peak limiter (4× oversample) | ffmpeg `loudnorm:TP=-3` / `alimiter` | 2 | ⚑ | also live `DynamicsCompressorNode` preview |
| Adaptive leveler | ffmpeg `dynaudnorm` (approx) | 2 | ⚑ | full per-speaker leveling out of scope |
| Dynamic / static / classic denoise | ffmpeg `afftdn` / `anlmdn` | 2 | ⚑ | still needed; no ML denoiser without backend/model work |
| De-hum | ffmpeg `highpass`/`anequalizer` notch | 2 | ⚑ | 50/60 Hz notch presets |
| High-pass filtering | HPF node ✅ (live) + ffmpeg `highpass` (bake) | 1/2 | ✗/⚑ | done live |
| Voice AutoEQ | manual 9-band EQ (our analog) | 2 | ✗ | auto spectral-fit out of scope |
| De-esser / de-plosive | de-ess preset ✅; de-plosive ⛔ | 1/2 | ✗/⚑ | de-plosive ≈ short HPF burst on plosive frames |
| **Cut silence** | ffmpeg `silenceremove` | 2 | ⚑ | ACX chain uses silence trimming; deeper chapter/phrase tooling remains |
| Cut fillers / coughs | **out of scope** | — | — | needs ASR/ML + off-origin |
| Cut music intros/outros | manual trim (have) | 2 | ⚑ | auto-detect out of scope |

---

## 5. The differentiator: in-browser ACX QC report

The first QC report exists. The remaining differentiator is a deeper chapter-aware report:

1. `decodeAudioData` the file (or stream-decode in chunks for very long books).
2. Compute: integrated RMS, sample/true peak, noise-floor (RMS of the quietest sustained
   window), head/tail silence durations, channel count, sample rate, duration.
3. Render a **pass/fail card** per ACX metric (green/amber/red), with the offending number
   and a one-line fix ("noise floor −52 dB — apply de-noise / re-record quieter room").
4. Offer/export **ACX-compliant chapter files** = ffmpeg invocations: `-ac 1 -ar 44100
   -c:a libmp3lame -b:a 192k -af loudnorm=I=-20:TP=-3:LRA=11,silenceremove=…` + head/tail
   room-tone pad, split from chapter markers when available.

This is uniquely valuable because the **noise-floor check is the #1 ACX rejection reason**
and most authors can't see it until ACX rejects them.

---

## 6. Remaining Sub-Tasks

All under `docs/types/media/`. New modules to respect the LOC cap:

- **Q1 — true-peak / mastering-grade peak clarity.** Keep sample peak visible, but add an
  oversampled or ffmpeg-backed true-peak path before claiming true peak.
- **Q2 — denoise / de-hum / de-plosive presets.** Use ffmpeg filters and clear copy; keep
  ML denoise out of scope.
- **Q3 — chapterized export.** Split by chapter markers (ID3 CHAP / sidecar) into
  per-chapter MP3s, ACX-formatted, zipped (fflate or hand-rolled). Lib: ffmpeg.wasm (+ zip).
- **Q4 — staged compare.** Raw -> tuned -> dynamics -> master bus, once the chain is real.

Order: Q1 -> Q2 -> Q3 -> Q4.

---

## 7. Sources

- ACX requirements (RMS −23…−18, peak −3, noise floor −60, 44.1 k mono 192 k CBR, room tone):
  <https://tomevox.com/blog-acx-requirements> · <https://chapterpass.com/blog/acx-audio-requirements> · <https://www.trevorohare.com/blog/understanding-the-acx-submission-requirements-for-audio>
- Audiobook mastering RMS/LUFS/noise-floor guide: <https://narrationbox.com/blog/audiobook-mastering-rms-lufs-noise-floor-acx-guide>
- Auphonic algorithms (denoise, leveler, true-peak limiter, AutoEQ, de-plosive, cut silence/fillers/coughs): <https://auphonic.com/help/algorithms/singletrack.html>
- Auphonic RMS normalization for ACX: <https://auphonic.com/blog/2026/01/15/rms-loudness-normalization-for-audible-acx/>
- ITU-R BS.1770 loudness (K-weighting + gating) — use as the reference for any future
  mastering-grade integrated LUFS pass.
