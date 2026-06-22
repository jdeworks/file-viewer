// Text-overlay tool — type a label, drag it onto the image, then bake it into the
// pixels. Placement uses a draggable DOM div plus Commit/Cancel buttons injected
// into the toolbar; commit rasterizes the text onto a canvas via the edit core.
//
// Returns { isActive, exitPlaceMode }: isActive() lets the renderer's pan logic
// stand down while text is being placed; exitPlaceMode() is called by the
// shared Reset button.

export function mountTextTool({ host, img, mime, core, els }) {
  const { editInput, editSize, editColor, editFont, editApply } = els;
  let textDragDiv = null, textCommitBtn = null, textCancelBtn = null;

  async function commitText(nx, ny) {
    const text = (editInput?.value || '').trim();
    if (!text) return;
    const base = await core.loadBase();
    const canvas = document.createElement('canvas');
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const g = canvas.getContext('2d');
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); }
    g.drawImage(base, 0, 0);
    const size = Math.max(8, Math.min(240, parseInt(editSize?.value, 10) || 32));
    const fontFamily = editFont?.value || 'system-ui,sans-serif';
    g.font = `700 ${size}px ${fontFamily}`;
    g.textBaseline = 'alphabetic';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,.72)';
    g.lineWidth = Math.max(3, Math.round(size / 8));
    g.fillStyle = editColor?.value || '#ffffff';
    const px = Math.round((nx ?? 0.5) * canvas.width);
    const py = Math.round((ny ?? 0.5) * canvas.height);
    const maxW = Math.round(canvas.width * 0.8);
    g.strokeText(text, px, py, maxW);
    g.fillText(text, px, py, maxW);
    core.pushUndo();
    await core.commitCanvas(canvas);
  }

  function exitPlaceMode() {
    if (textDragDiv) { textDragDiv.remove(); textDragDiv = null; }
    if (textCommitBtn) { textCommitBtn.remove(); textCommitBtn = null; }
    if (textCancelBtn) { textCancelBtn.remove(); textCancelBtn = null; }
    if (editApply) { editApply.textContent = 'Add text'; editApply.classList.remove('active'); }
  }

  function enterPlaceMode() {
    const text = (editInput?.value || '').trim();
    if (!text) { editInput?.focus(); return; }
    if (textDragDiv) { exitPlaceMode(); return; }
    if (editApply) { editApply.textContent = 'Cancel'; editApply.classList.add('active'); }

    const stage = host.querySelector('.imgv-stage');
    stage.style.position = 'relative';
    const fontSize = Math.max(8, Math.min(240, parseInt(editSize?.value, 10) || 32));
    const fontFamily = editFont?.value || 'system-ui,sans-serif';
    const color = editColor?.value || '#ffffff';

    textDragDiv = document.createElement('div');
    textDragDiv.textContent = text;
    textDragDiv.style.cssText = [
      'position:absolute',
      'z-index:10',
      'cursor:move',
      'user-select:none',
      `font-size:${fontSize}px`,
      `font-family:${fontFamily}`,
      `color:${color}`,
      'font-weight:700',
      'background:rgba(255,255,255,0.15)',
      'padding:2px 4px',
      'border-radius:3px',
      'white-space:nowrap',
      'touch-action:none',
    ].join(';');
    stage.appendChild(textDragDiv);
    // Position centered on the image (not the stage) so the text is immediately visible.
    requestAnimationFrame(() => {
      const stageR = stage.getBoundingClientRect();
      const imgR = img.getBoundingClientRect();
      const textR = textDragDiv.getBoundingClientRect();
      const cx = imgR.left - stageR.left + (imgR.width - textR.width) / 2;
      const cy = imgR.top - stageR.top + imgR.height / 3;
      textDragDiv.style.left = Math.max(0, cx) + 'px';
      textDragDiv.style.top = Math.max(0, cy) + 'px';
    });

    let dragOffX = 0, dragOffY = 0, dragging = false;
    textDragDiv.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      textDragDiv.setPointerCapture(e.pointerId);
      const r = textDragDiv.getBoundingClientRect();
      dragOffX = e.clientX - r.left;
      dragOffY = e.clientY - r.top;
      dragging = true;
    });
    textDragDiv.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      e.preventDefault();
      const stageR = stage.getBoundingClientRect();
      const x = e.clientX - stageR.left - dragOffX;
      const y = e.clientY - stageR.top - dragOffY;
      textDragDiv.style.left = x + 'px';
      textDragDiv.style.top = y + 'px';
    });
    textDragDiv.addEventListener('pointerup', () => { dragging = false; });

    const bar = host.querySelector('.imgv-bar');
    textCommitBtn = document.createElement('button');
    textCommitBtn.textContent = 'Commit text';
    textCommitBtn.className = 'imgv-text-commit';
    textCommitBtn.title = 'Place the text at its current position';
    bar.appendChild(textCommitBtn);

    textCancelBtn = document.createElement('button');
    textCancelBtn.textContent = 'Cancel';
    textCancelBtn.className = 'imgv-text-cancel-place';
    textCancelBtn.title = 'Cancel text placement';
    bar.appendChild(textCancelBtn);

    textCommitBtn.addEventListener('click', () => {
      // Position as a fraction of the displayed image rect (bottom = text baseline).
      const imgR = img.getBoundingClientRect();
      const divR = textDragDiv.getBoundingClientRect();
      const nx = (divR.left - imgR.left) / imgR.width;
      const ny = (divR.bottom - imgR.top) / imgR.height;
      exitPlaceMode();
      commitText(nx, ny).catch((err) => { if (editApply) editApply.title = err.message || String(err); });
    });
    textCancelBtn.addEventListener('click', exitPlaceMode);
  }

  editApply?.addEventListener('click', enterPlaceMode);

  return { isActive: () => !!textDragDiv, exitPlaceMode };
}
