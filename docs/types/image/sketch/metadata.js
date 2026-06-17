import { loadGlobal, vendor } from '../../../core/script-loader.js';

export async function extractMetadata(intake) {
  try {
    const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
    const zip = await JSZip.loadAsync(intake.bytes.buffer);

    let meta = null;
    const metaFile = zip.files['meta.json'];
    if (metaFile) {
      try {
        meta = JSON.parse(await metaFile.async('string'));
      } catch { /* ignore */ }
    }

    let pagesAndArtboards = meta?.pagesAndArtboards || null;

    // Fallback: read individual pages/*.json files
    if (!pagesAndArtboards) {
      pagesAndArtboards = {};
      const pageFiles = Object.keys(zip.files).filter(k => /^pages\/[^/]+\.json$/i.test(k));
      for (const pf of pageFiles) {
        try {
          const pageData = JSON.parse(await zip.files[pf].async('string'));
          const pageId = pageData.do_objectID || pf;
          const pageName = pageData.name || pf;
          const artboards = {};
          if (Array.isArray(pageData.layers)) {
            for (const layer of pageData.layers) {
              if (layer._class === 'artboard' || layer._class === 'symbolMaster') {
                artboards[layer.do_objectID || layer.name] = { name: layer.name };
              }
            }
          }
          pagesAndArtboards[pageId] = { name: pageName, artboards };
        } catch { /* ignore */ }
      }
    }

    const pageIds = Object.keys(pagesAndArtboards || {});
    let artboardCount = 0;
    for (const pid of pageIds) {
      artboardCount += Object.keys(pagesAndArtboards[pid]?.artboards || {}).length;
    }

    return {
      format: 'Sketch',
      sketchVersion: meta?.appVersion || null,
      build: meta?.build || null,
      pageCount: pageIds.length,
      artboardCount,
      fonts: meta?.fonts || [],
      size: intake.size,
    };
  } catch {
    return {
      format: 'Sketch',
      sketchVersion: null,
      pageCount: 0,
      artboardCount: 0,
      fonts: [],
      size: intake.size,
    };
  }
}
