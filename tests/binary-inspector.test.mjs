import assert from 'node:assert/strict';
import { hexDump } from '../docs/core/hexdump.js';
import {
  byteStatistics,
  extractAsciiStrings,
  findBytePattern,
  parseHexPattern,
} from '../docs/core/binary-inspector.js';

const bytes = Uint8Array.from({ length: 96 }, (_, index) => index);
const window = hexDump(bytes, 32, 16);
assert.match(window, /^00000010\s+10 11 12 13/m);
assert.match(window, /Window 0x00000010–0x0000002f of 96 loaded bytes\./);
assert.ok(!window.includes('00000000'));

assert.deepEqual([...parseHexPattern('0x50 4b:03-04')], [0x50, 0x4b, 0x03, 0x04]);
assert.equal(parseHexPattern('abc'), null);
assert.equal(parseHexPattern('not hex'), null);

const haystack = new TextEncoder().encode('abc needle abc needle');
const needle = new TextEncoder().encode('needle');
assert.equal(findBytePattern(haystack, needle), 4);
assert.equal(findBytePattern(haystack, needle, 5), 15);
assert.equal(findBytePattern(haystack, new Uint8Array([0xff])), -1);

const stats = byteStatistics(new Uint8Array([0, 1, 0, 1]));
assert.equal(stats.counts[0], 2);
assert.equal(stats.counts[1], 2);
assert.equal(stats.entropy, 1);

const strings = extractAsciiStrings(new TextEncoder().encode('\0Hello\0xy\0World!\0'));
assert.deepEqual(strings, [
  { offset: 1, text: 'Hello' },
  { offset: 10, text: 'World!' },
]);

console.log('binary inspector tests passed');
