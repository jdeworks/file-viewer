# Audiobook QC & Mastering — narratu / auto-audiobook deep dive

Companion to [STUDIO_ROADMAP.md](./STUDIO_ROADMAP.md). Detail for the audiobook-specific
gaps (Build package **P8**) and the loudness/QC standards we benchmark against. All work
here is **Tier 2** (studio, on-demand, ffmpeg.wasm where a file is written).

---

## 1. Why audiobooks are a distinct target

The viewer already opens `.m4b`/`.mp3` audiobooks (Tier 0 playback, resume, chapters,
sleep timer). The *processing* opportunity is that audiobook delivery has a **hard,
machine-checkable spec (ACX)** that almost no free in-browser tool reports on — so an
"ACX QC report + one-click compliant export" is a real differentiator and is fully doable
offline with FFT + ffmpeg.wasm.

---

## 2. The ACX spec (the benchmark to measure against)

| Metric | Requirement | How we measure / produce it |
|---|---|---|
| **RMS loudness** | each file **−23 dB to −18 dB RMS** | RMS over decoded buffer (offline pass) |
| **Peak** | **≤ −3 dBFS** (true-peak ideally) | sample peak from buffer; true-peak via oversample/ffmpeg `loudnorm` TP |
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
| `EqComparisonChart.tsx` (A/B + diff shading) | ✅ partial | only store/recall A; full overlaid diff-shaded chart richer in source |
| `eq-presets.ts` (**27 presets**, categorized) | ⛔ | only **8** ported (Flat/Broadcast/Warmth/De-ess M/De-ess F/Bass-cut/Air/Podcast) — port the rest (male/female voice variants, utility) |
| `use-processed-segment-stages.ts` (**raw → base → EQ → master-bus** 4-stage compare) | ⛔ | only raw→EQ; master-bus stage = post-compressor/limiter, depends on P4 dynamics |

**Action:** port the full 27-preset library and the 4-stage comparison once dynamics (P4)
exist so the "master bus" stage is real.

---

## 4. auto-audiobook (Auphonic-class) feature mapping

| Auphonic algorithm | Our plan | Tier | Lib | Note |
|---|---|---|---|---|
| Loudness normalization (LUFS/RMS, R128) | live makeup-gain ✅ + ffmpeg `loudnorm` export ⛔ | 1/2 | ⚑ | add ACX **RMS-target** export (`-af` two-pass) |
| True-peak limiter (4× oversample) | ffmpeg `loudnorm:TP=-3` / `alimiter` | 2 | ⚑ | also live `DynamicsCompressorNode` preview |
| Adaptive leveler | ffmpeg `dynaudnorm` (approx) | 2 | ⚑ | full per-speaker leveling out of scope |
| Dynamic / static / classic denoise | ffmpeg `afftdn` / `anlmdn` | 2 | ⚑ | no ML denoiser (would need a vendored model) |
| De-hum | ffmpeg `highpass`/`anequalizer` notch | 2 | ⚑ | 50/60 Hz notch presets |
| High-pass filtering | HPF node ✅ (live) + ffmpeg `highpass` (bake) | 1/2 | ✗/⚑ | done live |
| Voice AutoEQ | manual 9-band EQ (our analog) | 2 | ✗ | auto spectral-fit out of scope |
| De-esser / de-plosive | de-ess preset ✅; de-plosive ⛔ | 1/2 | ✗/⚑ | de-plosive ≈ short HPF burst on plosive frames |
| **Cut silence** | ffmpeg `silenceremove` | 2 | ⚑ | trims dead air between phrases — high audiobook value |
| Cut fillers / coughs | **out of scope** | — | — | needs ASR/ML + off-origin |
| Cut music intros/outros | manual trim (have) | 2 | ⚑ | auto-detect out of scope |

---

## 5. The differentiator: in-browser ACX QC report

A read-only analysis pass (no ffmpeg, no file written → could even be **Tier 1** as a
"QC" toggle, but the full true-peak + chapter scan is Tier 2):

1. `decodeAudioData` the file (or stream-decode in chunks for very long books).
2. Compute: integrated RMS, sample/true peak, noise-floor (RMS of the quietest sustained
   window), head/tail silence durations, channel count, sample rate, duration.
3. Render a **pass/fail card** per ACX metric (green/amber/red), with the offending number
   and a one-line fix ("noise floor −52 dB — apply de-noise / re-record quieter room").
4. Offer **"Make ACX-compliant"** = one ffmpeg invocation: `-ac 1 -ar 44100
   -c:a libmp3lame -b:a 192k -af loudnorm=I=-20:TP=-3:LRA=11,silenceremove=…` + head/tail
   room-tone pad. Optionally per-chapter split from chapter markers.

This is uniquely valuable because the **noise-floor check is the #1 ACX rejection reason**
and most authors can't see it until ACX rejects them.

---

## 6. P8 sub-tasks (hand-off)

All under `docs/types/media/`. New modules to respect the LOC cap:

- **P8a — `loudness.js`: mastering-grade integrated LUFS.** BS.1770 K-weighting pre-filter
  (two biquads: high-shelf +4 dB @ ~1.5 kHz + high-pass ~38 Hz) → 400 ms gated blocks →
  −10 LU relative gate → integrated LUFS. Offline over decoded buffer. Lib: none.
- **P8b — `qc.js`: ACX QC analyzer + report card.** RMS / peak / noise-floor / silence /
  format checks → pass/fail UI. Lib: none (read-only). Could surface as a Tier-1 toggle.
- **P8c — Silence cut + room tone (`transcoder.js` ops).** ffmpeg `silenceremove` +
  head/tail pad with a synthesized or sampled room-tone segment. Lib: ffmpeg.wasm.
- **P8d — Chapterized export.** Split by chapter markers (ID3 CHAP / sidecar) into
  per-chapter MP3s, ACX-formatted, zipped (fflate or hand-rolled). Lib: ffmpeg.wasm (+ zip).
- **P8e — ACX one-click compliant export preset.** Wires P8a–d into a single "Export for
  ACX" button using the §5 ffmpeg chain. Lib: ffmpeg.wasm.
- **P8f — Port narratu's full 27-preset library + 4-stage compare** (depends on P4
  dynamics for the master-bus stage). File: `spectrum.js` presets (or split presets into
  `eq-presets.js`). Lib: none.

Order: P8b (QC report, cheap, high-impact, read-only) → P8a (real LUFS) → P8c → P8e → P8d
→ P8f.

---

## 7. Sources

- ACX requirements (RMS −23…−18, peak −3, noise floor −60, 44.1 k mono 192 k CBR, room tone):
  <https://tomevox.com/blog-acx-requirements> · <https://chapterpass.com/blog/acx-audio-requirements> · <https://www.trevorohare.com/blog/understanding-the-acx-submission-requirements-for-audio>
- Audiobook mastering RMS/LUFS/noise-floor guide: <https://narrationbox.com/blog/audiobook-mastering-rms-lufs-noise-floor-acx-guide>
- Auphonic algorithms (denoise, leveler, true-peak limiter, AutoEQ, de-plosive, cut silence/fillers/coughs): <https://auphonic.com/help/algorithms/singletrack.html>
- Auphonic RMS normalization for ACX: <https://auphonic.com/blog/2026/01/15/rms-loudness-normalization-for-audible-acx/>
- ITU-R BS.1770 loudness (K-weighting + gating) — implemented per the standard; see EBU R128 / BS.1770 references.
