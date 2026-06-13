// Client-side PDF page editing via vendored pdf-lib (pure JS — no WASM, no server). Supports the
// page-level operations of a lite PDF tool: rotate, delete, reorder. Edits are tracked as an
// order array + per-page rotation and re-applied onto a fresh document, so the original bytes are
// never mutated; `build()` returns the edited PDF bytes for re-render / download. Lazy-loaded —
// pdf-lib is only fetched when the user enters edit mode.
import { loadGlobal, vendor } from '../../core/script-loader.js';

let libPromise = null;
export function loadPdfLib() {
  if (!libPromise) libPromise = loadGlobal(vendor('pdf-lib/pdf-lib.min.js'), 'PDFLib');
  return libPromise;
}

export async function createEditor(origBytes) {
  const PDFLib = await loadPdfLib();
  const src = await PDFLib.PDFDocument.load(origBytes, { ignoreEncryption: true });
  const n = src.getPageCount();
  let order = Array.from({ length: n }, (_, i) => i);          // display position → original index
  const rotations = {};                                        // original index → absolute degrees
  for (let i = 0; i < n; i++) { try { rotations[i] = src.getPage(i).getRotation().angle || 0; } catch { rotations[i] = 0; } }

  return {
    pageCount: () => order.length,
    rotate(pos, delta) { const oi = order[pos]; rotations[oi] = ((rotations[oi] || 0) + delta + 360) % 360; },
    remove(pos) { if (order.length > 1) order.splice(pos, 1); },
    move(pos, dir) { const j = pos + dir; if (j < 0 || j >= order.length) return; [order[pos], order[j]] = [order[j], order[pos]]; },
    // Rebuild a fresh PDF from the original pages in the current order, applying rotations.
    async build() {
      const out = await PDFLib.PDFDocument.create();
      const copied = await out.copyPages(src, order);
      copied.forEach((p, i) => { p.setRotation(PDFLib.degrees(rotations[order[i]] || 0)); out.addPage(p); });
      return out.save();
    },
  };
}
