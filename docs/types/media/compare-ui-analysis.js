import {
  classifyShiftedSections,
  overlapSourceRanges,
  formatCompareSeconds,
  sampleVideoTimes,
  diffVideoFrames,
} from './compare-math.js';
import {
  AUDIO_COMPARE_MAX_RANGE_SECONDS,
  AUDIO_COMPARE_MAX_BYTES,
  VIDEO_COMPARE_MAX_BYTES,
  VIDEO_COMPARE_MAX_FRAMES,
  VIDEO_COMPARE_MAX_RANGE_SECONDS,
  mediaSourceFromIntake,
} from './compare-ui-constants.js';
import {
  canDecodeByBrowser,
  decodeFile,
  toAudioAnalysisFromBuffers,
  readSelectedWavRange,
  sampleVideoFrames,
  loadVideoMetadata,
  toAudioAnalysisFromRange,
} from './compare-ui-media.js';

export function getAudioCompareResult(state) {
  return classifyShiftedSections({
    a: { offset: state.lanes.A.offset, range: { start: state.lanes.A.in, end: state.lanes.A.out } },
    b: { offset: state.lanes.B.offset, range: { start: state.lanes.B.in, end: state.lanes.B.out } },
    durationA: state.durationA,
    durationB: state.durationB,
  });
}

export function clearVideoAnalysis(state, kind, analysisStatus) {
  if (kind !== 'video' || !state.analysis) return;
  state.analysis = null;
  analysisStatus.textContent = 'Selection changed; analyze shifted overlap video again.';
}

export function clearAudioRangeAnalysis(state, kind, analysisStatus) {
  if (kind !== 'audio' || state.analysis?.source !== 'wav-range') return;
  state.analysis = null;
  analysisStatus.textContent = 'Selection changed; analyze shifted overlap WAV range again.';
}

