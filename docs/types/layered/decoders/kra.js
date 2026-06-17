// KRA (Krita native) loader — ZIP + maindoc.xml + per-layer PNGs.
// Returns { W, H, layers, mergedBitmap } in the unified layer model.

import { loadGlobal, vendor } from '../../../core/script-loader.js';

export async function loadKra(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);

  const xmlText = await zip.file('maindoc.xml')?.async('string');
  if (!xmlText) throw new Error('Missing maindoc.xml in KRA');

  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const imageEl = doc.querySelector('IMAGE');
  const W = parseInt(imageEl?.getAttribute('width') || '0', 10);
  const H = parseInt(imageEl?.getAttribute('height') || '0', 10);

  function parseLayers(el) {
    return [...el.children].flatMap((c) => {
      if (c.tagName === 'layer') {
        const nodeType = c.getAttribute('nodetype') || 'paintlayer';
        if (nodeType === 'grouplayer') {
          const innerLayers = c.querySelector('layers');
          return [{
            name: c.getAttribute('name') || 'Group',
            type: 'group',
            visibility: c.getAttribute('visible') !== '0',
            children: innerLayers ? parseLayers(innerLayers) : [],
          }];
        }
        return [{
          name: c.getAttribute('name') || 'Layer',
          type: 'layer',
          visibility: c.getAttribute('visible') !== '0',
          opacity: parseInt(c.getAttribute('opacity') || '255', 10) / 255,
          x: parseInt(c.getAttribute('x') || '0', 10),
          y: parseInt(c.getAttribute('y') || '0', 10),
          filename: c.getAttribute('filename'),
        }];
      }
      return [];
    }).reverse(); // KRA XML is top-to-bottom; reverse for bottom-up compositing
  }

  const layersEl = doc.querySelector('IMAGE > layers, IMAGE layers');
  const layers = layersEl ? parseLayers(layersEl) : [];

  // Try merged composite (exact path varies — common locations)
  let mergedBitmap = null;
  for (const path of ['mergedimage.png', 'preview.png']) {
    try {
      const data = await zip.file(path)?.async('arraybuffer');
      if (data) { mergedBitmap = await createImageBitmap(new Blob([data], { type: 'image/png' })); break; }
    } catch { /* try next */ }
  }

  // Load per-layer PNGs from data/ directory
  async function loadBitmaps(ls) {
    await Promise.all(ls.map(async (l) => {
      if (l.type === 'group') { await loadBitmaps(l.children); return; }
      if (!l.filename) return;
      try {
        const data = await zip.file(`data/${l.filename}`)?.async('arraybuffer');
        if (data) l.bitmap = await createImageBitmap(new Blob([data], { type: 'image/png' }));
      } catch { /* skip unreadable layer */ }
    }));
  }
  await loadBitmaps(layers);

  return { W, H, layers, mergedBitmap };
}
