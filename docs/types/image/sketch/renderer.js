import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { createPartialSupportNotice } from '../../../core/partial-support.js';

const CAPABILITY = 'Partial preview: the embedded Sketch preview, page/artboard names, file metadata, and declared fonts are shown. Vector layers, symbols/components, styles, prototypes, assets, constraints, and editable design geometry are not decoded or rendered.';

export async function render(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:24px;gap:16px;font-family:system-ui,sans-serif;color:var(--fg);';

  const banner = createPartialSupportNotice(CAPABILITY);
  banner.style.cssText += 'max-width:560px;width:100%;';
  wrap.appendChild(banner);

  const blobUrls = [];

  try {
    const zip = await JSZip.loadAsync(intake.bytes.buffer);

    // Extract preview image
    const PREVIEW_PATHS = ['previews/preview.png', 'previews/preview@2x.png'];
    let thumbFile = null;
    for (const p of PREVIEW_PATHS) {
      if (zip.files[p]) { thumbFile = zip.files[p]; break; }
      const key = Object.keys(zip.files).find(k => k.toLowerCase() === p.toLowerCase());
      if (key) { thumbFile = zip.files[key]; break; }
    }

    if (thumbFile) {
      const blob = new Blob([await thumbFile.async('uint8array')], { type: 'image/png' });
      const blobUrl = URL.createObjectURL(blob);
      blobUrls.push(blobUrl);
      const img = document.createElement('img');
      img.src = blobUrl;
      img.alt = 'Sketch preview';
      img.style.cssText = 'max-width:100%;max-height:600px;object-fit:contain;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
      wrap.appendChild(img);
    } else {
      const noThumb = document.createElement('div');
      noThumb.style.cssText = 'color:var(--fg-2);font-size:13px;padding:32px;border:1px dashed currentColor;border-radius:6px;';
      noThumb.textContent = 'No preview available';
      wrap.appendChild(noThumb);
    }

    // Parse meta.json
    let meta = null;
    const metaFile = zip.files['meta.json'];
    if (metaFile) {
      try {
        meta = JSON.parse(await metaFile.async('string'));
      } catch { /* ignore */ }
    }

    // Build pages+artboards map
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

    // File info section
    const pageIds = Object.keys(pagesAndArtboards || {});
    let totalArtboards = 0;
    for (const pid of pageIds) {
      totalArtboards += Object.keys(pagesAndArtboards[pid]?.artboards || {}).length;
    }

    const infoBox = document.createElement('div');
    infoBox.style.cssText = 'max-width:560px;width:100%;background:var(--bg-2);border:1px solid var(--border);border-radius:8px;padding:14px 16px;font-size:13px;color:var(--fg);';

    const infoTitle = document.createElement('div');
    infoTitle.style.cssText = 'font-weight:600;margin-bottom:8px;font-size:14px;';
    infoTitle.textContent = 'File Info';
    infoBox.appendChild(infoTitle);

    const infoRows = [
      ['Format', 'Sketch Design File'],
      meta?.appVersion ? ['Sketch version', meta.appVersion + (meta.build ? ' (build ' + meta.build + ')' : '')] : null,
      ['File size', formatSize(intake.size)],
      ['Pages', pageIds.length],
      ['Artboards', totalArtboards],
    ].filter(Boolean);

    for (const [key, val] of infoRows) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;padding:3px 0;border-bottom:1px solid var(--border);';
      const k = document.createElement('span');
      k.style.cssText = 'color:var(--fg-2);min-width:120px;';
      k.textContent = key;
      const v = document.createElement('span');
      v.textContent = String(val);
      row.appendChild(k);
      row.appendChild(v);
      infoBox.appendChild(row);
    }

    // Fonts
    const fonts = meta?.fonts;
    if (fonts && fonts.length > 0) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;padding:3px 0;';
      const k = document.createElement('span');
      k.style.cssText = 'color:var(--fg-2);min-width:120px;';
      k.textContent = 'Fonts used';
      const v = document.createElement('span');
      v.textContent = fonts.join(', ');
      row.appendChild(k);
      row.appendChild(v);
      infoBox.appendChild(row);
    }

    wrap.appendChild(infoBox);

    // Pages + artboards list
    if (pageIds.length > 0) {
      const pagesBox = document.createElement('div');
      pagesBox.style.cssText = 'max-width:560px;width:100%;background:var(--bg-2);border:1px solid var(--border);border-radius:8px;padding:14px 16px;font-size:13px;color:var(--fg);';

      const pagesTitle = document.createElement('div');
      pagesTitle.style.cssText = 'font-weight:600;margin-bottom:8px;font-size:14px;';
      pagesTitle.textContent = 'Pages & Artboards';
      pagesBox.appendChild(pagesTitle);

      for (const pid of pageIds) {
        const page = pagesAndArtboards[pid];
        const pageName = page?.name || pid;
        const artboardNames = Object.values(page?.artboards || {}).map(a => a.name);

        const pageRow = document.createElement('div');
        pageRow.style.cssText = 'padding:4px 0;';

        const pageLabel = document.createElement('div');
        pageLabel.style.cssText = 'font-weight:500;color:var(--fg);';
        pageLabel.textContent = '📄 ' + pageName;
        pageRow.appendChild(pageLabel);

        if (artboardNames.length > 0) {
          const abList = document.createElement('div');
          abList.style.cssText = 'padding-left:16px;color:var(--fg-2);display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;';
          for (const abName of artboardNames) {
            const ab = document.createElement('span');
            ab.style.cssText = 'background:var(--bg-3);border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:12px;color:var(--fg);';
            ab.textContent = abName;
            abList.appendChild(ab);
          }
          pageRow.appendChild(abList);
        } else {
          const noAb = document.createElement('div');
          noAb.style.cssText = 'padding-left:16px;color:var(--fg-2);font-size:12px;margin-top:2px;';
          noAb.textContent = 'No artboards';
          pageRow.appendChild(noAb);
        }

        pagesBox.appendChild(pageRow);
      }

      wrap.appendChild(pagesBox);
    }

  } catch (e) {
    const err = document.createElement('div');
    err.style.cssText = 'color:var(--danger,#dc2626);font-size:13px;';
    err.textContent = 'Could not read Sketch file: ' + e.message;
    wrap.appendChild(err);
  }

  return {
    parentNode: wrap,
    revoke() {
      for (const u of blobUrls) URL.revokeObjectURL(u);
    },
  };
}

function formatSize(bytes) {
  if (!bytes) return 'unknown';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
