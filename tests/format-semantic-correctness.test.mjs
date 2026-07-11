import assert from 'node:assert/strict';

import { parseFitsCard, parseFitsHeader } from '../docs/types/text/fits/parser.js';
import { render as renderFits } from '../docs/types/text/fits/renderer.js';
import { extractMetadata as fitsMetadata } from '../docs/types/text/fits/metadata.js';
import { parseMidi, render as renderMidi } from '../docs/types/binary/midi/renderer.js';
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
assert.match(fitsHtml, /Header metadata only — image pixel data is not decoded or rendered\./);
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
