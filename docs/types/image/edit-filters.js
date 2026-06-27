// Image filter tool — live CSS brightness/contrast/saturation/hue preview on the
// <img> while sliding, baked into the pixels on Apply through the shared edit
// core. Lives apart from renderer.js so the filter UI is one self-contained unit.
// Also hosts the Levels adjustment (black/white/gamma), which can't be expressed as
// a CSS filter — it remaps via a per-channel LUT (levels.js) and previews by swapping
// img.src to a processed blob.
import { buildLevelsLUT, applyLevels } from './levels.js';

export function mountFilters({ img, mime, core, els }) {
  const { filtersBtn, filtersPanel, fBrightness, fContrast, fSaturation, fHue, fApplyBtn, fResetBtn } = els;
  const { levelsBtn, levelsPanel, lvBlack, lvWhite, lvGamma, lvApply, lvCancel } = els;
  const { presetGrey, presetSepia, presetInvert } = els;
  injectFilterStyle();

  // The filter sliders are a LIVE CSS PREVIEW that only becomes permanent on Apply. We
  // flash the Apply button while a preview is un-applied, and revert it (back to the
  // committed image) if the user navigates away — so the screen never shows filters that
  // aren't actually baked in.
  let pending = false;
  const setPending = (on) => { pending = on; fApplyBtn?.classList.toggle('imgv-flash-apply', on); };
  function clearPreview() {
    if (fBrightness) fBrightness.value = '100';
    if (fContrast) fContrast.value = '100';
    if (fSaturation) fSaturation.value = '100';
    if (fHue) fHue.value = '0';
    img.style.filter = '';
    setPending(false);
  }

  filtersBtn?.addEventListener('click', () => {
    if (!filtersPanel) return;
    if (!filtersPanel.hidden && pending) clearPreview();   // closing the panel with un-applied changes → revert
    filtersPanel.hidden = !filtersPanel.hidden;
  });

  const filterString = () => `brightness(${fBrightness.value}%) contrast(${fContrast.value}%) saturate(${fSaturation.value}%) hue-rotate(${fHue?.value || 0}deg)`;
  const updateFilterPreview = () => { img.style.filter = filterString(); setPending(true); };
  [fBrightness, fContrast, fSaturation, fHue].forEach((s) => s?.addEventListener('input', updateFilterPreview));

  // Bake the current CSS filter into the canvas, then clear the live preview.
  fApplyBtn?.addEventListener('click', async () => {
    const filter = filterString();
    img.style.filter = '';
    const base = await core.loadBase();
    const canvas = document.createElement('canvas');
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const g = canvas.getContext('2d');
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); }
    g.filter = filter;
    g.drawImage(base, 0, 0);
    g.filter = 'none';
    core.pushUndo();
    await core.commitCanvas(canvas);
    clearPreview();   // baked → reset sliders + stop flashing
  });

  // Reset sliders to defaults and clear any live preview.
  fResetBtn?.addEventListener('click', clearPreview);

  // Switching toolbar tabs discards an un-applied preview (you've moved on).
  filtersBtn?.closest('.imgv-bar')?.querySelectorAll('.imgv-tab').forEach((t) => t.addEventListener('click', () => { if (pending) clearPreview(); }));

  // ── Levels (black / white / gamma) ── a per-channel LUT applied to the pixels.
  // While the panel is open we cache the source pixels once and preview by swapping
  // img.src to a processed blob (rAF-coalesced so dragging stays smooth); Apply
  // commits the processed canvas, Cancel/toggle-off restores the pre-Levels image.
  let lvSrc = null, lvW = 0, lvH = 0, lvOpenSrc = null, lvPrevUrl = null, lvRaf = 0;

  function lvProcessed() {
    const lut = buildLevelsLUT(+lvBlack.value, +lvWhite.value, (+lvGamma.value) / 100);
    const out = new ImageData(new Uint8ClampedArray(lvSrc.data), lvW, lvH);
    applyLevels(out.data, lut);
    const c = document.createElement('canvas'); c.width = lvW; c.height = lvH;
    c.getContext('2d').putImageData(out, 0, 0);
    return c;
  }

  function lvPreview() {
    if (lvRaf || !lvSrc) return;
    lvRaf = requestAnimationFrame(() => {
      lvRaf = 0;
      if (!lvSrc) return;
      lvProcessed().toBlob((blob) => {
        if (!blob || !lvSrc) return;
        const u = URL.createObjectURL(blob);
        if (lvPrevUrl) URL.revokeObjectURL(lvPrevUrl);
        lvPrevUrl = u; img.src = u;
      }, mime === 'image/jpeg' ? 'image/jpeg' : 'image/png');
    });
  }

  function lvClose(applied) {
    if (levelsPanel) levelsPanel.hidden = true;
    if (lvPrevUrl) { URL.revokeObjectURL(lvPrevUrl); lvPrevUrl = null; }
    if (!applied && lvOpenSrc) img.src = lvOpenSrc;   // restore the pre-Levels image
    lvSrc = null;
  }

  levelsBtn?.addEventListener('click', async () => {
    if (!levelsPanel) return;
    if (pending) clearPreview();   // a pending CSS filter preview would otherwise sit over the Levels preview
    if (!levelsPanel.hidden) { lvClose(false); levelsBtn.classList.remove('active'); return; }
    const base = await core.loadBase();
    lvW = base.naturalWidth; lvH = base.naturalHeight;
    const c = document.createElement('canvas'); c.width = lvW; c.height = lvH;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, lvW, lvH); }
    g.drawImage(base, 0, 0);
    lvSrc = g.getImageData(0, 0, lvW, lvH);
    lvOpenSrc = img.src;
    if (lvBlack) lvBlack.value = '0';
    if (lvWhite) lvWhite.value = '255';
    if (lvGamma) lvGamma.value = '100';
    levelsPanel.hidden = false;
    levelsBtn.classList.add('active');
  });
  [lvBlack, lvWhite, lvGamma].forEach((s) => s?.addEventListener('input', lvPreview));
  lvApply?.addEventListener('click', async () => {
    if (!lvSrc) return;
    const c = lvProcessed();
    core.pushUndo();
    await core.commitCanvas(c);   // sets img.src to the committed blob
    lvClose(true);
    levelsBtn?.classList.remove('active');
  });
  lvCancel?.addEventListener('click', () => { lvClose(false); levelsBtn?.classList.remove('active'); });

  // ── One-click presets ── greyscale / sepia / invert, baked straight to pixels via
  // a canvas filter (no panel; just undoable like any other commit).
  async function applyPreset(filter) {
    if (pending) clearPreview();   // discard any un-applied filter preview first
    const base = await core.loadBase();
    const canvas = document.createElement('canvas');
    canvas.width = base.naturalWidth; canvas.height = base.naturalHeight;
    const g = canvas.getContext('2d');
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); }
    g.filter = filter;
    g.drawImage(base, 0, 0);
    g.filter = 'none';
    core.pushUndo();
    await core.commitCanvas(canvas);
  }
  presetGrey?.addEventListener('click', () => applyPreset('grayscale(1)'));
  presetSepia?.addEventListener('click', () => applyPreset('sepia(1)'));
  presetInvert?.addEventListener('click', () => applyPreset('invert(1)'));
}

// Pulse the Apply button while a filter preview is un-applied (one-time injected style).
function injectFilterStyle() {
  if (document.getElementById('imgv-filters-css')) return;
  const st = document.createElement('style');
  st.id = 'imgv-filters-css';
  st.textContent = `
    .imgv-f-apply.imgv-flash-apply{animation:imgv-apply-flash .85s ease-in-out infinite;}
    @keyframes imgv-apply-flash{0%,100%{box-shadow:0 0 0 0 transparent;}50%{box-shadow:0 0 0 3px var(--accent,#4a8fff);background:var(--accent,#4a8fff);color:#fff;}}
    @media (prefers-reduced-motion:reduce){.imgv-f-apply.imgv-flash-apply{animation:none;outline:2px solid var(--accent,#4a8fff);}}`;
  document.head.appendChild(st);
}
