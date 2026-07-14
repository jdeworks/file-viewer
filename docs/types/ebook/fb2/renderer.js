// FictionBook 2 (.fb2) reader. FB2 is plain XML, so we parse it with DOMParser (data, never
// executed), convert the <body> to clean reading HTML, inline its <binary> images as data: URLs
// (so NO off-origin request is ever made), DOMPurify the result, and hand the body to the shared
// sandboxed preview iframe — exactly like the Markdown path. Section nesting becomes heading
// levels so the structure reads naturally.
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { FB2_READER_PREFS } from '../reader-prefs.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function readerShell(content) {
  return '<div class="ebook-reader fb2-reader" data-fv-reader-prefs="' + FB2_READER_PREFS.key + '">'
    + '<input class="ebook-choice ebook-size-normal" id="fb2-size-normal" name="fb2-size" type="radio" value="normal" data-fv-reader-pref="size" checked>'
    + '<input class="ebook-choice ebook-size-large" id="fb2-size-large" name="fb2-size" type="radio" value="large" data-fv-reader-pref="size">'
    + '<input class="ebook-choice ebook-font-serif" id="fb2-font-serif" name="fb2-font" type="radio" value="serif" data-fv-reader-pref="font" checked>'
    + '<input class="ebook-choice ebook-font-sans" id="fb2-font-sans" name="fb2-font" type="radio" value="sans" data-fv-reader-pref="font">'
    + '<input class="ebook-choice ebook-theme-light" id="fb2-theme-light" name="fb2-theme" type="radio" value="light" data-fv-reader-pref="theme" checked>'
    + '<input class="ebook-choice ebook-theme-sepia" id="fb2-theme-sepia" name="fb2-theme" type="radio" value="sepia" data-fv-reader-pref="theme">'
    + '<input class="ebook-choice ebook-theme-dark" id="fb2-theme-dark" name="fb2-theme" type="radio" value="dark" data-fv-reader-pref="theme">'
    + '<input class="ebook-choice ebook-line-normal" id="fb2-line-normal" name="fb2-line" type="radio" value="normal" data-fv-reader-pref="line" checked>'
    + '<input class="ebook-choice ebook-line-loose" id="fb2-line-loose" name="fb2-line" type="radio" value="loose" data-fv-reader-pref="line">'
    + '<input class="ebook-choice ebook-margin-normal" id="fb2-margin-normal" name="fb2-margin" type="radio" value="normal" data-fv-reader-pref="margin" checked>'
    + '<input class="ebook-choice ebook-margin-wide" id="fb2-margin-wide" name="fb2-margin" type="radio" value="wide" data-fv-reader-pref="margin">'
    + '<div class="ebook-controls" aria-label="Reader settings">'
    + '<label for="fb2-size-normal">A</label><label for="fb2-size-large">A+</label>'
    + '<label for="fb2-font-serif">Serif</label><label for="fb2-font-sans">Sans</label>'
    + '<label for="fb2-theme-light">Light</label><label for="fb2-theme-sepia">Sepia</label><label for="fb2-theme-dark">Dark</label>'
    + '<label for="fb2-line-normal">Line</label><label for="fb2-line-loose">Line+</label>'
    + '<label for="fb2-margin-normal">Page</label><label for="fb2-margin-wide">Page+</label>'
    + '</div>' + content + '</div>';
}

// Map a binary id → data: URL from the <binary> elements.
function collectImages(doc) {
  const map = new Map();
  for (const b of doc.getElementsByTagName('binary')) {
    const id = b.getAttribute('id');
    const ct = b.getAttribute('content-type') || 'image/jpeg';
    const data = (b.textContent || '').replace(/\s+/g, '');
    if (id && data) map.set(id, 'data:' + ct + ';base64,' + data);
  }
  return map;
}

function imgHref(el) {
  return el.getAttribute('l:href') || el.getAttribute('xlink:href') || el.getAttribute('href') || '';
}

