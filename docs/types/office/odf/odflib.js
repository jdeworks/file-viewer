// OpenDocument (.odt/.odp) reader helpers. Regular ODF is a ZIP holding content.xml (the
// document body) plus a Pictures/ folder. We read it with the already-vendored JSZip (no new
// dependency), inline the pictures as data: URLs (zero off-origin), and hand back the XML +
// image map + document kind. Flat XML ODF (.fodt/.fodp) is NOT a zip — it's a single
// <office:document> that inlines what would otherwise be content.xml/meta.xml/styles.xml as
// direct children, with embedded images as base64 <office:binary-data> instead of zip entries.
// Detect by the zip magic number ('PK'); the flat-XML body/meta elements share the exact same
// tag vocabulary as the zipped form; downstream code (metadata.js, renderer.js) needs no changes.
import { loadGlobal, vendor } from '../../../core/script-loader.js';

const picMime = (name) => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml'
    : ext === 'bmp' ? 'image/bmp' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
};

const isZip = (bytes) => bytes && bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b; // 'PK'

export async function openOdf(intake, { loadImages = true } = {}) {
  if (!isZip(intake.bytes)) {
    // Flat XML ODF: the whole file is content+meta+styles in one <office:document>, so the
    // same text serves as both "contentXml" and "metaXml" — callers look up elements by
    // localName across the whole parsed document either way.
    const text = new TextDecoder('utf-8', { fatal: false }).decode(intake.bytes);
    const kind = /<office:presentation[\s>/]/.test(text) ? 'presentation' : 'text';
    const imageCount = (text.match(/<draw:image[\s>]/g) || []).length;
    return { contentXml: text, metaXml: text, kind, images: new Map(), imageCount };
  }
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);
  const contentFile = zip.file('content.xml');
  if (!contentFile) throw new Error('no content.xml — not an OpenDocument file');
  const contentXml = await contentFile.async('string');
  const metaXml = zip.file('meta.xml') ? await zip.file('meta.xml').async('string') : '';
  const mimetype = zip.file('mimetype') ? (await zip.file('mimetype').async('string')).trim() : '';
  const kind = /presentation/.test(mimetype) ? 'presentation' : 'text';

  const images = new Map();
  for (const name of Object.keys(zip.files)) {
    if (loadImages && /^Pictures\//i.test(name) && !zip.files[name].dir) {
      const b64 = await zip.files[name].async('base64');
      images.set(name, 'data:' + picMime(name) + ';base64,' + b64);
    }
  }
  const imageCount = Object.keys(zip.files).filter((name) => /^Pictures\//i.test(name) && !zip.files[name].dir).length;
  return { contentXml, metaXml, kind, images, imageCount };
}
