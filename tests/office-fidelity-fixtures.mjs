import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const JSZip = require('jszip');

export function createXlsxFidelityFixture() {
  const workbook = XLSX.utils.book_new();
  const visible = XLSX.utils.aoa_to_sheet([
    ['Input', 'Stored formula', 'Unsafe link', 'Mail link'],
    [1, null, 'Do not execute', 'Do not launch'],
    [2],
  ]);
  visible.B2 = {
    t: 'n',
    v: 3,
    f: 'SUM(A2:A3)',
    z: '0.00',
    c: [{ a: 'Analyst', t: 'Stored result — verify inputs before publishing.' }],
    l: { Target: 'https://example.test/workbook-docs', Tooltip: 'Workbook documentation' },
  };
  visible.C2.l = { Target: 'javascript:alert(document.domain)' };
  visible.D2.l = { Target: 'mailto:owner@example.test' };

  XLSX.utils.book_append_sheet(workbook, visible, 'Visible Data');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Hidden payload'], ['retained']]), 'Hidden Sheet');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Very hidden payload'], ['retained']]), 'Very Hidden');
  workbook.Workbook = { Sheets: [{ Hidden: 0 }, { Hidden: 1 }, { Hidden: 2 }] };
  workbook.Props = { Title: 'XLSX fidelity fixture', Author: 'File Viewer tests' };

  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

async function joinedXml(zip, pattern) {
  const files = zip.file(pattern) || [];
  return (await Promise.all(files.map((file) => file.async('string')))).join('\n');
}

export async function inspectXlsxOoxml(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const workbookXml = await zip.file('xl/workbook.xml').async('string');
  const sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  const sheetRelationships = await joinedXml(zip, /^xl\/worksheets\/_rels\/sheet1\.xml\.rels$/);
  const commentsXml = await joinedXml(zip, /^xl\/comments\d*\.xml$/);
  const formulaCell = sheetXml.match(/<c\b[^>]*\br="B2"[^>]*>([\s\S]*?)<\/c>/)?.[1] || '';
  return { workbookXml, sheetXml, sheetRelationships, commentsXml, formulaCell };
}
