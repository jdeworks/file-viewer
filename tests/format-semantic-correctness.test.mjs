import assert from 'node:assert/strict';

import { parseFitsCard, parseFitsHeader } from '../docs/types/text/fits/parser.js';
import { render as renderFits } from '../docs/types/text/fits/renderer.js';
import { extractMetadata as fitsMetadata } from '../docs/types/text/fits/metadata.js';
import { parseMidi, render as renderMidi } from '../docs/types/binary/midi/renderer.js';
import { extractMetadata as midiMetadata } from '../docs/types/binary/midi/metadata.js';
import { render as renderDicom } from '../docs/types/binary/dicom/renderer.js';

const fitsCard = (keyword, body = '') => (keyword.padEnd(8) + body).padEnd(80, ' ').slice(0, 80);
const bunit = parseFitsCard(fitsCard('BUNIT', "= 'counts / s' / brightness unit"));
assert.deepEqual(bunit, { kw: 'BUNIT', value: 'counts / s', comment: 'brightness unit' });
const object = parseFitsCard(fitsCard('OBJECT', "= 'O''Brien / field' / target name"));
assert.deepEqual(object, { kw: 'OBJECT', value: "O'Brien / field", comment: 'target name' });

const fitsText = [
  fitsCard('SIMPLE', '=                    T / conforms to FITS'),
  fitsCard('BITPIX', '=                   16'),
  fitsCard('NAXIS', '=                    0'),
  fitsCard('BUNIT', "= 'counts / s' / brightness unit"),
  fitsCard('OBJECT', "= 'O''Brien / field' / target name"),
  fitsCard('END'),
].join('');
const fitsBytes = new TextEncoder().encode(fitsText.padEnd(2880, ' '));
const fitsIntake = { bytes: fitsBytes, isBinary: true, text: null };
assert.equal(parseFitsHeader(fitsIntake).length, 5);
const fitsHtml = renderFits(fitsIntake).bodyHtml;
assert.match(fitsHtml, /bounded FITS header-card metadata is shown/);
assert.match(fitsHtml, /Image pixels, table-HDU rows and cell values, additional HDUs/);
assert.match(fitsHtml, /counts \/ s/);
assert.match(fitsHtml, /brightness unit/);
assert.match(fitsHtml, /O'Brien \/ field/);
assert.match(fitsHtml, /target name/);
const fitsFields = Object.fromEntries((await fitsMetadata(fitsIntake)).fields.map(({ label, value }) => [label, value]));
assert.equal(fitsFields.Object, "O'Brien / field");

// 480 ticks at 120 BPM followed by 480 ticks at 60 BPM is 0.5 + 1.0 = 1.5 seconds.
const tempoChangeMidi = Buffer.from(
  '4d546864000000060001000101e04d54726b0000001400ff510307a1208360ff51030f42408360ff2f00',
  'hex',
);
const midi = parseMidi({ bytes: tempoChangeMidi });
assert.equal(midi.bpmText, '60-120');
assert.equal(midi.durationSeconds, 1.5);
assert.match((await renderMidi({ bytes: tempoChangeMidi })).bodyHtml, /1\.50s/);

// Type 2 tracks are independent patterns: track order must not change the longest-track duration.
const type2Header = '4d546864000000060002000201e0';
const fastTrack = '4d54726b0000000c00ff510307a1208360ff2f00';
const slowTrack = '4d54726b0000000c00ff51030f42408360ff2f00';
for (const body of [fastTrack + slowTrack, slowTrack + fastTrack]) {
  const independentMidi = Buffer.from(type2Header + body, 'hex');
  const parsed = parseMidi({ bytes: independentMidi });
  assert.equal(parsed.durationSeconds, 1);
  assert.equal(parsed.durationLabel, 'Longest track');
  assert.match((await renderMidi({ bytes: independentMidi })).bodyHtml, /1\.00s<\/strong><span>Longest track/);
}

// SMPTE division -25 fps × 40 ticks/frame gives exactly 1 second at tick 1000.
const smpteMidi = Buffer.from(
  '4d5468640000000600000001e7284d54726b000000058768ff2f00',
  'hex',
);
const smpte = parseMidi({ bytes: smpteMidi });
assert.equal(smpte.ppqn, 0);
assert.equal(smpte.timingLabel, 'SMPTE timing');
assert.equal(smpte.timingValue, '25 fps × 40');
assert.equal(smpte.bpmText, '—');
assert.equal(smpte.durationSeconds, 1);
const smpteHtml = (await renderMidi({ bytes: smpteMidi })).bodyHtml;
assert.match(smpteHtml, /25 fps × 40<\/strong><span>SMPTE timing/);
assert.match(smpteHtml, /—<\/strong><span>Tempo meta BPM/);
assert.match(smpteHtml, /1\.00s<\/strong><span>Duration/);
const smpteFields = Object.fromEntries((await midiMetadata({ bytes: smpteMidi })).fields
  .map(({ label, value }) => [label, value]));
assert.equal(smpteFields['SMPTE timing'], '25 fps × 40');
assert.equal(smpteFields['Tempo meta BPM'], '—');
assert.equal(smpteFields.Duration, '1.00s');

const invalidSmpteMidi = Buffer.from(smpteMidi);
invalidSmpteMidi.writeUInt16BE(0xe100, 12);
const invalidSmpteFields = Object.fromEntries((await midiMetadata({ bytes: invalidSmpteMidi })).fields
  .map(({ label, value }) => [label, value]));
assert.equal(invalidSmpteFields['SMPTE timing'], 'Invalid');
assert.equal(invalidSmpteFields.Duration, '—');

// The -29 code is the 29.97 fps drop-frame rate, not integer 29 fps.
const dropFrameMidi = Buffer.from(
  '4d5468640000000600000001e3504d54726b000000059260ff2f00',
  'hex',
);
const dropFrame = parseMidi({ bytes: dropFrameMidi });
assert.equal(dropFrame.timingValue, '29.97 drop-frame fps × 80');
assert.ok(Math.abs(dropFrame.durationSeconds - 1.001) < 1e-12);

const multiChannelMidi = Buffer.from(
  '4d546864000000060000000101e04d54726b0000001200c00000903c4000c1200091304000ff2f00',
  'hex',
);
const multiChannel = parseMidi({ bytes: multiChannelMidi });
assert.equal(multiChannel.tracks[0].channel, '1, 2');
assert.deepEqual(multiChannel.tracks[0].programs, [
  { channel: 1, program: 0 }, { channel: 2, program: 32 },
]);
const multiChannelHtml = (await renderMidi({ bytes: multiChannelMidi })).bodyHtml;
assert.match(multiChannelHtml, /data-label="Channel">1, 2/);
assert.match(multiChannelHtml, /Acoustic Grand Piano \(ch 1\); Acoustic Bass \(ch 2\)/);

const changingProgramMidi = Buffer.from(
  '4d546864000000060000000101e04d54726b0000001200c00000903c4000c0200090304000ff2f00',
  'hex',
);
const changingProgram = parseMidi({ bytes: changingProgramMidi });
assert.deepEqual(changingProgram.tracks[0].programs, [
  { channel: 1, program: 0 }, { channel: 1, program: 32 },
]);
const changingProgramHtml = (await renderMidi({ bytes: changingProgramMidi })).bodyHtml;
assert.match(changingProgramHtml, /Acoustic Grand Piano \(ch 1\); Acoustic Bass \(ch 1\)/);
assert.match(changingProgramHtml, /Instruments used/);

const setupTrackBody = '4d54726b0000000700c02000ff2f00';
const noteTrackBody = '4d54726b0000000801903c4000ff2f00';
const sharedProgramMidi = Buffer.from(
  `4d546864000000060001000201e0${setupTrackBody}${noteTrackBody}`,
  'hex',
);
const sharedProgram = parseMidi({ bytes: sharedProgramMidi });
assert.deepEqual(sharedProgram.tracks[0].programs, []);
assert.deepEqual(sharedProgram.tracks[1].programs, [{ channel: 1, program: 32 }]);
assert.match((await renderMidi({ bytes: sharedProgramMidi })).bodyHtml, /Acoustic Bass \(ch 1\)/);

const independentProgramMidi = Buffer.from(
  `4d546864000000060002000201e0${setupTrackBody}${noteTrackBody}`,
  'hex',
);
assert.deepEqual(parseMidi({ bytes: independentProgramMidi }).tracks[1].programs,
  [{ channel: 1, program: 0 }]);

const dicomElement = (group, element, vr, value) => {
  const data = Buffer.from(value);
  const header = Buffer.alloc(8);
  header.writeUInt16LE(group, 0);
  header.writeUInt16LE(element, 2);
  header.write(vr, 4, 2, 'ascii');
  header.writeUInt16LE(data.length, 6);
  return Buffer.concat([header, data]);
};
const dicomText = (group, element, vr, value) => {
  const data = Buffer.from(value, 'ascii');
  return dicomElement(group, element, vr, data.length % 2 ? Buffer.concat([data, Buffer.from(' ')]) : data);
};
const dicomUs = (group, element, value) => {
  const data = Buffer.alloc(2);
  data.writeUInt16LE(value);
  return dicomElement(group, element, 'US', data);
};
const dicom = (...elements) => {
  const preamble = Buffer.alloc(132);
  preamble.write('DICM', 128, 'ascii');
  return Buffer.concat([preamble, ...elements]);
};

const calibrationOnly = dicom(
  dicomUs(0x0028, 0x0010, 64),
  dicomUs(0x0028, 0x0011, 64),
  dicomUs(0x0028, 0x0100, 16),
  dicomText(0x0050, 0x0004, 'CS', 'YES'),
);
const calibrationHtml = renderDicom({ bytes: calibrationOnly, size: calibrationOnly.length }).bodyHtml;
assert.match(calibrationHtml, /64 × 64 pixels/);
assert.doesNotMatch(calibrationHtml, /Slice thickness/);
assert.doesNotMatch(calibrationHtml, /YES mm/);

class NoWholeTailSlice extends Uint8Array {
  slice(start, end) {
    if (start === 132 && end === undefined) throw new Error('renderer copied the complete DICOM tail');
    return super.slice(start, end);
  }
}
const guardedDicom = new NoWholeTailSlice(calibrationOnly.length);
guardedDicom.set(calibrationOnly);
assert.doesNotThrow(() => renderDicom({ bytes: guardedDicom, size: guardedDicom.length }));

const realSliceThickness = dicom(
  dicomText(0x0018, 0x0050, 'DS', '1.25'),
  dicomUs(0x0028, 0x0010, 64),
  dicomUs(0x0028, 0x0011, 64),
  dicomUs(0x0028, 0x0100, 16),
  dicomText(0x0050, 0x0004, 'CS', 'YES'),
);
assert.match(renderDicom({ bytes: realSliceThickness, size: realSliceThickness.length }).bodyHtml,
  /Slice thickness<\/dt><dd>1\.25 mm/);

console.log('format semantic correctness tests passed');
