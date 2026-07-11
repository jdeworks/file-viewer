import assert from 'node:assert/strict';
import {
  diagnoseDuplicateJsonKeys,
  duplicateJsonWarningHtml,
  jsonPointer,
} from '../docs/types/text/json/duplicate-keys.js';
import { parseJsonLike } from '../docs/types/text/json/jsonparse.js';
import { diffJson } from '../docs/types/text/json/jsondiff.js';

assert.equal(jsonPointer(['items', 0, 'a/b~c']), '/items/0/a~1b~0c');

const bomSource = '\ufeff{"name":"first","name":"last"}';
const bomParsed = parseJsonLike(bomSource);
assert.equal(bomParsed.mode, 'bom');
assert.equal(bomParsed.data.name, 'last');
assert.match(bomParsed.warnings.join(' '), /source is unchanged/);
assert.equal(bomSource.startsWith('\ufeff'), true, 'BOM recovery never rewrites the caller source');
const bomJsonc = parseJsonLike('\ufeff{/* keep */"value":1,}');
assert.equal(bomJsonc.mode, 'jsonc');
assert.equal(bomJsonc.warnings.length, 2, 'BOM and JSONC recoveries are both disclosed');
const bomDiff = diffJson('\ufeff{"value":1}', '{"value":1}');
assert.equal(bomDiff.ignoredBom, true);
assert.equal(bomDiff.recoveredJsonc, false);
const jsoncDiff = diffJson('{/* comment */"value":1,}', '{"value":1}');
assert.equal(jsoncDiff.recoveredJsonc, true);

const source = '\ufeff{\r\n'
  + '  "plain": 1,\r\n'
  + '  "\\u0070lain": 2,\r\n'
  + '  "nested": {"same": 1, "same": 2},\r\n'
  + '  "other": {"same": 3},\r\n'
  + '  "items": [{"a/b~c": 1, "a\\/b\\u007ec": 2}],\r\n'
  + '  "__proto__": 1, "__proto__": 2,\r\n'
  + '  "\\uD83D\\uDE00": 1, "😀": 2\r\n'
  + '}';
const report = diagnoseDuplicateJsonKeys(source);
assert.equal(report.complete, true);
assert.equal(report.stoppedAt, null);
assert.equal(report.totalDuplicates, 5);
assert.equal(report.omittedDiagnostics, 0);
assert.deepEqual(
  report.diagnostics.map(({ key, pointer, first, duplicate }) => ({
    key,
    pointer,
    first: [first.line, first.column],
    duplicate: [duplicate.line, duplicate.column],
  })),
  [
    { key: 'plain', pointer: '/plain', first: [2, 3], duplicate: [3, 3] },
    { key: 'same', pointer: '/nested/same', first: [4, 14], duplicate: [4, 25] },
    { key: 'a/b~c', pointer: '/items/0/a~1b~0c', first: [6, 14], duplicate: [6, 26] },
    { key: '__proto__', pointer: '/__proto__', first: [7, 3], duplicate: [7, 19] },
    { key: '😀', pointer: '/😀', first: [8, 3], duplicate: [8, 22] },
  ],
  'keys are decoded and scoped while CRLF/BOM locations and JSON Pointer escaping stay exact',
);

const separateScopes = diagnoseDuplicateJsonKeys('{"left":{"id":1},"right":{"id":2}}');
assert.equal(separateScopes.totalDuplicates, 0, 'the same key in separate object scopes is not a duplicate');

const jsonc = diagnoseDuplicateJsonKeys(`{
  // "fake": 1, "fake": 2
  "url": "https://example.test/\\\"key\\\":value",
  "value": 1,
  /* another "value": 9 */
  "value": 2,
}`);
assert.equal(jsonc.complete, true, 'comments and trailing commas remain structurally scannable');
assert.equal(jsonc.totalDuplicates, 1);
assert.equal(jsonc.diagnostics[0].pointer, '/value');
assert.deepEqual(
  [jsonc.diagnostics[0].first.line, jsonc.diagnostics[0].duplicate.line],
  [4, 6],
  'keys embedded in strings and comments are ignored',
);

