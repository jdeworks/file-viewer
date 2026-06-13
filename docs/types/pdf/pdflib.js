// Shared pdf.js loader for the PDF type. pdf.js runs in the PARENT (trusted, vendored) —
// it PARSES the PDF, it does not execute it. Rendered output is just images/text that go
// into the sandboxed preview iframe, so PDF bytes never run as code.
import { vendor } from '../../core/script-loader.js';

let libPromise = null;
export function loadPdfjs() {
  if (libPromise) return libPromise;
  libPromise = (async () => {
    const lib = await import(vendor('pdfjs/pdf.min.mjs'));
    lib.GlobalWorkerOptions.workerSrc = vendor('pdfjs/pdf.worker.min.mjs');
    return lib;
  })();
  return libPromise;
}

// Open a document from intake bytes. Copies the buffer (pdf.js transfers/detaches it).
export async function openDoc(intake) {
  const lib = await loadPdfjs();
  return lib.getDocument({ data: intake.bytes.slice() }).promise;
}
