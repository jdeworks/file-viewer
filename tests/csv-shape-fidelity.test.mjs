import assert from 'node:assert/strict';
import { csvColumnLabels, csvRowsToRecords, csvShapeDiagnostics, maxCsvColumns } from '../docs/types/text/csv/shape.js';

assert.equal(maxCsvColumns([]), 0, 'empty input has no invented columns');
for (const width of [2, 3, 4]) {
  const rows = [Array.from({ length: width }, (_, index) => `h${index + 1}`)];
  assert.equal(maxCsvColumns(rows), width, `exact width ${width}`);
}

const shortFirst = [
  ['name', 'score'],
  ['Ada', '10', 'Paris', 'A'],
  ['Bob', '20'],
];
assert.equal(maxCsvColumns(shortFirst), 4, 'a wider later row defines the table width');
assert.deepEqual(csvColumnLabels(shortFirst), ['name', 'score', 'column_3', 'column_4']);
assert.deepEqual(csvRowsToRecords(shortFirst), [
  { name: 'Ada', score: '10', column_3: 'Paris', column_4: 'A' },
  { name: 'Bob', score: '20', column_3: '', column_4: '' },
], 'JSON records retain later columns and represent missing cells explicitly');

const wideFirst = [
  ['a', 'b', 'c', 'd'],
  ['1', '2'],
  ['3', '4', '5', '6'],
];
assert.equal(maxCsvColumns(wideFirst), 4, 'a wide header remains authoritative for shorter rows');
assert.deepEqual(csvRowsToRecords(wideFirst)[0], { a: '1', b: '2', c: '', d: '' });

const duplicateHeaders = [
  ['name', 'name', '', 'name'],
  ['first', 'second', 'third', 'fourth'],
];
assert.deepEqual(csvColumnLabels(duplicateHeaders), ['name', 'name_2', 'column_3', 'name_3']);
assert.deepEqual(Object.values(csvRowsToRecords(duplicateHeaders)[0]), ['first', 'second', 'third', 'fourth'], 'duplicate and empty headers cannot overwrite cells');

const noHeader = [['1'], ['2', '3', '4']];
assert.deepEqual(csvColumnLabels(noHeader, false), ['column_1', 'column_2', 'column_3']);
assert.deepEqual(csvRowsToRecords(noHeader, false), [
  { column_1: '1', column_2: '', column_3: '' },
  { column_1: '2', column_2: '3', column_3: '4' },
]);

const prototypeHeader = csvRowsToRecords([['__proto__', '__proto__'], ['left', 'right']])[0];
assert.deepEqual(Object.keys(prototypeHeader), ['__proto__', '__proto___2']);
assert.equal(Object.hasOwn(prototypeHeader, '__proto__'), true, 'special header names stay ordinary own data properties');
assert.equal(prototypeHeader.__proto__, 'left');

const diagnostics = csvShapeDiagnostics([
  ['name', 'score'],
  ['Ada', '10'],
  ['Bob'],
  ['Cy', '30', 'extra'],
], [{ code: 'MissingQuotes', row: 3, message: 'Quoted field unterminated' }], true);
assert.match(diagnostics[0], /2 rows have inconsistent field counts/);
assert.match(diagnostics[0], /row 3 has 1/);
assert.match(diagnostics[0], /row 4 has 3/);
assert.match(diagnostics[1], /Row 4: unterminated quoted field/);

console.log('CSV shape fidelity: ragged widths, records, and recovery diagnostics verified');
