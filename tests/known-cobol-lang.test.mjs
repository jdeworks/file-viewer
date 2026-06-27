// Depth test for the COBOL known view: must capture REAL structure — the four divisions,
// PROGRAM-ID, data items WITH PIC-derived type + value, files (SELECT/FD), and PROCEDURE
// paragraphs/sections — not just a flat name list. Pure (analyzeCobol is DOM-free).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeCobol } from '../docs/types/text/known/cobol-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));

const FIXTURE = `       IDENTIFICATION DIVISION.
       PROGRAM-ID. INLINE-TEST.
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-REC.
           05  WS-COUNT   PIC 9(5) VALUE ZEROS.
           05  WS-NAME    PIC X(20).
       PROCEDURE DIVISION.
       MAIN-PARA.
           STOP RUN.
`;

let source, usedSample = false;
const samplePath = resolve(HERE, '../docs/examples/sample.cob');
if (existsSync(samplePath)) { source = readFileSync(samplePath, 'utf8'); usedSample = true; }
else { source = FIXTURE; }

const { programId, divisions, sections, paragraphs, dataItems, files } = analyzeCobol(source);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const item = (n) => dataItems.find((d) => d.name.toUpperCase() === n);

console.log(usedSample ? '(using docs/examples/sample.cob)' : '(using inline fixture)');

// PROGRAM-ID captured
ok(!!programId, `PROGRAM-ID captured: ${programId}`);

// divisions present
ok(divisions.includes('IDENTIFICATION') && divisions.includes('DATA') && divisions.includes('PROCEDURE'),
   `divisions: ${divisions.join(', ')}`);

// at least one data item with a PIC-derived type
ok(dataItems.length > 0, `data items: ${dataItems.length}`);
ok(dataItems.some((d) => d.pic && d.type), 'a data item carries a PIC-derived type (not name-only)');

// a paragraph captured
ok(paragraphs.length > 0, `paragraphs: ${paragraphs.join(', ')}`);

if (usedSample) {
  ok(programId === 'PAYROLL-CALC', 'sample PROGRAM-ID = PAYROLL-CALC');
  ok(divisions.length === 4, 'all four divisions detected');

  // numeric vs alphanumeric type inference
  const empName = item('EMP-NAME');
  ok(empName && empName.pic === 'X(30)' && empName.type === 'alphanumeric', 'EMP-NAME PIC X(30) → alphanumeric');
  const empHours = item('EMP-HOURS');
  ok(empHours && empHours.type === 'decimal', 'EMP-HOURS PIC 9(3)V9(1) → decimal (implied decimal)');
  const eof = item('WS-EOF-FLAG');
  ok(eof && eof.type === 'alphanumeric' && eof.value === "'N'", "WS-EOF-FLAG VALUE 'N' captured");
  const otRate = item('WS-OT-RATE');
  ok(otRate && otRate.value === '1.5', 'WS-OT-RATE VALUE 1.5 captured');

  // files: SELECT + FD
  ok(files.some((f) => f.name === 'EMPLOYEE-FILE' && f.kind === 'SELECT' && f.assign === 'EMPFILE.DAT'),
     'SELECT EMPLOYEE-FILE ASSIGN TO EMPFILE.DAT');
  ok(files.some((f) => f.name === 'EMPLOYEE-FILE' && f.kind === 'FD'), 'FD EMPLOYEE-FILE descriptor');

  // procedure sections + paragraphs
  ok(sections.some((s) => s.name === 'MAIN-SECTION'), 'MAIN-SECTION section captured');
  ok(paragraphs.includes('CALCULATE-PAY') && paragraphs.includes('READ-EMPLOYEE'), 'named paragraphs captured');
} else {
  ok(programId === 'INLINE-TEST', 'fixture PROGRAM-ID = INLINE-TEST');
  ok(item('WS-COUNT') && item('WS-COUNT').type === 'numeric', 'WS-COUNT PIC 9(5) → numeric');
  ok(item('WS-NAME') && item('WS-NAME').type === 'alphanumeric', 'WS-NAME PIC X(20) → alphanumeric');
  ok(paragraphs.includes('MAIN-PARA'), 'MAIN-PARA paragraph captured');
}

console.log(failed ? `\n${failed} failed` : '\nall cobol-lang assertions passed');
process.exit(failed ? 1 : 0);