// Recursively convert an FB2 node to HTML. `depth` tracks <section> nesting for heading levels.
function convert(node, images, depth) {
  let out = '';
  for (const child of node.childNodes) {
    if (child.nodeType === 3) { out += esc(child.nodeValue); continue; }   // text
    if (child.nodeType !== 1) continue;
    const tag = child.localName || child.nodeName;
    switch (tag) {
      case 'section': out += '<section class="fb2-section">' + convert(child, images, depth + 1) + '</section>'; break;
      case 'title': { const h = Math.min(6, depth + 1); out += '<h' + h + ' class="fb2-title">' + convert(child, images, depth) + '</h' + h + '>'; break; }
      case 'subtitle': out += '<h6 class="fb2-subtitle">' + convert(child, images, depth) + '</h6>'; break;
      case 'p': out += '<p>' + convert(child, images, depth) + '</p>'; break;
      case 'empty-line': out += '<div class="fb2-empty"></div>'; break;
      case 'emphasis': out += '<em>' + convert(child, images, depth) + '</em>'; break;
      case 'strong': out += '<strong>' + convert(child, images, depth) + '</strong>'; break;
      case 'strikethrough': out += '<s>' + convert(child, images, depth) + '</s>'; break;
      case 'sub': out += '<sub>' + convert(child, images, depth) + '</sub>'; break;
      case 'sup': out += '<sup>' + convert(child, images, depth) + '</sup>'; break;
      case 'code': out += '<code>' + convert(child, images, depth) + '</code>'; break;
      case 'epigraph': out += '<blockquote class="fb2-epigraph">' + convert(child, images, depth) + '</blockquote>'; break;
      case 'cite': out += '<blockquote class="fb2-cite">' + convert(child, images, depth) + '</blockquote>'; break;
      case 'poem': out += '<div class="fb2-poem">' + convert(child, images, depth) + '</div>'; break;
      case 'stanza': out += '<div class="fb2-stanza">' + convert(child, images, depth) + '</div>'; break;
      case 'v': out += '<div class="fb2-v">' + convert(child, images, depth) + '</div>'; break;
      case 'a': out += '<a href="' + esc(imgHref(child) || '#') + '" target="_blank" rel="noopener noreferrer">' + convert(child, images, depth) + '</a>'; break;
      case 'image': { const href = imgHref(child).replace(/^#/, ''); const src = images.get(href); if (src) out += '<img class="fb2-img" src="' + src + '" alt="">'; break; }
      case 'table': out += '<table>' + convert(child, images, depth) + '</table>'; break;
      case 'tr': out += '<tr>' + convert(child, images, depth) + '</tr>'; break;
      case 'td': out += '<td>' + convert(child, images, depth) + '</td>'; break;
      case 'th': out += '<th>' + convert(child, images, depth) + '</th>'; break;
      default: out += convert(child, images, depth);   // unknown wrapper → inline its children
    }
  }
  return out;
}

export async function render(intake, _ctx) {
  const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
  const doc = new DOMParser().parseFromString(intake.text || '', 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    return { bodyHtml: '<div class="json-error"><strong>Could not parse FB2</strong><br>This file is not valid FictionBook XML.</div>', hadUnsafe: false };
  }
  const images = collectImages(doc);
  const bodies = doc.getElementsByTagName('body');
  if (!bodies.length) return { bodyHtml: '<div class="json-error">No &lt;body&gt; found in this FB2 file.</div>', hadUnsafe: false };

  // Title from <description><title-info><book-title>, with author if present.
  const titleInfo = doc.getElementsByTagName('title-info')[0];
  const bookTitle = titleInfo && titleInfo.getElementsByTagName('book-title')[0];
  const author = titleInfo && titleInfo.getElementsByTagName('author')[0];
  const authorName = author ? [...author.children].map((c) => (c.textContent || '').trim()).filter(Boolean).join(' ') : '';
  const header = bookTitle
    ? '<header class="fb2-head"><h1 class="fb2-booktitle">' + esc(bookTitle.textContent) + '</h1>'
      + (authorName ? '<div class="fb2-author">' + esc(authorName) + '</div>' : '') + '</header>'
    : '';

  // First <body> is the main text; any extra bodies (notes) follow.
  let inner = '';
  for (const body of bodies) inner += convert(body, images, 0);

  const dirty = '<article class="fb2-book">' + header + inner + '</article>';
  DOMPurify.removed = [];
  const clean = DOMPurify.sanitize(dirty, {
    ADD_ATTR: ['target'],
    ADD_DATA_URI_TAGS: ['img'],         // allow our inline data: image URLs (no network request)
    FORBID_TAGS: ['script', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
  return { bodyHtml: readerShell(clean), hadUnsafe: DOMPurify.removed.length > 0, readerPrefs: FB2_READER_PREFS };
}