export async function analyzeSelectedAudio({
  state,
  kind,
  intake,
  enableFfmpeg,
  analysisStatus,
  analyzeButton,
  render,
}) {
  if (kind !== 'audio') return;
  const rangeA = state.lanes.A.out - state.lanes.A.in;
  const current = getAudioCompareResult(state);
  const overlapRanges = overlapSourceRanges(current);
  const hasSecond = !!state.files.B;
  const selected = hasSecond ? overlapRanges.overlap.duration : rangeA;
  if (!hasSecond && selected > AUDIO_COMPARE_MAX_RANGE_SECONDS) {
    analysisStatus.textContent = `Selected range is ${formatCompareSeconds(selected)}; choose ${formatCompareSeconds(AUDIO_COMPARE_MAX_RANGE_SECONDS)} or less.`;
    state.analysis = null;
    render();
    return;
  }
  if (hasSecond && !overlapRanges.hasOverlap) {
    state.analysis = null;
    analysisStatus.textContent = 'No shifted overlap to analyze; adjust offsets or ranges.';
    render();
    return;
  }
  if (hasSecond && overlapRanges.overlap.duration > AUDIO_COMPARE_MAX_RANGE_SECONDS) {
    state.analysis = null;
    analysisStatus.textContent = `Shifted overlap is ${formatCompareSeconds(overlapRanges.overlap.duration)}; choose ${formatCompareSeconds(AUDIO_COMPARE_MAX_RANGE_SECONDS)} or less.`;
    render();
    return;
  }

  analyzeButton.disabled = true;
  analysisStatus.textContent = 'Analyzing shifted overlap audio on demand...';
  const fileA = state.files.A || mediaSourceFromIntake(intake);
  if (!fileA) {
    analysisStatus.textContent = 'Open-file bytes are unavailable for audio analysis.';
    analyzeButton.disabled = false;
    return;
  }

  try {
    const sourceRangeA = overlapRanges.a;
    const sourceRangeB = overlapRanges.b;
    const sampleRangeA = hasSecond ? sourceRangeA : current.a.source;
    const fileB = state.files.B;

    const attemptA = readSelectedWavRange(fileA, sampleRangeA, 'Lane A shifted-overlap WAV range');
    const attemptB = hasSecond
      ? readSelectedWavRange(fileB, sourceRangeB, 'Lane B shifted-overlap WAV range')
      : Promise.resolve(null);
    const directReads = await Promise.allSettled([attemptA, attemptB]);

    let wavA = directReads[0]?.status === 'fulfilled' ? directReads[0].value : null;
    let wavB = hasSecond && directReads[1]?.status === 'fulfilled' ? directReads[1].value : null;
    const canUseDirectWavRange = !!wavA && (!hasSecond || !!wavB);
    let usedFfmpegExtract = false;

    const directWasIncomplete = hasSecond && !canUseDirectWavRange;
    if (!canUseDirectWavRange && hasSecond && enableFfmpeg) {
      const ffModule = await import('./compare-ffmpeg.js');
      const {
        extractAudioRangeToWav: extractAudioRangeToWavFromModule,
        AUDIO_COMPARE_MAX_EXTRACT_BYTES,
        formatMb,
      } = ffModule;
      const extractA = wavA ? Promise.resolve(wavA) : extractAudioRangeToWavFromModule(fileA, sourceRangeA, 'Lane A');
      const extractB = wavB ? Promise.resolve(wavB) : (hasSecond && fileB
        ? extractAudioRangeToWavFromModule(fileB, sourceRangeB, 'Lane B')
        : Promise.resolve(null));
      try {
        const extracted = await Promise.all([extractA, extractB]);
        wavA = wavA || (await readSelectedWavRange(
          extracted[0],
          { start: 0, end: Number.MAX_VALUE },
          'Lane A ffmpeg extracted WAV range',
          AUDIO_COMPARE_MAX_EXTRACT_BYTES,
        ));
        wavB = wavB || (hasSecond
          ? await readSelectedWavRange(
            extracted[1],
            { start: 0, end: Number.MAX_VALUE },
            'Lane B ffmpeg extracted WAV range',
            AUDIO_COMPARE_MAX_EXTRACT_BYTES,
          )
          : null);
        usedFfmpegExtract = directWasIncomplete && (wavA && (!hasSecond || wavB));
      } catch (err) {
        if (!canDecodeByBrowser(fileA) || !canDecodeByBrowser(fileB)) {
          const reason = (err && err.message) || '';
          const hint = 'Compressed audio needs ffmpeg extraction and is not analyzable under compare caps. '
            + `ffmpeg extract cap is ${formatMb(AUDIO_COMPARE_MAX_EXTRACT_BYTES)} and browser decode cap is ${formatMb(AUDIO_COMPARE_MAX_BYTES)}.`;
          throw new Error(reason ? `${reason} ${hint}` : hint);
        }
        const [bufferA, bufferB] = await Promise.all([decodeFile(fileA), decodeFile(fileB)]);
        state.durationA = bufferA.duration || state.durationA;
        state.lanes.A.out = Math.min(state.lanes.A.out, state.durationA);
        if (bufferB) {
          state.durationB = bufferB.duration || state.durationB;
          state.lanes.B.out = Math.min(state.lanes.B.out, state.durationB);
        }
        state.analysis = toAudioAnalysisFromBuffers(bufferA, bufferB);
        analysisStatus.textContent = hasSecond
          ? 'Analyzed shifted overlap audio range (browser decode).'
          : 'Analyzed A shifted-overlap audio range (browser decode). Add a second audio file.';
        return;
      }
    }

    if (wavA && (!hasSecond || wavB)) {
      state.durationA = wavA.duration || state.durationA;
      state.lanes.A.out = Math.min(state.lanes.A.out, state.durationA);
      if (hasSecond && wavB) {
        state.durationB = wavB.duration || state.durationB;
        state.lanes.B.out = Math.min(state.lanes.B.out, state.durationB);
      }
      const overlapForAnalysis = {
        hasOverlap: hasSecond ? overlapRanges.hasOverlap : true,
        overlap: hasSecond ? overlapRanges.overlap : current.a.source,
        a: hasSecond ? overlapRanges.a : current.a.source,
        b: hasSecond ? overlapRanges.b : { start: 0, end: 0 },
      };
      state.analysis = toAudioAnalysisFromRange(
        wavA,
        wavB,
        overlapForAnalysis,
      );
      analysisStatus.textContent = hasSecond
        ? (usedFfmpegExtract
          ? 'Analyzed shifted overlap audio range (ffmpeg extract).'
          : 'Analyzed shifted overlap WAV range.')
        : 'Analyzed A shifted-overlap WAV range. Add a second audio file.';
    } else {
      const [bufferA, bufferB] = await Promise.all([
        decodeFile(fileA),
        hasSecond ? decodeFile(state.files.B) : Promise.resolve(null),
      ]);
      state.durationA = bufferA.duration || state.durationA;
      state.lanes.A.out = Math.min(state.lanes.A.out, state.durationA);
      if (bufferB) {
        state.durationB = bufferB.duration || state.durationB;
        state.lanes.B.out = Math.min(state.lanes.B.out, state.durationB);
      }
      state.analysis = toAudioAnalysisFromBuffers(bufferA, bufferB);
      analysisStatus.textContent = hasSecond
        ? 'Analyzed shifted overlap audio range (browser decode).'
        : 'Analyzed A shifted-overlap audio range (browser decode). Add a second audio file.';
    }
    if (!state.analysis.hasB && hasSecond) {
      analysisStatus.textContent = state.analysis.source === 'wav-range'
        ? 'Analyzed shifted overlap WAV range. Add a second audio file.'
        : 'Analyzed shifted-overlap audio range (browser decode). Add a second audio file.';
    }
  } catch (err) {
    state.analysis = null;
    analysisStatus.textContent = err?.message || 'Audio decode failed; compare controls remain available.';
  } finally {
    analyzeButton.disabled = false;
    render();
  }
}

