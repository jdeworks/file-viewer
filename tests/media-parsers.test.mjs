import assert from 'node:assert/strict';

import { parseSubtitles, parseTimestamp } from '../docs/types/media/subtitles.js';
import { parseId3 } from '../docs/types/media/id3.js';
import {
  findChapterSidecars,
  chapterFilename,
  normalizeChapters,
  parseChapterSidecar,
  parseFfmetadataChapters,
  parseTextChapterLines,
  parseWebVttChapters,
} from '../docs/types/media/chapters.js';
import { buildAcxChapterExportArgs, buildAcxExportArgs, buildAcxFilterChain, buildAudioFilterChain, buildMasteringCleanupFilter } from '../docs/types/media/audio-filters.js';
import { analyzeMetrics, estimatedTruePeak, evaluateAcx, samplePeak } from '../docs/types/media/qc.js';
import {
  presetById,
  describeParams,
  resolveExportAudioSettings,
  resolveExportParams,
} from '../docs/types/media/export-presets.js';
import {
  applyLaneOffset,
  clampRange,
  classifyShiftedSections,
  computeOverlapWindow,
  describeShiftedComparison,
  diffAudioSummaries,
  diffVideoFrames,
  sampleVideoTimes,
  summarizeAudioWindow,
} from '../docs/types/media/compare-math.js';
import {
  parsePcmWavHeader,
  readPcmWavFirstChannelRange,
} from '../docs/types/media/compare-audio.js';
import { buildMuxMusicArgs, buildVideoExportFilterChain } from '../docs/types/media/video-filters.js';
import {
  classifyFfmpegError,
  cancelFfmpeg,
  formatFfmpegError,
  buildSubtitleBurnArgs,
  __getFfmpegInstanceForTest,
  __setFfmpegInstanceForTest,
} from '../docs/types/media/transcoder.js';
import { PRESETS } from '../docs/types/media/spectrum-draw.js';

const enc = new TextEncoder();

function le16(n) {
  return [n & 255, (n >>> 8) & 255];
}

function le32(n) {
  return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
}

function makePcm16Wav({ sampleRate = 4, channels = 2, frames = [] } = {}) {
  const blockAlign = channels * 2;
  const dataBytes = frames.length * blockAlign;
  const bytes = [
    ...enc.encode('RIFF'),
    ...le32(36 + dataBytes),
    ...enc.encode('WAVE'),
    ...enc.encode('fmt '),
    ...le32(16),
    ...le16(1),
    ...le16(channels),
    ...le32(sampleRate),
    ...le32(sampleRate * blockAlign),
    ...le16(blockAlign),
    ...le16(16),
    ...enc.encode('data'),
    ...le32(dataBytes),
  ];
  for (const frame of frames) {
    for (let ch = 0; ch < channels; ch++) {
      const sample = Math.max(-32768, Math.min(32767, frame[ch] || 0));
      bytes.push(sample & 255, (sample >> 8) & 255);
    }
  }
  return new Blob([new Uint8Array(bytes)], { type: 'audio/wav' });
}

