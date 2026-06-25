export function isTypingTarget(target) {
  if (!target) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA') return true;
  if (target.tagName !== 'INPUT') return false;
  return /^(text|search|url|email|tel|password)$/i.test(target.type || 'text');
}

export function rgbToHex(c) {
  if (typeof c !== 'string') return '#000000';
  if (c[0] === '#') return c.length === 7 ? c : c;
  const m = c.match(/\d+/g);
  if (!m) return '#000000';
  return '#' + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join('');
}

export function normalizeTransform(node) {
  const cls = node?.getClassName?.();
  if (!node || cls === 'Label' || cls === 'Group') return;
  const sx = node.scaleX?.() || 1, sy = node.scaleY?.() || 1;
  if (Math.abs(sx - 1) < 1e-4 && Math.abs(sy - 1) < 1e-4) return;
  if (typeof node.width === 'function' && typeof node.height === 'function' && !['Line', 'Arrow'].includes(cls)) {
    node.width(Math.max(1, node.width() * sx));
    node.height(Math.max(1, node.height() * sy));
  } else if (cls === 'Circle') {
    node.radius(Math.max(1, node.radius() * Math.max(Math.abs(sx), Math.abs(sy))));
  } else if (cls === 'Ellipse') {
    node.radiusX(Math.max(1, node.radiusX() * sx));
    node.radiusY(Math.max(1, node.radiusY() * sy));
  } else if (cls === 'Ring' || cls === 'Arc') {
    const k = Math.max(Math.abs(sx), Math.abs(sy));
    node.innerRadius(Math.max(1, node.innerRadius() * k));
    node.outerRadius(Math.max(1, node.outerRadius() * k));
  } else if (cls === 'Wedge') {
    node.radius(Math.max(1, node.radius() * Math.max(Math.abs(sx), Math.abs(sy))));
  } else if (cls === 'RegularPolygon') {
    node.radius(Math.max(1, node.radius() * Math.max(Math.abs(sx), Math.abs(sy))));
  } else if (cls === 'Star') {
    const k = Math.max(Math.abs(sx), Math.abs(sy));
    node.innerRadius(Math.max(1, node.innerRadius() * k));
    node.outerRadius(Math.max(1, node.outerRadius() * k));
  }
  node.scaleX(1); node.scaleY(1);
}

export function cloneNode(node, stageW, stageH) {
  const clone = node.clone();
  clone.x(Math.min(stageW - 20, clone.x() + 18));
  clone.y(Math.min(stageH - 20, clone.y() + 18));
  clone.visible(true);
  return clone;
}

export function nodeName(node, isLabel, textNodeOf) {
  if (isLabel(node)) {
    const t = textNodeOf(node)?.text?.();
    if (t && t.trim()) return t.trim().slice(0, 18);
  }
  if (node?.getClassName?.() === 'Group') return `Group (${node.getChildren?.().length || 0})`;
  return ({ Rect: 'Rectangle', Circle: 'Circle', Ellipse: 'Ellipse', Ring: 'Ring', Wedge: 'Wedge', Arc: 'Arc', Line: 'Line', Arrow: 'Arrow', RegularPolygon: 'Polygon', Star: 'Star', Label: 'Text' })[node?.getClassName?.()] || 'Layer';
}

export function readSize(node) {
  const cls = node?.getClassName?.();
  if (cls === 'Circle') return { w: Math.round(node.radius() * 2), h: Math.round(node.radius() * 2) };
  if (cls === 'Ellipse') return { w: Math.round(node.radiusX() * 2), h: Math.round(node.radiusY() * 2) };
  if (cls === 'Ring' || cls === 'Arc') return { w: Math.round(node.outerRadius() * 2), h: Math.round(node.outerRadius() * 2) };
  if (cls === 'Wedge') return { w: Math.round(node.radius() * 2), h: Math.round(node.radius() * 2) };
  if (cls === 'RegularPolygon') return { w: Math.round(node.radius() * 2), h: Math.round(node.radius() * 2) };
  if (cls === 'Star') return { w: Math.round(node.outerRadius() * 2), h: Math.round(node.outerRadius() * 2) };
  if (cls === 'Group') { const r = node.getClientRect({ skipShadow: true }); return { w: Math.round(r.width), h: Math.round(r.height) }; }
  if (typeof node?.width === 'function' && typeof node?.height === 'function') return { w: Math.round(node.width()), h: Math.round(node.height()) };
  return { w: 0, h: 0 };
}

