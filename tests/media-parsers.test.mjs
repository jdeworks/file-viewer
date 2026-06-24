import assert from 'node:assert/strict';

import { parseSubtitles, parseTimestamp } from '../docs/types/media/subtitles.js';
import { parseId3 } from '../docs/types/media/id3.js';

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
