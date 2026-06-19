// Shared 3D mesh viewer — renders a triangle mesh to a <canvas> in the parent pane with NO
// dependency: each face is rotated, orthographically projected, flat-shaded by its normal, and
// painted back-to-front (painter's algorithm). Drag (mouse/touch) to orbit. Used by the STL and
// OBJ viewers (and any future mesh format) — each supplies a normalized model + an info string.
//
// model: { tris: [{ v: [[x,y,z],[x,y,z],[x,y,z]], n: [x,y,z], color?: [r,g,b,a] }], size, center }

export function mountMeshView(model, infoText) {
  const host = document.createElement('div');
  host.className = 'stl-doc';
  if (!model.tris.length) { host.innerHTML = '<p class="stl-empty">No triangles found.</p>'; return { parentNode: host }; }

  host.innerHTML = '<div class="stl-bar"><span class="stl-info"></span>'
    + '<input type="color" class="stl-color" value="#4978c8" title="Mesh color">'
    + '<button class="stl-dl-ply" title="Download colored PLY">&#8595; PLY</button>'
    + '<button class="stl-reset" title="Reset view">Reset</button></div>'
    + '<div class="stl-stage"><canvas class="stl-canvas"></canvas></div>';
  const canvas = host.querySelector('.stl-canvas');
  const stage = host.querySelector('.stl-stage');
  const ctx = canvas.getContext('2d');
  host.querySelector('.stl-info').textContent = infoText;

  const baseRotX = -1.1, baseRotY = 0.6;
  let rotX = baseRotX, rotY = baseRotY;
  let overrideColor = null;
  const light = (() => { const l = [0.4, 0.5, 0.8]; const n = Math.hypot(...l); return l.map((x) => x / n); })();
  function faceFill(triColor, shade) {
    const color = overrideColor || triColor;
    const lit = 0.25 + 0.75 * shade;
    if (!color) return 'rgb(' + Math.round(70 * lit + 40) + ',' + Math.round(120 * lit + 40) + ',' + Math.round(200 * lit + 30) + ')';
    return 'rgba(' + Math.round(255 * color[0] * lit) + ',' + Math.round(255 * color[1] * lit) + ',' + Math.round(255 * color[2] * lit) + ',' + (color[3] ?? 1) + ')';
  }
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
    const rot = (p, useCenter) => {
      const x0 = p[0] - (useCenter ? C[0] : 0), y0 = p[1] - (useCenter ? C[1] : 0), z0 = p[2] - (useCenter ? C[2] : 0);
      const y1 = y0 * cX - z0 * sX, z1 = y0 * sX + z0 * cX;
      const x2 = x0 * cY + z1 * sY, z2 = -x0 * sY + z1 * cY;
      return [x2, y1, z2];
    };
    const faces = [];
    for (const t of model.tris) {
      const a = rot(t.v[0], true), b = rot(t.v[1], true), c = rot(t.v[2], true);
      const n = rot(t.n, false);
      faces.push({ a, b, c, color: t.color, shade: Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]), depth: (a[2] + b[2] + c[2]) / 3 });
    }
    faces.sort((p, q) => p.depth - q.depth);
    for (const f of faces) {
      ctx.fillStyle = faceFill(f.color, f.shade);
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

  let dragging = false, px = 0, py = 0;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!dragging) return; rotY += (e.clientX - px) * 0.01; rotX += (e.clientY - py) * 0.01; px = e.clientX; py = e.clientY; schedule(); });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  host.querySelector('.stl-reset').addEventListener('click', () => { rotX = baseRotX; rotY = baseRotY; schedule(); });
  host.querySelector('.stl-color').addEventListener('input', (e) => {
    const h = e.target.value;
    overrideColor = [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255, 1];
    schedule();
  });
  host.querySelector('.stl-dl-ply').addEventListener('click', () => {
    const [r, g, b] = overrideColor ? overrideColor.map((c) => Math.round(c * 255)) : [73, 120, 200];
    const lines = ['ply', 'format ascii 1.0', 'element vertex ' + model.tris.length * 3,
      'property float x', 'property float y', 'property float z',
      'property uchar red', 'property uchar green', 'property uchar blue',
      'element face ' + model.tris.length, 'property list uchar int vertex_indices', 'end_header'];
    let vi = 0;
    for (const t of model.tris) for (const v of t.v) lines.push(v[0] + ' ' + v[1] + ' ' + v[2] + ' ' + r + ' ' + g + ' ' + b);
    for (let i = 0; i < model.tris.length; i++) { lines.push('3 ' + vi + ' ' + (vi + 1) + ' ' + (vi + 2)); vi += 3; }
    const blob = new Blob([lines.join('\n')], { type: 'application/octet-stream' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = (model._filename ? model._filename.replace(/\.[^.]+$/, '') : 'model') + '-colored.ply';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  });

  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  return { parentNode: host, revoke: () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); } };
}

// Compute bounding box, size, and center for a triangle list — shared by mesh parsers.
export function bounds(tris) {
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (const p of t.v) for (let k = 0; k < 3; k++) { if (p[k] < min[k]) min[k] = p[k]; if (p[k] > max[k]) max[k] = p[k]; }
  if (!tris.length) min = max = [0, 0, 0];
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]], center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2] };
}
