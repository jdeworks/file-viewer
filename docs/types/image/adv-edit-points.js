export function mountAdvPointEditor({ Konva, stage, tr, getSelected, markDirty, refreshLayers }) {
  const layer = new Konva.Layer({ listening: true });
  layer.name('point-edit');
  stage.add(layer);
  let enabled = false;

  const target = () => enabled ? getSelected().find((n) => ['Line', 'Arrow'].includes(n.getClassName?.())) : null;
  const localPoint = (node, pos) => node.getAbsoluteTransform().copy().invert().point(pos);
  const worldPoint = (node, x, y) => node.getAbsoluteTransform().point({ x, y });

  function setEnabled(on) {
    enabled = !!on;
    if (enabled) tr?.nodes?.([]);
    refresh();
  }

  function refresh() {
    layer.destroyChildren();
    const node = target();
    if (!node || !node.visible()) { layer.batchDraw(); return; }
    const pts = node.points().slice();
    for (let i = 0; i < pts.length; i += 2) layer.add(handle(node, i, false));
    for (let i = 0; i < pts.length - 2; i += 2) layer.add(handle(node, i, true));
    layer.batchDraw();
  }

  function handle(node, idx, mid) {
    const pts = node.points();
    const p = mid
      ? { x: (pts[idx] + pts[idx + 2]) / 2, y: (pts[idx + 1] + pts[idx + 3]) / 2 }
      : { x: pts[idx], y: pts[idx + 1] };
    const w = worldPoint(node, p.x, p.y);
    const h = new Konva.Circle({
      x: w.x, y: w.y, radius: mid ? 5 : 6,
      fill: mid ? '#ffffff' : '#4c9aff', stroke: '#0b3d91', strokeWidth: 1,
      draggable: true, name: mid ? 'point-mid' : 'point-handle',
    });
    let pointIndex = idx, inserted = false;
    h.on('dragstart', (e) => {
      e.cancelBubble = true;
      if (!mid || inserted) return;
      const now = node.points().slice();
      const lp = localPoint(node, h.position());
      now.splice(idx + 2, 0, lp.x, lp.y);
      node.points(now);
      pointIndex = idx + 2;
      inserted = true;
      h.name('point-handle');
      h.fill('#4c9aff');
      layer.find('.point-mid').forEach((n) => n.destroy());
    });
    h.on('dragmove', (e) => {
      e.cancelBubble = true;
      const now = node.points().slice();
      const lp = localPoint(node, h.position());
      now[pointIndex] = lp.x; now[pointIndex + 1] = lp.y;
      node.points(now);
      tr?.forceUpdate?.(); stage.batchDraw();
    });
    h.on('dragend', (e) => {
      e.cancelBubble = true;
      refresh(); refreshLayers(); markDirty();
    });
    return h;
  }

  return {
    layer,
    isEnabled: () => enabled,
    setEnabled,
    refresh,
    destroy: () => layer.destroy(),
  };
}