const malformed = diagnoseDuplicateJsonKeys('{"kept":1,"kept":2,"nested":{"x":1,"x":2},BROKEN,"late":1,"late":2}');
assert.equal(malformed.complete, false);
assert.equal(malformed.totalDuplicates, 2, 'certain duplicates before a malformed tail survive');
assert.deepEqual(malformed.diagnostics.map((item) => item.pointer), ['/kept', '/nested/x']);
assert.equal(malformed.stoppedAt?.column, 43);
const malformedHtml = duplicateJsonWarningHtml(malformed, { malformed: true });
assert.match(malformedHtml, /parse error above is primary/i);
assert.match(malformedHtml, /line 1, column 11/);

const cappedSource = '{' + Array.from({ length: 6 }, (_, index) => `"key${index}":0,"key${index}":1`).join(',') + '}';
const capped = diagnoseDuplicateJsonKeys(cappedSource, { maxDiagnostics: 2 });
assert.equal(capped.complete, true);
assert.equal(capped.totalDuplicates, 6, 'all duplicate occurrences are counted beyond the storage cap');
assert.equal(capped.diagnostics.length, 2);
assert.equal(capped.omittedDiagnostics, 4);
assert.match(duplicateJsonWarningHtml(capped), /Showing 2 of 6 duplicate occurrences; 4 more omitted/);

const repeated = diagnoseDuplicateJsonKeys('{"x":1,"x":2,"x":3}');
assert.equal(repeated.totalDuplicates, 2, 'each occurrence after the first is counted');
assert.deepEqual(repeated.diagnostics.map((item) => item.first.column), [2, 2]);

const notAProperty = diagnoseDuplicateJsonKeys('{"x":1,"x" BROKEN}');
assert.equal(notAProperty.totalDuplicates, 0, 'a repeated string without a confirming colon is not diagnosed as a key');
assert.equal(notAProperty.complete, false);

const deeplyNested = diagnoseDuplicateJsonKeys('['.repeat(10_000) + '0' + ']'.repeat(10_000));
assert.equal(deeplyNested.complete, true, 'the iterative scanner does not recurse on deeply nested input');

const longKey = 'x'.repeat(1_000);
const boundedText = diagnoseDuplicateJsonKeys(`{"${longKey}":1,"${longKey}":2}`, {
  maxKeyChars: 20,
  maxPointerChars: 30,
});
assert.equal(boundedText.diagnostics[0].key.length, 20);
assert.equal(boundedText.diagnostics[0].pointer.length, 30);
assert.equal(boundedText.diagnostics[0].keyTruncated, true);
assert.equal(boundedText.diagnostics[0].pointerTruncated, true);
assert.match(duplicateJsonWarningHtml(boundedText), /key shortened from 1000 characters.*path shortened from 1001 characters/);

let seed = 0x5eed1234;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
function generatedValue(depth = 0) {
  if (depth > 4 || random() < 0.35) {
    const leaves = [null, true, false, random() * 100, `x\"/\n${Math.floor(random() * 9)}`];
    return leaves[Math.floor(random() * leaves.length)];
  }
  if (random() < 0.5) return Array.from({ length: Math.floor(random() * 5) }, () => generatedValue(depth + 1));
  const object = {};
  for (let index = 0; index < Math.floor(random() * 5); index++) {
    object[`k${depth}_${index}${random() < 0.2 ? '~/' : ''}`] = generatedValue(depth + 1);
  }
  return object;
}
for (let index = 0; index < 2_000; index++) {
  const generated = diagnoseDuplicateJsonKeys(JSON.stringify(generatedValue()));
  assert.equal(generated.complete, true, `valid generated JSON ${index} scans to completion`);
  assert.equal(generated.totalDuplicates, 0, `JSON.stringify output ${index} has no duplicates`);
}

console.log('JSON duplicate keys: decoded scopes, pointers, locations, JSONC, malformed tails, and caps verified');
