#!/usr/bin/env node
// Generates docs/examples/sample.mid — a deterministic Type-1 sequence with a conductor track,
// piano melody, bass line, 48 notes, 12 pitches, two channels/programs, and eight seconds of music.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PPQN = 480;
const u16 = (value) => Buffer.from([value >> 8 & 0xff, value & 0xff]);
const u32 = (value) => Buffer.from([value >>> 24 & 0xff, value >>> 16 & 0xff, value >>> 8 & 0xff, value & 0xff]);
function vlq(value) {
  const bytes = [value & 0x7f];
  while ((value >>= 7)) bytes.unshift((value & 0x7f) | 0x80);
  return Buffer.from(bytes);
}
const event = (delta, ...bytes) => Buffer.concat([vlq(delta), Buffer.from(bytes)]);
const meta = (delta, type, data) => {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return Buffer.concat([vlq(delta), Buffer.from([0xff, type]), vlq(bytes.length), bytes]);
};
const track = (events) => {
  const body = Buffer.concat([...events, meta(0, 0x2f, Buffer.alloc(0))]);
  return Buffer.concat([Buffer.from('MTrk'), u32(body.length), body]);
};

const totalTicks = 7680;
const conductor = track([
  meta(0, 0x03, 'Conductor'),
  meta(0, 0x51, Buffer.from([0x07, 0xa1, 0x20])), // 120 BPM
  meta(0, 0x58, Buffer.from([4, 2, 24, 8])),
  meta(0, 0x59, Buffer.from([0, 0])),
  meta(totalTicks, 0x06, 'End of demo'),
]);

const melodyPitches = [60, 64, 67, 72, 71, 67, 64, 60, 62, 65, 69, 74];
const melodyEvents = [meta(0, 0x03, 'Piano Melody'), meta(0, 0x04, 'Acoustic Grand Piano'), event(0, 0xc0, 0)];
for (let index = 0; index < 32; index++) {
  const pitch = melodyPitches[index % melodyPitches.length];
  melodyEvents.push(event(0, 0x90, pitch, 86 + index % 20));
  melodyEvents.push(event(240, 0x80, pitch, 0));
}
const melody = track(melodyEvents);

const bassPitches = [36, 43, 41, 48, 38, 45, 43, 36];
const bassEvents = [meta(0, 0x03, 'Bass Foundation'), meta(0, 0x04, 'Acoustic Bass'), event(0, 0xc1, 32)];
for (let index = 0; index < 16; index++) {
  const pitch = bassPitches[index % bassPitches.length];
  bassEvents.push(event(0, 0x91, pitch, 78));
  bassEvents.push(event(480, 0x81, pitch, 0));
}
const bass = track(bassEvents);

const header = Buffer.concat([Buffer.from('MThd'), u32(6), u16(1), u16(3), u16(PPQN)]);
const output = Buffer.concat([header, conductor, melody, bass]);
const destination = join(new URL('../docs/examples/', import.meta.url).pathname, 'sample.mid');
await writeFile(destination, output);
console.log(`Wrote ${destination} (${output.length} bytes, 3 tracks, 48 notes, 8 seconds)`);
