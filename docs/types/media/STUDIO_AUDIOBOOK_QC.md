# Audiobook QC & Mastering — narratu / auto-audiobook deep dive

Reference detail for the audiobook-specific loudness/QC standards used by the media studio.
Implementation status and unfinished work are tracked only in [TASKS.md](../../../TASKS.md).

---

## 1. Why audiobooks are a distinct target

The viewer opens `.m4b`/`.mp3` audiobooks and provides local ACX-oriented QC, chapter editing,
and per-chapter export. The checks are intentionally described as preflight guidance: a browser
meter and encoder cannot replace listening review, ACX's own analysis, or production-wide checks.

---

## 2. The ACX spec (the benchmark to measure against)

| Metric | Requirement | How we measure / produce it |
|---|---|---|
| **RMS loudness** | each file **−23 dB to −18 dB RMS** | RMS over decoded buffer (offline pass) |
| **Peak** | **≤ −3 dBFS sample peak** | sample peak; a separately labelled 4× true-peak estimate is guidance only |
| **Noise floor** | **≤ −60 dBFS** in silent sections | find quietest sustained window; RMS of it. *Most common ACX rejection.* |
| **Sample rate** | **44.1 kHz** | ffmpeg `-ar 44100` |
| **Channels** | **all mono or all stereo across the production** | single-file channel check; cross-file consistency remains a production review |
| **Codec** | **MP3, 192 kbps or higher, CBR** | bounded scan of real MP3 frames; export uses `-c:a libmp3lame -b:a 192k` |
| **Edge spacing** | **no more than 5 s; 1–5 s room tone recommended at both ends** | amplitude-based quiet-spacing estimate plus an explicit listening caveat |
| **Per-chapter files** | one file per chapter | chapterized export |

ACX states loudness in **RMS**, not LUFS. The studio reports LUFS separately as mastering
guidance and does not let that row change the ACX verdict.

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
| Loudness normalization (LUFS/RMS, R128) | live makeup-gain ✅ + ffmpeg `loudnorm` export ✅ | 1/2 | ⚑ | output is re-measured because a LUFS target cannot guarantee the RMS requirement |
| True-peak limiter (4× oversample) | ffmpeg `loudnorm:TP=-3` / `alimiter` | 2 | ⚑ | also live `DynamicsCompressorNode` preview |
| Adaptive leveler | ffmpeg `dynaudnorm` (approx) | 2 | ⚑ | full per-speaker leveling out of scope |
| Dynamic / static / classic denoise | ffmpeg `afftdn` / `anlmdn` | 2 | ⚑ | still needed; no ML denoiser without backend/model work |
| De-hum | ffmpeg `highpass`/`anequalizer` notch | 2 | ⚑ | 50/60 Hz notch presets |
| High-pass filtering | HPF node ✅ (live) + ffmpeg `highpass` (bake) | 1/2 | ✗/⚑ | done live |
| Voice AutoEQ | manual 9-band EQ (our analog) | 2 | ✗ | auto spectral-fit out of scope |
| De-esser / de-plosive | de-ess preset ✅; de-plosive ⛔ | 1/2 | ✗/⚑ | de-plosive ≈ short HPF burst on plosive frames |
| **Cut silence** | explicit ffmpeg `silenceremove` helper | 2 | ⚑ | not enabled by the ACX preset; automatic trimming can discard real room tone or pauses |
| Cut fillers / coughs | **out of scope** | — | — | needs ASR/ML + off-origin |
| Cut music intros/outros | manual trim (have) | 2 | ⚑ | auto-detect out of scope |

---

## 5. The differentiator: in-browser ACX QC report

The QC/report workflow is implemented as follows:

1. `decodeAudioData` the file (or stream-decode in chunks for very long books).
2. Compute: integrated RMS, sample/true peak, noise-floor (RMS of the quietest sustained
   window), head/tail silence durations, channel count, sample rate, duration.
3. Render a **pass/fail card** per ACX metric (green/amber/red), with the offending number
   and a one-line fix ("noise floor −52 dB — apply de-noise / re-record quieter room").
4. Offer/export **ACX-targeted chapter files** using `-ac 1 -ar 44100 -c:a libmp3lame
   -b:a 192k -af loudnorm=I=-20:TP=-3:LRA=11`, split from edited chapter markers.
5. Preserve existing edge spacing. The app never labels synthesized digital silence as room tone;
   authors must listen to and retain clean room tone in the source.
6. Re-run the checks on the actual encoded MP3 and describe the result as measured preflight,
   not guaranteed acceptance.

The cataloged `acx-qc-reference.mp3` fixture proves the meter against real 44.1 kHz,
192 kbps CBR MP3 bytes. `sample.wav` separately proves that a valid working master is not an
ACX upload file.

---

## 6. Implementation Status

The bounded single-file QC, encoding inspection, chapter editing/sidecar download, targeted
export, and post-export recheck are implemented. Future work belongs in
[TASKS.md](../../../TASKS.md), not in this reference.

---

## 7. Sources

- Official ACX audio submission requirements (current encoding, level, noise, and spacing rules):
  <https://help.acx.com/s/article/what-are-the-acx-audio-submission-requirements>
- Official ACX mastering guide (mono/stereo consistency, per-chapter structure, RMS/peak/noise):
  <https://www.acx.com/mp/blog/mastering-audiobooks-with-alex-the-audio-scientist>
- Official ACX spacing update (maximum five seconds at either edge):
  <https://www.acx.com/mp/blog/turn-up-the-feedback-acx-audio-analysis-now-checks-spacing>
- Auphonic algorithms (denoise, leveler, true-peak limiter, AutoEQ, de-plosive, cut silence/fillers/coughs): <https://auphonic.com/help/algorithms/singletrack.html>
- Auphonic RMS normalization for ACX: <https://auphonic.com/blog/2026/01/15/rms-loudness-normalization-for-audible-acx/>
- ITU-R BS.1770 loudness (K-weighting + gating) — use as the reference for any future
  mastering-grade integrated LUFS pass.
