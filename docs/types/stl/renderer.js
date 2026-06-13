// STL 3D viewer — renders the mesh to a <canvas> in the parent pane with no dependency: each
// triangle is rotated, orthographically projected, flat-shaded by its normal, and drawn
// back-to-front (painter's algorithm). Drag (mouse/touch) to orbit. STL is geometry data, not
// code — safe to render in the parent document.
import { parseSTL } from './stllib.js';

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'stl-doc';

  let model;
  try { model = parseSTL(intake); }
  catch (e) { host.innerHTML = '<div class="json-error"><strong>Could not read STL</strong><br>' + (e.message || e) + '</div>'; return { parentNode: host }; }
  if (!model.tris.length) { host.innerHTML = '<p class="stl-empty">No triangles found in this STL.</p>'; return { parentNode: host }; }

  host.innerHTML = '<div class="stl-bar"><span class="stl-info"></span><button class="stl-reset" title="Reset view">Reset</button></div>'
    + '<div class="stl-stage"><canvas class="stl-canvas"></canvas></div>';
  const canvas = host.querySelector('.stl-canvas');
  const stage = host.querySelector('.stl-stage');
  const ctx = canvas.getContext('2d');
  host.querySelector('.stl-info').textContent = model.tris.length.toLocaleString() + ' triangles · '
    + model.size.map((s) => s.toFixed(1)).join(' × ');

  let rotX = -1.1, rotY = 0.6, baseRotX = -1.1, baseRotY = 0.6;
  const light = (() => { const l = [0.4, 0.5, 0.8]; const n = Math.hypot(...l); return l.map((x) => x / n); })();
  const scaleFit = () => {
    const maxDim = Math.max(model.size[0], model.size[1], model.size[2]) || 1;
    return 0.42 * Math.min(canvas.width, canvas.height) / maxDim;
  };

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, s = scaleFit();
    const cX = Math.cos(rotX), sX = Math.sin(rotX), cY = Math.cos(rotY), sY = Math.sin(rotY);
    const C = model.center;
    const rot = (p) => {
      const x0 = p[0] - C[0], y0 = p[1] - C[1], z0 = p[2] - C[2];
      const y1 = y0 * cX - z0 * sX, z1 = y0 * sX + z0 * cX;          // rotate X
      const x2 = x0 * cY + z1 * sY, z2 = -x0 * sY + z1 * cY;          // rotate Y
      return [x2, y1, z2];
    };
    const faces = [];
    for (const t of model.tris) {
      const a = rot(t.v[0]), b = rot(t.v[1]), c = rot(t.v[2]);
      const n = rot([t.n[0] + C[0], t.n[1] + C[1], t.n[2] + C[2]]);   // rotate the normal direction
      const depth = (a[2] + b[2] + c[2]) / 3;
      faces.push({ a, b, c, nz: n[2], shade: Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]), depth });
    }
    faces.sort((p, q) => p.depth - q.depth);                          // back to front
    for (const f of faces) {
      const lit = 0.25 + 0.75 * f.shade;
      const r = Math.round(70 * lit + 40), g = Math.round(120 * lit + 40), bl = Math.round(200 * lit + 30);
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + bl + ')';
      ctx.beginPath();
      ctx.moveTo(cx + f.a[0] * s, cy - f.a[1] * s);
      ctx.lineTo(cx + f.b[0] * s, cy - f.b[1] * s);
      ctx.lineTo(cx + f.c[0] * s, cy - f.c[1] * s);
      ctx.closePath();
      ctx.fill();
    }
  }

  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  function resize() {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(r.width * dpr));
    canvas.height = Math.max(1, Math.floor(r.height * dpr));
    canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
    schedule();
  }

  // Drag to orbit (mouse + touch via pointer events).
  let dragging = false, px = 0, py = 0;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!dragging) return; rotY += (e.clientX - px) * 0.01; rotX += (e.clientY - py) * 0.01; px = e.clientX; py = e.clientY; schedule(); });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  host.querySelector('.stl-reset').addEventListener('click', () => { rotX = baseRotX; rotY = baseRotY; schedule(); });

  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  return { parentNode: host, revoke: () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); } };
}
