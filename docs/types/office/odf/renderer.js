// OpenDocument (.odt / .odp) reader. Parses content.xml with DOMParser (data, never executed),
// converts the ODF body to clean reading HTML (headings, paragraphs, lists, tables, images),
// inlines pictures as data: URLs (zero off-origin), DOMPurify-sanitizes, and renders via the
// shared sandboxed iframe like the other document types. Presentations render one block per slide.
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { openOdf } from './odflib.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function imgSrc(el, images) {
  const href = el.getAttribute('xlink:href') || el.getAttribute('href') || '';
  if (!href) return '';
  return images.get(href.replace(/^\.\//, '')) || images.get(href) || '';
}

// Convert one ODF node → HTML. Matches on localName (the prefix text:/draw:/table: is stripped).
function convert(node, images) {
  let out = '';
  for (const child of node.childNodes) {
    if (child.nodeType === 3) { out += esc(child.nodeValue); continue; }
    if (child.nodeType !== 1) continue;
    const tag = child.localName;
    switch (tag) {
      case 'h': { const lvl = Math.min(6, Math.max(1, parseInt(child.getAttribute('text:outline-level') || '2', 10))); out += '<h' + lvl + '>' + convert(child, images) + '</h' + lvl + '>'; break; }
      case 'p': out += '<p>' + convert(child, images) + '</p>'; break;
      case 'span': out += convert(child, images); break;
      case 'list': out += '<ul>' + convert(child, images) + '</ul>'; break;
      case 'list-item': out += '<li>' + convert(child, images) + '</li>'; break;
      case 'a': out += '<a href="' + esc(child.getAttribute('xlink:href') || '#') + '" target="_blank" rel="noopener noreferrer">' + convert(child, images) + '</a>'; break;
      case 'line-break': out += '<br>'; break;
      case 'tab': out += ' '; break;
      case 's': { const n = parseInt(child.getAttribute('text:c') || '1', 10); out += '&nbsp;'.repeat(Math.min(n, 50)); break; }
      case 'image': { const src = imgSrc(child, images); if (src) out += '<img class="odf-img" src="' + src + '" alt="">'; break; }
      case 'frame': out += convert(child, images); break;
      case 'text-box': out += '<div class="odf-textbox">' + convert(child, images) + '</div>'; break;
      case 'table': out += '<table>' + convert(child, images) + '</table>'; break;
      case 'table-row': out += '<tr>' + convert(child, images) + '</tr>'; break;
      case 'table-cell': out += '<td>' + convert(child, images) + '</td>'; break;
      case 'page': out += '<section class="odf-slide">' + convert(child, images) + '</section>'; break;   // ODP draw:page
      default: out += convert(child, images);
    }
  }
  return out;
}

export async function render(intake, _ctx) {
  let data;
  try { data = await openOdf(intake); }
  catch (e) { return { bodyHtml: '<div class="json-error"><strong>Could not read OpenDocument</strong><br>' + esc(e.message) + '</div>', hadUnsafe: false }; }

  const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
  const doc = new DOMParser().parseFromString(data.contentXml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    return { bodyHtml: '<div class="json-error">content.xml is not valid XML.</div>', hadUnsafe: false };
  }
  const body = doc.getElementsByTagName('office:body')[0] || doc.documentElement;
  const inner = convert(body, data.images);
  const cls = data.kind === 'presentation' ? 'odf-doc odf-presentation' : 'odf-doc odf-text';

  DOMPurify.removed = [];
  const clean = DOMPurify.sanitize('<article class="' + cls + '">' + inner + '</article>', {
    ADD_ATTR: ['target'],
    ADD_DATA_URI_TAGS: ['img'],
    FORBID_TAGS: ['script', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
  return { bodyHtml: clean, hadUnsafe: DOMPurify.removed.length > 0 };
}
