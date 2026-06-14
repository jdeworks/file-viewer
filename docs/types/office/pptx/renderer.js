// PPTX preview: render each slide to a canvas (parent) and embed as an image in the
// sandboxed iframe — same pattern as PDF. Slide cap reported, not silent.
import { loadPptxViewer } from './pptxlib.js';

const MAX_SLIDES = 50;

// pptxviewjs queues an async render after renderSlide; calling destroy() immediately throws
// "No PPTX loaded" when that pending render fires. So we keep the current viewer alive and
// only dispose the PREVIOUS (now-idle) one on the next render. One live viewer at a time.
let activeViewer = null;

export async function render(intake, ctx) {
  const scale = ctx?.settings?.pptxScale || 1.5;
  const PPTXViewer = await loadPptxViewer();
  if (activeViewer) { try { activeViewer.destroy?.(); } catch { /* idle, safe */ } activeViewer = null; }
  // Fixed 16:9 canvas; resolution scales with the setting. slideSizeMode 'fit' draws the
  // slide into this canvas (letterboxes non-16:9 decks).
  const W = Math.round(1280 * scale / 1.5), H = Math.round(W * 9 / 16);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  // Construct WITHOUT a canvas: passing one makes the viewer auto-render before loadFile,
  // which throws "No PPTX loaded". We hand the canvas to renderSlide instead.
  const viewer = new PPTXViewer({ slideSizeMode: 'fit', backgroundColor: '#ffffff' });
  activeViewer = viewer;
  await viewer.loadFile(intake.bytes.slice());
  const count = viewer.getSlideCount();
  const max = Math.min(count, MAX_SLIDES);
  const slides = [];
  for (let i = 0; i < max; i++) {
    await viewer.renderSlide(i, canvas, { quality: 'high' });
    slides.push('<img class="pptx-slide" alt="Slide ' + (i + 1) + '" src="' + canvas.toDataURL('image/png') + '">');
  }
  const note = count > max ? '<p class="pdf-note">Showing first ' + max + ' of ' + count + ' slides.</p>' : '';
  return { bodyHtml: '<div class="pptx-doc">' + slides.join('\n') + note + '</div>', hadUnsafe: false };
}
