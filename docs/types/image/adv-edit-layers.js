export function mountAdvLayersPanel({ stageHost, layer, tr, getObjects, getSelected, select, snap, markDirty, cloneNode, placeObject, labelName, stageW, stageH }) {
  const panel = document.createElement('div');
  panel.className = 'imgv-adv-layers';
  panel.hidden = true;
  panel.style.cssText = 'position:absolute;top:8px;right:8px;z-index:7;width:210px;max-height:60%;overflow:auto;background:var(--bg-2,#222);color:var(--fg,#eee);border:1px solid var(--border,#444);border-radius:6px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.3);';
  stageHost.appendChild(panel);

  const locked = (n) => !!n.getAttr('locked');
  const setLocked = (n, on) => { n.setAttr('locked', on); n.draggable(!on); n.listening(!on); };
  const displayName = (n) => n.getAttr('layerName') || labelName(n);
  const icon = (n) => ({ Label: 'T', Rect: 'R', Circle: 'C', Ellipse: 'E', Ring: 'O', Wedge: 'W', Arc: 'A', Line: '/', Arrow: '>', RegularPolygon: 'P', Star: '*', Group: 'G' })[n.getClassName?.()] || '?';

  function refresh() {
    const selected = getSelected();
    const labels = getObjects().slice().reverse();
    panel.innerHTML = `<div style="padding:5px 8px;font-weight:600;border-bottom:1px solid var(--border,#444)">Layers (${labels.length})${selected.length ? ` · ${selected.length} selected` : ''}</div>`;
    labels.forEach((label) => panel.appendChild(rowFor(label, selected)));
  }

  function rowFor(label, selected) {
    const row = document.createElement('div');
    row.dataset.selected = selected.includes(label) ? '1' : '0';
    row.style.cssText = `display:flex;align-items:center;gap:4px;padding:3px 6px;cursor:pointer;${selected.includes(label) ? 'background:var(--accent,#2563eb);color:#fff;' : ''}${locked(label) ? 'opacity:.7;' : ''}`;
    const eye = mkMini(label.visible() ? 'V' : '-', 'Show / hide', (e) => { e.stopPropagation(); snap(); label.visible(!label.visible()); if (!label.visible() && selected.includes(label)) select(null); layer.draw(); refresh(); markDirty(); });
    const lock = mkMini(locked(label) ? 'L' : 'U', locked(label) ? 'Unlock' : 'Lock', (e) => { e.stopPropagation(); snap(); setLocked(label, !locked(label)); if (locked(label)) tr.nodes(tr.nodes().filter((n) => n !== label)); layer.draw(); refresh(); markDirty(); });
    const type = document.createElement('span');
    type.textContent = icon(label); type.title = label.getClassName?.() || 'Layer'; type.style.cssText = 'width:12px;text-align:center;font-weight:700;opacity:.85';
    const name = document.createElement('span');
    name.textContent = displayName(label); name.title = 'Double-click to rename'; name.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    name.addEventListener('dblclick', (e) => renameLayer(e, label, name));
    const dup = mkMini('+', 'Duplicate', (e) => { e.stopPropagation(); snap(); const c = cloneNode(label, stageW(), stageH()); placeObject(c); refresh(); });
    const up = mkMini('↑', 'Bring forward', (e) => { e.stopPropagation(); snap(); label.moveUp(); tr.moveToTop(); layer.draw(); refresh(); markDirty(); });
    const dn = mkMini('↓', 'Send backward', (e) => { e.stopPropagation(); snap(); label.moveDown(); tr.moveToTop(); layer.draw(); refresh(); markDirty(); });
    const del = mkMini('x', 'Delete', (e) => { e.stopPropagation(); snap(); if (selected.includes(label)) select(null); label.destroy(); layer.draw(); refresh(); markDirty(); });
    row.append(eye, lock, type, name, dup, up, dn, del);
    row.addEventListener('click', (e) => { select(label, { toggle: e.shiftKey || e.ctrlKey || e.metaKey }); });
    return row;
  }

  function renameLayer(e, label, name) {
    e.stopPropagation();
    const input = document.createElement('input');
    input.value = label.getAttr('layerName') || labelName(label);
    input.style.cssText = 'flex:1;min-width:60px;font:inherit;';
    name.replaceWith(input); input.focus(); input.select();
    const done = (commit) => {
      if (!input.isConnected) return;
      if (commit) { snap(); label.setAttr('layerName', input.value.trim() || null); markDirty(); }
      refresh();
    };
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') done(false);
      if (ev.key === 'Enter') done(true);
    });
    input.addEventListener('blur', () => done(true));
  }

  function mkMini(txt, title, fn) {
    const b = document.createElement('button');
    b.textContent = txt; b.title = title;
    b.style.cssText = 'background:none;border:none;color:inherit;cursor:pointer;font-size:11px;padding:0 1px';
    b.addEventListener('click', fn);
    return b;
  }

  return { panel, refresh, destroy: () => panel.remove() };
}
