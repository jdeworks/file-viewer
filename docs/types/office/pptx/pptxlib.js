// pptxviewjs loader. Its UMD reads globals Chart + JSZip, so those load first. Like
// pdf.js/SheetJS, pptxviewjs runs in the parent (trusted, vendored) and only PARSES the
// .pptx — nothing from the file executes.
import { loadGlobal, vendor } from '../../../core/script-loader.js';

// PptxViewJS exports an internal helper as window.FileReader, overwriting the browser API that
// JSZip, Tesseract, and later renderers require. Keep the native constructor across vendor load.
const BrowserFileReader = window.FileReader;

let promise = null;
export function loadPptxViewer() {
  if (promise) return promise;
  promise = (async () => {
    await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
    const Chart = await loadGlobal(vendor('chartjs/chart.umd.js'), 'Chart');
    try { if (Chart.registerables) Chart.register(...Chart.registerables); } catch { /* charts optional */ }
    let ns;
    try {
      ns = await loadGlobal(vendor('pptxviewjs/PptxViewJS.min.js'), 'PptxViewJS');
    } finally {
      window.FileReader = BrowserFileReader;
    }
    return ns.PPTXViewer;
  })();
  return promise;
}
