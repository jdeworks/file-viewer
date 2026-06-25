export function makeFloatingPanel(panel, { title = 'Settings', initialWidth = 360 } = {}) {
  const body = document.createElement('div');
  body.className = 'asx-float-body';
  while (panel.firstChild) body.appendChild(panel.firstChild);
  const head = document.createElement('div');
  head.className = 'asx-float-head';
  head.textContent = title;
  panel.append(head, body);
  panel.style.width = `${initialWidth}px`;
  panel.style.left = `calc(100vw - ${initialWidth + 24}px)`;
  panel.style.top = '92px';

  let drag = null;
  head.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const r = panel.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.preventDefault();
  });
  const onMove = (e) => {
    if (!drag) return;
    const maxX = window.innerWidth - 48;
    const maxY = window.innerHeight - 48;
    panel.style.left = `${Math.max(8, Math.min(maxX, e.clientX - drag.dx))}px`;
    panel.style.top = `${Math.max(8, Math.min(maxY, e.clientY - drag.dy))}px`;
  };
  const onUp = () => { drag = null; };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);

  return { body, destroy() { drag = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); } };
}
