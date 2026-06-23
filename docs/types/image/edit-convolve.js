// Sharpen / Blur tool — a 3×3 convolution (convolve.js) over the image pixels. A type
// selector (Blur | Sharpen) + a strength slider drive buildKernel; applyConvolution
// remaps the bytes. Lifecycle mirrors Levels/Curves (edit-filters.js / edit-curves.js):
// cache the source pixels on open, preview by swapping img.src to a processed blob
// (rAF-coalesced so dragging stays smooth), commit on Apply, restore on Cancel.
import { buildKernel, applyConvolution } from './convolve.js';

export function mountConvolve({ img, mime, core, els }) {
  const { convolveBtn, convolvePanel, convType, convStrength, convApply, convCancel } = els;
  if (!convolveBtn || !convolvePanel) return { teardown() {} };

  let src = null, sw = 0, sh = 0, openSrc = null, prevUrl = null, raf = 0;

  function processed() {
    const kernel = buildKernel(convType?.value || 'blur', (+convStrength.value || 0) / 100);
    const out = new ImageData(applyConvolution(src.data, sw, sh, kernel), sw, sh);
    const c = document.createElement('canvas'); c.width = sw; c.height = sh;
    c.getContext('2d').putImageData(out, 0, 0);
    return c;
  }

  function preview() {
    if (raf || !src) return;
    raf = requestAnimationFrame(() => {
      raf = 0; if (!src) return;
      processed().toBlob((blob) => {
        if (!blob || !src) return;
        const u = URL.createObjectURL(blob);
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        prevUrl = u; img.src = u;
      }, mime === 'image/jpeg' ? 'image/jpeg' : 'image/png');
    });
  }

  function close(applied) {
    convolvePanel.hidden = true;
    if (prevUrl) { URL.revokeObjectURL(prevUrl); prevUrl = null; }
    if (!applied && openSrc) img.src = openSrc;   // restore the pre-convolve image
    src = null; convolveBtn.classList.remove('active');
  }

  convolveBtn.addEventListener('click', async () => {
    if (!convolvePanel.hidden) { close(false); return; }
    const base = await core.loadBase();
    sw = base.naturalWidth; sh = base.naturalHeight;
    const c = document.createElement('canvas'); c.width = sw; c.height = sh;
    const cx = c.getContext('2d', { willReadFrequently: true });
    if (mime === 'image/jpeg') { cx.fillStyle = '#fff'; cx.fillRect(0, 0, sw, sh); }
    cx.drawImage(base, 0, 0);
    src = cx.getImageData(0, 0, sw, sh);
    openSrc = img.src;
    if (convType) convType.value = 'blur';
    if (convStrength) convStrength.value = '50';
    convolvePanel.hidden = false; convolveBtn.classList.add('active');
  });
  convType?.addEventListener('change', preview);
  convStrength?.addEventListener('input', preview);
  convCancel?.addEventListener('click', () => close(false));
  convApply?.addEventListener('click', async () => {
    if (!src) return;
    const c = processed();
    core.pushUndo();
    await core.commitCanvas(c);
    close(true);
  });

  return { teardown() { if (prevUrl) URL.revokeObjectURL(prevUrl); } };
}
