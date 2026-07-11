import assert from 'node:assert/strict';
import {
  DOCX_MIME,
  docxContentIsDirty,
  originalDocxDownload,
  rebuiltDocxFilename,
} from '../docs/types/office/docx/fidelity.js';
import { createDocxFidelityFixture, inspectDocxOoxml } from './office-fidelity-fixtures.mjs';

const bytes = await createDocxFidelityFixture();
const raw = await inspectDocxOoxml(bytes);
assert.match(raw.documentXml, /DOCX fidelity document/);
assert.match(raw.commentsXml, /Original review comment/, 'raw fixture contains a comment omitted by semantic HTML');
assert.match(raw.footnotesXml, /Original footnote detail/, 'raw fixture contains a footnote omitted by rebuilt export');
assert.match(raw.headerXml, /Original confidential header/, 'raw fixture contains a header omitted by rebuilt export');
assert.match(raw.relationshipsXml, /relationships\/comments/);
assert.match(raw.relationshipsXml, /relationships\/footnotes/);
assert.match(raw.relationshipsXml, /relationships\/header/);

const intake = { bytes, filename: 'Exact Original.DOCX', mime: DOCX_MIME };
const original = originalDocxDownload(intake);
assert.strictEqual(original.bytes, bytes, 'original download reuses the exact intake bytes');
assert.equal(original.filename, 'Exact Original.DOCX', 'original filename and case are retained');
assert.equal(original.mime, DOCX_MIME, 'original MIME is retained');
assert.equal(originalDocxDownload({ bytes, filename: '', mime: '' }).filename, 'document.docx');
assert.equal(originalDocxDownload({ bytes, filename: '', mime: '' }).mime, DOCX_MIME);
assert.equal(rebuiltDocxFilename('Exact Original.DOCX'), 'Exact Original-rebuilt.docx');

const baseline = '<h1>Title</h1><p>Body</p>';
assert.equal(docxContentIsDirty(baseline, baseline), false, 'entering/exiting unchanged stays clean');
assert.equal(docxContentIsDirty(baseline, baseline + '<p>Edit</p>'), true, 'a real net edit enables rebuilding');
assert.equal(docxContentIsDirty(null, baseline), false, 'no baseline never produces a false dirty state');

console.log('DOCX fidelity: raw OOXML, exact original descriptor, and net-dirty semantics verified');