export async function analyzeSelectedVideo({
  state,
  kind,
  intake,
  analysisStatus,
  analyzeButton,
  render,
}) {
  if (kind !== 'video') return;
  const fileA = state.files.A || mediaSourceFromIntake(intake);
  const fileB = state.files.B;
  if (!fileA) {
    analysisStatus.textContent = 'Open-file bytes are unavailable for video analysis.';
    return;
  }
  if (!fileB) {
    analysisStatus.textContent = 'Choose a second video file before analysis.';
    return;
  }
  if (fileA.size > VIDEO_COMPARE_MAX_BYTES || fileB.size > VIDEO_COMPARE_MAX_BYTES) {
    analysisStatus.textContent = `Video compare is capped at ${(VIDEO_COMPARE_MAX_BYTES / 1048576).toFixed(0)} MB per file.`;
    state.analysis = null;
    render();
    return;
  }

  analyzeButton.disabled = true;
  analysisStatus.textContent = 'Decoding shifted overlap video frames on demand...';
  try {
    const [durationA, durationB] = await Promise.all([loadVideoMetadata(fileA), loadVideoMetadata(fileB)]);
    if (durationA > 0) {
      state.durationA = durationA;
      state.lanes.A.out = Math.min(state.lanes.A.out, state.durationA);
    }
    if (durationB > 0) {
      state.durationB = durationB;
      state.lanes.B.out = Math.min(state.lanes.B.out, state.durationB);
    }
    const result = classifyShiftedSections({
      a: { offset: state.lanes.A.offset, range: { start: state.lanes.A.in, end: state.lanes.A.out } },
      b: { offset: state.lanes.B.offset, range: { start: state.lanes.B.in, end: state.lanes.B.out } },
      durationA: state.durationA,
      durationB: state.durationB,
    });
    const overlapRanges = overlapSourceRanges(result);
    if (!overlapRanges.hasOverlap) {
      state.analysis = null;
      analysisStatus.textContent = 'No shifted overlap to sample; adjust offsets or ranges.';
      render();
      return;
    }
    if (overlapRanges.overlap.duration > VIDEO_COMPARE_MAX_RANGE_SECONDS) {
      state.analysis = null;
      analysisStatus.textContent = `Shifted overlap is ${formatCompareSeconds(overlapRanges.overlap.duration)}; choose ${formatCompareSeconds(VIDEO_COMPARE_MAX_RANGE_SECONDS)} or less.`;
      render();
      return;
    }
    const compareTimesA = sampleVideoTimes(overlapRanges.a, VIDEO_COMPARE_MAX_FRAMES);
    const compareTimesB = sampleVideoTimes(overlapRanges.b, VIDEO_COMPARE_MAX_FRAMES);
    const [framesA, framesB] = await Promise.all([
      sampleVideoFrames(fileA, compareTimesA),
      sampleVideoFrames(fileB, compareTimesB),
    ]);
    const diff = diffVideoFrames(framesA, framesB);
    state.analysis = { kind: 'video', framesA, framesB, diff, compareTimes: compareTimesA, overlapRanges };
    analysisStatus.textContent = `Analyzed ${diff.frames} shifted-overlap video frame${diff.frames === 1 ? '' : 's'}.`;
  } catch (err) {
    state.analysis = null;
    analysisStatus.textContent = err?.message || 'Video decode failed; compare controls remain available.';
  } finally {
    analyzeButton.disabled = false;
    render();
  }
}