{
  assert.deepEqual(clampRange({ start: -4, end: 12 }, 10), { start: 0, end: 10 }, 'compare math: clampRange bounds to duration');
  assert.deepEqual(clampRange({ start: 8, end: 3 }, 10), { start: 8, end: 8 }, 'compare math: clampRange prevents inverted ranges');
  assert.deepEqual(applyLaneOffset({ start: 2, end: 5 }, -1.5), { start: 0.5, end: 3.5 }, 'compare math: applyLaneOffset shifts both range ends');
  assert.deepEqual(computeOverlapWindow({ start: 0, end: 4 }, { start: 3, end: 8 }), { start: 3, end: 4, duration: 1 }, 'compare math: overlap window intersects shifted ranges');

  const shifted = classifyShiftedSections({
    a: { offset: 0, range: { start: 0, end: 10 } },
    b: { offset: 3, range: { start: 0, end: 6 } },
    durationA: 10,
    durationB: 8,
  });
  assert.equal(shifted.hasShift, true, 'compare math: detects shifted lanes');
  assert.equal(shifted.overlap.duration, 6, 'compare math: shifted overlap duration');
  assert.deepEqual(
    shifted.sections.map((s) => `${s.lane}:${s.kind}:${s.start}-${s.end}`),
    ['A:missing-in-b:0-3', 'A:overlap:3-9', 'A:missing-in-b:9-10', 'B:overlap:3-9'],
    'compare math: classifies overlap and missing sections for UI copy',
  );
  assert.match(describeShiftedComparison(shifted), /B is shifted \+3\.00s/, 'compare math: copy reports signed shift');
  assert.match(describeShiftedComparison(shifted), /Overlap 6\.0s/, 'compare math: copy reports overlap duration');

  const disjoint = classifyShiftedSections({
    a: { offset: 0, range: { start: 0, end: 2 } },
    b: { offset: 5, range: { start: 0, end: 2 } },
    durationA: 2,
    durationB: 2,
  });
  assert.equal(disjoint.hasOverlap, false, 'compare math: disjoint ranges report no overlap');
  assert.equal(disjoint.sections.length, 2, 'compare math: disjoint ranges become two missing sections');

  const samples = Float32Array.from([0, 0.5, -1, 0.25, 0, -0.25, 0.75, -0.5]);
  const summary = summarizeAudioWindow(samples, 4, { start: 0, end: 2 }, 4);
  assert.equal(summary.columns, 4, 'compare math: audio summary returns requested columns');
  assert.deepEqual(
    [...summary.peaks].map((n) => Number(n.toFixed(3))),
    [0.5, 1, 0.25, 0.75],
    'compare math: audio summary stores per-column peaks',
  );
  assert.equal(Number(summary.peak.toFixed(3)), 1, 'compare math: audio summary tracks lane peak');

  const softer = summarizeAudioWindow(Float32Array.from(samples, (n) => n * 0.5), 4, { start: 0, end: 2 }, 4);
  const rawDiff = diffAudioSummaries(summary, softer, { normalize: false });
  const normDiff = diffAudioSummaries(summary, softer, { normalize: true });
  assert(rawDiff.averageEnergy > 0.05, 'compare math: raw audio diff reports amplitude differences');
  assert(normDiff.averageEnergy < rawDiff.averageEnergy, 'compare math: explicit normalize reduces pure level difference');

  assert.deepEqual(
    sampleVideoTimes({ start: 2, end: 3 }, 8).map((n) => Number(n.toFixed(3))),
    [2.167, 2.5, 2.833],
    'compare math: video sample times are deterministic midpoints',
  );
  assert.equal(sampleVideoTimes({ start: 0, end: 10 }, 4).length, 4, 'compare math: video samples respect cap');

  const black = new Uint8ClampedArray(2 * 1 * 4);
  black.set([0, 0, 0, 255, 0, 0, 0, 255]);
  const changed = new Uint8ClampedArray(2 * 1 * 4);
  changed.set([255, 255, 255, 255, 0, 0, 0, 255]);
  const videoDiff = diffVideoFrames(
    [{ data: black, width: 2, height: 1 }],
    [{ data: changed, width: 2, height: 1 }],
    { highPixelThreshold: 0.5, highFrameThreshold: 0.2, highColumnThreshold: 0.5 },
  );
  assert.equal(videoDiff.frames, 1, 'compare math: video diff counts paired frames');
  assert.equal(Number(videoDiff.averageDifference.toFixed(3)), 0.5, 'compare math: video diff averages RGB deltas');
  assert.equal(videoDiff.highFrames, 1, 'compare math: video diff reports high-diff frames');
  assert.equal(videoDiff.highPixels, 1, 'compare math: video diff reports high-diff pixels');
  assert.equal(videoDiff.highColumns, 1, 'compare math: video diff reports high-diff columns');
}

{
  const wav = makePcm16Wav({
    sampleRate: 4,
    frames: [
      [0, 32000],
      [8192, 31000],
      [-16384, 30000],
      [32767, 29000],
      [-32768, 28000],
      [4096, 27000],
    ],
  });
  const header = await parsePcmWavHeader(wav);
  assert.equal(header?.sampleRate, 4, 'compare audio: parses PCM WAV sample rate from header');
  assert.equal(header?.channels, 2, 'compare audio: parses PCM WAV channel count');
  assert.equal(header?.bitsPerSample, 16, 'compare audio: supports 16-bit PCM');
  assert.equal(header?.frameCount, 6, 'compare audio: computes frame count from data chunk');

  const selected = await readPcmWavFirstChannelRange(wav, { start: 0.25, end: 1.0 }, { maxBytes: 1024 });
  assert.equal(selected?.sampleRate, 4, 'compare audio: selected WAV range keeps sample rate');
  assert.equal(selected?.rangeStart, 0.25, 'compare audio: selected WAV range aligns start to frames');
  assert.equal(selected?.rangeEnd, 1, 'compare audio: selected WAV range aligns end to frames');
  assert.equal(selected?.bytesRead, 12, 'compare audio: selected WAV range reads only requested frames');
  assert.deepEqual(
    [...selected.channel].map((n) => Number(n.toFixed(3))),
    [0.25, -0.5, 1],
    'compare audio: selected WAV range extracts first channel only',
  );

  const unsupported = new Blob([enc.encode('ID3not wav')], { type: 'audio/mpeg' });
  assert.equal(await parsePcmWavHeader(unsupported), null, 'compare audio: unsupported audio returns null for fallback');
  await assert.rejects(
    () => readPcmWavFirstChannelRange(wav, { start: 0, end: 1.5 }, { maxBytes: 4, label: 'Tiny cap' }),
    /Tiny cap is too large/,
    'compare audio: selected WAV range enforces byte cap before slice decode',
  );
}

