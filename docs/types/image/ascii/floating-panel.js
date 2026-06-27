// Floating, draggable settings panel for the ASCII studio. Uses POINTER events (not
// mouse) so dragging works with touch as well as a mouse, and exposes a close ✕ on the
// head so it's dismissible on phones where the toolbar toggle may be out of reach.
export function makeFloatingPanel(panel, { title = 'Settings', initialWidth = 360, onClose } = {}) {
  const body = document.createElement('div');
  body.className = 'asx-float-body';
  while (panel.firstChild) body.appendChild(panel.firstChild);

  const head = document.createElement('div');
  head.className = 'asx-float-head';
  head.style.touchAction = 'none';   // a touch-drag on the head must not scroll the page
  const titleEl = document.createElement('span');
  titleEl.className = 'asx-float-title';
  titleEl.textContent = title;
  head.appendChild(titleEl);
  let closeBtn = null;
  if (onClose) {
    closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'asx-float-close';
    closeBtn.title = 'Close settings';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => onClose());
    head.appendChild(closeBtn);
  }
  panel.append(head, body);

  // Responsive initial size/position — never wider than the viewport, never off-screen.
  const w = Math.min(initialWidth, window.innerWidth - 16);
  panel.style.width = `${w}px`;
  panel.style.left = `${Math.max(8, window.innerWidth - w - 24)}px`;
  panel.style.top = '92px';

  let drag = null, pid = null;
  const onDown = (e) => {
    if (closeBtn && e.target.closest('.asx-float-close')) return;   // taps on ✕ aren't drags
    const r = panel.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    pid = e.pointerId;
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!drag || (pid != null && e.pointerId !== pid)) return;
    const maxX = window.innerWidth - 48, maxY = window.innerHeight - 48;
    panel.style.left = `${Math.max(8, Math.min(maxX, e.clientX - drag.dx))}px`;
    panel.style.top = `${Math.max(8, Math.min(maxY, e.clientY - drag.dy))}px`;
  };
  const onUp = () => { drag = null; pid = null; };
  head.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  return {
    body,
    destroy() {
      drag = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    },
  };
}
