// DOCX export — builds a real Word document (.docx is a ZIP of OOXML) from a sanitized HTML preview
// using the already-vendored JSZip. No heavy writer library: we emit the minimal valid OOXML parts
// ([Content_Types].xml, _rels/.rels, word/document.xml) and map the body's block elements to
// paragraphs with bold/italic runs; headings become bold, larger runs (so no styles.xml is needed).
// data:-URL <img> elements are embedded as real inline pictures (word/media/* + drawing XML).
import { loadGlobal, vendor } from './script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const EMU_PER_PX = 9525;            // 914400 EMU/inch ÷ 96 px/inch
const MAX_W_EMU = 5486400;          // 6 inches — keep images inside the page margins
const IMG_EXT = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/jpg': 'jpeg', 'image/gif': 'gif', 'image/bmp': 'bmp' };

// Decode a data:image/...;base64,... URL into { bytes, ext }. Returns null for anything else
// (remote URLs, svg, malformed) — those images are simply dropped from the .docx.
function decodeDataImage(src) {
  const m = /^data:(image\/[a-z+]+);base64,([\s\S]+)$/i.exec(src || '');
  if (!m) return null;
  const ext = IMG_EXT[m[1].toLowerCase()];
  if (!ext) return null;            // svg etc. — Word needs vector handling we don't do
  try {
    const bin = atob(m[2].replace(/\s/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, ext };
  } catch { return null; }
}

// Natural pixel size of a data-URL image, via a transient Image. Falls back to 400×300.
function imageSize(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 400, h: img.naturalHeight || 300 });
    img.onerror = () => resolve({ w: 400, h: 300 });
    img.src = src;
  });
}

// Inline-picture paragraph XML for one embedded image (rId → word/media file).
function drawingXml(rId, id, name, cx, cy) {
  return '<w:p><w:r><w:drawing>'
    + '<wp:inline distT="0" distB="0" distL="0" distR="0">'
    + '<wp:extent cx="' + cx + '" cy="' + cy + '"/>'
    + '<wp:docPr id="' + id + '" name="' + esc(name) + '"/>'
    + '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
    + '<pic:pic><pic:nvPicPr><pic:cNvPr id="' + id + '" name="' + esc(name) + '"/><pic:cNvPicPr/></pic:nvPicPr>'
    + '<pic:blipFill><a:blip r:embed="' + rId + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
    + '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>'
    + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'
    + '</a:graphicData></a:graphic></wp:inline>'
    + '</w:drawing></w:r></w:p>';
}

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

// Append image markers ({ img: src }) for every data-URL <img> descendant, in document order.
function collectImages(node, items) {
  for (const img of node.querySelectorAll('img')) {
    const src = img.getAttribute('src');
    if (src && src.startsWith('data:image/')) items.push({ img: src });
  }
}

// Items are either paragraph XML strings or { img: src } markers (resolved to drawings later).
function walkBlocks(node, items) {
  for (const c of node.children) {
    const tag = c.tagName.toLowerCase();
    if (tag === 'img') {
      const src = c.getAttribute('src');
      if (src && src.startsWith('data:image/')) items.push({ img: src });
    } else if (HEADING_SZ[tag]) {
      const runs = []; extractRuns(c, true, false, runs);
      items.push(paraXml(runs, HEADING_SZ[tag]));
      collectImages(c, items);
    } else if (tag === 'p' || tag === 'li') {
      const runs = []; extractRuns(c, false, false, runs);
      items.push(paraXml(tag === 'li' ? [{ text: '• ' }, ...runs] : runs));
      collectImages(c, items);
    } else if (tag === 'pre') {
      items.push(paraXml([{ text: c.textContent }]));
    } else if (c.children.length) {
      walkBlocks(c, items);                 // recurse into containers (article/section/div…)
    } else {
      const txt = (c.textContent || '').trim();
      if (txt) items.push(paraXml([{ text: txt }]));
    }
  }
}

function bodyToItems(bodyHtml) {
  const doc = new DOMParser().parseFromString('<body><div id="r">' + bodyHtml + '</div></body>', 'text/html');
  const root = doc.getElementById('r');
  const items = [];
  if (root) walkBlocks(root, items);
  return items.length ? items : ['<w:p/>'];
}

function contentTypesXml(exts) {
  const ct = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp' };
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + [...exts].map((e) => '<Default Extension="' + e + '" ContentType="' + ct[e] + '"/>').join('')
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '</Types>';
}
const RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
  + '</Relationships>';

// Namespaces declared once on the document root so drawing/relationship refs resolve.
const DOC_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
  + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
  + ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'
  + ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
  + ' xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

export async function buildDocx(bodyHtml) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const items = bodyToItems(bodyHtml);

  // Resolve every image marker: decode the data URL, measure it, register a media part + rel.
  const media = [];               // { file, bytes }
  const imgRels = [];             // word/_rels/document.xml.rels entries
  const exts = new Set();
  const body = [];
  for (const it of items) {
    if (typeof it === 'string') { body.push(it); continue; }
    const dec = decodeDataImage(it.img);
    if (!dec) continue;           // unsupported/remote image — drop it
    const n = media.length + 1;
    const file = 'image' + n + '.' + dec.ext;
    const rId = 'rIdImg' + n;
    media.push({ file, bytes: dec.bytes });
    imgRels.push('<Relationship Id="' + rId + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + file + '"/>');
    exts.add(dec.ext);
    const { w, h } = await imageSize(it.img);
    let cx = w * EMU_PER_PX, cy = h * EMU_PER_PX;
    if (cx > MAX_W_EMU) { cy = Math.round(cy * MAX_W_EMU / cx); cx = MAX_W_EMU; }
    body.push(drawingXml(rId, n, file, cx, cy));
  }

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml(exts));
  zip.folder('_rels').file('.rels', RELS);
  const wordDir = zip.folder('word');
  const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:document ' + DOC_NS + '><w:body>'
    + body.join('')
    + '<w:sectPr/></w:body></w:document>';
  wordDir.file('document.xml', doc);
  if (media.length) {
    wordDir.folder('_rels').file('document.xml.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + imgRels.join('') + '</Relationships>');
    const mediaDir = wordDir.folder('media');
    for (const m of media) mediaDir.file(m.file, m.bytes);
  }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
