// DOCX export — builds a real Word document (.docx is a ZIP of OOXML) from a sanitized HTML preview
// using the already-vendored JSZip. No heavy writer library: we emit the minimal valid OOXML parts
// ([Content_Types].xml, _rels/.rels, word/document.xml) and map the body's block elements to
// paragraphs with bold/italic runs; headings become bold, larger runs (so no styles.xml is needed).
import { loadGlobal, vendor } from './script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Collect inline text runs under a node, tracking bold/italic state.
function extractRuns(node, b, i, out) {
  for (const c of node.childNodes) {
    if (c.nodeType === 3) { if (c.nodeValue) out.push({ text: c.nodeValue, b, i }); }
    else if (c.nodeType === 1) {
      const t = c.tagName.toLowerCase();
      if (t === 'br') out.push({ text: '\n', b, i });
      else extractRuns(c, b || t === 'b' || t === 'strong', i || t === 'i' || t === 'em', out);
    }
  }
}

function runXml(r, sz) {
  const rpr = (r.b || r.i || sz) ? '<w:rPr>' + (r.b ? '<w:b/>' : '') + (r.i ? '<w:i/>' : '') + (sz ? '<w:sz w:val="' + sz + '"/>' : '') + '</w:rPr>' : '';
  return '<w:r>' + rpr + '<w:t xml:space="preserve">' + esc(r.text) + '</w:t></w:r>';
}
function paraXml(runs, sz) {
  if (!runs.length) return '<w:p/>';
  return '<w:p>' + runs.map((r) => runXml(r, sz)).join('') + '</w:p>';
}

const HEADING_SZ = { h1: 40, h2: 32, h3: 28, h4: 26, h5: 24, h6: 22 };   // half-points

function walkBlocks(node, paras) {
  for (const c of node.children) {
    const tag = c.tagName.toLowerCase();
    if (HEADING_SZ[tag]) {
      const runs = []; extractRuns(c, true, false, runs);
      paras.push(paraXml(runs, HEADING_SZ[tag]));
    } else if (tag === 'p' || tag === 'li') {
      const runs = []; extractRuns(c, false, false, runs);
      paras.push(paraXml(tag === 'li' ? [{ text: '• ' }, ...runs] : runs));
    } else if (tag === 'pre') {
      paras.push(paraXml([{ text: c.textContent }]));
    } else if (c.children.length) {
      walkBlocks(c, paras);                 // recurse into containers (article/section/div…)
    } else {
      const txt = (c.textContent || '').trim();
      if (txt) paras.push(paraXml([{ text: txt }]));
    }
  }
}

function bodyToParagraphs(bodyHtml) {
  const doc = new DOMParser().parseFromString('<body><div id="r">' + bodyHtml + '</div></body>', 'text/html');
  const root = doc.getElementById('r');
  const paras = [];
  if (root) walkBlocks(root, paras);
  return paras.length ? paras : ['<w:p/>'];
}

const CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
  + '</Types>';
const RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
  + '</Relationships>';

export async function buildDocx(bodyHtml) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.folder('_rels').file('.rels', RELS);
  const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
    + bodyToParagraphs(bodyHtml).join('')
    + '<w:sectPr/></w:body></w:document>';
  zip.folder('word').file('document.xml', doc);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
