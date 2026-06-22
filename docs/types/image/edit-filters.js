// Image filter tool — live CSS brightness/contrast/saturation/hue preview on the
// <img> while sliding, baked into the pixels on Apply through the shared edit
// core. Lives apart from renderer.js so the filter UI is one self-contained unit.

export function mountFilters({ img, mime, core, els }) {
  const { filtersBtn, filtersPanel, fBrightness, fContrast, fSaturation, fHue, fApplyBtn, fResetBtn } = els;

  filtersBtn?.addEventListener('click', () => { if (filtersPanel) filtersPanel.hidden = !filtersPanel.hidden; });

  const filterString = () => `brightness(${fBrightness.value}%) contrast(${fContrast.value}%) saturate(${fSaturation.value}%) hue-rotate(${fHue?.value || 0}deg)`;
  const updateFilterPreview = () => { img.style.filter = filterString(); };
  fBrightness?.addEventListener('input', updateFilterPreview);
  fContrast?.addEventListener('input', updateFilterPreview);
  fSaturation?.addEventListener('input', updateFilterPreview);
  fHue?.addEventListener('input', updateFilterPreview);

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
  });

  // Reset sliders to defaults and clear any live preview.
  fResetBtn?.addEventListener('click', () => {
    if (fBrightness) fBrightness.value = '100';
    if (fContrast) fContrast.value = '100';
    if (fSaturation) fSaturation.value = '100';
    if (fHue) fHue.value = '0';
    img.style.filter = '';
  });
}
