export function mountAdvPrecision({ Konva, stage, tr, getObjects, getSelected, snap, markDirty, refreshLayers, stageW, stageH }) {
  const layer = new Konva.Layer({ listening: false });
  layer.name('precision');
  stage.add(layer);
  let gridOn = false;
  const gridSize = 25, threshold = 5;

  function drawGrid() {
    layer.find('.grid').forEach((n) => n.destroy());
    if (!gridOn) { layer.batchDraw(); return; }
    for (let x = gridSize; x < stageW(); x += gridSize) layer.add(line([x, 0, x, stageH()], 'grid', 'rgba(120,120,120,.22)', [2, 5]));
    for (let y = gridSize; y < stageH(); y += gridSize) layer.add(line([0, y, stageW(), y], 'grid', 'rgba(120,120,120,.22)', [2, 5]));
    layer.batchDraw();
  }

  function snapDrag(node) {
    clearGuides();
    if (!node) return;
    if (gridOn) {
      node.x(Math.round(node.x() / gridSize) * gridSize);
      node.y(Math.round(node.y() / gridSize) * gridSize);
    }
    const guides = snapToGuides(node);
    guides.forEach((g) => layer.add(line(g.points, 'guide', '#4c9aff', [4, 3])));
    layer.batchDraw();
  }

  function snapToGuides(node) {
    const box = node.getClientRect({ skipShadow: true });
    const stopsX = [0, stageW() / 2, stageW()];
    const stopsY = [0, stageH() / 2, stageH()];
    getObjects().forEach((other) => {
      if (other === node || !other.visible()) return;
      const r = other.getClientRect({ skipShadow: true });
      stopsX.push(r.x, r.x + r.width / 2, r.x + r.width);
      stopsY.push(r.y, r.y + r.height / 2, r.y + r.height);
    });
    const edgesX = [{ p: box.x, off: box.x - node.x() }, { p: box.x + box.width / 2, off: box.x + box.width / 2 - node.x() }, { p: box.x + box.width, off: box.x + box.width - node.x() }];
    const edgesY = [{ p: box.y, off: box.y - node.y() }, { p: box.y + box.height / 2, off: box.y + box.height / 2 - node.y() }, { p: box.y + box.height, off: box.y + box.height - node.y() }];
    const bestX = closest(stopsX, edgesX), bestY = closest(stopsY, edgesY);
    const guides = [];
    if (bestX) { node.x(bestX.value); guides.push({ points: [bestX.stop, 0, bestX.stop, stageH()] }); }
    if (bestY) { node.y(bestY.value); guides.push({ points: [0, bestY.stop, stageW(), bestY.stop] }); }
    return guides;
  }

  function closest(stops, edges) {
    let best = null;
    for (const stop of stops) for (const edge of edges) {
      const diff = Math.abs(stop - edge.p);
      if (diff <= threshold && (!best || diff < best.diff)) best = { diff, stop, value: stop - edge.off };
    }
    return best;
  }

  function activeNodes() {
    const live = new Set(getObjects());
    const transformed = (tr?.nodes?.() || []).filter((n) => live.has(n));
    const source = transformed.length ? transformed : (getSelected() || []);
    return [...new Set(source)]
      .filter((n) => live.has(n) && n.visible() && !n.getAttr?.('locked'));
  }

  function align(kind) {
    const nodes = activeNodes();
    if (nodes.length < 2) return;
    const boxes = nodes.map((n) => ({ n, r: n.getClientRect({ skipShadow: true }) }));
    const minX = Math.min(...boxes.map((b) => b.r.x)), maxX = Math.max(...boxes.map((b) => b.r.x + b.r.width));
    const minY = Math.min(...boxes.map((b) => b.r.y)), maxY = Math.max(...boxes.map((b) => b.r.y + b.r.height));
    snap();
    tr?.nodes?.([]);
    boxes.forEach(({ n, r }) => {
      if (kind === 'left') n.x(n.x() + minX - r.x);
      if (kind === 'hcenter') n.x(n.x() + (minX + maxX) / 2 - (r.x + r.width / 2));
      if (kind === 'right') n.x(n.x() + maxX - (r.x + r.width));
      if (kind === 'top') n.y(n.y() + minY - r.y);
      if (kind === 'vcenter') n.y(n.y() + (minY + maxY) / 2 - (r.y + r.height / 2));
      if (kind === 'bottom') n.y(n.y() + maxY - (r.y + r.height));
    });
    tr?.nodes?.(nodes);
    tr?.forceUpdate?.(); stage.batchDraw(); refreshLayers(); markDirty();
  }

  function distribute(axis) {
    const nodes = activeNodes();
    if (nodes.length < 3) return;
    const key = axis === 'x' ? 'x' : 'y', size = axis === 'x' ? 'width' : 'height';
    const boxes = nodes
      .map((n) => {
        const r = n.getClientRect({ skipShadow: true });
        return { n, r, center: r[key] + r[size] / 2 };
      })
      .sort((a, b) => a.center - b.center);
    const first = boxes[0].center;
    const last = boxes.at(-1).center;
    const step = (last - first) / (boxes.length - 1);
    snap();
    tr?.nodes?.([]);
    boxes.forEach(({ n, r }, i) => {
      const target = first + step * i;
      const delta = target - (r[key] + r[size] / 2);
      if (axis === 'x') n.x(n.x() + delta); else n.y(n.y() + delta);
    });
    tr?.nodes?.(nodes);
    tr?.forceUpdate?.(); stage.batchDraw(); refreshLayers(); markDirty();
  }

  function line(points, name, stroke, dash) {
    return new Konva.Line({ points, name, stroke, strokeWidth: 1, dash, listening: false });
  }
  function clearGuides() { layer.find('.guide').forEach((n) => n.destroy()); layer.batchDraw(); }

  return {
    layer,
    setGrid(on) { gridOn = !!on; drawGrid(); },
    relayout: drawGrid,
    snapDrag,
    clearGuides,
    align,
    distribute,
    destroy: () => layer.destroy(),
  };
}
