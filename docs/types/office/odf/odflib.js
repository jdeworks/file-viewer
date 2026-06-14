// OpenDocument (.odt/.odp) reader helpers. ODF is a ZIP holding content.xml (the document body)
// plus a Pictures/ folder. We read it with the already-vendored JSZip (no new dependency), inline
// the pictures as data: URLs (zero off-origin), and hand back the XML + image map + document kind.
import { loadGlobal, vendor } from '../../../core/script-loader.js';

const picMime = (name) => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml'
    : ext === 'bmp' ? 'image/bmp' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
};

export async function openOdf(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);
  const contentFile = zip.file('content.xml');
  if (!contentFile) throw new Error('no content.xml — not an OpenDocument file');
  const contentXml = await contentFile.async('string');
  const mimetype = zip.file('mimetype') ? (await zip.file('mimetype').async('string')).trim() : '';
  const kind = /presentation/.test(mimetype) ? 'presentation' : 'text';

  const images = new Map();
  for (const name of Object.keys(zip.files)) {
    if (/^Pictures\//i.test(name) && !zip.files[name].dir) {
      const b64 = await zip.files[name].async('base64');
      images.set(name, 'data:' + picMime(name) + ';base64,' + b64);
    }
  }
  return { contentXml, kind, images };
}
