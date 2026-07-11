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

export async function createDocxFidelityFixture() {
  const zip = new JSZip();
  const date = new Date('2020-01-02T03:04:05Z');
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
  <Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`,
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>DOCX fidelity fixture</dc:title><dc:creator>File Viewer tests</dc:creator></cp:coreProperties>`,
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>
  <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>DOCX fidelity document</w:t></w:r></w:p>
  <w:p><w:commentRangeStart w:id="0"/><w:r><w:t>Original paragraph</w:t></w:r><w:commentRangeEnd w:id="0"/><w:r><w:commentReference w:id="0"/></w:r></w:p>
  <w:p><w:r><w:t>Footnote marker</w:t></w:r><w:r><w:footnoteReference w:id="1"/></w:r></w:p>
  <w:sectPr><w:headerReference w:type="default" r:id="rId3"/></w:sectPr>
</w:body></w:document>`,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    'word/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:qFormat/></w:style></w:styles>`,
    'word/comments.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:comment w:id="0" w:author="Reviewer"><w:p><w:r><w:t>Original review comment</w:t></w:r></w:p></w:comment></w:comments>`,
    'word/footnotes.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:id="1"><w:p><w:r><w:t>Original footnote detail</w:t></w:r></w:p></w:footnote></w:footnotes>`,
    'word/header1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>Original confidential header</w:t></w:r></w:p></w:hdr>`,
  };
  for (const [name, content] of Object.entries(files)) zip.file(name, content, { date });
  return new Uint8Array(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
}

export async function inspectDocxOoxml(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const read = async (name) => zip.file(name) ? zip.file(name).async('string') : '';
  return {
    files: Object.keys(zip.files).filter((name) => !zip.files[name].dir).sort(),
    documentXml: await read('word/document.xml'),
    commentsXml: await read('word/comments.xml'),
    footnotesXml: await read('word/footnotes.xml'),
    headerXml: await read('word/header1.xml'),
    relationshipsXml: await read('word/_rels/document.xml.rels'),
  };
}