function u32(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

function synchsafe(n) {
  return [(n >>> 21) & 127, (n >>> 14) & 127, (n >>> 7) & 127, n & 127];
}

function concatBytes(...parts) {
  const bytes = [];
  for (const p of parts) bytes.push(...Array.from(p));
  return new Uint8Array(bytes);
}

function id3Frame(id, payload) {
  return concatBytes(id.split('').map((c) => c.charCodeAt(0)), u32(payload.length), [0, 0], payload);
}

function id3TagFromFrames(frames) {
  const body = concatBytes(...frames);
  return concatBytes(
    [0x49, 0x44, 0x33, 0x03, 0x00, 0x00, ...synchsafe(body.length)],
    body,
  );
}

function apicFrame({ mime = 'image/jpeg', bytes }) {
  const payload = concatBytes(
    [0x03],
    enc.encode(mime),
    [0x00],
    [0x03],
    [0x00],
    bytes,
  );
  return id3Frame('APIC', payload);
}

function chapFrame({ id = 'ch', startMs = 0, endMs = 1000, title = 'Chapter' }) {
  const body = [];
  body.push(...enc.encode(id), 0x00);
  body.push(...u32(startMs), ...u32(endMs), ...u32(0), ...u32(0));

  if (title !== null) {
    const titlePayload = concatBytes([0x03], enc.encode(title));
    body.push(...enc.encode('TIT2'), ...u32(titlePayload.length), 0x00, 0x00, ...titlePayload);
  }
  return id3Frame('CHAP', new Uint8Array(body));
}

function ctocFrame({ id = 'toc', children = [], title = 'Contents', flags = 0x03 }) {
  const body = [];
  body.push(...enc.encode(id), 0x00, flags, children.length);
  for (const child of children) body.push(...enc.encode(child), 0x00);
  if (title !== null) {
    const titlePayload = concatBytes([0x03], enc.encode(title));
    body.push(...enc.encode('TIT2'), ...u32(titlePayload.length), 0x00, 0x00, ...titlePayload);
  }
  return id3Frame('CTOC', new Uint8Array(body));
}

{
  assert.equal(
    buildVideoExportFilterChain({ scale: '-2:720' }, {}),
    'scale=-2:720',
    'video export filters: default MP4 720p keeps scale-only chain',
  );
  assert.equal(
    buildVideoExportFilterChain({ scale: '-2:720' }, { transform: 'square', look: 'source' }),
    'crop=trunc(min(iw\\,ih)/2)*2:trunc(min(iw\\,ih)/2)*2:(iw-ow)/2:(ih-oh)/2,scale=-2:720',
    'video export filters: crop composes before scale',
  );
  assert.equal(
    buildVideoExportFilterChain({ scale: '-2:720' }, { transform: 'rotate_cw', look: 'cinema' }),
    'transpose=1,eq=contrast=1.08:saturation=1.12:brightness=-0.02,scale=-2:720',
    'video export filters: rotate and look compose before scale',
  );
  assert.equal(
    buildVideoExportFilterChain({}, { transform: 'none', look: 'source' }),
    '',
    'video export filters: no preset filters emits no -vf chain',
  );

  const args = buildSubtitleBurnArgs('input.avi', 'subtitle.srt', 'out.mp4', { ext: 'srt' });
  assert.deepEqual(args.slice(0, 4), ['-i', 'input.avi', '-vf', 'subtitles=subtitle.srt'], 'subtitle burn: uses subtitles video filter');
  assert.equal(args.includes('-c:v'), true, 'subtitle burn: sets video codec explicitly');
  assert.equal(args[args.indexOf('-c:v') + 1], 'libx264', 'subtitle burn: re-encodes video to H.264');
  assert.equal(args.includes('-c'), false, 'subtitle burn: does not stream-copy all streams');
  assert.equal(args[args.indexOf('-c:a') + 1], 'aac', 'subtitle burn: encodes MP4-compatible AAC audio');
  assert.equal(args.at(-1), 'out.mp4', 'subtitle burn: writes requested MP4 output');

  assert.equal(parseTimestamp('0:00:02.500'), 2.5, 'timestamp: minute-only HH:SS variant');
  assert.equal(parseTimestamp('01:02:03,004'), 3723.004, 'timestamp: comma ms variant');
  const raw = [
    'WEBVTT',
    'NOTE: metadata header',
    '',
    '00:00:00.000 --> 00:00:01.500 align:start line:10%',
    '<v Voice>Styled <b>cue</b>',
    'Second line',
    '',
    '2',
    '00:00:01.250 --> 00:00:01.000',
    'Bad cue (end before start) should be ignored',
    '',
    '3',
    '00:00:02,250 --> 00:00:04.000',
    'Second cue',
    '',
    'note: not a cue',
    'no timing line',
    '',
  ].join('\n');
  const cues = parseSubtitles(raw);
  assert.equal(cues.length, 2, 'parseSubtitles: malformed cue skipped');
  assert.equal(cues[0].start, 0, 'parseSubtitles: first cue start');
  assert.equal(cues[0].end, 1.5, 'parseSubtitles: first cue end');
  assert.equal(cues[0].text, '<v Voice>Styled <b>cue</b>\nSecond line', 'parseSubtitles: preserves cue text body');
  assert.equal(cues[1].start, 2.25, 'parseSubtitles: second cue start');
  assert.equal(cues[1].text, 'Second cue', 'parseSubtitles: complex cue timing block parsed');
}

{
  const defaultMux = buildMuxMusicArgs('video.mp4', 'music.mp3', 'out.mp4').join(' ');
  assert.match(defaultMux, /volume=0\.35/, 'mux music: defaults music bed to 35%');
  assert.match(defaultMux, /amix=inputs=2:duration=first/, 'mux music: mixes bed under original video audio duration');
  assert.match(defaultMux, /-map 0:v -map \[a\] -c:v copy/, 'mux music: keeps original video stream copied');

  const chosenMux = buildMuxMusicArgs('video.mp4', 'music.mp3', 'out.mp4', { musicGain: 0.625 }).join(' ');
  assert.match(chosenMux, /volume=0\.63/, 'mux music: rounds representative user gain to two decimals');

  const clampedMux = buildMuxMusicArgs('video.mp4', 'music.mp3', 'out.mp4', { musicGain: -0.4 }).join(' ');
  assert.match(clampedMux, /volume=0(?:\.0)?\[/, 'mux music: clamps negative user gain to silence');
}

{
  const chapters = normalizeChapters([
    { start: 32, title: 'Second' },
    { start: -4, title: '' },
    { start: 32.0004, title: 'Duplicate start' },
    { start: 90, title: 'Past end' },
    { start: Number.NaN, title: 'Bad' },
  ], 60);
  assert.deepEqual(
    chapters.map((c) => ({ start: c.start, end: c.end, title: c.title })),
    [
      { start: 0, end: 32, title: 'Chapter 1' },
      { start: 32, end: 60, title: 'Second' },
      { start: 60, end: 60, title: 'Past end' },
    ],
    'chapters: normalize sorts, clamps, drops duplicate starts, and synthesizes ends',
  );

  const unknownDuration = normalizeChapters([
    { start: 5, end: 9, title: 'Only' },
  ]);
  assert.equal(unknownDuration[0].end, 9, 'chapters: unknown duration can use an explicit final end');
  assert.equal(
    normalizeChapters([{ start: 5, title: 'Open' }])[0].end,
    null,
    'chapters: unknown duration leaves final chapter open without an explicit end',
  );

  assert.equal(
    chapterFilename('Book.mp3', { title: 'Prologue: A/B?' }, 0),
    'Book_01_Prologue_A_B.mp3',
    'chapters: filenames are deterministic and safe',
  );
  assert.equal(
    chapterFilename('.. weird.m4b', { title: '' }, 11),
    'weird_12_Chapter_12.mp3',
    'chapters: filename helper supplies fallback chapter title',
  );

  const vttChapters = parseWebVttChapters([
    'WEBVTT',
    '',
    '00:00:00.000 --> 00:01:20.000',
    'Prologue',
    '',
    'c2',
    '00:01:20.000 --> 00:03:00.000',
    '<b>Chapter One</b>',
    '',
  ].join('\n'));
  assert.deepEqual(
    vttChapters,
    [
      { start: 0, end: 80, title: 'Prologue' },
      { start: 80, end: 180, title: 'Chapter One' },
    ],
    'chapters: WebVTT cues become chapter titles and ranges',
  );

  const ffmetadata = parseFfmetadataChapters([
    ';FFMETADATA1',
    '[CHAPTER]',
    'TIMEBASE=1/1000',
    'START=0',
    'END=80000',
    'title=Prologue',
    '[CHAPTER]',
    'TIMEBASE=1/1',
    'START=80',
    'END=180',
    'title=Chapter One',
  ].join('\n'));
  assert.deepEqual(
    ffmetadata,
    [
      { start: 0, end: 80, title: 'Prologue' },
      { start: 80, end: 180, title: 'Chapter One' },
    ],
    'chapters: ffmetadata chapter sections honor TIMEBASE, START, END, and title',
  );

  const textChapters = parseTextChapterLines([
    '# 00:00 Prologue',
    '00:01:20 Chapter 1',
    '1:02:03 - Long chapter',
    '* 125.5 Bonus',
    'not a chapter',
  ].join('\n'));
  assert.deepEqual(
    textChapters,
    [
      { start: 0, title: 'Prologue' },
      { start: 80, title: 'Chapter 1' },
      { start: 3723, title: 'Long chapter' },
      { start: 125.5, title: 'Bonus' },
    ],
    'chapters: text timestamp lines support mm:ss, hh:mm:ss, separators, and markdown bullets',
  );

  assert.deepEqual(
    parseChapterSidecar('00:00 Intro\n00:10 Chapter', 'book.chapters.txt').map((c) => c.title),
    ['Intro', 'Chapter'],
    'chapters: parseChapterSidecar falls back to timestamp text',
  );

  const sidecars = findChapterSidecars([
    { path: 'Book/book.mp3', file: { name: 'book.mp3', size: 10 } },
    { path: 'Book/chapters.vtt', file: { name: 'chapters.vtt', size: 10 } },
    { path: 'Book/book.chapters.txt', file: { name: 'book.chapters.txt', size: 10 } },
    { path: 'Book/book.vtt', file: { name: 'book.vtt', size: 10 } },
    { path: 'Other/book.vtt', file: { name: 'book.vtt', size: 10 } },
    { path: 'Book/book.srt', file: { name: 'book.srt', size: 10 } },
  ], 'Book/book.mp3', null);
  assert.deepEqual(
    sidecars.map((s) => s.path),
    ['Book/book.vtt', 'Book/book.chapters.txt', 'Book/chapters.vtt'],
    'chapters: sidecar discovery prefers same basename and same directory chapter-ish files',
  );
}

{
  const cover = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const tag = id3TagFromFrames([
    id3Frame('TIT2', concatBytes([0x03], enc.encode('Polish Title'))),
    id3Frame('TPE1', concatBytes([0x03], enc.encode('Polished Artist'))),
    apicFrame({ mime: 'image/png', bytes: cover }),
    chapFrame({ id: 'intro', startMs: 1000, endMs: 3200, title: 'Prologue' }),
    chapFrame({ id: 'main', startMs: 3400, endMs: 8800, title: 'Chapter One' }),
  ]);
  const out = parseId3(tag);
  assert.ok(out, 'parseId3: returns object when frames exist');
  assert.equal(out.title, 'Polish Title', 'parseId3: title parsed');
  assert.equal(out.artist, 'Polished Artist', 'parseId3: artist parsed');
  assert.ok(out.cover, 'parseId3: APIC cover parsed');
  assert.equal(out.cover.mime, 'image/png', 'parseId3: APIC MIME');
  assert.deepEqual(Array.from(out.cover.bytes), Array.from(cover), 'parseId3: APIC bytes copied');
  assert.ok(Array.isArray(out.chapters), 'parseId3: CHAP list parsed');
  assert.equal(out.chapters.length, 2, 'parseId3: two chapters parsed');
  assert.equal(out.chapters[0].title, 'Prologue', 'parseId3: CHAP title preserved');
  assert.equal(out.chapters[0].start, 1, 'parseId3: CHAP start converted to seconds');
  assert.equal(out.chapters[0].end, 3.2, 'parseId3: CHAP end converted to seconds when present');
  assert.equal(out.chapters[1].start, 3.4, 'parseId3: CHAP ordering normalized by start');
}

{
  const tag = id3TagFromFrames([
    chapFrame({ id: 'alpha', startMs: 10000, endMs: 19000, title: 'Alpha' }),
    chapFrame({ id: 'beta', startMs: 20000, endMs: 28000, title: 'Beta' }),
    chapFrame({ id: 'untitled', startMs: 30000, endMs: 38000, title: null }),
    ctocFrame({ id: 'root', children: ['beta', 'alpha', 'untitled'], title: 'Main contents' }),
  ]);
  const out = parseId3(tag);
  assert.deepEqual(
    out.chapters.map((chapter) => chapter.id),
    ['beta', 'alpha', 'untitled'],
    'parseId3: CTOC child order takes precedence when present',
  );
  assert.equal(out.chapters[2].title, 'Main contents', 'parseId3: CTOC title can provide low-risk fallback title');
}

{
  const p = resolveExportParams(presetById('acx-mp3'), {}, 'mp3');
  assert.equal(p.acxChain, true, 'acx preset: resolved params carry ACX chain marker');
  assert.equal(p.lufsTarget, -20, 'acx preset: lufsTarget is −20');
  assert.equal(p.truePeak, -3, 'acx preset: truePeak is −3');
  assert.equal(p.channels, 1, 'acx preset: mono channel target');
  assert.equal(p.sampleRate, 44100, 'acx preset: 44.1k sample-rate target');
  assert.equal(p.cbr, true, 'acx preset: CBR encoding');

  const args = buildAcxExportArgs('in.mp3', 'out.mp3');
  const chain = buildAcxFilterChain();
  const chainText = args.join(' ');
  assert.ok(/-ac\s+1/.test(chainText), 'acx args: include explicit mono channel');
  assert.ok(chainText.includes('-ar 44100'), 'acx args: include 44.1 kHz sample-rate');
  assert.ok(chainText.includes('-b:a 192k'), 'acx args: include 192 kbps bitrate');
  assert.ok(chain.includes('loudnorm=I=-20:TP=-3:LRA=11'), 'acx filter chain: includes loudnorm −20 / −3 defaults');
  assert.ok(chain.includes('silenceremove='), 'acx filter chain: includes silenceremove');
  assert.ok(chain.includes('apad=pad_dur='), 'acx filter chain: includes room-tone pad');

  const chapterArgs = buildAcxChapterExportArgs('in.m4b', 'ch01.mp3', { start: 1.25, end: 13.75 }).join(' ');
  assert.ok(/^-ss 1\.25 -t 12\.5 -i in\.m4b/.test(chapterArgs), 'acx chapter args: seek and duration are range-scoped before input');
  assert.ok(/-ac 1 -ar 44100 -c:a libmp3lame -b:a 192k/.test(chapterArgs), 'acx chapter args: force ACX mono/44.1k/192k CBR');
  assert.throws(
    () => buildAcxChapterExportArgs('in.mp3', 'bad.mp3', { start: 3, end: null }),
    /finite start and end/,
    'acx chapter args: reject open-ended ranges',
  );
}

{
  const fake = {
    exitCalls: 0,
    exit() {
      this.exitCalls += 1;
      return Promise.resolve();
    },
  };
  __setFfmpegInstanceForTest(fake);
  assert.equal(__getFfmpegInstanceForTest(), fake, 'transcoder test hook: sets cached ffmpeg instance');
  await cancelFfmpeg(fake);
  assert.equal(fake.exitCalls, 1, 'transcoder cancel helper: exits cached ffmpeg instance');
  assert.equal(__getFfmpegInstanceForTest(), null, 'transcoder cancel helper: clears cached instance for reload');
  __setFfmpegInstanceForTest(null);
}

{
  const cancelled = classifyFfmpegError('error: ffmpeg exit (killed)');
  assert.equal(cancelled.headline, 'Operation cancelled.', 'ffmpeg error classification: cancel message');
  const unsupported = classifyFfmpegError('Error: Unknown encoder: libx265');
  assert.equal(unsupported.headline, 'Unsupported codec or container for this operation.', 'ffmpeg error classification: unsupported codec');
  assert.ok(/Unknown encoder/.test(unsupported.detail || ''), 'ffmpeg error classification: preserves unsupported raw detail');
  const decode = classifyFfmpegError('Invalid data found when processing input: maybe corrupt data');
  assert.equal(decode.headline, 'Could not decode this media for that operation.', 'ffmpeg error classification: decode-style');
  const decodeFormatted = formatFfmpegError('Invalid data found when processing input: maybe corrupt data');
  assert.ok(decodeFormatted.includes('Could not decode this media for that operation.'), 'ffmpeg error formatting: keeps decode-friendly headline');
  assert.ok(decodeFormatted.includes('Invalid data found when processing input'), 'ffmpeg error formatting: preserves decode raw detail');
  assert.equal(formatFfmpegError('error: ffmpeg exit'), 'Operation cancelled.', 'ffmpeg error formatting: cancellation keeps neutral message');
}

{
  const ids = PRESETS.map((p) => p.id);
  const requiredGeneric = [
    'acx-standard',
    'findaway',
    'intimate-audiobook',
    'audacity-rolloff',
    'deep-male',
    'proximity-fix',
    'boomy-cleanup',
    'female-clarity',
    'thin-body-fix',
    'bbc-broadcast',
    'npr-spoken',
    'rode-podcast',
    'radio-drama',
    'youtube-streaming',
    'flat',
  ];
  for (const id of requiredGeneric) {
    assert.equal(ids.includes(id), true, `preset availability: includes ${id}`);
  }
  const unexpectedCharacterPresets = ids.filter((id) => id.startsWith('char-'));
  assert.equal(unexpectedCharacterPresets.length, 0, 'preset availability: excludes character presets');
}

{
  const p = resolveExportParams(presetById('podcast-cleanup-mp3'), {}, 'wav');
  assert.equal(p.cleanupChain, 'spoken-cleanup', 'cleanup preset resolves cleanup chain marker');
  assert.equal(p.sampleRate, null, 'cleanup preset keeps source sample-rate');
  assert.equal(p.channels, null, 'cleanup preset keeps source channels');
  assert.equal(p.lufsTarget, -16, 'cleanup preset carries podcast loudnorm target');
  assert.equal(p.truePeak, -1.5, 'cleanup preset carries ffmpeg loudnorm TP target');

  const desc = describeParams(p);
  assert.ok(desc.includes('cleanup: de-hum, de-noise, de-plosive, leveler'), 'cleanup preset summary names cleanup stages');
  assert.ok(desc.includes('loudnorm target -16 LUFS / TP -1.5 dBTP'), 'cleanup preset summary labels TP as loudnorm target');

  const chainSettings = resolveExportAudioSettings(p, {
    freqs: [120, 4000],
    gains: [0, 1.5],
    hpf: 20,
    lpf: 20000,
  });
  assert.equal(chainSettings.cleanupChain, 'spoken-cleanup', 'cleanup export settings carry cleanup chain');
  const cleanupOnly = buildMasteringCleanupFilter(chainSettings.cleanupChain);
  assert.ok(cleanupOnly.includes('highpass=f=75'), 'cleanup chain: de-hum includes highpass cleanup');
  assert.ok(cleanupOnly.includes('bandreject=f=60:t=h:w=8'), 'cleanup chain: de-hum includes 60 Hz notch');
  assert.ok(cleanupOnly.includes('bandreject=f=120:t=h:w=8'), 'cleanup chain: de-hum includes 120 Hz harmonic notch');
  assert.ok(cleanupOnly.includes('afftdn=nr=8'), 'cleanup chain: de-noise uses afftdn');
  assert.ok(cleanupOnly.includes('highpass=f=90'), 'cleanup chain: de-plosive helper uses heuristic highpass');
  assert.ok(cleanupOnly.includes('equalizer=f=120:t=q:w=0.9:g=-2.5'), 'cleanup chain: de-plosive helper uses low-frequency cut');
  assert.ok(cleanupOnly.includes('dynaudnorm=f=500:g=15:p=0.9:m=8'), 'cleanup chain: leveler uses conservative dynaudnorm');

  const chain = buildAudioFilterChain(chainSettings, {});
  assert.ok(chain.includes('equalizer=f=4000:width_type=o:width=1:g=1.5'), 'cleanup preset: live EQ still follows cleanup');
  assert.ok(
    chain.indexOf('dynaudnorm=f=500:g=15:p=0.9:m=8') < chain.indexOf('equalizer=f=4000:width_type=o:width=1:g=1.5'),
    'cleanup preset: dynaudnorm happens before EQ',
  );
  assert.ok(
    chain.indexOf('dynaudnorm=f=500:g=15:p=0.9:m=8') < chain.indexOf('loudnorm=I=-16:TP=-1.5:LRA=11'),
    'cleanup preset: dynaudnorm happens before final loudnorm',
  );
}

{
  const p = resolveExportParams(presetById('podcast-mp3-master-bus'), {}, 'mp3');
  assert.equal(p.masterBus, true, 'master-bus preset resolves with masterBus flag');
  assert.equal(p.sampleRate, 44100, 'master-bus preset keeps explicit 44.1k sample-rate');
  assert.equal(p.channels, 2, 'master-bus preset keeps explicit stereo channels');

  const chain = buildAudioFilterChain(
    { freqs: [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000], gains: [0, 0, 0, 0, 0, 0, 0, 0, 0], hpf: 80, lpf: 20000, masterBus: true },
    {},
  );
  assert.ok(chain.includes('highpass=f=65:p=2'), 'master-bus: uses 65Hz pre-cut');
  assert.ok(chain.includes('equalizer=f=120:t=q:w=0.5:g=-1.5'), 'master-bus: applies low- shelf-like cut at 120 Hz');
  assert.ok(chain.includes('equalizer=f=3200:t=q:w=0.8:g=-1'), 'master-bus: applies 3.2kHz containment');
  assert.ok(chain.includes('treble=g=+1:f=8000:w=0.5'), 'master-bus: applies high-shelf lift at 8kHz');
  assert.ok(chain.includes('acompressor=threshold=-20dB'), 'master-bus: applies compressor threshold in dB');
  assert.ok(/acompressor=.*attack=15:release=250/.test(chain), 'master-bus: applies compressor timing in milliseconds');
}

{
  const p = resolveExportParams(presetById('podcast-mp3-master-bus'), {}, 'mp3');
  const chainSettings = resolveExportAudioSettings(p, {
    freqs: [100, 200, 300],
    gains: [1, 2, 3],
    hpf: 20,
    lpf: 20000,
    lufsTarget: -9,
    truePeak: -2,
  });
  assert.equal(chainSettings.masterBus, true, 'master-bus export settings carry masterBus flag');
  assert.equal(chainSettings.lufsTarget, -16, 'master-bus preset lufs target overrides live value');
  assert.equal(chainSettings.truePeak, -1.5, 'master-bus preset truePeak overrides live value');
}

{
  const customMatch = resolveExportParams(presetById('custom'), { container: 'source', bitrate: '', sampleRate: '', channels: '' }, 'flac');
  assert.equal(customMatch.sampleRate, null, 'custom preset without explicit sample-rate keeps source rate');
  assert.equal(customMatch.channels, null, 'custom preset without explicit channels keeps source channels');
  assert.equal(customMatch.bitrate, null, 'custom preset without explicit bitrate keeps VBR default');

  const customExplicit = resolveExportParams(
    presetById('custom'),
    { container: 'source', bitrate: '', sampleRate: '48000', channels: '1' },
    'flac',
  );
  assert.equal(customExplicit.sampleRate, 48000, 'custom preset explicitly maps sample-rate override');
  assert.equal(customExplicit.channels, 1, 'custom preset explicitly maps channel override');
}

{
  const intersample = new Float32Array([-0.5, 0.9, 0.9, -0.5]);
  const sample = samplePeak(intersample);
  const estimated = estimatedTruePeak(intersample);
  assert.ok(estimated > sample, 'estimatedTruePeak: 4x interpolation can catch inter-sample overs');
  assert.ok(estimated > 0 && estimated < 1, 'estimatedTruePeak: reports the expected dBTP range for the synthetic over');
  assert.equal(estimatedTruePeak(new Float32Array()), -Infinity, 'estimatedTruePeak: empty buffers return −Infinity');

  const fs = 48000;
  const n = fs * 4;
  const tone = new Float32Array(n);
  const amp = Math.pow(10, -20 / 20);
  for (let i = 0; i < n; i++) tone[i] = amp * Math.sin(2 * Math.PI * 1000 * i / fs);
  const metrics = analyzeMetrics([tone], fs, { sampleRate: 44100, channels: 1, duration: n / fs });
  assert.equal(typeof metrics.truePeak, 'number', 'analyzeMetrics: includes estimated truePeak metric');
  assert.ok(metrics.truePeak >= metrics.peak, 'analyzeMetrics: estimated truePeak is not below sample peak');
}

{
  const base = {
    rms: -20,
    lufs: -20,
    peak: -3.5,
    truePeak: -3.4,
    noiseFloor: -62,
    sampleRate: 44100,
    channels: 1,
    headSilence: 0.75,
    tailSilence: 2,
  };

  const pass = evaluateAcx(base);
  const passMap = new Map(pass.map((row) => [row.key, row]));
  assert.deepEqual(
    pass.map((row) => row.key),
    ['rms', 'lufs', 'peak', 'truePeak', 'noise', 'sr', 'ch', 'head', 'tail'],
    'evaluateAcx: row order separates RMS, LUFS, sample peak, and estimated true peak',
  );
  assert.equal(passMap.get('lufs').label, 'Integrated LUFS', 'evaluateAcx: LUFS row is distinct from RMS');
  assert.equal(passMap.get('truePeak').label, 'Estimated true peak', 'evaluateAcx: true peak row is labelled as estimated');
  assert.match(passMap.get('truePeak').value, /dBTP$/, 'evaluateAcx: true peak value uses dBTP');
  assert.match(passMap.get('truePeak').fix, /Estimated 4× oversampled peak/, 'evaluateAcx: true peak copy is honest about estimate');
  assert.match(passMap.get('truePeak').fix, /TP −3/, 'evaluateAcx: true peak copy names the export TP target');
  assert.equal(passMap.get('peak').status, 'pass', 'evaluateAcx: sample peak pass condition');
  assert.ok(!/true-peak/i.test(passMap.get('peak').fix), 'evaluateAcx: peak fix text does not mention true-peak');
  assert.equal(passMap.get('truePeak').status, 'pass', 'evaluateAcx: estimated true peak pass condition');

  const warn = evaluateAcx({ ...base, peak: -2.5 });
  const warnMap = new Map(warn.map((row) => [row.key, row]));
  assert.equal(warnMap.get('peak').status, 'warn', 'evaluateAcx: sample peak borderline maps to warn');
  assert.ok(!/true-peak/i.test(warnMap.get('peak').fix), 'evaluateAcx: warn copy still avoids true-peak wording');

  const truePeakWarn = evaluateAcx({ ...base, truePeak: -2.5 });
  const truePeakWarnMap = new Map(truePeakWarn.map((row) => [row.key, row]));
  assert.equal(truePeakWarnMap.get('truePeak').status, 'warn', 'evaluateAcx: estimated true peak borderline maps to warn');

  const fail = evaluateAcx({ ...base, peak: -1.2 });
  const failMap = new Map(fail.map((row) => [row.key, row]));
  assert.equal(failMap.get('peak').status, 'fail', 'evaluateAcx: sample peak over limit maps to fail');
  assert.ok(!/true-peak/i.test(failMap.get('peak').fix), 'evaluateAcx: fail copy still avoids true-peak wording');

  const truePeakFail = evaluateAcx({ ...base, truePeak: -1.2 });
  const truePeakFailMap = new Map(truePeakFail.map((row) => [row.key, row]));
  assert.equal(truePeakFailMap.get('truePeak').status, 'fail', 'evaluateAcx: estimated true peak over limit maps to fail');
}
