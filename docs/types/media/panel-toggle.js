// Collapsible "▶ Label / ▼ Label" panel helper (extracted from renderer.js).
//
// The media renderer had the same ~12-line toggle pattern repeated for the waveform, spectrum,
// dynamics, mixer and video-timeline panels: a wrap + toggle button + hidden panel, where the
// FIRST open lazily mounts a controller and a close destroys it (CPU-lazy). This collapses that
// boilerplate so renderer.js stays under the 500-LOC cap.
//
// `mount(panel)` is called on first open and may be async; it returns a controller with a
// `.destroy()` (called on collapse + on teardown). Returns { wrap, destroy }.

export function makeTogglePanel({ label, panelClass, mount, onMounted, floating = false, floatingTitle = label }) {
  const wrap = document.createElement('div');
  wrap.className = 'media-wv-wrap';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'media-wv-toggle';
  toggle.textContent = '▶ ' + label;
  const panel = document.createElement('div');
  panel.className = panelClass;
  panel.hidden = true;
  let mountTarget = panel;
  let drag = null;
  const closePanel = () => {
    panel.hidden = true;
    toggle.textContent = '▶ ' + label;
    controller?.destroy?.();
    controller = null;
  };
  if (floating) {
    panel.classList.add('media-floating-panel');
    panel.style.width = 'min(680px, 88vw)';
    panel.style.left = 'calc(100vw - min(704px, 88vw + 24px))';
    panel.style.top = '92px';
    const head = document.createElement('div');
    head.className = 'media-floating-head';
    const title = document.createElement('span');
    title.className = 'media-floating-title';
    title.textContent = floatingTitle;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'media-floating-close';
    close.textContent = 'Close';
    close.addEventListener('click', closePanel);
    mountTarget = document.createElement('div');
    mountTarget.className = 'media-floating-body';
    head.append(title, close);
    panel.append(head, mountTarget);
    head.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || event.target === close) return;
      const rect = panel.getBoundingClientRect();
      drag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
      event.preventDefault();
    });
  }
  wrap.append(toggle, panel);

  let controller = null;
  const onMove = (event) => {
    if (!drag) return;
    const maxX = window.innerWidth - 48;
    const maxY = window.innerHeight - 48;
    panel.style.left = `${Math.max(8, Math.min(maxX, event.clientX - drag.dx))}px`;
    panel.style.top = `${Math.max(8, Math.min(maxY, event.clientY - drag.dy))}px`;
  };
  const onUp = () => { drag = null; };
  if (floating) {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
  toggle.addEventListener('click', async () => {
    panel.hidden = !panel.hidden;
    toggle.textContent = (panel.hidden ? '▶ ' : '▼ ') + label;
    if (panel.hidden) { controller?.destroy?.(); controller = null; return; }
    if (!controller) {
      controller = await mount(mountTarget);
      onMounted?.(controller);
    }
  });

  return {
    wrap,
    destroy() {
      controller?.destroy?.();
      controller = null;
      drag = null;
      if (floating) {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }
    },
  };
}
