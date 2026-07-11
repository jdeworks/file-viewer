import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { extractPptxSpeakerNotes, formatPptxNotesStatus } from '../docs/types/office/pptx/notes.js';
import { createPptxNotesFixture, inspectPptxOoxml } from './office-fidelity-fixtures.mjs';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const bytes = await createPptxNotesFixture();
const raw = await inspectPptxOoxml(bytes);
const order = [...raw.presentationXml.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(order, ['rId3', 'rId2'], 'raw presentation order is deliberately opposite physical filenames');
assert.match(raw.presentationRelationshipsXml, /Id="rId3"[^>]*Target="slides\/slide2\.xml"/);
assert.match(raw.slide1RelationshipsXml, /notesSlide1\.xml/);
assert.match(raw.slide2RelationshipsXml, /notesSlide2\.xml/);

const zip = await JSZip.loadAsync(bytes);
const readPart = async (part) => zip.file(part) ? zip.file(part).async('string') : null;
const notes = await extractPptxSpeakerNotes(readPart);
assert.equal(notes.totalSlides, 2);
assert.equal(notes.scannedSlides, 2);
assert.equal(notes.truncated, false);
assert.equal(notes.slides.length, 2);
assert.deepEqual(
  notes.slides.map((slide) => ({
    number: slide.slideNumber,
    slide: slide.slidePart,
    notes: slide.notesPart,
    headline: slide.headline,
    count: slide.paragraphCount,
  })),
  [
    { number: 1, slide: 'ppt/slides/slide2.xml', notes: 'ppt/notesSlides/notesSlide2.xml', headline: 'Presented first headline', count: 2 },
    { number: 2, slide: 'ppt/slides/slide1.xml', notes: 'ppt/notesSlides/notesSlide1.xml', headline: 'Presented second headline', count: 3 },
  ],
  'notes follow presentation relationships, not physical slide filenames',
);
assert.equal(notes.slides[0].paragraphs[1], 'Presented first detail <img src=x onerror=alert(1)>');
assert.ok(notes.slides[1].paragraphs.includes('Additional speaker cue'), 'untyped speaker-note text boxes are included');
const combined = notes.slides.flatMap((slide) => slide.paragraphs).join('\n');
for (const excluded of ['EXCLUDED IMAGE PLACEHOLDER', 'EXCLUDED HEADER', 'EXCLUDED FOOTER', 'EXCLUDED DATE', '999']) {
  assert.equal(combined.includes(excluded), false, `${excluded} is not reported as a speaker note`);
}

const oneSlide = await extractPptxSpeakerNotes(readPart, { maxSlides: 1 });
assert.equal(oneSlide.scannedSlides, 1);
assert.equal(oneSlide.slides.length, 1);
assert.equal(oneSlide.truncated, true, 'slide scan cap is explicit');
assert.equal(formatPptxNotesStatus(oneSlide), '1 slide with speaker notes in first 1 of 2 slides · bounded preview');
assert.equal(
  formatPptxNotesStatus({ ...oneSlide, slides: [] }),
  'No speaker notes found in first 1 of 2 slides · bounded scan',
  'a bounded scan never claims the full deck has no notes',
);
const oneParagraph = await extractPptxSpeakerNotes(readPart, { maxParagraphsPerSlide: 1 });
assert.equal(oneParagraph.slides[0].paragraphCount, 1);
assert.equal(oneParagraph.slides[0].truncated, true, 'paragraph storage cap is explicit');
assert.equal(oneParagraph.truncated, true);
const shortParagraph = await extractPptxSpeakerNotes(readPart, { maxParagraphChars: 12 });
assert.equal(shortParagraph.slides[0].paragraphs[0], 'Presented f…', 'character bounds are visibly ellipsized');
assert.equal(shortParagraph.slides[0].truncated, true);

const controller = new AbortController();
controller.abort();
await assert.rejects(() => extractPptxSpeakerNotes(readPart, { signal: controller.signal }), { name: 'AbortError' });

console.log('PPTX notes fidelity: relationship order, placeholders, bounds, and abort verified');
