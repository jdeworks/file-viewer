// Client-side PDF page editing via vendored pdf-lib (pure JS — no WASM, no server). Lite PDF-tool
// page ops: rotate, delete, reorder, AND insert an image as a new page. Edits are tracked as an
// ordered list of items (original page refs + inserted images) and re-applied onto a fresh
// document, so the original bytes are never mutated; `build()` returns the edited PDF bytes for
// re-render / download. Lazy-loaded — pdf-lib is only fetched when the user enters edit mode.
import { loadGlobal, vendor } from '../../core/script-loader.js';

let libPromise = null;
export function loadPdfLib() {
  if (!libPromise) libPromise = loadGlobal(vendor('pdf-lib/pdf-lib.min.js'), 'PDFLib');
  return libPromise;
}

// A4 in PDF points — inserted image pages are fit within this (never upscaled past 1:1).
const A4_W = 595.28, A4_H = 841.89;

export async function createEditor(origBytes) {
  const PDFLib = await loadPdfLib();
  const src = await PDFLib.PDFDocument.load(origBytes, { ignoreEncryption: true });
  const srcs = [src];                  // doc 0 is the original; merged PDFs append as docs 1, 2, …
  const n = src.getPageCount();
  // order: ordered display items. Page item {kind:'page', doc, oi, rot, rot0}; image item
  // {kind:'image', bytes(PNG), rot}. The renderer always hands us PNG bytes (it rasterizes).
  const order = [];
  for (let i = 0; i < n; i++) {
    let rot = 0; try { rot = src.getPage(i).getRotation().angle || 0; } catch { rot = 0; }
    order.push({ kind: 'page', doc: 0, oi: i, rot, rot0: rot });
  }
  const origPageSeq = order.map((it) => it.oi).join(',');

  return {
    pageCount: () => order.length,
    isImage: (pos) => order[pos]?.kind === 'image',
    rotate(pos, delta) { const it = order[pos]; if (it) it.rot = ((it.rot || 0) + delta + 360) % 360; },
    remove(pos) { if (order.length > 1) order.splice(pos, 1); },
    move(pos, dir) { const j = pos + dir; if (j < 0 || j >= order.length) return; [order[pos], order[j]] = [order[j], order[pos]]; },
    // Insert an image (PNG bytes) as a new page. Appends at the end unless a position is given.
    addImage(pngBytes, pos) {
      const item = { kind: 'image', bytes: pngBytes, rot: 0 };
      if (pos == null || pos >= order.length) order.push(item); else order.splice(Math.max(0, pos), 0, item);
    },
    // Merge: append every page of another PDF (by bytes) to the end. Returns how many were added.
    async addPdf(bytes) {
      const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      const di = srcs.push(doc) - 1;
      const count = doc.getPageCount();
      for (let i = 0; i < count; i++) {
        let rot = 0; try { rot = doc.getPage(i).getRotation().angle || 0; } catch { rot = 0; }
        order.push({ kind: 'page', doc: di, oi: i, rot, rot0: rot, merged: true });
      }
      return count;
    },
    // A human summary of what changed vs the original — a lightweight PDF "diff".
    changes() {
      const out = [];
      const orig = order.filter((it) => it.kind === 'page' && (it.doc || 0) === 0);
      const present = new Set(orig.map((it) => it.oi));
      for (let i = 0; i < n; i++) if (!present.has(i)) out.push('Page ' + (i + 1) + ' deleted');
      for (const it of orig) { const d = ((it.rot || 0) - (it.rot0 || 0) + 360) % 360; if (d) out.push('Page ' + (it.oi + 1) + ' rotated ' + d + '°'); }
      const added = order.filter((it) => it.kind === 'image').length;
      if (added) out.push(added + ' image page' + (added === 1 ? '' : 's') + ' added');
      const merged = order.filter((it) => it.kind === 'page' && it.merged).length;
      if (merged) out.push(merged + ' page' + (merged === 1 ? '' : 's') + ' merged in');
      const pageSeq = orig.map((it) => it.oi).join(',');
      const sortedPresent = [...present].sort((a, b) => a - b).join(',');
      if (pageSeq !== sortedPresent || (added === 0 && pageSeq !== origPageSeq && order.length === n)) {
        if (pageSeq !== sortedPresent) out.push('Pages reordered');
      }
      return out;
    },
    // Stamp a diagonal text watermark on every page when build() is called.
    watermark(text, opts = {}) {
      this._watermark = {
        text,
        color: opts.color || '#cccccc',
        opacity: opts.opacity ?? 0.3,
        size: opts.size || 48,
        diagonal: opts.diagonal ?? true,
      };
    },
    clearWatermark() { this._watermark = null; },

    // Extract a range of pages (0-based, inclusive) into a new PDF and return its bytes.
    async extractRange(from, to) {
      const out = await PDFLib.PDFDocument.create();
      const clampedFrom = Math.max(0, from);
      const clampedTo = Math.min(to, order.length - 1);
      for (let i = clampedFrom; i <= clampedTo; i++) {
        const it = order[i];
        if (!it) continue;
        if (it.kind === 'page') {
          const [p] = await out.copyPages(srcs[it.doc || 0], [it.oi]);
          p.setRotation(PDFLib.degrees(it.rot || 0));
          out.addPage(p);
        } else {
          const img = await out.embedPng(it.bytes);
          const scale = Math.min(A4_W / img.width, A4_H / img.height, 1);
          const w = img.width * scale, h = img.height * scale;
          const page = out.addPage([w, h]);
          page.drawImage(img, { x: 0, y: 0, width: w, height: h });
          if (it.rot) page.setRotation(PDFLib.degrees(it.rot));
        }
      }
      return out.save();
    },

    // Rebuild a fresh PDF from the items in order, applying rotations + embedding image pages.
    async build() {
      const out = await PDFLib.PDFDocument.create();
      for (const it of order) {
        let page;
        if (it.kind === 'page') {
          const [p] = await out.copyPages(srcs[it.doc || 0], [it.oi]);
          p.setRotation(PDFLib.degrees(it.rot || 0));
          out.addPage(p);
          page = p;
        } else {
          const img = await out.embedPng(it.bytes);
          const scale = Math.min(A4_W / img.width, A4_H / img.height, 1);
          const w = img.width * scale, h = img.height * scale;
          page = out.addPage([w, h]);
          page.drawImage(img, { x: 0, y: 0, width: w, height: h });
          if (it.rot) page.setRotation(PDFLib.degrees(it.rot));
        }
        if (this._watermark) {
          const wm = this._watermark;
          const { width, height } = page.getSize();
          const hexColor = wm.color.replace('#', '');
          const r = parseInt(hexColor.slice(0, 2), 16) / 255;
          const g = parseInt(hexColor.slice(2, 4), 16) / 255;
          const b = parseInt(hexColor.slice(4, 6), 16) / 255;
          page.drawText(wm.text, {
            x: width / 2 - (wm.text.length * wm.size * 0.3),
            y: height / 2,
            size: wm.size,
            color: PDFLib.rgb(r, g, b),
            opacity: wm.opacity,
            rotate: PDFLib.degrees(wm.diagonal ? 45 : 0),
          });
        }
      }
      return out.save();
    },
  };
}
