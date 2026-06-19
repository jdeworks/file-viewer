// PDF exports: extract the document's text content and download it as a plain-text file, or
// render every page to PNG and bundle them as a ZIP. Uses the already-vendored pdf.js and JSZip.
import { downloadBlob } from '../../core/exports.js';
import { loadGlobal, vendor } from '../../core/script-loader.js';
import { openDoc, loadPdfjs } from './pdflib.js';

export async function getExports(intake) {
  const base = (intake.filename || 'document').replace(/\.[^.]+$/, '');
  return [
    {
      label: 'Extract text (.txt)',
      run: async () => {
        const doc = await openDoc(intake);
        const parts = [];
        try {
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
            parts.push(pageText);
            page.cleanup();
          }
        } finally {
          try { await doc.destroy(); } catch { /* already gone */ }
        }
        downloadBlob(parts.join('\n\n'), base + '.txt', 'text/plain');
      },
    },
    {
      label: 'Export pages as PNG images',
      run: async () => {
        const [pdfjsLib, JSZip] = await Promise.all([
          loadPdfjs(),
          loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip'),
        ]);

        const doc = await pdfjsLib.getDocument({ data: intake.bytes.slice() }).promise;
        const zip = new JSZip();

        try {
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            const buf = await blob.arrayBuffer();
            zip.file('page-' + String(i).padStart(3, '0') + '.png', buf);
            // Free canvas memory immediately
            canvas.width = canvas.height = 0;
            page.cleanup();
          }
        } finally {
          try { await doc.destroy(); } catch { /* already gone */ }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, base + '-pages.zip', 'application/zip');
      },
    },
  ];
}
