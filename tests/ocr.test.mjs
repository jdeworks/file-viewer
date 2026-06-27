// Pure-logic unit tests for the shared OCR module (no wasm/browser): subtitle serializers, timestamp
// formatting, frame-sampling math, and consecutive-cue merging. The end-to-end OCR (wasm+worker on a
// real image) is covered by the browser smoke area tests/areas/ocr.mjs.
import { toSRT, toVTT, toText, toJSON, fmtSRT, fmtVTT } from '../docs/core/ocr/subtitles.js';
import { sampleTimes, mergeCues } from '../docs/core/ocr/frames.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), msg + (a === b ? '' : ` (got ${JSON.stringify(a)})`));

// timestamp formatting
eq(fmtSRT(0), '00:00:00,000', 'fmtSRT(0)');
eq(fmtSRT(3661.5), '01:01:01,500', 'fmtSRT(3661.5) — h:m:s,ms with comma');
eq(fmtVTT(3661.5), '01:01:01.500', 'fmtVTT uses a period');
eq(fmtSRT(2.004), '00:00:02,004', 'fmtSRT sub-second ms');

// sampleTimes
eq(sampleTimes(10, 2), [0, 2, 4, 6, 8], 'sampleTimes(10,2)');
eq(sampleTimes(5, 0.5), [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5], 'sampleTimes(5,0.5)');
eq(sampleTimes(0, 2), [], 'sampleTimes(0,*) empty');
eq(sampleTimes(10, 0), [], 'sampleTimes(*,0) empty');

// mergeCues: drop empties, merge consecutive identical, end = next start (last = +interval)
const raw = [
  { time: 0, text: 'HELLO', confidence: 90 },
  { time: 2, text: 'HELLO', confidence: 88 },   // merge with previous
  { time: 4, text: '', confidence: 0 },         // dropped
  { time: 6, text: 'WORLD', confidence: 80 },
];
const cues = mergeCues(raw, 2);
eq(cues.length, 2, 'mergeCues collapses to 2 cues');
eq([cues[0].start, cues[0].end, cues[0].text], [0, 4, 'HELLO'], 'first cue merged 0→4');
eq([cues[1].start, cues[1].end, cues[1].text], [6, 8, 'WORLD'], 'last cue end = start + interval');

// serializers over the merged cues
const srt = toSRT(cues);
ok(srt.startsWith('1\n00:00:00,000 --> 00:00:04,000\nHELLO'), 'toSRT numbered + comma timestamps');
ok(srt.includes('2\n00:00:06,000 --> 00:00:08,000\nWORLD'), 'toSRT second cue');
ok(toVTT(cues).startsWith('WEBVTT\n\n00:00:00.000 --> 00:00:04.000\nHELLO'), 'toVTT header + period timestamps');
eq(toText(cues), '[00:00:00] HELLO\n[00:00:06] WORLD\n', 'toText timestamped lines');
const json = JSON.parse(toJSON(cues));
ok(json.length === 2 && json[0].text === 'HELLO' && json[0].confidence === 90 && json[0].start === 0 && json[0].end === 4, 'toJSON structured cues');

// empty input → empty/valid output
eq(toSRT([]), '', 'toSRT([]) empty');
ok(toVTT([]) === 'WEBVTT\n\n', 'toVTT([]) is just the header');

console.log(failed ? `\n${failed} assertion(s) failed` : '\nall OCR unit assertions passed');
process.exit(failed ? 1 : 0);
