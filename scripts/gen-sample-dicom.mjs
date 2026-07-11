#!/usr/bin/env node
// Generates docs/examples/sample.dcm — an Explicit VR Little Endian DICOM Part 10 file with a
// deterministic 64×64 synthetic CT pixel plane and the identity/study/series/image tags needed to
// make its declared image internally coherent.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WIDTH = 64;
const HEIGHT = 64;
const LONG_VRS = new Set(['OB', 'OD', 'OF', 'OL', 'OQ', 'OV', 'OW', 'SQ', 'UC', 'UN', 'UR', 'UT']);

function u16(value) { const output = Buffer.alloc(2); output.writeUInt16LE(value); return output; }
function u32(value) { const output = Buffer.alloc(4); output.writeUInt32LE(value); return output; }
function text(vr, value) {
  const pad = vr === 'UI' ? 0 : 0x20;
  const source = Buffer.from(String(value), 'ascii');
  return source.length % 2 ? Buffer.concat([source, Buffer.from([pad])]) : source;
}
function us(value) { return u16(value); }
function element(group, id, vr, rawValue) {
  const value = Buffer.isBuffer(rawValue) ? rawValue : text(vr, rawValue);
  const tag = Buffer.concat([u16(group), u16(id), Buffer.from(vr, 'ascii')]);
  if (LONG_VRS.has(vr)) return Buffer.concat([tag, Buffer.alloc(2), u32(value.length), value]);
  return Buffer.concat([tag, u16(value.length), value]);
}

const sopClass = '1.2.840.10008.5.1.4.1.1.2';
const sopInstance = '1.2.826.0.1.3680043.10.543.4';
const studyUid = '1.2.826.0.1.3680043.10.543.2';
const seriesUid = '1.2.826.0.1.3680043.10.543.3';
const implementationUid = '1.2.826.0.1.3680043.10.543.99';

const metaRest = Buffer.concat([
  element(0x0002, 0x0001, 'OB', Buffer.from([0, 1])),
  element(0x0002, 0x0002, 'UI', sopClass),
  element(0x0002, 0x0003, 'UI', sopInstance),
  element(0x0002, 0x0010, 'UI', '1.2.840.10008.1.2.1'),
  element(0x0002, 0x0012, 'UI', implementationUid),
  element(0x0002, 0x0013, 'SH', 'FILEVIEWER_0100'),
]);
const fileMeta = Buffer.concat([element(0x0002, 0x0000, 'UL', u32(metaRest.length)), metaRest]);

const pixels = Buffer.alloc(WIDTH * HEIGHT * 2);
let minPixel = 0xffff;
let maxPixel = 0;
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const dx = x - (WIDTH - 1) / 2;
    const dy = y - (HEIGHT - 1) / 2;
    const radius = Math.sqrt(dx * dx + dy * dy);
    const body = radius < 27 ? 600 + Math.round((27 - radius) * 75) : 0;
    const boneA = Math.max(0, 1800 - Math.round(((x - 23) ** 2 + (y - 29) ** 2) * 160));
    const boneB = Math.max(0, 1700 - Math.round(((x - 42) ** 2 + (y - 35) ** 2) * 150));
    const value = Math.min(4095, body + boneA + boneB);
    minPixel = Math.min(minPixel, value);
    maxPixel = Math.max(maxPixel, value);
    pixels.writeUInt16LE(value, (y * WIDTH + x) * 2);
  }
}

const dataset = Buffer.concat([
  element(0x0008, 0x0008, 'CS', 'ORIGINAL\\PRIMARY\\AXIAL'),
  element(0x0008, 0x0016, 'UI', sopClass),
  element(0x0008, 0x0018, 'UI', sopInstance),
  element(0x0008, 0x0020, 'DA', '20260115'),
  element(0x0008, 0x0030, 'TM', '093000'),
  element(0x0008, 0x0050, 'SH', ''),
  element(0x0008, 0x0060, 'CS', 'CT'),
  element(0x0008, 0x0070, 'LO', 'File Viewer Imaging'),
  element(0x0008, 0x0080, 'LO', 'File Viewer Demo Hospital'),
  element(0x0008, 0x0090, 'PN', ''),
  element(0x0008, 0x1030, 'LO', 'Synthetic CT fixture'),
  element(0x0008, 0x103e, 'LO', 'Axial demo series'),
  element(0x0008, 0x1090, 'LO', 'DemoCam 64'),
  element(0x0010, 0x0010, 'PN', 'DEMO^PATIENT'),
  element(0x0010, 0x0020, 'LO', 'FV-0001'),
  element(0x0010, 0x0030, 'DA', '19700101'),
  element(0x0010, 0x0040, 'CS', 'O'),
  element(0x0018, 0x0050, 'DS', '1.0'),
  element(0x0018, 0x0060, 'DS', '120'),
  element(0x0020, 0x000d, 'UI', studyUid),
  element(0x0020, 0x000e, 'UI', seriesUid),
  element(0x0020, 0x0010, 'SH', 'FV-STUDY-1'),
  element(0x0020, 0x0011, 'IS', '1'),
  element(0x0020, 0x0012, 'IS', '1'),
  element(0x0020, 0x0013, 'IS', '1'),
  element(0x0020, 0x0032, 'DS', '0\\0\\0'),
  element(0x0020, 0x0037, 'DS', '1\\0\\0\\0\\1\\0'),
  element(0x0020, 0x0052, 'UI', '1.2.826.0.1.3680043.10.543.5'),
  element(0x0020, 0x1040, 'LO', ''),
  element(0x0028, 0x0002, 'US', us(1)),
  element(0x0028, 0x0004, 'CS', 'MONOCHROME2'),
  element(0x0028, 0x0010, 'US', us(HEIGHT)),
  element(0x0028, 0x0011, 'US', us(WIDTH)),
  element(0x0028, 0x0030, 'DS', '0.8\\0.8'),
  element(0x0028, 0x0100, 'US', us(16)),
  element(0x0028, 0x0101, 'US', us(12)),
  element(0x0028, 0x0102, 'US', us(11)),
  element(0x0028, 0x0103, 'US', us(0)),
  element(0x0028, 0x1050, 'DS', String(Math.round((minPixel + maxPixel) / 2))),
  element(0x0028, 0x1051, 'DS', String(maxPixel - minPixel)),
  element(0x0028, 0x1052, 'DS', '0'),
  element(0x0028, 0x1053, 'DS', '1'),
  element(0x7fe0, 0x0010, 'OW', pixels),
]);

const output = Buffer.concat([Buffer.alloc(128), Buffer.from('DICM'), fileMeta, dataset]);
const destination = join(new URL('../docs/examples/', import.meta.url).pathname, 'sample.dcm');
await writeFile(destination, output);
console.log(`Wrote ${destination} (${output.length} bytes, ${WIDTH}x${HEIGHT} CT pixels ${minPixel}-${maxPixel})`);