export function writeSize(node, w, h) {
  const cls = node?.getClassName?.();
  if (cls === 'Circle') { node.radius(Math.max(1, Math.max(w, h) / 2)); return; }
  if (cls === 'Ellipse') { node.radiusX(Math.max(1, w / 2)); node.radiusY(Math.max(1, h / 2)); return; }
  if (cls === 'Ring' || cls === 'Arc') { node.outerRadius(Math.max(1, Math.max(w, h) / 2)); return; }
  if (cls === 'Wedge') { node.radius(Math.max(1, Math.max(w, h) / 2)); return; }
  if (cls === 'RegularPolygon') { node.radius(Math.max(1, Math.max(w, h) / 2)); return; }
  if (cls === 'Star') { node.outerRadius(Math.max(1, Math.max(w, h) / 2)); return; }
  if (typeof node?.width === 'function' && typeof node?.height === 'function' && !['Line', 'Arrow'].includes(cls)) {
    node.width(Math.max(1, w)); node.height(Math.max(1, h));
  }
}

export function snapNodeToGuides(node, layer, stageW, stageH, threshold = 5) {
  if (!node || !layer) return;
  const box = node.getClientRect({ skipShadow: true });
  const stopsX = [0, stageW / 2, stageW];
  const stopsY = [0, stageH / 2, stageH];
  layer.find('.obj').forEach((other) => {
    if (other === node || !other.visible()) return;
    const r = other.getClientRect({ skipShadow: true });
    stopsX.push(r.x, r.x + r.width / 2, r.x + r.width);
    stopsY.push(r.y, r.y + r.height / 2, r.y + r.height);
  });
  const edgesX = [{ p: box.x, off: box.x - node.x() }, { p: box.x + box.width / 2, off: box.x + box.width / 2 - node.x() }, { p: box.x + box.width, off: box.x + box.width - node.x() }];
  const edgesY = [{ p: box.y, off: box.y - node.y() }, { p: box.y + box.height / 2, off: box.y + box.height / 2 - node.y() }, { p: box.y + box.height, off: box.y + box.height - node.y() }];
  let bestX = null, bestY = null;
  for (const stop of stopsX) for (const edge of edgesX) {
    const diff = Math.abs(stop - edge.p);
    if (diff <= threshold && (!bestX || diff < bestX.diff)) bestX = { diff, value: stop - edge.off };
  }
  for (const stop of stopsY) for (const edge of edgesY) {
    const diff = Math.abs(stop - edge.p);
    if (diff <= threshold && (!bestY || diff < bestY.diff)) bestY = { diff, value: stop - edge.off };
  }
  if (bestX) node.x(bestX.value);
  if (bestY) node.y(bestY.value);
}

export function installAdvKeys({ ownerDocument, keyTarget, isActive, getSelection, deleteSelection, duplicateSelection, nudgeSelection, clearSelection }) {
  const onKey = (e) => {
    if (!isActive() || isTypingTarget(e.target)) return;
    const selected = getSelection();
    if (!selected.length) return;
    if (e.__fvAdvHandled) return;
    const handled = () => { e.__fvAdvHandled = true; e.preventDefault(); };
    const isDelete = e.key === 'Delete' || e.key === 'Backspace' || e.code === 'Delete' || e.code === 'Backspace' || e.keyCode === 46 || e.keyCode === 8;
    if (e.type === 'keyup' && !isDelete) return;
    if (isDelete) {
      handled(); deleteSelection(); return;
    }
    if (e.key === 'Escape') {
      handled(); clearSelection(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      handled(); duplicateSelection(); return;
    }
    const delta = e.shiftKey ? 10 : 1;
    const map = { ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, -delta], ArrowDown: [0, delta] };
    const move = map[e.key];
    if (move) { handled(); nudgeSelection(move[0], move[1]); }
  };
  ownerDocument.addEventListener('keydown', onKey);
  ownerDocument.addEventListener('keyup', onKey);
  ownerDocument.defaultView?.addEventListener('keydown', onKey);
  ownerDocument.defaultView?.addEventListener('keyup', onKey);
  keyTarget?.addEventListener('keydown', onKey);
  keyTarget?.addEventListener('keyup', onKey);
  return () => {
    ownerDocument.removeEventListener('keydown', onKey);
    ownerDocument.removeEventListener('keyup', onKey);
    ownerDocument.defaultView?.removeEventListener('keydown', onKey);
    ownerDocument.defaultView?.removeEventListener('keyup', onKey);
    keyTarget?.removeEventListener('keydown', onKey);
    keyTarget?.removeEventListener('keyup', onKey);
  };
}
