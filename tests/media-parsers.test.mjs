import assert from 'node:assert/strict';

import { parseSubtitles, parseTimestamp } from '../docs/types/media/subtitles.js';
import { parseId3 } from '../docs/types/media/id3.js';
import { buildAcxExportArgs, buildAcxFilterChain, buildAudioFilterChain, buildMasteringCleanupFilter } from '../docs/types/media/audio-filters.js';
import { analyzeMetrics, estimatedTruePeak, evaluateAcx, samplePeak } from '../docs/types/media/qc.js';
import {
  presetById,
  describeParams,
  resolveExportAudioSettings,
  resolveExportParams,
} from '../docs/types/media/export-presets.js';
import {
  classifyFfmpegError,
  cancelFfmpeg,
  formatFfmpegError,
  __getFfmpegInstanceForTest,
  __setFfmpegInstanceForTest,
} from '../docs/types/media/transcoder.js';
import { PRESETS } from '../docs/types/media/spectrum-draw.js';

const enc = new TextEncoder();

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

  const titlePayload = concatBytes([0x03], enc.encode(title));
  body.push(...enc.encode('TIT2'), ...u32(titlePayload.length), 0x00, 0x00, ...titlePayload);
  return id3Frame('CHAP', new Uint8Array(body));
}

{
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
  assert.equal(out.chapters[1].start, 3.4, 'parseId3: CHAP ordering normalized by start');
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
