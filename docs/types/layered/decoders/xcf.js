// Hand-rolled XCF (GIMP native) binary reader. No external dependencies.
// Returns { W, H, layers } in the unified layer model.
// Pixel data is not decoded — the canvas shows a placeholder and the layer panel is the value.

export function loadXcf(bytes) {
  const magic = String.fromCharCode(...bytes.slice(0, 9));
  if (magic !== 'gimp xcf ') throw new Error('Not an XCF file');

  const buf = bytes.buffer;
  const base = bytes.byteOffset;
  const view = new DataView(buf);
  let pos = base + 14; // skip "gimp xcf vNNN\0"

  const u32 = () => { const v = view.getUint32(pos, false); pos += 4; return v; };
  const i32 = () => { const v = view.getInt32(pos, false); pos += 4; return v; };
  const nstr = () => {
    const len = u32();
    if (!len) return '';
    const s = new TextDecoder().decode(buf.slice(pos, pos + len - 1));
    pos += len;
    return s;
  };
  const readProps = () => {
    const props = {};
    while (pos < base + bytes.byteLength) {
      const type = u32(), len = u32();
      if (type === 0) break;
      const pEnd = pos + len;
      if (type === 6 && len >= 4)  props.opacity  = view.getUint32(pos, false);       // PROP_OPACITY 0-255
      else if (type === 7 && len >= 4)  props.mode   = view.getUint32(pos, false);    // PROP_MODE
      else if (type === 8 && len >= 4)  props.visible = view.getUint32(pos, false) !== 0; // PROP_VISIBLE
      else if (type === 15 && len >= 8) { props.x = view.getInt32(pos, false); props.y = view.getInt32(pos + 4, false); } // PROP_OFFSETS
      pos = pEnd;
    }
    return props;
  };

  const W = u32(), H = u32();
  u32(); // base_type
  readProps(); // image-level props

  const layerOffsets = [];
  while (pos < base + bytes.byteLength) { const off = u32(); if (!off) break; layerOffsets.push(off); }
  // skip channel offsets
  while (pos < base + bytes.byteLength) { if (!u32()) break; }

  const layers = [];
  for (const off of layerOffsets) {
    try {
      pos = base + off;
      const lW = u32(), lH = u32();
      u32(); // type enum (RGBA, RGB, GRAYA, GRAY, INDEXEDA, INDEXED)
      const name = nstr();
      const props = readProps();
      layers.push({
        name: name || 'Layer',
        type: 'layer',
        visibility: props.visible !== false,
        opacity: props.opacity !== undefined ? props.opacity / 255 : 1,
        x: props.x || 0,
        y: props.y || 0,
        w: lW,
        h: lH,
      });
    } catch { /* skip corrupt layer */ }
  }

  // Layers in XCF are stored top-to-bottom; reverse for bottom-up compositing order
  layers.reverse();
  return { W, H, layers };
}
