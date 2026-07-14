import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { acxVerdict, evaluateAcx } from '../docs/types/media/qc.js';
import { inspectAcxEncoding } from '../docs/types/media/qc-encoding.js';
import { isCompatibleMediaOutput } from '../docs/types/media/media-working-copy.js';

const referenceBytes = new Uint8Array(await readFile(new URL('../docs/examples/acx-qc-reference.mp3', import.meta.url)));
const reference = inspectAcxEncoding(referenceBytes, 'acx-qc-reference.mp3');
assert.equal(reference.container, 'mp3', 'reference fixture: real bytes identify as MP3');
assert.equal(reference.sampleRate, 44100, 'reference fixture: real MP3 frames use 44.1 kHz');
assert.equal(reference.channels, 1, 'reference fixture: real MP3 frames are mono');
assert.equal(reference.bitrateKbps, 192, 'reference fixture: real MP3 frames use 192 kbps');
assert.equal(reference.cbr, true, 'reference fixture: scanned MP3 frames are constant bitrate');
assert.ok(reference.frameCount > 100, 'reference fixture: CBR verdict scans many real frames');

const wavBytes = new Uint8Array(await readFile(new URL('../docs/examples/sample.wav', import.meta.url)));
const wav = inspectAcxEncoding(wavBytes, 'sample.wav');
assert.equal(wav.container, 'wav', 'working-master fixture: real RIFF bytes identify as WAV');
assert.equal(wav.sampleRate, 44100, 'working-master fixture: source sample rate comes from RIFF metadata');
assert.equal(wav.channels, 1, 'working-master fixture: source channel count comes from RIFF metadata');

const measured = {
  rms: -20,
  lufs: -12,
  peak: -4,
  truePeak: -1,
  noiseFloor: -65,
  sampleRate: reference.sampleRate,
  channels: 2,
  headSilence: 1.2,
  tailSilence: 2.2,
  encoding: reference,
};
const rows = evaluateAcx(measured);
assert.equal(new Map(rows.map((row) => [row.key, row])).get('ch').status, 'pass', 'ACX semantics: stereo is accepted for a consistently stereo production');
assert.equal(acxVerdict(rows), 'pass', 'ACX semantics: LUFS and estimated true peak are guidance, not submission verdict rules');
const wavRows = evaluateAcx({ ...measured, encoding: wav, channels: 1 });
assert.equal(new Map(wavRows.map((row) => [row.key, row])).get('format').status, 'fail', 'ACX semantics: WAV is a working master, not a submission file');
assert.equal(acxVerdict(wavRows), 'fail', 'ACX semantics: wrong upload encoding fails the verdict');

const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' });
assert.equal(
  isCompatibleMediaOutput({ filename: 'source.wav' }, { filename: 'source-mix.wav', blob }),
  true,
  'working copy: same-extension output can be handed to exact-target Save',
);
assert.equal(
  isCompatibleMediaOutput({ filename: 'source.wav' }, { filename: 'source-mix.mp3', blob }),
  false,
  'working copy: converted output cannot overwrite a differently typed source',
);

console.log('media QC fixture tests passed');
