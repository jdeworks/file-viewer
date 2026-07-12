import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  applyXlsxLiteralEdit,
  describeXlsxCell,
  describeXlsxHyperlink,
  describeXlsxSheetVisibility,
} from '../docs/types/office/xlsx/cell-fidelity.js';
import { createXlsxFidelityFixture, inspectXlsxOoxml } from './office-fidelity-fixtures.mjs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const bytes = createXlsxFidelityFixture();
const raw = await inspectXlsxOoxml(bytes);

assert.match(raw.workbookXml, /name="Hidden Sheet"[^>]*state="hidden"/, 'raw OOXML marks hidden state 1');
assert.match(raw.workbookXml, /name="Very Hidden"[^>]*state="veryHidden"/, 'raw OOXML marks hidden state 2');
assert.match(raw.formulaCell, /<f>SUM\(A2:A3\)<\/f>/, 'raw OOXML carries the formula');
assert.match(raw.formulaCell, /<v>3<\/v>/, 'raw OOXML carries the cached result independently');
assert.match(raw.commentsXml, /Stored result/, 'raw OOXML carries the cell comment');
assert.match(raw.sheetRelationships, /Target="https:\/\/example\.test\/workbook-docs"/, 'raw OOXML carries the safe hyperlink target');

const workbook = XLSX.read(bytes, {
  type: 'array', cellDates: true, cellFormula: true, cellHTML: false,
  cellNF: true, cellStyles: true, cellText: true,
});
const formulaCell = workbook.Sheets['Visible Data'].B2;
assert.equal(formulaCell.f, 'SUM(A2:A3)');
assert.equal(formulaCell.v, 3);
assert.equal(formulaCell.w, '3.00');
assert.equal(formulaCell.c[0].t, 'Stored result — verify inputs before publishing.');
assert.equal(formulaCell.l.Target, 'https://example.test/workbook-docs');
assert.equal(describeXlsxSheetVisibility(workbook, 0).label, 'Visible');
assert.equal(describeXlsxSheetVisibility(workbook, 1).label, 'Hidden');
assert.equal(describeXlsxSheetVisibility(workbook, 2).label, 'Very hidden');

const description = describeXlsxCell(XLSX, formulaCell, 'B2');
assert.deepEqual(
  { kind: description.kind, formula: description.formula, cached: description.cached, display: description.display },
  { kind: 'Formula', formula: '=SUM(A2:A3)', cached: '3', display: '3.00' },
);
assert.equal(description.comments[0].author, 'Analyst');
assert.equal(description.hyperlink.clickable, true);

for (const target of ['javascript:alert(1)', 'file:///etc/passwd', 'mailto:test@example.test', '#Sheet2!A1', '/relative']) {
  assert.deepEqual(describeXlsxHyperlink({ Target: target }), { target, href: null, clickable: false });
}
assert.equal(describeXlsxHyperlink({ Target: 'https://example.test/path' }).clickable, true);
assert.equal(describeXlsxHyperlink({ Target: 'http://example.test/path' }).clickable, true);

const original = {
  t: 'n', v: 3, f: 'SUM(A2:A3)', F: 'B2:B2', w: '3.00', h: '3.00', z: '0.00',
  c: [{ a: 'Analyst', t: 'Keep me' }], l: { Target: 'https://example.test' }, s: { patternType: 'solid' },
};
assert.throws(() => applyXlsxLiteralEdit(original, '42'), /explicit destructive replacement/);
const literal = applyXlsxLiteralEdit(original, '42', { replaceFormula: true });
assert.equal(literal.t, 'n');
assert.equal(literal.v, 42);
assert.equal('f' in literal, false);
assert.equal('F' in literal, false);
assert.equal('w' in literal, false);
assert.equal('h' in literal, false);
assert.strictEqual(literal.c, original.c, 'comments survive a literal replacement');
assert.strictEqual(literal.l, original.l, 'hyperlinks survive a literal replacement');
assert.strictEqual(literal.s, original.s, 'style metadata survives a literal replacement');
assert.equal(literal.z, '0.00', 'number format survives a literal replacement');
assert.equal(original.f, 'SUM(A2:A3)', 'the original parsed cell is not mutated');

console.log('XLSX fidelity: raw OOXML, cell inspection, safe links, and literal replacement verified');
