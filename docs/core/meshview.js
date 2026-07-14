// Shared 3D mesh viewer — renders a triangle mesh to a <canvas> in the parent pane with NO
// dependency: each face is rotated, orthographically projected, flat-shaded by its normal, and
// painted back-to-front (painter's algorithm). Drag (mouse/touch) to orbit. Used by the STL, OBJ,
// PLY, and glTF/GLB viewers — each supplies a normalized model + an info string.
//
// model: { tris: [{ v: [[x,y,z],[x,y,z],[x,y,z]], n: [x,y,z], color?: [r,g,b,a] }], size, center }
//
// Selection: click picks a triangle and opens a popover that recolors per the active select mode:
//   • Region (default) — the connected coplanar set around the hit triangle (a flat cube side),
//   • Face — just the one triangle,
//   • Group — the OBJ/material group the triangle belongs to (the original behaviour).
import { ptInTri2D, buildAdjacency, coplanarRegion } from './meshview-faces.js';

export function mountMeshView(model, infoText) {
  const host = document.createElement('div');
  host.className = 'stl-doc';
  if (!model.tris.length) { host.innerHTML = '<p class="stl-empty">No triangles found.</p>'; return { parentNode: host }; }

  host.innerHTML = '<div class="stl-bar"><span class="stl-info"></span>'
    + '<span class="mv-mode" title="What a click selects to color">'
    + '<button class="mv-mode-btn active" data-mode="region" title="Color the coplanar region (a flat side)">Region</button>'
    + '<button class="mv-mode-btn" data-mode="face" title="Color one triangle">Face</button>'
    + '<button class="mv-mode-btn" data-mode="group" title="Color the whole group/material">Group</button></span>'
    + '<input type="color" class="stl-color" value="#4978c8" title="Mesh color">'
    + '<button class="stl-dl-ply" title="Download colored PLY">&#8595; PLY</button>'
    + '<button class="stl-dl-obj" title="Download as OBJ">&#8595; OBJ</button>'
    + '<button class="stl-reset-colors" title="Reset all colors">Colors \xd7</button>'
    + '<button class="mv-wire" aria-pressed="false" title="Toggle triangle edges">Wire</button>'
    + '<button class="mv-normals" aria-pressed="false" title="Toggle face-normal directions">Normals</button>'
    + '<button class="mv-measure" aria-pressed="false" title="Measure between two mesh vertices">Measure</button>'
    + '<button class="mv-stats" aria-pressed="false" title="Show model statistics">Stats</button>'
    + '<button class="stl-reset" title="Reset view">Reset</button></div>'
    + '<div class="stl-stage"><canvas class="stl-canvas"></canvas>'
    + '<canvas class="mv-axes" aria-label="X Y Z orientation axes"></canvas>'
    + '<aside class="mv-stats-panel" hidden><h3>Model statistics</h3><dl></dl></aside>'
    + '<output class="mv-measure-readout" hidden></output></div>';
  const canvas = host.querySelector('.stl-canvas');
  const axesCanvas = host.querySelector('.mv-axes');
  const stage = host.querySelector('.stl-stage');
  const ctx = canvas.getContext('2d');
  const axesCtx = axesCanvas.getContext('2d');
  host.querySelector('.stl-info').textContent = infoText;

  const baseRotX = -1.1, baseRotY = 0.6;
  let rotX = baseRotX, rotY = baseRotY;
  let zoomFactor = 1;
  let wireframe = false, showNormals = false, measureMode = false;
  let measurePoints = [];
  let overrideColor = null;
  let selectMode = 'region'; // 'region' | 'face' | 'group'
  const groupColors = new Map(); // groupIdx → [r,g,b,1]
  const faceColors = new Map();  // triIdx → [r,g,b,1]
  // Precedence: per-face > per-group > global override > the triangle's own color > default.
  function resolveColor(t, triIdx) {
    if (triIdx != null && faceColors.has(triIdx)) return faceColors.get(triIdx);
    if (t.groupIdx != null && groupColors.has(t.groupIdx)) return groupColors.get(t.groupIdx);
    if (overrideColor) return overrideColor;
    return t.color || null;
  }
  function colorToHex(c) {
    return '#' + [c[0], c[1], c[2]].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  }
  function hexToColor(h) {
    return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255, 1];
  }
  const light = (() => { const l = [0.4, 0.5, 0.8]; const n = Math.hypot(...l); return l.map((x) => x / n); })();
  function faceFill(t, shade, triIdx) {
    const color = resolveColor(t, triIdx);
    const lit = 0.25 + 0.75 * shade;
    if (!color) return 'rgb(' + Math.round(70 * lit + 40) + ',' + Math.round(120 * lit + 40) + ',' + Math.round(200 * lit + 30) + ')';
    return 'rgba(' + Math.round(255 * color[0] * lit) + ',' + Math.round(255 * color[1] * lit) + ',' + Math.round(255 * color[2] * lit) + ',' + (color[3] ?? 1) + ')';
  }
  const scaleFit = () => {
    const maxDim = Math.max(model.size[0], model.size[1], model.size[2]) || 1;
    return 0.42 * Math.min(canvas.width, canvas.height) / maxDim * zoomFactor;
  };

  function rotatePoint(p, useCenter) {
    const cX = Math.cos(rotX), sX = Math.sin(rotX), cY = Math.cos(rotY), sY = Math.sin(rotY);
    const C = model.center;
    const x0 = p[0] - (useCenter ? C[0] : 0);
    const y0 = p[1] - (useCenter ? C[1] : 0);
    const z0 = p[2] - (useCenter ? C[2] : 0);
    const y1 = y0 * cX - z0 * sX, z1 = y0 * sX + z0 * cX;
    return [x0 * cY + z1 * sY, y1, -x0 * sY + z1 * cY];
  }

  function drawAxes() {
    const W = axesCanvas.width, H = axesCanvas.height;
    axesCtx.clearRect(0, 0, W, H);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const origin = [W / 2, H / 2];
    const length = 24 * dpr;
    const axes = [
      { label: 'X', color: '#ef4444', vector: [1, 0, 0] },
      { label: 'Y', color: '#22c55e', vector: [0, 1, 0] },
      { label: 'Z', color: '#3b82f6', vector: [0, 0, 1] },
    ];
    axesCtx.font = `${10 * dpr}px ui-monospace, monospace`;
    axesCtx.lineWidth = Math.max(1, dpr);
    axes.forEach((axis) => {
      const p = rotatePoint(axis.vector, false);
      const end = [origin[0] + p[0] * length, origin[1] - p[1] * length];
      axesCtx.strokeStyle = axis.color;
      axesCtx.fillStyle = axis.color;
      axesCtx.beginPath(); axesCtx.moveTo(...origin); axesCtx.lineTo(...end); axesCtx.stroke();
      axesCtx.fillText(axis.label, end[0] + 2 * dpr, end[1] - 2 * dpr);
    });
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, s = scaleFit();
    const faces = [];
    for (let ti = 0; ti < model.tris.length; ti++) {
      const t = model.tris[ti];
      const a = rotatePoint(t.v[0], true), b = rotatePoint(t.v[1], true), c = rotatePoint(t.v[2], true);
      const n = rotatePoint(t.n, false);
      const pa = [cx + a[0] * s, cy - a[1] * s];
      const pb = [cx + b[0] * s, cy - b[1] * s];
      const pc = [cx + c[0] * s, cy - c[1] * s];
      faces.push({ color: t.color, groupIdx: t.groupIdx, triIdx: ti, world: t.v, normal: n,
        proj2d: [pa, pb, pc], shade: Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]),
        depth: (a[2] + b[2] + c[2]) / 3 });
    }
    faces.sort((p, q) => p.depth - q.depth);
    _lastFaces = faces;
    for (const f of faces) {
      ctx.fillStyle = faceFill(f, f.shade, f.triIdx);
      ctx.beginPath();
      ctx.moveTo(f.proj2d[0][0], f.proj2d[0][1]);
      ctx.lineTo(f.proj2d[1][0], f.proj2d[1][1]);
      ctx.lineTo(f.proj2d[2][0], f.proj2d[2][1]);
      ctx.closePath();
      ctx.fill();
      if (wireframe) {
        ctx.strokeStyle = 'rgba(15,23,42,.58)';
        ctx.lineWidth = Math.max(1, window.devicePixelRatio || 1);
        ctx.stroke();
      }
      if (showNormals) {
        const mx = (f.proj2d[0][0] + f.proj2d[1][0] + f.proj2d[2][0]) / 3;
        const my = (f.proj2d[0][1] + f.proj2d[1][1] + f.proj2d[2][1]) / 3;
        const len = 18 * Math.min(2, window.devicePixelRatio || 1);
        ctx.strokeStyle = 'rgba(236,72,153,.85)';
        ctx.lineWidth = Math.max(1, window.devicePixelRatio || 1);
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + f.normal[0] * len, my - f.normal[1] * len); ctx.stroke();
      }
    }
    if (measurePoints.length) {
      const projected = measurePoints.map((p) => {
        const r = rotatePoint(p, true);
        return [cx + r[0] * s, cy - r[1] * s];
      });
      ctx.fillStyle = '#f59e0b'; ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = Math.max(2, 2 * (window.devicePixelRatio || 1));
      if (projected.length === 2) { ctx.beginPath(); ctx.moveTo(...projected[0]); ctx.lineTo(...projected[1]); ctx.stroke(); }
      projected.forEach((p) => { ctx.beginPath(); ctx.arc(p[0], p[1], 4 * (window.devicePixelRatio || 1), 0, Math.PI * 2); ctx.fill(); });
    }
    drawAxes();
    canvas.dataset.zoom = zoomFactor.toFixed(3);
  }

  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  function resize() {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(r.width * dpr));
    canvas.height = Math.max(1, Math.floor(r.height * dpr));
    canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
    axesCanvas.width = Math.floor(76 * dpr); axesCanvas.height = Math.floor(76 * dpr);
    axesCanvas.style.width = '76px'; axesCanvas.style.height = '76px';
    schedule();
  }

  const clampZoom = (value) => Math.max(0.25, Math.min(8, value));
  const pointers = new Map();
  let dragging = false, px = 0, py = 0, pinchStartDistance = 0, pinchStartZoom = 1;
  let _wasDragging = false, _lastFaces = [];
  const pointerDistance = () => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  canvas.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragging = true; _wasDragging = false; px = e.clientX; py = e.clientY;
    if (pointers.size === 2) { pinchStartDistance = pointerDistance(); pinchStartZoom = zoomFactor; }
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    _wasDragging = true;
    if (pointers.size >= 2) {
      const distance = pointerDistance();
      if (pinchStartDistance > 0) zoomFactor = clampZoom(pinchStartZoom * distance / pinchStartDistance);
    } else if (dragging) {
      rotY += (e.clientX - px) * 0.01; rotX += (e.clientY - py) * 0.01;
      px = e.clientX; py = e.clientY;
    }
    schedule();
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    dragging = pointers.size > 0;
    if (pointers.size === 1) {
      const p = [...pointers.values()][0]; px = p.x; py = p.y;
    }
    pinchStartDistance = 0;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomFactor = clampZoom(zoomFactor * Math.exp(-e.deltaY * 0.0015));
    schedule();
  }, { passive: false });
  host.querySelector('.stl-reset').addEventListener('click', () => {
    rotX = baseRotX; rotY = baseRotY; zoomFactor = 1; measurePoints = [];
    host.querySelector('.mv-measure-readout').hidden = true;
    schedule();
  });
  host.querySelector('.stl-reset-colors').addEventListener('click', () => { groupColors.clear(); faceColors.clear(); schedule(); });

  function toggleButton(selector, active) {
    const button = host.querySelector(selector);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  host.querySelector('.mv-wire').addEventListener('click', () => { wireframe = !wireframe; toggleButton('.mv-wire', wireframe); schedule(); });
  host.querySelector('.mv-normals').addEventListener('click', () => { showNormals = !showNormals; toggleButton('.mv-normals', showNormals); schedule(); });
  host.querySelector('.mv-measure').addEventListener('click', () => {
    measureMode = !measureMode; measurePoints = [];
    toggleButton('.mv-measure', measureMode);
    const readout = host.querySelector('.mv-measure-readout');
    readout.textContent = measureMode ? 'Select two mesh vertices' : '';
    readout.hidden = !measureMode;
    schedule();
  });
  host.querySelector('.mv-stats').addEventListener('click', () => {
    const panel = host.querySelector('.mv-stats-panel');
    panel.hidden = !panel.hidden;
    toggleButton('.mv-stats', !panel.hidden);
  });

  const vertexKeys = new Set();
  for (const triangle of model.tris) {
    for (const vertex of triangle.v) vertexKeys.add(vertex.map((value) => Number(value).toPrecision(12)).join(','));
  }
  const uniqueVertices = vertexKeys.size;
  const stats = [
    ['Triangles', model.tris.length.toLocaleString()],
    ['Vertices', Number(model.vertexCount || uniqueVertices).toLocaleString()],
    ['Groups / materials', String((model.groups || []).length || 1)],
    ['Bounds', model.size.map((n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 })).join(' × ')],
    ...(model.extraStats || []),
  ];
  const statsList = host.querySelector('.mv-stats-panel dl');
  stats.forEach(([label, value]) => {
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = value;
    statsList.append(dt, dd);
  });

  // Select-mode toggle (touch-friendly buttons, not modifier keys).
  host.querySelectorAll('.mv-mode-btn').forEach((b) => b.addEventListener('click', () => {
    selectMode = b.dataset.mode;
    host.querySelectorAll('.mv-mode-btn').forEach((o) => o.classList.toggle('active', o === b));
  }));

  // Welded-vertex edge adjacency for region flood-fill — built lazily, cached on the model.
  function adjacency() {
    if (!model._mvAdj) model._mvAdj = buildAdjacency(model);
    return model._mvAdj;
  }

  // A selection is one of: { kind:'group', groupIdx } / { kind:'face', triIdx } /
  // { kind:'region', triIdx, tris:[…] }. The popover writes the chosen color into the right map.
  function selectionFromHit(triIdx) {
    if (selectMode === 'group') return { kind: 'group', groupIdx: model.tris[triIdx]?.groupIdx ?? 0 };
    if (selectMode === 'face') return { kind: 'face', triIdx };
    return { kind: 'region', triIdx, tris: coplanarRegion(model, adjacency(), triIdx) };
  }
  function selCurrentColor(sel) {
    if (sel.kind === 'group') {
      const group = (model.groups || [])[sel.groupIdx] ?? { id: 'mesh', color: [0.286, 0.471, 0.784, 1] };
      return groupColors.get(sel.groupIdx) ?? group.color;
    }
    return faceColors.get(sel.triIdx) ?? model.tris[sel.triIdx]?.color ?? [0.286, 0.471, 0.784, 1];
  }
  function selLabel(sel) {
    if (sel.kind === 'group') return ((model.groups || [])[sel.groupIdx] ?? { id: 'mesh' }).id;
    if (sel.kind === 'face') return 'Face #' + sel.triIdx;
    return 'Region (' + sel.tris.length + ' face' + (sel.tris.length === 1 ? '' : 's') + ')';
  }
  function selApply(sel, color) {
    if (sel.kind === 'group') groupColors.set(sel.groupIdx, color);
    else if (sel.kind === 'face') faceColors.set(sel.triIdx, color);
    else for (const ti of sel.tris) faceColors.set(ti, color);
  }
  function selClear(sel) {
    if (sel.kind === 'group') groupColors.delete(sel.groupIdx);
    else if (sel.kind === 'face') faceColors.delete(sel.triIdx);
    else for (const ti of sel.tris) faceColors.delete(ti);
  }
  function showGroupPicker(screenX, screenY, sel) {
    const hex = colorToHex(selCurrentColor(sel));
    let picker = host.querySelector('.mv-group-picker');
    if (!picker) {
      picker = document.createElement('div');
      picker.className = 'mv-group-picker';
      picker.innerHTML = '<span class="mv-gp-name"></span><input type="color" class="mv-gp-color"><button class="mv-gp-clear" title="Clear this selection’s color">\xd7</button>';
      host.appendChild(picker);
      picker.querySelector('.mv-gp-color').addEventListener('input', (e) => {
        selApply(picker._sel, hexToColor(e.target.value));
        schedule();
      });
      picker.querySelector('.mv-gp-clear').addEventListener('click', () => {
        selClear(picker._sel);
        schedule();
        hideGroupPicker();
      });
    }
    picker._sel = sel;
    picker.querySelector('.mv-gp-name').textContent = selLabel(sel);
    picker.querySelector('.mv-gp-color').value = hex;
    picker.style.cssText = 'display:flex;position:fixed;left:' + (screenX + 12) + 'px;top:' + (screenY + 12) + 'px;z-index:10;gap:6px;align-items:center;background:var(--bg,#fff);border:1px solid var(--border,#ccc);border-radius:6px;padding:4px 8px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.15)';
  }
  function hideGroupPicker() { host.querySelector('.mv-group-picker')?.remove(); }
  canvas.addEventListener('click', (e) => {
    if (_wasDragging) { _wasDragging = false; return; }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY;
    for (let i = _lastFaces.length - 1; i >= 0; i--) {
      const f = _lastFaces[i];
      if (ptInTri2D(mx, my, ...f.proj2d)) {
        if (measureMode) {
          let nearest = 0, distance = Infinity;
          f.proj2d.forEach((p, index) => {
            const d = Math.hypot(p[0] - mx, p[1] - my);
            if (d < distance) { distance = d; nearest = index; }
          });
          if (measurePoints.length >= 2) measurePoints = [];
          measurePoints.push(f.world[nearest].slice());
          const readout = host.querySelector('.mv-measure-readout');
          if (measurePoints.length === 2) {
            const [a, b] = measurePoints;
            const value = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
            readout.textContent = `Distance: ${value.toLocaleString(undefined, { maximumFractionDigits: 6 })} model units`;
          } else readout.textContent = 'Select the second mesh vertex';
          schedule();
          return;
        }
        showGroupPicker(e.clientX, e.clientY, selectionFromHit(f.triIdx ?? 0));
        return;
      }
    }
    hideGroupPicker();
  });

  host.querySelector('.stl-color').addEventListener('input', (e) => {
    const h = e.target.value;
    overrideColor = [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255, 1];
    schedule();
  });
  host.querySelector('.stl-dl-ply').addEventListener('click', () => {
    const lines = ['ply', 'format ascii 1.0', 'element vertex ' + model.tris.length * 3,
      'property float x', 'property float y', 'property float z',
      'property uchar red', 'property uchar green', 'property uchar blue',
      'element face ' + model.tris.length, 'property list uchar int vertex_indices', 'end_header'];
    let vi = 0;
    for (let ti = 0; ti < model.tris.length; ti++) {
      const t = model.tris[ti];
      const tc = resolveColor(t, ti) || [0.286, 0.471, 0.784, 1];
      const r = Math.round(tc[0] * 255), g = Math.round(tc[1] * 255), b = Math.round(tc[2] * 255);
      for (const v of t.v) lines.push(v[0] + ' ' + v[1] + ' ' + v[2] + ' ' + r + ' ' + g + ' ' + b);
    }
    for (let i = 0; i < model.tris.length; i++) { lines.push('3 ' + vi + ' ' + (vi + 1) + ' ' + (vi + 2)); vi += 3; }
    const blob = new Blob([lines.join('\n')], { type: 'application/octet-stream' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = (model._filename ? model._filename.replace(/\.[^.]+$/, '') : 'model') + '-colored.ply';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  });
  host.querySelector('.stl-dl-obj').addEventListener('click', () => {
    const base = model._filename ? model._filename.replace(/\.[^.]+$/, '') : 'model';
    const grps = model.groups || [{ id: 'mesh', color: [0.286, 0.471, 0.784, 1] }];
    // Per-triangle effective material: a face/region color is promoted to a SYNTHETIC material
    // (deduped by color) so OBJ usemtl carries it; un-recolored faces keep their real group's
    // material. This never clobbers OBJ-derived usemtl groups.
    const mats = []; // { id, color }
    const matIdxByKey = new Map();
    const groupMatIdx = new Map(); // groupIdx → mat index (real groups, possibly recolored)
    const ensureGroupMat = (gIdx) => {
      if (groupMatIdx.has(gIdx)) return groupMatIdx.get(gIdx);
      const grp = grps[gIdx] || { id: 'mesh', color: [0.286, 0.471, 0.784, 1] };
      const idx = mats.length;
      mats.push({ id: grp.id || 'mesh', color: groupColors.get(gIdx) ?? grp.color });
      groupMatIdx.set(gIdx, idx);
      return idx;
    };
    const ensureFaceMat = (color) => {
      const key = color.map((c) => Math.round(c * 255)).slice(0, 3).join('_');
      if (matIdxByKey.has(key)) return matIdxByKey.get(key);
      const idx = mats.length;
      mats.push({ id: 'fv_face_' + key, color });
      matIdxByKey.set(key, idx);
      return idx;
    };
    const triMat = new Array(model.tris.length);
    for (let i = 0; i < model.tris.length; i++) {
      const t = model.tris[i];
      if (faceColors.has(i)) triMat[i] = ensureFaceMat(faceColors.get(i));
      else triMat[i] = ensureGroupMat(t.groupIdx ?? 0);
    }
    let mtl = '# Generated by file-viewer\n\n';
    for (const m of mats) {
      const [r, g, b] = m.color.slice(0, 3);
      mtl += 'newmtl ' + m.id + '\nKd ' + r.toFixed(4) + ' ' + g.toFixed(4) + ' ' + b.toFixed(4) + '\nNs 10\nd 1\n\n';
    }
    const objLines = ['# Generated by file-viewer', 'mtllib ' + base + '-colored.mtl'];
    for (const t of model.tris) for (const v of t.v) objLines.push('v ' + v[0] + ' ' + v[1] + ' ' + v[2]);
    for (const t of model.tris) {
      const n = t.n;
      objLines.push('vn ' + n[0] + ' ' + n[1] + ' ' + n[2]);
      objLines.push('vn ' + n[0] + ' ' + n[1] + ' ' + n[2]);
      objLines.push('vn ' + n[0] + ' ' + n[1] + ' ' + n[2]);
    }
    let vi = 1, vni = 1, lastMat = -1;
    for (let i = 0; i < model.tris.length; i++) {
      const mIdx = triMat[i];
      if (mIdx !== lastMat) { objLines.push('usemtl ' + mats[mIdx].id); lastMat = mIdx; }
      objLines.push('f ' + vi + '//' + vni + ' ' + (vi + 1) + '//' + (vni + 1) + ' ' + (vi + 2) + '//' + (vni + 2));
      vi += 3; vni += 3;
    }
    const objBlob = new Blob([objLines.join('\n')], { type: 'application/octet-stream' });
    const mtlBlob = new Blob([mtl], { type: 'application/octet-stream' });
    const aObj = document.createElement('a'); aObj.href = URL.createObjectURL(objBlob);
    aObj.download = base + '-colored.obj'; aObj.click();
    setTimeout(() => {
      const aMtl = document.createElement('a'); aMtl.href = URL.createObjectURL(mtlBlob);
      aMtl.download = base + '-colored.mtl'; aMtl.click();
      setTimeout(() => { URL.revokeObjectURL(aObj.href); URL.revokeObjectURL(aMtl.href); }, 30000);
    }, 200);
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
