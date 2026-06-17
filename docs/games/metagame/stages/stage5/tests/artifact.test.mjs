import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOOP_DURATION_MS, TRANSMISSION_HUM_PATH } from '../messages.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../..');
const artifactPath = path.join(root, TRANSMISSION_HUM_PATH.replace(/^\//, ''));
const bytes = fs.readFileSync(artifactPath);

assert.equal(path.basename(artifactPath), 'transmission_hum.mp3');
assert(bytes.length > 80_000 && bytes.length < 90_000, 'artifact stays small enough for offline examples');
assert.equal(bytes.subarray(0, 3).toString('ascii'), 'ID3');

const id3Size = synchsafeToInt(bytes.subarray(6, 10));
const metadata = bytes.subarray(10, 10 + id3Size).toString('utf8');
assert(metadata.includes('transmission_hum'));
assert(metadata.includes('Defragmenter Stage 5'));
assert(metadata.includes('14 second same-origin counter-wave calibration sample'));

const audioStart = 10 + id3Size;
assert.equal(bytes[audioStart], 0xff, 'MPEG frame sync byte present after ID3 tag');
assert.equal(bytes[audioStart + 1] & 0xe0, 0xe0, 'MPEG frame sync marker present after ID3 tag');

const durationMs = estimateMp3DurationMs(bytes, audioStart);
assert(durationMs >= LOOP_DURATION_MS, `artifact duration ${durationMs}ms covers calibration loop`);
assert(durationMs < LOOP_DURATION_MS + 500, `artifact duration ${durationMs}ms remains a focused sample`);

console.log('stage5 artifact tests passed');

function synchsafeToInt(buffer) {
  return (buffer[0] << 21) | (buffer[1] << 14) | (buffer[2] << 7) | buffer[3];
}

function estimateMp3DurationMs(buffer, start) {
  let offset = start;
  let samples = 0;
  let sampleRate = 0;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) break;
    const parsed = parseFrameHeader(buffer, offset);
    if (!parsed) break;
    samples += parsed.samplesPerFrame;
    sampleRate = parsed.sampleRate;
    offset += parsed.frameLength;
  }
  return Math.round((samples / sampleRate) * 1000);
}

function parseFrameHeader(buffer, offset) {
  const b1 = buffer[offset + 1];
  const b2 = buffer[offset + 2];
  const versionBits = (b1 >> 3) & 0x03;
  const layerBits = (b1 >> 1) & 0x03;
  const bitrateIndex = (b2 >> 4) & 0x0f;
  const sampleRateIndex = (b2 >> 2) & 0x03;
  const padding = (b2 >> 1) & 0x01;
  if (versionBits !== 0x03 || layerBits !== 0x01 || bitrateIndex === 0 || bitrateIndex === 0x0f || sampleRateIndex === 0x03) {
    return null;
  }
  const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const sampleRates = [44100, 48000, 32000];
  const bitrate = bitrates[bitrateIndex] * 1000;
  const sampleRate = sampleRates[sampleRateIndex];
  return {
    frameLength: Math.floor((144 * bitrate) / sampleRate) + padding,
    sampleRate,
    samplesPerFrame: 1152,
  };
}
