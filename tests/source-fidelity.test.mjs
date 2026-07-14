import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  intakeFromBytes,
  intakeFromText,
  parserTextFromSource,
  sourceTextFromParser,
  sourceTextOf,
  withParserText,
  withSourceText,
} from '../docs/core/intake.js';

const exact = '\ufeff{\r\n  "message": "Grüße 🌍",\r\n  "unknown": true\r\n}\r\n';
const bytes = new TextEncoder().encode(exact);
const intake = intakeFromBytes(bytes, 'fidelity.json', 'application/json');
assert.equal(intake.isBinary, false);
assert.equal(intake.hadBom, true);
assert.equal(intake.sourceText, exact);
assert.equal(intake.originalText, exact);
assert.equal(sourceTextOf(intake), exact);
assert.equal(intake.text, exact.slice(1), 'parser-facing text omits only the leading BOM');
assert.equal(intake.text.includes('\r\n'), true, 'parser-facing text retains CRLF');
assert.deepEqual(intake.bytes, bytes);

const originalHash = createHash('sha256').update(intake.bytes).digest('hex');
const editedExact = exact.replace('Grüße 🌍', 'Grüße 🌍 — edited').replace('true', 'false');
const edited = withSourceText(intake, editedExact);
assert.equal(edited.sourceText, editedExact);
assert.equal(edited.text, editedExact.slice(1));
assert.equal(edited.originalText, exact, 'the as-opened text remains immutable across edits');
assert.equal(edited.bytes, intake.bytes, 'the as-opened byte oracle is retained by identity');
assert.equal(createHash('sha256').update(edited.bytes).digest('hex'), originalHash);
assert.equal(edited.sourceText.endsWith('\r\n'), true, 'the trailing CRLF is retained');

const withoutBom = withSourceText(edited, editedExact.slice(1));
assert.equal(withoutBom.sourceText.startsWith('\ufeff'), false);
assert.equal(withoutBom.originalText.startsWith('\ufeff'), true, 'removing the working BOM does not rewrite the original');
assert.equal(withoutBom.text, withoutBom.sourceText);

assert.equal(parserTextFromSource('\ufeffalpha\r\n'), 'alpha\r\n');
assert.equal(parserTextFromSource('alpha\r\n'), 'alpha\r\n');
assert.equal(sourceTextFromParser(intake, 'alpha\r\n'), '\ufeffalpha\r\n', 'parser editors retain the current BOM');
assert.equal(sourceTextFromParser(withoutBom, 'alpha\r\n'), 'alpha\r\n', 'parser editors respect a raw BOM removal');

const parserEdited = withParserText(intake, '{\r\n  "message": "edited"\r\n}\r\n');
assert.equal(parserEdited.sourceText, '\ufeff{\r\n  "message": "edited"\r\n}\r\n');
assert.equal(parserEdited.text, '{\r\n  "message": "edited"\r\n}\r\n');
assert.equal(parserEdited.originalText, exact, 'parser edits retain the exact as-opened baseline');
assert.equal(parserEdited.bytes, intake.bytes, 'parser edits retain the original byte oracle');

const direct = intakeFromText(exact, 'direct.json');
assert.equal(direct.sourceText, exact);
assert.equal(direct.text, exact.slice(1));
assert.deepEqual(direct.bytes, bytes, 'text intake bytes retain the exact BOM/CRLF/Unicode source');

const binary = intakeFromBytes(Uint8Array.from([0, 1, 2]), 'binary.bin');
assert.equal(binary.isBinary, true);
assert.equal(binary.text, null);
assert.equal(binary.sourceText, null);
assert.equal(binary.originalText, null);

const utf16le = intakeFromBytes(
  Uint8Array.from([0xff, 0xfe, 0x41, 0x00, 0x0a, 0x00]),
  'utf16.txt',
  'text/plain; charset=utf-8',
);
assert.equal(utf16le.isBinary, false, 'UTF-16 BOM bypasses the generic NUL/binary heuristic');
assert.equal(utf16le.sourceText, '\ufeffA\n');
assert.equal(utf16le.text, 'A\n');
assert.equal(utf16le.encoding, 'UTF-16 LE');
assert.equal(utf16le.encodingSource, 'BOM');
assert.match(utf16le.encodingWarnings.join(' '), /MIME charset says UTF-8/);

const inferredUtf16be = intakeFromBytes(
  Uint8Array.from([0x00, 0x41, 0x00, 0x42, 0x00, 0x43, 0x00, 0x44]),
  'legacy.txt',
  'text/plain',
);
assert.equal(inferredUtf16be.isBinary, false);
assert.equal(inferredUtf16be.text, 'ABCD');
assert.equal(inferredUtf16be.encoding, 'UTF-16 BE');
assert.equal(inferredUtf16be.encodingSource, 'byte pattern');
assert.match(inferredUtf16be.encodingWarnings.join(' '), /inferred from alternating NUL bytes/);

const malformedUtf8 = intakeFromBytes(Uint8Array.from([0x66, 0x6f, 0x80, 0x6f]), 'bad.txt', 'text/plain');
assert.equal(malformedUtf8.isBinary, false);
assert.equal(malformedUtf8.hadDecodingErrors, true);
assert.match(malformedUtf8.encodingWarnings.join(' '), /Invalid UTF-8 byte sequence/);

console.log('source fidelity: immutable source plus BOM/UTF-16/encoding diagnostics verified');
