// PPTX preview: render each slide to a canvas (parent) and embed as an image in the
// parent preview pane, same pattern as PDF. Slide cap is reported, not silent.
import { loadPptxViewer } from './pptxlib.js';
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { extractPptxSpeakerNotes, formatPptxNotesStatus } from './notes.js';

const MAX_SLIDES = 50;

export async function render(intake, ctx) {
  const scale = ctx?.settings?.pptxScale || 1.5;
  let viewMode = 'continuous', currentSlide = 0;
  const PPTXViewer = await loadPptxViewer();
  // Fixed 16:9 canvas; resolution scales with the setting. slideSizeMode 'fit' draws the
  // slide into this canvas (letterboxes non-16:9 decks).
  const W = Math.round(1280 * scale / 1.5), H = Math.round(W * 9 / 16);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  // Construct WITHOUT a canvas: passing one makes the viewer auto-render before loadFile,
  // which throws "No PPTX loaded". We hand the canvas to renderSlide instead.
  const viewer = new PPTXViewer({
    slideSizeMode: 'fit',
    backgroundColor: '#ffffff',
    // The library schedules a delayed chart rerender by default. We render each slide
    // to an image snapshot, so that delayed pass can hit a retired canvas and throw.
    autoChartRerenderDelayMs: 0,
  });
  let busy = true;
  let disposeRequested = false;
  let disposed = false;
  function destroyWhenIdle() {
    disposeRequested = true;
    if (busy || disposed) return;
    disposed = true;
    try { viewer.destroy?.(); } catch { /* stale/partially loaded viewer */ }
  }
  // Register before the first await: a superseding main or side-by-side request owns cleanup even
  // when loadFile/renderSlide never returns a normal renderer result. pptxviewjs cannot be safely
  // destroyed while one of those calls is active, so invalidation requests disposal and the
  // finally block performs it as soon as the instance is idle.
  ctx?.onCleanup?.(destroyWhenIdle);
  try {
    await viewer.loadFile(intake.bytes.slice());
    if (ctx?.signal?.aborted) throw new DOMException('Preview superseded', 'AbortError');
    const count = viewer.getSlideCount();
    const max = Math.min(count, MAX_SLIDES);
    let notesResult = null;
    let notesError = false;
    try {
      const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
      const zip = await JSZip.loadAsync(intake.bytes);
      notesResult = await extractPptxSpeakerNotes(
        async (part) => zip.file(part) ? zip.file(part).async('string') : null,
        { maxSlides: MAX_SLIDES, signal: ctx?.signal },
      );
    } catch (error) {
      if (ctx?.signal?.aborted || error?.name === 'AbortError') throw error;
      notesError = true;
    }
    if (ctx?.signal?.aborted) throw new DOMException('Preview superseded', 'AbortError');
    const notesBySlide = new Map((notesResult?.slides || []).map((notes) => [notes.slideNumber, notes]));

    const host = document.createElement('div');
    host.className = 'pptx-doc';
    host.innerHTML =
    '<div class="pptx-bar">'
    + '<span class="pptx-info"></span>'
    + '<span class="pptx-notes-status"></span>'
    + '<button class="pptx-viewmode" title="Switch between continuous and single-slide view">Single slide</button>'
    + '<span class="pptx-slide-nav" hidden>'
    + '<button class="pptx-slide-prev" title="Previous slide">‹</button>'
    + '<span class="pptx-slide-status">1 / 1</span>'
    + '<button class="pptx-slide-next" title="Next slide">›</button>'
    + '</span>'
    + '</div>'
    + '<div class="pptx-slides"></div>';
    const slidesEl = host.querySelector('.pptx-slides');
    const infoEl = host.querySelector('.pptx-info');

  function updateSlideMode() {
    currentSlide = Math.min(Math.max(currentSlide, 0), Math.max(max - 1, 0));
    const single = viewMode === 'single';
    host.classList.toggle('pptx-single-on', single);
    host.querySelector('.pptx-viewmode').classList.toggle('active', single);
    host.querySelector('.pptx-viewmode').textContent = single ? 'Continuous' : 'Single slide';
    host.querySelector('.pptx-slide-nav').hidden = !single || max <= 1;
    host.querySelector('.pptx-slide-prev').disabled = currentSlide <= 0;
    host.querySelector('.pptx-slide-next').disabled = currentSlide >= max - 1;
    host.querySelector('.pptx-slide-status').textContent = (currentSlide + 1) + ' / ' + Math.max(max, 1);
    slidesEl.querySelectorAll('.pptx-slide-wrap').forEach((wrap, index) => {
      wrap.hidden = single && index !== currentSlide;
    });
  }

  function goToSlide(delta) {
    if (viewMode !== 'single') return false;
    const next = Math.min(Math.max(currentSlide + delta, 0), Math.max(max - 1, 0));
    if (next === currentSlide) return false;
    currentSlide = next;
    updateSlideMode();
    return true;
  }

    for (let i = 0; i < max; i++) {
      if (ctx?.signal?.aborted) throw new DOMException('Preview superseded', 'AbortError');
      await viewer.renderSlide(i, canvas, { quality: 'high' });
      const wrap = document.createElement('div');
      wrap.className = 'pptx-slide-wrap';
      wrap.dataset.slideIndex = String(i);
      const img = document.createElement('img');
      img.className = 'pptx-slide';
      img.alt = 'Slide ' + (i + 1);
      img.src = canvas.toDataURL('image/png');
      wrap.appendChild(img);
      const notes = notesBySlide.get(i + 1);
      if (notes) {
        const card = document.createElement('details');
        card.className = 'pptx-notes-card';
        card.dataset.slideNumber = String(i + 1);
        const summary = document.createElement('summary');
        const label = document.createElement('strong');
        label.textContent = 'Slide ' + (i + 1) + ' notes';
        const headline = document.createElement('span');
        headline.className = 'pptx-notes-headline';
        headline.textContent = notes.headline;
        const countLabel = document.createElement('span');
        countLabel.className = 'pptx-notes-count';
        countLabel.textContent = notes.paragraphCount + (notes.truncated ? '+' : '')
          + ' paragraph' + (notes.paragraphCount === 1 && !notes.truncated ? '' : 's');
        summary.append(label, headline, countLabel);
        card.appendChild(summary);
        const body = document.createElement('div');
        body.className = 'pptx-notes-body';
        for (const paragraph of notes.paragraphs) {
          const p = document.createElement('p');
          p.textContent = paragraph;
          body.appendChild(p);
        }
        if (notes.truncated) {
          const bounded = document.createElement('p');
          bounded.className = 'pptx-notes-bounded';
          bounded.textContent = 'Additional note content is not shown in this bounded preview.';
          body.appendChild(bounded);
        }
        card.appendChild(body);
        wrap.appendChild(card);
      }
      slidesEl.appendChild(wrap);
    }
  if (count > max) {
    const note = document.createElement('p');
    note.className = 'pdf-note';
    note.textContent = 'Showing first ' + max + ' of ' + count + ' slides.';
    slidesEl.appendChild(note);
  }
  infoEl.textContent = count + ' slide' + (count === 1 ? '' : 's');
  const notesStatus = host.querySelector('.pptx-notes-status');
  notesStatus.textContent = formatPptxNotesStatus(notesResult, { error: notesError });
  host.querySelector('.pptx-viewmode').addEventListener('click', () => {
    viewMode = viewMode === 'single' ? 'continuous' : 'single';
    updateSlideMode();
  });
  host.querySelector('.pptx-slide-prev').addEventListener('click', () => {
    goToSlide(-1);
  });
  host.querySelector('.pptx-slide-next').addEventListener('click', () => {
    goToSlide(1);
  });
  host.tabIndex = 0;
  host.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || viewMode !== 'single') return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      if (goToSlide(-1)) e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      if (goToSlide(1)) e.preventDefault();
    }
  });
  let touchStartX = null, touchStartY = null;
  slidesEl.addEventListener('touchstart', (e) => {
    if (viewMode !== 'single' || e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  slidesEl.addEventListener('touchend', (e) => {
    if (viewMode !== 'single' || touchStartX == null || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    touchStartX = touchStartY = null;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    goToSlide(dx < 0 ? 1 : -1);
  }, { passive: true });
    updateSlideMode();
    return { parentNode: host, revoke: destroyWhenIdle };
  } finally {
    busy = false;
    if (disposeRequested) destroyWhenIdle();
  }
}
