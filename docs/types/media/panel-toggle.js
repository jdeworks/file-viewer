// Collapsible "▶ Label / ▼ Label" panel helper (extracted from renderer.js).
//
// The media renderer had the same ~12-line toggle pattern repeated for the waveform, spectrum,
// dynamics, mixer and video-timeline panels: a wrap + toggle button + hidden panel, where the
// FIRST open lazily mounts a controller and a close destroys it (CPU-lazy). This collapses that
// boilerplate so renderer.js stays under the 500-LOC cap.
//
// `mount(panel)` is called on first open and may be async; it returns a controller with a
// `.destroy()` (called on collapse + on teardown). Returns { wrap, destroy }.

export function makeTogglePanel({ label, panelClass, mount, onMounted }) {
  const wrap = document.createElement('div');
  wrap.className = 'media-wv-wrap';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'media-wv-toggle';
  toggle.textContent = '▶ ' + label;
  const panel = document.createElement('div');
  panel.className = panelClass;
  panel.hidden = true;
  wrap.append(toggle, panel);

  let controller = null;
  toggle.addEventListener('click', async () => {
    panel.hidden = !panel.hidden;
    toggle.textContent = (panel.hidden ? '▶ ' : '▼ ') + label;
    if (panel.hidden) { controller?.destroy?.(); controller = null; return; }
    if (!controller) {
      controller = await mount(panel);
      onMounted?.(controller);
    }
  });

  return { wrap, destroy() { controller?.destroy?.(); controller = null; } };
}
